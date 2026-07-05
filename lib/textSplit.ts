'use client';

/**
 * Returns every valid grapheme-cluster boundary offset in `text`, including
 * 0 and text.length. Devanagari (and other Indic scripts) render a base
 * consonant plus its dependent vowel signs/virama as a single visual unit —
 * cutting a plain JS string between them (raw UTF-16 code units) produces a
 * technically non-empty but visually broken or near-invisible fragment
 * (an orphaned matra with no base, or a base missing its vowel sign). Using
 * Intl.Segmenter ensures every candidate cut point is a real character
 * boundary, never mid-cluster.
 */
function getGraphemeBoundaries(text: string): number[] {
  const SegmenterCtor = (
    Intl as unknown as { Segmenter?: new (...args: unknown[]) => Intl.Segmenter }
  ).Segmenter;
  if (typeof SegmenterCtor === 'function') {
    const segmenter = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    const boundaries: number[] = [0];
    for (const seg of segmenter.segment(text)) {
      boundaries.push(seg.index + seg.segment.length);
    }
    return boundaries;
  }
  // Fallback for browsers without Intl.Segmenter: every code unit is its
  // own boundary — functionally fine for plain Latin text, but may
  // occasionally split a combining mark on very old browsers.
  const boundaries: number[] = [];
  for (let i = 0; i <= text.length; i++) boundaries.push(i);
  return boundaries;
}

/**
 * Finds the largest grapheme-safe offset `k` in `textNode` such that the
 * rendered content from the start of the node up to `k` has its bottom
 * edge at or above `dangerLine` (a viewport-space y coordinate, same
 * space as getBoundingClientRect()).
 *
 * Uses the DOM Range API against the LIVE text node — this reads real,
 * already-rendered layout (actual width/font/line-height/whitespace
 * handling), never a synthetic estimate, so the cut point always matches
 * what the browser actually wrapped.
 *
 * Returns null when either the whole node already fits (no split needed)
 * or not even one grapheme fits (nothing can be kept on this side of the
 * boundary — caller should fall back to moving the whole block).
 */
export function findTextSplitOffset(textNode: Text, dangerLine: number): number | null {
  const text = textNode.textContent ?? '';
  const len = text.length;
  if (len === 0) return null;

  const boundaries = getGraphemeBoundaries(text);
  if (boundaries.length <= 1) return null;

  const range = document.createRange();
  range.setStart(textNode, 0);

  range.setEnd(textNode, len);
  if (range.getBoundingClientRect().bottom <= dangerLine) return null; // fits whole — no split needed

  range.setEnd(textNode, boundaries[1]);
  if (range.getBoundingClientRect().bottom > dangerLine) return null; // not even one grapheme fits

  // Binary search over boundary INDICES (not raw offsets) — every
  // candidate is therefore guaranteed to be a real character boundary.
  let lo = 1;
  let hi = boundaries.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    range.setEnd(textNode, boundaries[mid]);
    if (range.getBoundingClientRect().bottom <= dangerLine) lo = mid;
    else hi = mid - 1;
  }

  // Prefer snapping back to a whitespace boundary so words aren't cut
  // mid-way — but only walking backward over grapheme boundaries, and
  // never past the first one, so a single long unbreakable run of text
  // still keeps as much as fits rather than collapsing to nothing.
  let cutIdx = lo;
  while (cutIdx > 1 && !/\s/.test(text[boundaries[cutIdx] - 1] ?? '')) {
    cutIdx -= 1;
  }
  const cut = boundaries[cutIdx > 1 ? cutIdx : lo];

  return cut > 0 && cut < len ? cut : null;
}
