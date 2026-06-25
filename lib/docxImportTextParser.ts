// lib/docxImportExtractor.ts
//
// Converts an uploaded .docx ArrayBuffer into the same "pasted text" shape
// that bulkImportParser.ts already knows how to parse — a plain string with
// one logical line per paragraph — except images embedded in the document
// are preserved instead of being lost (as they are with manual copy-paste
// into a <textarea>).
//
// Strategy:
//   1. mammoth.js converts the docx to HTML, paragraph-by-paragraph, and
//      (via a custom image converter) inlines every embedded image as a
//      base64 data URL <img src="data:...">.
//   2. We walk that HTML with the browser's native DOMParser and rebuild a
//      line-oriented text stream: each <p> (or table cell, list item, etc.)
//      becomes one line. Wherever an <img> appears within a block, we splice
//      in a sentinel token "[[IMG:n]]" at that position and record n -> the
//      image's data URL in a side map.
//   3. bulkImportParser's line classifiers (QUESTION_START_RE, OPTION_RE,
//      etc.) run unchanged against this text. A small extension in that
//      file resolves "[[IMG:n]]" tokens to imageDataUrl on the right
//      Question/QuestionOption instead of just flagging "looks like an
//      image was meant to go here".
//
// This file has no knowledge of question/option semantics — it only knows
// how to turn a docx into (text-with-sentinels, sentinel -> data URL map).

import mammoth from 'mammoth';

export const IMAGE_SENTINEL_RE = /\[\[IMG:(\d+)\]\]/g;

export interface DocxExtractionResult {
  /** Pseudo pasted-text, one paragraph/block per line, "[[IMG:n]]" tokens mark image positions */
  text: string;
  /** Sentinel index -> base64 data URL */
  images: Map<number, string>;
  /** Non-fatal issues mammoth reported while converting (missing styles etc.) — surfaced for debugging, not blocking */
  warnings: string[];
}

const BLOCK_TAGS = new Set(['P', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

/**
 * Reads an uploaded File (expected to be .docx) and produces pseudo paste
 * text + an image sentinel map. Throws if the file can't be parsed as a
 * docx at all (corrupt zip, wrong format) — callers should catch this and
 * surface a clear "couldn't read this file" message rather than silently
 * importing nothing.
 */
export async function extractDocxForImport(file: File): Promise<DocxExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();

  const images = new Map<number, string>();
  let nextImageIndex = 0;

  // Custom image converter, built on the same pattern as mammoth's own
  // `mammoth.images.dataUri` helper: read each embedded image as base64
  // and hand back a data URL. We additionally stash it in `images` keyed
  // by an incrementing index, and put that index in a data-attribute so
  // we can find *which* <img> is which after HTML parsing (src alone
  // isn't a safe key — identical images would collide).
  const convertImage = mammoth.images.imgElement((element) => {
    return element.readAsBase64String().then((base64: string) => {
      const index = nextImageIndex++;
      const dataUrl = `data:${element.contentType};base64,${base64}`;
      images.set(index, dataUrl);
      return {
        src: dataUrl,
        'data-img-sentinel': String(index),
      };
    });
  });

  const result = await mammoth.convertToHtml({ arrayBuffer }, { convertImage });

  const warnings = (result.messages ?? [])
    .filter((m: { type: string }) => m.type === 'warning' || m.type === 'error')
    .map((m: { message: string }) => m.message);

  const text = htmlToSentinelLines(result.value);

  return { text, images, warnings };
}

/**
 * Walks mammoth's output HTML and rebuilds it as line-oriented text, with
 * "[[IMG:n]]" tokens standing in for <img data-img-sentinel="n">.
 *
 * We deliberately reconstruct lines from block-level elements (<p>, <li>,
 * table cells, headings) rather than just stripping all tags and using
 * textContent on the whole document — that would collapse every paragraph
 * onto one line and break the parser's line-by-line question/option
 * detection, which depends on paragraph boundaries matching pasted-text
 * line breaks.
 */
function htmlToSentinelLines(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];

  function blockToLine(el: Element): string {
    let out = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent ?? '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const child = node as Element;
        if (child.tagName === 'IMG') {
          const sentinelIndex = child.getAttribute('data-img-sentinel');
          if (sentinelIndex !== null) {
            out += `[[IMG:${sentinelIndex}]]`;
          }
        } else if (child.tagName === 'BR') {
          // A manual line break mid-paragraph (e.g. wrapped option
          // text) — keep it as a space rather than a hard newline,
          // since splitting here would fragment one logical
          // question/option line into pieces the regex parser
          // would treat as unrelated content.
          out += ' ' + blockToLine(child);
        } else {
          out += blockToLine(child);
        }
      }
    });
    return out;
  }

  // Walk every block-level element in document order. Nested blocks (e.g.
  // a <p> inside a <td>) are visited once at their own level only, since
  // blockToLine already recurses into non-block children — to avoid
  // double-counting we only treat top-level body children plus list/table
  // descendants explicitly.
  const body = doc.body;

  function walk(node: Node) {
    node.childNodes.forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;
      if (BLOCK_TAGS.has(el.tagName)) {
        const line = blockToLine(el).replace(/\s+/g, ' ').trim();
        if (line.length > 0) lines.push(line);
        // Tables/lists can nest further blocks (e.g. a list inside a
        // table cell) — recurse to catch those too.
        if (el.tagName === 'TD' || el.tagName === 'TH') {
          walk(el);
        }
      } else {
        walk(el);
      }
    });
  }

  walk(body);

  return lines.join('\n');
}
