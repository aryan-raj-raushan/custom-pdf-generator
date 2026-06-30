// lib/usePagination.ts
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
  },
) {
  const {
    reservedFirstPagePx,
    reservedOtherPagePx,
    pageHeightPx = A4_PAGE_HEIGHT_PX,
    columns = 2,
    fontSize = 11,
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
      // Call through the ref, not the `measure` binding itself — the ref
      // always points at the *current* render's closure (with up-to-date
      // blockIds/columns/etc.), and sidesteps the "used before declared"
      // self-reference inside this same useCallback body.
      rafRef.current = requestAnimationFrame(() => measureRef.current());
      return;
    }

    const rowHeights: { ids: string[]; height: number }[] = [];
    for (let i = 0; i < nodes.length; i += columns) {
      let rowH = 0;
      const ids: string[] = [];
      for (let c = 0; c < columns; c++) {
        const node = nodes[i + c];
        if (!node) break;
        const h = node.getBoundingClientRect().height;
        if (h > rowH) rowH = h;
        ids.push(blockIds[i + c]);
      }
      rowHeights.push({ ids, height: rowH + 8 });
    }

    const result: string[][] = [[]];
    let currentHeight = 0;
    let pageIndex = 0;
    let budget = pageHeightPx - reservedFirstPagePx;

    for (const row of rowHeights) {
      if (currentHeight + row.height > budget && result[pageIndex].length > 0) {
        pageIndex += 1;
        result.push([]);
        currentHeight = 0;
        budget = pageHeightPx - reservedOtherPagePx;
      }
      for (const id of row.ids) result[pageIndex].push(id);
      currentHeight += row.height;
    }

    setPages(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockIdsKey, columns, fontSize, pageHeightPx, reservedFirstPagePx, reservedOtherPagePx]);

  // Keep the ref pointed at the latest `measure` after every render.
  useEffect(() => {
    measureRef.current = measure;
  }, [measure]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => measureRef.current());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [measure]);

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

  return pages;
}
