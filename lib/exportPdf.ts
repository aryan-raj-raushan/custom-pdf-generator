// lib/exportPdf.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PX_PER_MM = 96 / 25.4;

const LOG_PREFIX = '[exportPdf]';

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'building' | 'done';
  pagesDone: number;
  pagesTotal: number;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
}

export interface ExportPdfOptions {
  fileName?: string;
  scale?: number;
  onProgress?: (progress: ExportProgress) => void;
  pageClassName?: string;
  concurrency?: number;
  foreignObjectRendering?: boolean;
}

export interface ExportCombinedPdfOptions {
  fileName?: string;
  scale?: number;
  onProgress?: (progress: ExportProgress) => void;
  paperPageClassName?: string;
  answerKeyPageClassName?: string;
  concurrency?: number;
  foreignObjectRendering?: boolean;
}

const MODERN_COLOR_RE = /oklab|oklch|color-mix|color\(/i;

const COLOR_PROPS = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'fill',
  'stroke',
] as const;

/**
 * IMPORTANT: this is intentionally scoped to the actual export root(s),
 * NOT `document.styleSheets`. A whole-document stylesheet scan is a false
 * positive trap: Tailwind v4's *default* color palette (stone-900,
 * stone-50, etc., used all over the app's toolbar/buttons/sidebar) is
 * defined using oklch() internally, so a global scan flags `true` even when
 * the exported page content itself uses plain hex/rgba colors (as this
 * app's PREVIEW_COLORS does). That false positive was forcing the full,
 * expensive per-element resolveModernColors pass onto every page for no
 * reason — likely the dominant remaining cost after earlier optimizations.
 *
 * Instead we do a cheap, targeted check: read just `color` and
 * `background-color` (the two properties that matter most and are cheapest
 * to check) on every element actually inside the export root. This is still
 * a DOM walk, but 2 property reads instead of 16, done once per export
 * (not once per page) and only across the content that will actually be
 * rasterised.
 */
const modernColorCheckCache = new Map<HTMLElement, boolean>();

function rootUsesModernColors(root: HTMLElement): boolean {
  const cached = modernColorCheckCache.get(root);
  if (cached !== undefined) return cached;

  let found = false;
  const els = root.querySelectorAll<HTMLElement>('*');
  for (const el of Array.from(els)) {
    const computed = window.getComputedStyle(el);
    if (
      MODERN_COLOR_RE.test(computed.getPropertyValue('color')) ||
      MODERN_COLOR_RE.test(computed.getPropertyValue('background-color'))
    ) {
      found = true;
      break;
    }
  }

  modernColorCheckCache.set(root, found);
  console.log(`${LOG_PREFIX} modern-color scoped scan → ${found}`);
  return found;
}

function resolveModernColors(liveRoot: HTMLElement, cloneRoot: HTMLElement): void {
  const liveEls = Array.from(liveRoot.querySelectorAll<HTMLElement>('*'));
  const cloneEls = Array.from(cloneRoot.querySelectorAll<HTMLElement>('*'));

  liveEls.unshift(liveRoot);
  cloneEls.unshift(cloneRoot);

  liveEls.forEach((live, i) => {
    const clone = cloneEls[i];
    if (!clone) return;
    const computed = window.getComputedStyle(live);

    let inlineOverrides = '';
    for (const prop of COLOR_PROPS) {
      const val = computed.getPropertyValue(prop);
      if (val && MODERN_COLOR_RE.test(val)) {
        inlineOverrides += `${prop}:${val} !important;`;
      }
    }

    if (inlineOverrides) {
      clone.setAttribute('style', (clone.getAttribute('style') ?? '') + ';' + inlineOverrides);
    }
  });
}

async function waitForFontsAndSettle(): Promise<void> {
  const t0 = performance.now();
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      /* noop */
    }
  }
  await new Promise<void>((r) => setTimeout(r, 300));
  console.log(`${LOG_PREFIX} fonts ready + settle took ${Math.round(performance.now() - t0)}ms`);
}

function getOffscreenContainer(): HTMLElement {
  const id = '__pdf-export-offscreen-container__';
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement('div');
    container.id = id;
    container.style.position = 'absolute';
    container.style.top = '-99999px';
    container.style.left = '-99999px';
    container.style.overflow = 'visible';
    document.body.appendChild(container);
  }
  return container;
}

function removeOffscreenContainer(): void {
  const container = document.getElementById('__pdf-export-offscreen-container__');
  if (container) container.remove();
}

/**
 * Async, non-blocking encode. canvas.toBlob can run its encode step off the
 * main thread in Chromium-family browsers (unlike the fully synchronous
 * toDataURL), which both avoids janking the UI and lets the browser overlap
 * the encode for page N with layout/paint work queued for page N+1 under
 * concurrency.
 */
function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('canvas.toBlob returned null'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

interface RenderTiming {
  cloneMs: number;
  canvasMs: number;
  encodeMs: number;
  totalMs: number;
}

async function renderPageToImage(
  node: HTMLElement,
  scale: number,
  applyColorFix: boolean,
  foreignObjectRendering: boolean,
): Promise<{ imgData: string; timing: RenderTiming }> {
  const pageStart = performance.now();

  const cloneStart = performance.now();
  const clone = node.cloneNode(true) as HTMLElement;

  const nodeComputed = window.getComputedStyle(node);
  clone.style.cssText = node.style.cssText;
  clone.style.width = nodeComputed.width;
  clone.style.minHeight = nodeComputed.minHeight;
  clone.style.padding = nodeComputed.padding;
  clone.style.boxSizing = 'border-box';
  clone.style.visibility = 'visible';
  clone.style.overflow = 'visible';

  const container = getOffscreenContainer();
  container.appendChild(clone);

  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  if (applyColorFix) {
    resolveModernColors(node, clone);
  }
  const cloneMs = Math.round(performance.now() - cloneStart);

  const canvasStart = performance.now();
  const canvas = await html2canvas(clone, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: node.offsetWidth,
    windowHeight: node.offsetHeight,
    foreignObjectRendering,
    ignoreElements: (el) => el.hasAttribute('data-pdf-ignore'),
  });
  const canvasMs = Math.round(performance.now() - canvasStart);

  clone.remove();

  const encodeStart = performance.now();
  const imgData = await canvasToDataUrl(canvas, 0.92);
  const encodeMs = Math.round(performance.now() - encodeStart);

  const totalMs = Math.round(performance.now() - pageStart);

  return { imgData, timing: { cloneMs, canvasMs, encodeMs, totalMs } };
}

function addImageToPdf(pdf: jsPDF, imgData: string): void {
  pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
}

interface QueueItem {
  node: HTMLElement;
  /** Position in the final assembled PDF — preserved regardless of completion order. */
  globalIndex: number;
  label: string; // for logging, e.g. "paper 3/8" or "answerKey 2/6"
}

/**
 * Renders a queue of pages using a shared worker pool. Workers pull the next
 * item off the queue as soon as they're free, so pages from two different
 * documents (e.g. question paper + answer key) interleave naturally when
 * queued together — this is what gives the combined export real overlap
 * instead of finishing one document fully before starting the next.
 *
 * True CPU-bound canvas painting still serializes on the main thread, but
 * each page has real async gaps (image/font decode, RAF yields, blob
 * encode) where a concurrent page's work can proceed — so concurrency > 1
 * still reduces wall-clock time even without multiple threads. Benchmark
 * `concurrency` for your content; 2–3 is a reasonable starting point.
 */
async function renderQueueConcurrently(
  queue: QueueItem[],
  scale: number,
  concurrency: number,
  startTime: number,
  applyColorFix: boolean,
  foreignObjectRendering: boolean,
  onProgress?: (progress: ExportProgress) => void,
): Promise<string[]> {
  const total = queue.length;
  const results: string[] = new Array(total);
  let nextIndex = 0;
  let completed = 0;

  console.log(
    `${LOG_PREFIX} rendering ${total} page(s) — concurrency=${concurrency}, scale=${scale}, ` +
      `colorFix=${applyColorFix}, foreignObjectRendering=${foreignObjectRendering}`,
  );

  async function worker(workerId: number) {
    while (true) {
      const i = nextIndex++;
      if (i >= total) return;
      const item = queue[i];

      const { imgData, timing } = await renderPageToImage(
        item.node,
        scale,
        applyColorFix,
        foreignObjectRendering,
      );

      results[item.globalIndex] = imgData;
      completed += 1;

      const elapsedMs = performance.now() - startTime;
      const avgMsPerPage = elapsedMs / completed;
      const remaining = total - completed;
      const estimatedRemainingMs = remaining > 0 ? Math.round(avgMsPerPage * remaining) : 0;

      console.log(
        `${LOG_PREFIX} [worker ${workerId}] ${item.label} done — ` +
          `clone ${timing.cloneMs}ms, canvas ${timing.canvasMs}ms, encode ${timing.encodeMs}ms, total ${timing.totalMs}ms ` +
          `— progress ${completed}/${total} (${Math.round((completed / total) * 100)}%) ` +
          `— elapsed ${Math.round(elapsedMs / 1000)}s, ~${Math.round(estimatedRemainingMs / 1000)}s left`,
      );

      onProgress?.({
        phase: 'rendering',
        pagesDone: completed,
        pagesTotal: total,
        elapsedMs,
        estimatedRemainingMs,
      });
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, total));
  const workers = Array.from({ length: workerCount }, (_, idx) => worker(idx + 1));
  await Promise.all(workers);

  return results;
}

function buildPdfFromImages(imgDataList: string[]): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  imgDataList.forEach((imgData, i) => {
    if (i > 0) pdf.addPage();
    addImageToPdf(pdf, imgData);
  });

  return pdf;
}

export async function exportPreviewToPdf(rootEl: HTMLElement, options: ExportPdfOptions = {}) {
  const {
    fileName = 'question-paper',
    scale = 2,
    onProgress,
    pageClassName = 'pdf-page',
    concurrency = 3,
    foreignObjectRendering = false,
  } = options;

  const startTime = performance.now();
  console.log(`${LOG_PREFIX} ── export started: "${fileName}.pdf" ──`);

  onProgress?.({
    phase: 'preparing',
    pagesDone: 0,
    pagesTotal: 0,
    elapsedMs: 0,
    estimatedRemainingMs: null,
  });
  await waitForFontsAndSettle();

  const applyColorFix = rootUsesModernColors(rootEl);

  const pages = Array.from(rootEl.querySelectorAll<HTMLElement>(`.${pageClassName}`));
  const nodesToRender = pages.length > 0 ? pages : [rootEl];
  console.log(`${LOG_PREFIX} found ${nodesToRender.length} page(s) to render`);

  const queue: QueueItem[] = nodesToRender.map((node, i) => ({
    node,
    globalIndex: i,
    label: `paper ${i + 1}/${nodesToRender.length}`,
  }));

  try {
    const imgDataList = await renderQueueConcurrently(
      queue,
      scale,
      concurrency,
      startTime,
      applyColorFix,
      foreignObjectRendering,
      onProgress,
    );

    console.log(`${LOG_PREFIX} all pages rendered — building PDF document...`);
    onProgress?.({
      phase: 'building',
      pagesDone: nodesToRender.length,
      pagesTotal: nodesToRender.length,
      elapsedMs: performance.now() - startTime,
      estimatedRemainingMs: 0,
    });

    const pdf = buildPdfFromImages(imgDataList);
    pdf.save(`${fileName}.pdf`);

    const totalMs = Math.round(performance.now() - startTime);
    console.log(
      `${LOG_PREFIX} ── export complete: "${fileName}.pdf", ${nodesToRender.length} page(s), ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s) ──`,
    );
    onProgress?.({
      phase: 'done',
      pagesDone: nodesToRender.length,
      pagesTotal: nodesToRender.length,
      elapsedMs: totalMs,
      estimatedRemainingMs: 0,
    });
  } finally {
    removeOffscreenContainer();
  }
}

export async function exportCombinedPreviewToPdf(
  paperRootEl: HTMLElement,
  answerKeyRootEl: HTMLElement,
  options: ExportCombinedPdfOptions = {},
) {
  const {
    fileName = 'question-paper',
    scale = 2,
    onProgress,
    paperPageClassName = 'pdf-page',
    answerKeyPageClassName = 'answer-key-page',
    concurrency = 3,
    foreignObjectRendering = false,
  } = options;

  const startTime = performance.now();
  console.log(`${LOG_PREFIX} ── combined export started: "${fileName}.pdf" ──`);

  onProgress?.({
    phase: 'preparing',
    pagesDone: 0,
    pagesTotal: 0,
    elapsedMs: 0,
    estimatedRemainingMs: null,
  });
  await waitForFontsAndSettle();

  const applyColorFix = rootUsesModernColors(paperRootEl) || rootUsesModernColors(answerKeyRootEl);

  const paperPages = Array.from(
    paperRootEl.querySelectorAll<HTMLElement>(`.${paperPageClassName}`),
  );
  const answerPages = Array.from(
    answerKeyRootEl.querySelectorAll<HTMLElement>(`.${answerKeyPageClassName}`),
  );

  const paperNodes = paperPages.length > 0 ? paperPages : [paperRootEl];
  const answerNodes = answerPages.length > 0 ? answerPages : [answerKeyRootEl];

  if (paperNodes.length === 0 && answerNodes.length === 0) {
    throw new Error('No pages found to export');
  }

  console.log(
    `${LOG_PREFIX} found ${paperNodes.length} question-paper page(s) + ${answerNodes.length} answer-key page(s)`,
  );

  // Question-paper pages occupy indices [0, paperNodes.length), answer-key
  // pages follow — this fixes their position in the final PDF regardless of
  // which finishes rendering first, since paper and answer-key pages are
  // queued together and processed by a shared worker pool (true interleaving,
  // not "render all of paper, then all of answer key").
  const queue: QueueItem[] = [
    ...paperNodes.map((node, i) => ({
      node,
      globalIndex: i,
      label: `paper ${i + 1}/${paperNodes.length}`,
    })),
    ...answerNodes.map((node, i) => ({
      node,
      globalIndex: paperNodes.length + i,
      label: `answerKey ${i + 1}/${answerNodes.length}`,
    })),
  ];

  try {
    const imgDataList = await renderQueueConcurrently(
      queue,
      scale,
      concurrency,
      startTime,
      applyColorFix,
      foreignObjectRendering,
      onProgress,
    );

    console.log(`${LOG_PREFIX} all pages rendered — building combined PDF document...`);
    onProgress?.({
      phase: 'building',
      pagesDone: queue.length,
      pagesTotal: queue.length,
      elapsedMs: performance.now() - startTime,
      estimatedRemainingMs: 0,
    });

    const pdf = buildPdfFromImages(imgDataList);
    pdf.save(`${fileName}.pdf`);

    const totalMs = Math.round(performance.now() - startTime);
    console.log(
      `${LOG_PREFIX} ── combined export complete: "${fileName}.pdf", ${queue.length} page(s), ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s) ──`,
    );
    onProgress?.({
      phase: 'done',
      pagesDone: queue.length,
      pagesTotal: queue.length,
      elapsedMs: totalMs,
      estimatedRemainingMs: 0,
    });
  } finally {
    removeOffscreenContainer();
  }
}

export const A4_PAGE_HEIGHT_PX = Math.round(A4_HEIGHT_MM * PX_PER_MM);
export const A4_PAGE_WIDTH_PX = Math.round(A4_WIDTH_MM * PX_PER_MM);
