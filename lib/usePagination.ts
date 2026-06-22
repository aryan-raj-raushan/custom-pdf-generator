// lib/usePagination.ts
// Measures a hidden "measurement" render of all question blocks and buckets
// them into A4 pages so the live preview + PDF export always paginate
// correctly regardless of how much content each question has.
"use client";

import { useEffect, useRef, useState } from "react";
import { A4_PAGE_HEIGHT_PX } from "./exportPdf";

// Usable content height per page after header/footer/margins reserved by the page chrome.
// Page chrome (header on pg.1, footer, margins) is subtracted by the caller via reservedFirstPage/reservedRest.

export interface PaginationBlock {
    id: string;
    height: number;
}

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
                // Not all blocks mounted yet — try again next tick.
                return;
            }

            const result: string[][] = [[]];
            let currentHeight = 0;
            let pageIndex = 0;
            let budget = pageHeightPx - reservedFirstPagePx;

            nodes.forEach((node, i) => {
                const h = node.getBoundingClientRect().height + 8; // include gap
                if (
                    currentHeight + h > budget &&
                    result[pageIndex].length > 0
                ) {
                    pageIndex += 1;
                    result.push([]);
                    currentHeight = 0;
                    budget = pageHeightPx - reservedOtherPagePx;
                }
                result[pageIndex].push(blockIds[i]);
                currentHeight += h;
            });

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
