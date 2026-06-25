// lib/exportPdf.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PX_PER_MM = 96 / 25.4;

export interface ExportPdfOptions {
  fileName?: string;
  scale?: number;
  onProgress?: (progress: number) => void;
  pageClassName?: string;
}

/**
 * Walks every element in a cloned subtree and replaces any computed style
 * property that html2canvas cannot parse (oklab, oklch, color-mix, etc.)
 * with its getComputedStyle-resolved rgb() value from the LIVE element.
 *
 * We do this on a clone so we never mutate the real DOM.
 */
function resolveModernColors(liveRoot: HTMLElement, cloneRoot: HTMLElement): void {
  const liveEls = Array.from(liveRoot.querySelectorAll<HTMLElement>('*'));
  const cloneEls = Array.from(cloneRoot.querySelectorAll<HTMLElement>('*'));

  // Also handle the roots themselves
  liveEls.unshift(liveRoot);
  cloneEls.unshift(cloneRoot);

  const MODERN_COLOR_RE = /oklab|oklch|color-mix|color\(/i;

  const COLOR_PROPS = [
    'color',
    'background-color',
    'border-color',
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

  liveEls.forEach((live, i) => {
    const clone = cloneEls[i];
    if (!clone) return;
    const computed = window.getComputedStyle(live);

    let inlineOverrides = '';
    for (const prop of COLOR_PROPS) {
      const val = computed.getPropertyValue(prop);
      if (val && MODERN_COLOR_RE.test(val)) {
        // computed already resolved to rgb/rgba by the browser — but if it
        // somehow slipped through, force inline the resolved value.
        const resolved = computed.getPropertyValue(prop);
        inlineOverrides += `${prop}:${resolved} !important;`;
      }
    }

    // Always inline background-color and color from computed so html2canvas
    // never has to evaluate oklch utility classes itself.
    const bg = computed.getPropertyValue('background-color');
    const fg = computed.getPropertyValue('color');
    if (bg && bg !== 'rgba(0, 0, 0, 0)') {
      inlineOverrides += `background-color:${bg} !important;`;
    }
    inlineOverrides += `color:${fg} !important;`;

    // Font properties — ensure html2canvas picks up the right face
    inlineOverrides += `font-family:${computed.getPropertyValue('font-family')} !important;`;
    inlineOverrides += `font-size:${computed.getPropertyValue('font-size')} !important;`;
    inlineOverrides += `font-weight:${computed.getPropertyValue('font-weight')} !important;`;
    inlineOverrides += `line-height:${computed.getPropertyValue('line-height')} !important;`;

    if (inlineOverrides) {
      clone.setAttribute('style', (clone.getAttribute('style') ?? '') + ';' + inlineOverrides);
    }
  });
}

export async function exportPreviewToPdf(rootEl: HTMLElement, options: ExportPdfOptions = {}) {
  const {
    fileName = 'question-paper',
    scale = 2,
    onProgress,
    pageClassName = 'pdf-page',
  } = options;

  // Wait for fonts once, before any rasterisation.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      /* noop */
    }
  }
  // Extra settle time for Devanagari / KaTeX glyphs
  await new Promise<void>((r) => setTimeout(r, 300));

  const pages = Array.from(rootEl.querySelectorAll<HTMLElement>(`.${pageClassName}`));
  const nodesToRender = pages.length > 0 ? pages : [rootEl];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < nodesToRender.length; i++) {
    const node = nodesToRender[i];

    // --- Clone the page node so we can mutate styles without touching the DOM ---
    const clone = node.cloneNode(true) as HTMLElement;

    // Copy layout-critical styles so the clone has the same box model
    const nodeComputed = window.getComputedStyle(node);
    clone.style.cssText = node.style.cssText;
    clone.style.width = nodeComputed.width;
    clone.style.minHeight = nodeComputed.minHeight;
    clone.style.padding = nodeComputed.padding;
    clone.style.boxSizing = 'border-box';
    clone.style.position = 'absolute';
    clone.style.top = '-99999px';
    clone.style.left = '-99999px';
    clone.style.visibility = 'visible';
    clone.style.overflow = 'visible';

    document.body.appendChild(clone);

    // Allow one paint so clone gets its own layout pass
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    // Resolve modern color functions → plain rgb() on clone
    resolveModernColors(node, clone);

    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: node.offsetWidth,
      windowHeight: node.offsetHeight,
      // Ignore the measurement div that might be nearby in the real DOM
      ignoreElements: (el) => el.hasAttribute('aria-hidden'),
    });

    document.body.removeChild(clone);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage();

    const imgWidthMm = A4_WIDTH_MM;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    if (imgHeightMm <= A4_HEIGHT_MM) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthMm, imgHeightMm);
    } else {
      const scaledWidth = (canvas.width * A4_HEIGHT_MM) / canvas.height;
      const xOffset = (A4_WIDTH_MM - scaledWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, A4_HEIGHT_MM);
    }

    onProgress?.((i + 1) / nodesToRender.length);
  }

  pdf.save(`${fileName}.pdf`);
}

export const A4_PAGE_HEIGHT_PX = Math.round(A4_HEIGHT_MM * PX_PER_MM);
export const A4_PAGE_WIDTH_PX = Math.round(A4_WIDTH_MM * PX_PER_MM);
