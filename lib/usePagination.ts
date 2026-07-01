'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { A4_PAGE_HEIGHT_PX } from './exportPdf';

export function useAutoPaginate(
  blockIds: string[],
  containerRef: React.RefObject<HTMLDivElement>,
  options: {
    reservedFirstPagePx: number;
    reservedOtherPagePx: number;
    pageHeightPx?: number;
    columns?: number;
    fontSize?: number;
    active?: boolean;
    extraHeightBefore?: (id: string) => number;
    safetyBufferPx?: number;
    /**
     * Return true if this block starts a brand-new row in the ACTUAL
     * rendered layout, regardless of how many items are already in the
     * current row (e.g. a new section starts its own CSS grid in
     * A4Preview, so it always begins at column 1 even if the previous
     * section left the row half-full). Measurement must mirror this or
     * row-height budgeting drifts and content gets clipped near section
     * boundaries.
     */
    forcesNewRow?: (id: string) => boolean;
  },
) {
  const {
    reservedFirstPagePx,
    reservedOtherPagePx,
    pageHeightPx = A4_PAGE_HEIGHT_PX,
    columns = 2,
    fontSize = 11,
    active = true,
    extraHeightBefore,
    safetyBufferPx = 28,
    forcesNewRow,
  } = options;

  const [pages, setPages] = useState<string[][]>([blockIds]);
  const rafRef = useRef<number | null>(null);
  const measureRef = useRef<() => void>(() => {});
  const blockIdsKey = blockIds.join('|');

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || blockIds.length === 0) {
      setPages([[]]);
      return;
    }

    const nodes = blockIds
      .map((id) => container.querySelector<HTMLElement>(`[data-block-id="${id}"]`))
      .filter((n): n is HTMLElement => n !== null);

    const containerRect = container.getBoundingClientRect();
    const isHidden = containerRect.width === 0 || containerRect.height === 0;

    if (nodes.length !== blockIds.length || isHidden) {
      rafRef.current = requestAnimationFrame(() => measureRef.current());
      return;
    }

    // Build rows the same way the real layout does: fill up to `columns`
    // items per row, BUT force a new row whenever forcesNewRow(id) says a
    // fresh grid/section starts (mirrors per-section grid restarts).
    const rowHeights: { ids: string[]; height: number }[] = [];
    let currentIds: string[] = [];
    let currentH = 0;
    let currentExtra = 0;

    const flushRow = () => {
      if (currentIds.length === 0) return;
      rowHeights.push({ ids: currentIds, height: currentH + currentExtra + 8 });
      currentIds = [];
      currentH = 0;
      currentExtra = 0;
    };
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const id = blockIds[i];

      if (forcesNewRow?.(id) && currentIds.length > 0) {
        flushRow();
      }

      const h = Math.ceil(node.getBoundingClientRect().height);
      if (h > currentH) currentH = h;
      if (extraHeightBefore) {
        const extra = extraHeightBefore(id);
        if (extra > currentExtra) currentExtra = extra;
      }
      currentIds.push(id);

      if (currentIds.length >= columns) {
        flushRow();
      }
    }
    flushRow();

    const result: string[][] = [[]];
    let currentHeight = 0;
    let pageIndex = 0;
    let budget = pageHeightPx - reservedFirstPagePx - safetyBufferPx;

    for (const row of rowHeights) {
      if (currentHeight + row.height > budget && result[pageIndex].length > 0) {
        pageIndex += 1;
        result.push([]);
        currentHeight = 0;
        budget = pageHeightPx - reservedOtherPagePx - safetyBufferPx;
      }
      for (const id of row.ids) result[pageIndex].push(id);
      currentHeight += row.height;
    }

    setPages(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    blockIdsKey,
    columns,
    fontSize,
    pageHeightPx,
    reservedFirstPagePx,
    reservedOtherPagePx,
    safetyBufferPx,
  ]);

  useEffect(() => {
    measureRef.current = measure;
  }, [measure]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => measureRef.current());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [measure, active]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measureRef.current());
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  // Question blocks can contain <img> tags (diagrams, RRB-style grids).
  // Images have zero height until loaded, so if pagination measures before
  // they finish loading, those blocks are undercounted and the real page
  // renders taller than budgeted. Watch every image in the container and
  // re-measure once they're all loaded (and again on any that load later).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const imgs = Array.from(container.querySelectorAll('img'));
    const pending = imgs.filter((img) => !img.complete);
    if (pending.length === 0) return;

    let remaining = pending.length;
    const onSettle = () => {
      remaining -= 1;
      if (remaining <= 0) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => measureRef.current());
      }
    };

    pending.forEach((img) => {
      img.addEventListener('load', onSettle, { once: true });
      img.addEventListener('error', onSettle, { once: true });
    });

    return () => {
      pending.forEach((img) => {
        img.removeEventListener('load', onSettle);
        img.removeEventListener('error', onSettle);
      });
    };
  }, [blockIdsKey]);

  return pages;
}

/**
 * Safety-net correction pass that runs AFTER real pages are rendered.
 * useAutoPaginate predicts page breaks from a hidden measurement pass —
 * usually accurate, but text hinting, image/font load timing, etc. can
 * still cause a block to render slightly past the page's footer.
 *
 * This hook inspects the actual rendered DOM: for each page, it finds the
 * real footer element and checks whether any block's bottom edge comes
 * within FOOTER_SAFETY_MARGIN_PX of it. If so, that block (and everything
 * after it on that page) is moved to the start of the next page, and we
 * recheck — up to maxPasses times.
 */

// Blocks ending merely a few px above the footer can still visually collide
// with it (footer line-height, sub-pixel layout drift, etc). Treat anything
// within this margin as "too close" rather than requiring true overlap.
const FOOTER_SAFETY_MARGIN_PX = 18;

export function useOverflowCorrection(
  measuredPages: string[][],
  containerRef: React.RefObject<HTMLElement>,
  options: {
    pageSelector: string;
    footerSelector: string;
    blockAttr: string;
    maxPasses?: number;
  },
) {
  const { pageSelector, footerSelector, blockAttr, maxPasses = 8 } = options;

  const [pages, setPages] = useState<string[][]>(measuredPages);
  const passRef = useRef(0);
  const measuredKey = measuredPages.map((p) => p.join(',')).join('|');

  useEffect(() => {
    setPages(measuredPages);
    passRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (passRef.current >= maxPasses) return;

    let cancelled = false;

    // Double-RAF: the first frame lets React commit the DOM from the last
    // setPages call, the second guarantees the browser has actually laid
    // out and painted that commit before we measure. A single RAF can read
    // positions mid-layout, which is exactly the kind of "barely touching"
    // false-negative that let content sneak in behind the footer.
    const raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      const raf2 = requestAnimationFrame(() => {
        if (cancelled) return;

        const pageNodes = Array.from(container.querySelectorAll<HTMLElement>(pageSelector));
        if (pageNodes.length !== pages.length) return;

        const next = pages.map((ids) => [...ids]);
        let changed = false;

        for (let i = 0; i < pageNodes.length; i++) {
          const pageNode = pageNodes[i];
          const footer = pageNode.querySelector<HTMLElement>(footerSelector);
          if (!footer) continue;
          const footerTop = footer.getBoundingClientRect().top;
          const dangerLine = footerTop - FOOTER_SAFETY_MARGIN_PX;

          const idsOnPage = next[i];
          let cutIndex = -1;

          for (let bi = 0; bi < idsOnPage.length; bi++) {
            const id = idsOnPage[bi];
            const node = pageNode.querySelector<HTMLElement>(`[${blockAttr}="${id}"]`);
            if (!node) continue;
            const rect = node.getBoundingClientRect();
            if (rect.bottom > dangerLine) {
              cutIndex = bi;
              break;
            }
          }

          if (cutIndex !== -1) {
            const overflowIds = idsOnPage.splice(cutIndex);
            if (!next[i + 1]) next[i + 1] = [];
            next[i + 1] = [...overflowIds, ...next[i + 1]];
            changed = true;
          }
        }

        if (changed) {
          passRef.current += 1;
          setPages(next.filter((p) => p.length > 0));
        }
      });
      // no cleanup needed for raf2 individually — cancelled flag covers it
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
    };
  }, [pages, containerRef, pageSelector, footerSelector, blockAttr, maxPasses]);

  return pages;
}
