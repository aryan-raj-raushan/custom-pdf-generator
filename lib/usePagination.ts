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
    },
) {
    const {
        reservedFirstPagePx,
        reservedOtherPagePx,
        pageHeightPx = A4_PAGE_HEIGHT_PX,
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
                    // trigger re-measure by bumping state minimally
                    setPages((prev) => [...prev]);
                });
                return;
            }

            // Questions render in a 2-column grid. Measure pairs: only the taller
            // sibling in each column-pair consumes vertical space.
            const rowHeights: { ids: string[]; height: number }[] = [];
            for (let i = 0; i < nodes.length; i += 2) {
                const leftH = nodes[i].getBoundingClientRect().height;
                const rightH =
                    nodes[i + 1]?.getBoundingClientRect().height ?? 0;
                const rowH = Math.max(leftH, rightH) + 8; // +8 for gap-y
                const ids = [blockIds[i]];
                if (blockIds[i + 1]) ids.push(blockIds[i + 1]);
                rowHeights.push({ ids, height: rowH });
            }

            // Now paginate by row (not by individual question)
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
    ]);

    return pages;
}
