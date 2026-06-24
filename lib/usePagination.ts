// lib/usePagination.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { A4_PAGE_HEIGHT_PX } from "./exportPdf";

export function useAutoPaginate(
    blockIds: string[],
    containerRef: React.RefObject<HTMLDivElement>,
    options: {
        reservedFirstPagePx: number;
        reservedOtherPagePx: number;
        pageHeightPx?: number;
        columns?: number; // 1 | 2 | 3 — default 2
        fontSize?: number; // 10 - 16 -- default 11
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

    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            const container = containerRef.current;
            if (!container || blockIds.length === 0) {
                setPages([[]]);
                return;
            }

            const nodes = blockIds
                .map((id) =>
                    container.querySelector<HTMLElement>(
                        `[data-block-id="${id}"]`,
                    ),
                )
                .filter((n): n is HTMLElement => n !== null);

            if (nodes.length !== blockIds.length) {
                // Not all blocks mounted yet — retry next frame
                rafRef.current = requestAnimationFrame(() => {
                    setPages((prev) => [...prev]);
                });
                return;
            }

            // Group nodes into rows of `columns` width.
            // For each row, the tallest cell defines the row height.
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
                rowHeights.push({ ids, height: rowH + 8 }); // +8 for gap-y
            }

            // Paginate by row
            const result: string[][] = [[]];
            let currentHeight = 0;
            let pageIndex = 0;
            let budget = pageHeightPx - reservedFirstPagePx;

            for (const row of rowHeights) {
                if (
                    currentHeight + row.height > budget &&
                    result[pageIndex].length > 0
                ) {
                    pageIndex += 1;
                    result.push([]);
                    currentHeight = 0;
                    budget = pageHeightPx - reservedOtherPagePx;
                }
                for (const id of row.ids) result[pageIndex].push(id);
                currentHeight += row.height;
            }

            setPages(result);
        });

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        blockIds.join("|"),
        reservedFirstPagePx,
        reservedOtherPagePx,
        pageHeightPx,
        columns,
        fontSize,
    ]);

    return pages;
}
