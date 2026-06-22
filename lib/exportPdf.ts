// lib/exportPdf.ts
// Exports a DOM node (the live A4 preview) to a downloadable multi-page PDF
// using html2canvas + jsPDF — same client-side pattern used elsewhere in
// this project (PRD generator). Devanagari text relies on Noto Sans
// Devanagari being loaded (see lib/fonts.ts) before this runs.

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PX_PER_MM = 96 / 25.4; // standard CSS px-per-mm at 96dpi

export interface ExportPdfOptions {
    /** Filename without extension */
    fileName?: string;
    /** Scale factor for canvas rasterisation — higher = sharper but slower/larger file */
    scale?: number;
    /** Called with progress 0-1 while pages are being rendered */
    onProgress?: (progress: number) => void;
    /** CSS class identifying each A4 page node within rootEl. Defaults to "pdf-page". */
    pageClassName?: string;
}

/**
 * Renders each page-class child of `rootEl` onto its own A4 PDF page.
 * The preview component is expected to lay out content as one or more
 * elements with the page class, each sized to A4 (210mm x 297mm) at 96 CSS
 * dpi, i.e. 794 x 1123 px. This avoids slicing a single huge canvas (which
 * breaks text/rows mid-line) — pagination is decided in the layout, not the
 * export step.
 */
export async function exportPreviewToPdf(
    rootEl: HTMLElement,
    options: ExportPdfOptions = {},
) {
    const {
        fileName = "question-paper",
        scale = 2,
        onProgress,
        pageClassName = "pdf-page",
    } = options;

    const pages = Array.from(
        rootEl.querySelectorAll<HTMLElement>(`.${pageClassName}`),
    );
    const nodesToRender = pages.length > 0 ? pages : [rootEl];

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    for (let i = 0; i < nodesToRender.length; i++) {
        const node = nodesToRender[i];

        // Wait for any web fonts (incl. Devanagari) to be ready before rasterising.
        if (typeof document !== "undefined" && "fonts" in document) {
            try {
                await (document as Document & { fonts: FontFaceSet }).fonts
                    .ready;
            } catch {
                /* noop */
            }
        }

        const canvas = await html2canvas(node, {
            scale,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            windowWidth: node.scrollWidth,
            windowHeight: node.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) pdf.addPage();

        // Fit the rasterised page exactly to A4, preserving aspect ratio against width.
        const imgWidthMm = A4_WIDTH_MM;
        const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

        if (imgHeightMm <= A4_HEIGHT_MM) {
            pdf.addImage(imgData, "JPEG", 0, 0, imgWidthMm, imgHeightMm);
        } else {
            // Content slightly taller than A4 (e.g. last page overflow) — scale to fit height instead.
            const scaledWidth = (canvas.width * A4_HEIGHT_MM) / canvas.height;
            const xOffset = (A4_WIDTH_MM - scaledWidth) / 2;
            pdf.addImage(
                imgData,
                "JPEG",
                xOffset,
                0,
                scaledWidth,
                A4_HEIGHT_MM,
            );
        }

        onProgress?.((i + 1) / nodesToRender.length);
    }

    pdf.save(`${fileName}.pdf`);
}

/** Rough estimate of px-per-A4-page height, useful for client-side pagination logic. */
export const A4_PAGE_HEIGHT_PX = Math.round(A4_HEIGHT_MM * PX_PER_MM); // ≈ 1123
export const A4_PAGE_WIDTH_PX = Math.round(A4_WIDTH_MM * PX_PER_MM); // ≈ 794
