'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { A4_PAGE_HEIGHT_PX } from './exportPdf';

function pagesKeyFromColumns(pages: string[][][]): string {
  return pages.map((page) => page.map((column) => column.join(',')).join('||')).join('|');
}

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
    containerRef,
    fontSize,
    pageHeightPx,
    reservedFirstPagePx,
    reservedOtherPagePx,
    safetyBufferPx,
  ]);

  useEffect(() => {
    measureRef.current = measure;
  }, [containerRef, measure]);

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
  }, [containerRef, measure]);

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
  }, [blockIdsKey, containerRef]);

  return pages;
}

function createEmptyColumnPages(pageCount: number, columns: number): string[][][] {
  return Array.from({ length: pageCount }, () =>
    Array.from({ length: columns }, () => [] as string[]),
  );
}

function createSeededColumnPages(blockIds: string[], columns: number): string[][][] {
  const seeded = createEmptyColumnPages(1, columns);
  seeded[0][0] = [...blockIds];
  return seeded;
}

export function useRenderedColumnPagination(
  blockIds: string[],
  containerRef: React.RefObject<HTMLElement>,
  options: {
    pageSelector: string;
    columnSelector: string;
    footerSelector: string;
    blockAttr: string;
    columns: number;
    active?: boolean;
    safetyBufferPx?: number;
    maxPasses?: number;
    resetKey?: string;
  },
) {
  const {
    pageSelector,
    columnSelector,
    footerSelector,
    blockAttr,
    columns,
    active = true,
    safetyBufferPx = 18,
    maxPasses = 40,
    resetKey = '',
  } = options;

  const [pages, setPages] = useState<string[][][]>(() =>
    createSeededColumnPages(blockIds, columns),
  );
  const passRef = useRef(0);
  const pagesKeyRef = useRef(pagesKeyFromColumns(createSeededColumnPages(blockIds, columns)));
  const blockIdsKey = blockIds.join('|');

  useEffect(() => {
    const seeded = createSeededColumnPages(blockIds, columns);
    const seededKey = pagesKeyFromColumns(seeded);
    pagesKeyRef.current = seededKey;
    passRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPages(seeded);
  }, [blockIds, blockIdsKey, columns, resetKey]);

  useEffect(() => {
    if (!active) return;

    const root = containerRef.current;
    if (!root) return;
    if (passRef.current >= maxPasses) return;

    let cancelled = false;

    const moveOverflow = (
      targetPages: string[][][],
      pageIndex: number,
      columnIndex: number,
      overflowIds: string[],
    ) => {
      if (overflowIds.length === 0) return;

      if (!targetPages[pageIndex]) {
        targetPages[pageIndex] = createEmptyColumnPages(1, columns)[0];
      }
      while (targetPages[pageIndex].length < columns) {
        targetPages[pageIndex].push([]);
      }

      if (columnIndex < columns - 1) {
        if (!targetPages[pageIndex][columnIndex + 1]) {
          targetPages[pageIndex][columnIndex + 1] = [];
        }
        targetPages[pageIndex][columnIndex + 1] = [
          ...overflowIds,
          ...targetPages[pageIndex][columnIndex + 1],
        ];
        return;
      }

      if (!targetPages[pageIndex + 1]) {
        targetPages[pageIndex + 1] = createEmptyColumnPages(1, columns)[0];
      }
      targetPages[pageIndex + 1][0] = [...overflowIds, ...targetPages[pageIndex + 1][0]];
    };

    const normalizePages = (input: string[][][]) =>
      input.filter((page) => page.some((column) => column.length > 0));

    const raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;

        const rootRect = root.getBoundingClientRect();
        if (rootRect.width === 0 || rootRect.height === 0) return;

        const pageNodes = Array.from(root.querySelectorAll<HTMLElement>(pageSelector));
        if (pageNodes.length === 0) return;

        const next = pages.map((page) => page.map((column) => [...column]));
        let changed = false;

        for (let pageIndex = 0; pageIndex < pageNodes.length; pageIndex++) {
          const pageNode = pageNodes[pageIndex];
          const footerNode = pageNode.querySelector<HTMLElement>(footerSelector);
          const columnNodes = Array.from(pageNode.querySelectorAll<HTMLElement>(columnSelector));
          if (!footerNode || columnNodes.length === 0) continue;

          const pageRect = pageNode.getBoundingClientRect();
          const footerRect = footerNode.getBoundingClientRect();
          const pageDangerLine = Math.min(
            footerRect.top - safetyBufferPx,
            pageRect.bottom - safetyBufferPx,
          );

          for (let columnIndex = 0; columnIndex < columnNodes.length; columnIndex++) {
            const columnNode = columnNodes[columnIndex];
            const idsInColumn = next[pageIndex]?.[columnIndex] ?? [];
            if (idsInColumn.length === 0) continue;

            const columnRect = columnNode.getBoundingClientRect();
            let previousBottom = columnRect.top;
            let cutIndex = -1;

            for (let blockIndex = 0; blockIndex < idsInColumn.length; blockIndex++) {
              const id = idsInColumn[blockIndex];
              const blockNode = columnNode.querySelector<HTMLElement>(`[${blockAttr}="${id}"]`);
              if (!blockNode) continue;

              const rect = blockNode.getBoundingClientRect();
              const occupiedBottom = Math.max(rect.bottom, previousBottom);
              const isTooTallForCurrentColumn = occupiedBottom > pageDangerLine;

              if (isTooTallForCurrentColumn) {
                if (blockIndex === 0) {
                  previousBottom = rect.bottom;
                  continue;
                }
                cutIndex = blockIndex;
                break;
              }

              previousBottom = rect.bottom;
            }

            if (cutIndex !== -1) {
              const overflowIds = idsInColumn.splice(cutIndex);
              moveOverflow(next, pageIndex, columnIndex, overflowIds);
              changed = true;
            }
          }
        }

        if (!changed) return;

        const normalized = normalizePages(next);
        const nextKey = pagesKeyFromColumns(normalized);
        if (nextKey !== pagesKeyRef.current) {
          passRef.current += 1;
          pagesKeyRef.current = nextKey;
          setPages(normalized);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
    };
  }, [
    active,
    blockAttr,
    columnSelector,
    columns,
    containerRef,
    footerSelector,
    maxPasses,
    pageSelector,
    pages,
    safetyBufferPx,
  ]);

  useEffect(() => {
    if (!active) return;

    const root = containerRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => {
      passRef.current = 0;
      const currentKey = pagesKeyFromColumns(pages);
      if (currentKey !== pagesKeyRef.current) {
        pagesKeyRef.current = currentKey;
      }
      setPages((current) => [...current.map((page) => page.map((column) => [...column]))]);
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, [active, containerRef, pages]);

  useEffect(() => {
    if (!active) return;
    if (typeof document === 'undefined' || !('fonts' in document)) return;

    let cancelled = false;
    void (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => {
      if (cancelled) return;
      passRef.current = 0;
      setPages((current) => [...current.map((page) => page.map((column) => [...column]))]);
    });

    return () => {
      cancelled = true;
    };
  }, [active, blockIdsKey, resetKey]);

  return pages;
}

export function useAutoPaginateByColumn(
  blockIds: string[],
  containerRef: React.RefObject<HTMLDivElement>,
  options: {
    reservedFirstPagePx: number;
    reservedOtherPagePx: number;
    pageHeightPx?: number;
    columns?: number;
    active?: boolean;
    extraHeightBefore?: (id: string) => number;
    safetyBufferPx?: number;
  },
) {
  const {
    reservedFirstPagePx,
    reservedOtherPagePx,
    pageHeightPx = A4_PAGE_HEIGHT_PX,
    columns = 2,
    active = true,
    extraHeightBefore,
    safetyBufferPx = 28,
  } = options;

  const [pages, setPages] = useState<string[][][]>(createEmptyColumnPages(1, columns));
  const rafRef = useRef<number | null>(null);
  const measureRef = useRef<() => void>(() => {});
  const blockIdsKey = blockIds.join('|');
  const pagesKeyRef = useRef(pagesKeyFromColumns(createEmptyColumnPages(1, columns)));
  const blockIdsRef = useRef(blockIds);
  const extraHeightBeforeRef = useRef(extraHeightBefore);

  useEffect(() => {
    blockIdsRef.current = blockIds;
  }, [blockIds]);

  useEffect(() => {
    extraHeightBeforeRef.current = extraHeightBefore;
  }, [extraHeightBefore]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const currentBlockIds = blockIdsRef.current;
    if (!container || currentBlockIds.length === 0) {
      const emptyPages = createEmptyColumnPages(1, columns);
      const emptyKey = pagesKeyFromColumns(emptyPages);
      if (pagesKeyRef.current !== emptyKey) {
        pagesKeyRef.current = emptyKey;
        setPages(emptyPages);
      }
      return;
    }

    const nodes = currentBlockIds
      .map((id) => container.querySelector<HTMLElement>(`[data-block-id="${id}"]`))
      .filter((n): n is HTMLElement => n !== null);

    const containerRect = container.getBoundingClientRect();
    const isHidden = containerRect.width === 0 || containerRect.height === 0;

    if (nodes.length !== currentBlockIds.length || isHidden) {
      rafRef.current = requestAnimationFrame(() => measureRef.current());
      return;
    }

    const result = createEmptyColumnPages(1, columns);
    let pageIndex = 0;
    let columnIndex = 0;
    let currentHeight = 0;
    let budget = pageHeightPx - reservedFirstPagePx - safetyBufferPx;

    const ensurePage = (index: number) => {
      while (result.length <= index) {
        result.push(Array.from({ length: columns }, () => [] as string[]));
      }
    };

    for (let i = 0; i < nodes.length; i++) {
      const id = currentBlockIds[i];
      const node = nodes[i];
      const extra = extraHeightBeforeRef.current?.(id) ?? 0;
      const blockHeight = Math.ceil(node.getBoundingClientRect().height) + extra + 8;
      const currentColumn = result[pageIndex][columnIndex];
      const shouldAdvance = currentColumn.length > 0 && currentHeight + blockHeight > budget;

      if (shouldAdvance) {
        if (columnIndex < columns - 1) {
          columnIndex += 1;
        } else {
          pageIndex += 1;
          ensurePage(pageIndex);
          columnIndex = 0;
          budget = pageHeightPx - reservedOtherPagePx - safetyBufferPx;
        }
        currentHeight = 0;
      }

      result[pageIndex][columnIndex].push(id);
      currentHeight += blockHeight;
    }

    const normalized = result.filter((page) => page.some((column) => column.length > 0));
    const nextKey = pagesKeyFromColumns(normalized);
    if (pagesKeyRef.current !== nextKey) {
      pagesKeyRef.current = nextKey;
      setPages(normalized);
    }
  }, [
    columns,
    containerRef,
    pageHeightPx,
    reservedFirstPagePx,
    reservedOtherPagePx,
    safetyBufferPx,
  ]);

  useEffect(() => {
    measureRef.current = measure;
  }, [containerRef, measure]);

  useEffect(() => {
    if (!active) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => measureRef.current());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [measure, active, blockIdsKey]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measureRef.current());
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [active, containerRef, measure]);

  useEffect(() => {
    if (!active) return;
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
  }, [active, blockIdsKey, containerRef]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      requestAnimationFrame(() => {
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

export function useColumnOverflowCorrection(
  measuredPages: string[][][],
  containerRef: React.RefObject<HTMLElement>,
  options: {
    pageSelector: string;
    footerSelector: string;
    columnSelector: string;
    blockAttr: string;
    columns: number;
    maxPasses?: number;
  },
) {
  const {
    pageSelector,
    footerSelector,
    columnSelector,
    blockAttr,
    columns,
    maxPasses = 8,
  } = options;

  const [pages, setPages] = useState<string[][][]>(measuredPages);
  const passRef = useRef(0);
  const measuredKey = measuredPages
    .map((page) => page.map((column) => column.join(',')).join('||'))
    .join('|');
  const pagesKeyRef = useRef(measuredKey);

  useEffect(() => {
    pagesKeyRef.current = measuredKey;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPages(measuredPages);
    passRef.current = 0;
  }, [measuredKey, measuredPages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (passRef.current >= maxPasses) return;

    let cancelled = false;

    const clonePages = (input: string[][][]) =>
      input.map((page) => page.map((column) => [...column]));

    const normalizePages = (input: string[][][]) =>
      input.filter((page) => page.some((column) => column.length > 0));

    const moveOverflow = (
      targetPages: string[][][],
      pageIndex: number,
      columnIndex: number,
      overflowIds: string[],
    ) => {
      if (overflowIds.length === 0) return;

      if (columnIndex < columns - 1) {
        targetPages[pageIndex][columnIndex + 1] = [
          ...overflowIds,
          ...targetPages[pageIndex][columnIndex + 1],
        ];
        return;
      }

      if (!targetPages[pageIndex + 1]) {
        targetPages[pageIndex + 1] = Array.from({ length: columns }, () => [] as string[]);
      }
      targetPages[pageIndex + 1][0] = [...overflowIds, ...targetPages[pageIndex + 1][0]];
    };

    const raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;

        const pageNodes = Array.from(container.querySelectorAll<HTMLElement>(pageSelector));
        if (pageNodes.length !== pages.length) return;

        const next = clonePages(pages);
        let changed = false;

        for (let i = 0; i < pageNodes.length; i++) {
          const pageNode = pageNodes[i];
          const footer = pageNode.querySelector<HTMLElement>(footerSelector);
          if (!footer) continue;

          const footerTop = footer.getBoundingClientRect().top;
          const dangerLine = footerTop - FOOTER_SAFETY_MARGIN_PX;
          const columnNodes = Array.from(pageNode.querySelectorAll<HTMLElement>(columnSelector));

          for (let ci = 0; ci < columnNodes.length; ci++) {
            const columnNode = columnNodes[ci];
            const idsInColumn = next[i]?.[ci] ?? [];
            let cutIndex = -1;

            for (let bi = 0; bi < idsInColumn.length; bi++) {
              const id = idsInColumn[bi];
              const node = columnNode.querySelector<HTMLElement>(`[${blockAttr}="${id}"]`);
              if (!node) continue;
              const rect = node.getBoundingClientRect();
              if (rect.bottom > dangerLine) {
                cutIndex = bi;
                break;
              }
            }

            if (cutIndex !== -1) {
              const overflowIds = idsInColumn.splice(cutIndex);
              moveOverflow(next, i, ci, overflowIds);
              changed = true;
              break;
            }
          }
        }

        if (changed) {
          passRef.current += 1;
          const normalized = normalizePages(next);
          const nextKey = pagesKeyFromColumns(normalized);
          if (pagesKeyRef.current !== nextKey) {
            pagesKeyRef.current = nextKey;
            setPages(normalized);
          }
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
    };
  }, [
    blockAttr,
    columnSelector,
    columns,
    containerRef,
    footerSelector,
    maxPasses,
    pageSelector,
    pages,
  ]);

  return pages;
}
