'use client';

import React from 'react';
import type { TextRange } from './usePagination';
import { MathText } from './renderMath';

// Marks the single splittable text node inside a fragment, so the
// pagination hook's getSplitTextNode can find it and cut a paragraph
// mid-way (book-style reflow) instead of moving the whole fragment.
export const SPLITTABLE_TEXT_ATTR = 'data-splittable-text';

/** Strips a `::tail:N` suffix, if any, back to the original fragment id. */
export function rootFragmentId(id: string): string {
  const idx = id.indexOf('::tail:');
  return idx === -1 ? id : id.slice(0, idx);
}

export function sliceForRange(text: string, range?: TextRange): string {
  if (!range) return text;
  return text.slice(range.from, range.to ?? text.length);
}

/**
 * Resolves which language variant(s) of a field should actually render.
 * `showEn`/`showHi` reflect the paper's configured display language, but
 * individual questions/options are often only partially translated (e.g.
 * a bulk import with English filled in but no Hindi yet). Rendering
 * strictly by the configured language in that case shows nothing at all —
 * this falls back to whichever language actually has content instead of
 * leaving a blank line.
 */
export function resolveDisplayText(
  showEn: boolean,
  showHi: boolean,
  enSource: string | undefined,
  hiSource: string | undefined,
): { enText: string | undefined; hiText: string | undefined } {
  const preferredEn = showEn ? enSource : undefined;
  const preferredHi = showHi ? hiSource : undefined;
  if (preferredEn || preferredHi) return { enText: preferredEn, hiText: preferredHi };
  return { enText: enSource, hiText: hiSource };
}

/**
 * Renders a text field that may show an English variant, a Hindi variant,
 * or both (bilingual). When exactly one variant is shown and the content
 * has no math, that variant is wrapped as the single splittable text node
 * for this fragment (`data-splittable-text`) — the pagination hook can
 * then cut it mid-paragraph instead of moving the whole fragment.
 * Bilingual fragments (both shown) and math fragments are never split —
 * there's no single, unambiguous text node to cut in those cases — so
 * they render in full and fall back to whole-fragment movement.
 *
 * IMPORTANT: `textRange` must be applied whenever it exists at all, not
 * only when it starts partway through the text (a "continuation" piece).
 * The ORIGINAL ("head") fragment keeps `from === 0` once split, but its
 * `to` is now less than the full length — if the head weren't sliced too,
 * its DOM node would keep rendering the full untruncated paragraph forever
 * while the pagination hook believed it had been shortened, causing it to
 * re-split on every pass and cascade near-duplicate tail fragments forward
 * indefinitely (growing blank space, page count exploding).
 */
export function renderMonoOrBilingualText(
  enText: string | undefined,
  hiText: string | undefined,
  hasMath: boolean,
  textRange: TextRange | undefined,
  wrapEn: (node: React.ReactNode) => React.ReactNode,
  wrapHi: (node: React.ReactNode) => React.ReactNode,
): React.ReactNode {
  const bilingual = !!enText && !!hiText;

  if (textRange) {
    const isHi = !enText && !!hiText;
    const soleText = enText ?? hiText ?? '';
    const node = <span data-splittable-text="true">{sliceForRange(soleText, textRange)}</span>;
    return isHi ? wrapHi(node) : wrapEn(node);
  }

  const renderSide = (text: string): React.ReactNode => {
    if (hasMath) return <MathText text={text} />;
    if (bilingual) return text;
    return <span data-splittable-text="true">{text}</span>;
  };

  return (
    <>
      {enText && wrapEn(renderSide(enText))}
      {hiText && wrapHi(renderSide(hiText))}
    </>
  );
}
