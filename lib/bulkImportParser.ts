// lib/bulkImportParser.ts
//
// Parses pasted question-paper text (the format commonly seen in Indian
// competitive-exam question banks: numbered questions, lettered options,
// optional "Answer:" and "Solution:" blocks) into Question[] objects.
//
// Designed to be forgiving — real pasted text is messy. Anything the parser
// can't resolve confidently is never silently dropped or guessed past;
// instead the question is still created and tagged with an ImportFlag so
// the review screen can surface it and the user can jump straight to it.
//
// Two input shapes feed into this file:
//   - Manually pasted text from a <textarea> (images can never be present —
//     a plain-text paste can't carry them).
//   - Text extracted from an uploaded .docx via docxImportExtractor.ts,
//     where embedded images ARE present, represented inline as
//     "[[IMG:n]]" sentinel tokens (see IMAGE_SENTINEL_RE) alongside a
//     sentinel -> base64 data URL map. This lets the exact same line
//     classifiers below handle both cases — the only docx-specific logic is
//     resolving sentinels to imageDataUrl instead of falling back to the
//     image_question/image_option text-cue flags.

import { ImportFlagType, Subject } from '@/components/layout/CustomPdfCreator';
import { Question, QuestionOption, ImportFlag } from '@/types/exam';

export interface BulkImportResult {
  questions: Question[];
  /** Questions with 1+ flags, in the same order as `questions`, for quick review-screen iteration */
  flaggedQuestions: Question[];
  totalParsed: number;
  totalClean: number;
  /** Raw lines that couldn't be attributed to any question (e.g. stray text before Q1) */
  unparsedPreamble: string[];
}

// ---- Line classifiers -------------------------------------------------

// Matches "1.", "1)", "Q1.", "Q.1", "1 -", and tolerates stray space before
// the punctuation ("7 ." → still a valid question start) since pasted text
// from PDFs/scans often has irregular spacing. Captures the number and the
// remainder on the same line (the format this app expects: "1.राज्य की...").
const QUESTION_START_RE = /^\s*(?:Q\.?\s*)?(\d{1,3})\s*[.)\-:]\s*(.*)$/u;

// Option lines: "A.", "A)", "(A)", "a.", also tolerate a stray space before the
// letter ("  A. text") since pasted text often carries leading whitespace.
const OPTION_RE = /^\s*\(?([A-Da-d])\)?[.)\-:]\s*(.*)$/u;

// "Answer: D" / "Answer : (D)" / "उत्तर: D" / "Ans- D". Captures ANY single
// letter (not just A-D) so an out-of-range key (e.g. "Answer: E" on a
// 4-option question) is still recognised and reported as a clear mismatch
// flag, rather than silently failing to match and being misreported as a
// missing answer entirely.
const ANSWER_RE = /^\s*(?:Answer|Ans|उत्तर)\s*[:\-]\s*\(?([A-Za-z])\)?\.?\s*$/u;

// "Solution: ..." / "Sol: ..." / "व्याख्या:" / "हल:" — captures the rest of the line as the first solution line.
const SOLUTION_START_RE = /^\s*(?:Solution|Sol|व्याख्या|हल|स्पष्टीकरण)\s*[:\-]\s*(.*)$/iu;

// "Assertion (A): ..." / "अभिकथन A: ..." / "अभिकथन: ..."
// "Assertion (A): ..." / "अभिकथन A: ..." / "अभिकथन: ..." / "कथन A: ..."
const ASSERTION_RE = /^\s*(?:Assertion\s*\(?A\)?|अभिकथन\s*A?|कथन\s*A)\s*[:\-]\s*(.*)$/iu;

// "Reason (R): ..." / "कारण R: ..." / "कारण: ..."
const REASON_RE = /^\s*(?:Reason\s*\(?R\)?|कारण\s*R?)\s*[:\-]\s*(.*)$/iu;

// The "choose from the codes below" instruction line that follows Assertion/Reason
// — once we see this, subsequent text belongs back to the question stem, not the reason.
const CODE_HINT_RE =
  /(कूट|कूटों|codes?\s+given\s+below|select\s+the\s+correct\s+answer|सही उत्तर चुनिए|विकल्प\s+का\s+चयन\s+करें|सत्य\s+विकल्प|correct\s+option)/iu;

// "सूची-I" / "सूची -II" / "List-I" / "List II" — the column headers of a
// match-the-following question. Seeing one while we're sitting in "options"
// mode means the a/b/c/d rows collected so far were List-I's own labels
// (lettered the same way as real options), not the answer choices — same
// situation CODE_HINT_RE handles for the "कूट:" instruction line.
const LIST_HEADER_RE = /^\s*(?:सूची|list)\s*-?\s*(?:i{1,3}|1|2)\b/iu;

// Same header, but capturing the header token itself plus whatever follows
// it on the line, to tell a bare header line ("सूची-II") apart from one
// where the whole list got flattened onto it ("सूची-II 1 पंचविश2 गोपथ...").
const LIST_HEADER_CAPTURE_RE = /^\s*((?:सूची|list)\s*-?\s*(?:i{1,3}|1|2))\s*[:\-]?\s*(\S.*)?$/iu;

// "Consider the following statements" cues — the lines between one of these
// and the closing "which of the statements above is/are correct" line are
// numbered claims that the options ("only 1 and 2", "1, 2 and 3"...) refer
// to, but source text frequently omits the "1./2./3." markers entirely.
const STATEMENTS_CUE_RE = /(निम्नलिखित\s+कथनों|following\s+statements)/iu;
const STATEMENTS_CLOSING_CUE_RE =
  /(उपर्युक्त|उपरोक्त|above\s+statements?|निम्नलिखित\s+में\s+से\s+कौन)/iu;
const LEADING_MARKER_RE = /^\s*(\d{1,2}|i{1,3}|iv)[.)]?\s+\S/iu;

// A further option marker embedded later in the same physical line as an
// already-matched option — e.g. "(a) केवल 1 और 2 B. केवल 2 और 3 C. केवल 1
// और 3 D. 1, 2 और 3" all on one line. This happens when a source PDF laid
// options out in a grid and text extraction flattened the row onto a single
// line. Matched case-insensitively and only accepted where it continues the
// A→B→C→D sequence, so a capitalised word inside an option's own text can't
// false-positive as a new option.
const INLINE_OPTION_MARKER_RE = /\s\(?([A-Da-d])\)?[.)]\s+/g;

// Heuristic cues that a question or option is image-based rather than text-based.
const IMAGE_CUE_RE =
  /(see\s+the\s+figure|given\s+figure|following\s+figure|diagram\s+below|image\s+below|refer\s+to\s+the\s+image|चित्र\s+में|दिए\s+गए\s+चित्र|निम्नलिखित\s+चित्र|आकृति\s+में|नीचे\s+दिए\s+गए\s+चित्र)/iu;

// An option that's empty, just punctuation, or just "image"/"चित्र" is almost
// certainly meant to hold an image the user hasn't pasted (paste can't carry images).
const EMPTY_OR_IMAGE_OPTION_RE = /^\s*(image|img|चित्र|figure|आकृति)?\s*[-—]?\s*$/iu;

// Marks the position of an embedded image extracted from a .docx (see
// docxImportExtractor.ts). Never present in manually pasted text. A line
// can contain more than one — e.g. a question stem with an inline figure
// followed by an option whose entire content is a diagram.
const IMAGE_SENTINEL_RE = /\[\[IMG:(\d+)\]\]/g;

// A bare numbered or roman-numeral sub-statement marker at the start of a
// continuation line — "1 सर्वोच्च..." / "i अपरिमेय..." / "iii जिसका..." —
// with no punctuation after the marker. We don't touch these during
// parsing (they're not question/option/answer lines, just stem
// continuation), but for display we normalize them to "1. ..." / "i. ..."
// so they read as a proper list instead of running into the marker.
const BARE_NUMBER_MARKER_RE = /^(\d{1,2})\s+(\S.*)$/;
const BARE_ROMAN_MARKER_RE = /^(i{1,3}|iv)\s+(\S.*)$/;

const SUB_STATEMENT_MARKER_INLINE_RE = /(^|[।.:])\s*(\d{1,2}|i{1,3}|iv)\s+(?=\S)/gu;

function punctuateSubStatementMarker(line: string): string {
  return line.replace(SUB_STATEMENT_MARKER_INLINE_RE, (_match, prefix, marker) => {
    // No newline before the very first marker if it's at the start of the
    // string (nothing to break away from yet).
    const lineBreak = prefix === '' ? '' : '\n';
    return `${prefix}${lineBreak}${marker}. `;
  });
}

function normalizeListHeaderToken(token: string): string {
  return token.replace(/\s+/g, '').replace(/-/g, '').toLowerCase();
}

// Some source documents carry each List-I/List-II column twice: once
// flattened onto the header line ("सूची-II 1 पंचविश2 गोपथ3 ..."), then
// again properly laid out one item per line under a bare repeat of the same
// header ("सूची-II" / "1. पंचविश" / "2. गोपथ" / ...). Rather than trying to
// parse the flattened copy, drop it outright whenever the same header
// reappears bare further down — the well-laid-out copy is strictly better
// and keeping both just doubles the list in the output.
function dedupeCrammedListHeaderLines(lines: string[]): string[] {
  const bareIndexes = new Set<number>();
  const bareTokens: string[] = [];
  lines.forEach((line, i) => {
    const m = LIST_HEADER_CAPTURE_RE.exec(line.trim());
    LIST_HEADER_CAPTURE_RE.lastIndex = 0;
    if (m && !m[2]) {
      bareIndexes.add(i);
      bareTokens[i] = normalizeListHeaderToken(m[1]);
    }
  });

  return lines.filter((line, i) => {
    if (bareIndexes.has(i)) return true;
    const m = LIST_HEADER_CAPTURE_RE.exec(line.trim());
    LIST_HEADER_CAPTURE_RE.lastIndex = 0;
    if (!m || !m[2]) return true; // not a crammed header line
    const token = normalizeListHeaderToken(m[1]);
    const hasLaterBareRepeat = [...bareIndexes].some((j) => j > i && bareTokens[j] === token);
    return !hasLaterBareRepeat;
  });
}

// Numbers the unmarked "statement" lines that follow a "consider the
// following statements" cue, up to the closing "which of the above is/are
// correct" line — source text conventionally lists these as 1/2/3 (matching
// option text like "only 1 and 2"), but frequently omits the markers.
// Lines that already carry a marker are left untouched, but still advance
// the counter so a partially-numbered set doesn't end up renumbered.
function autoNumberStatementLines(lines: string[]): string[] {
  let inStatements = false;
  let counter = 0;

  return lines.map((line) => {
    const trimmed = line.trim();

    if (!inStatements) {
      if (STATEMENTS_CUE_RE.test(trimmed)) {
        inStatements = true;
        counter = 0;
      }
      return line;
    }

    if (trimmed === '' || STATEMENTS_CLOSING_CUE_RE.test(trimmed)) {
      inStatements = false;
      return line;
    }

    counter += 1;
    if (LEADING_MARKER_RE.test(trimmed)) return line;
    return `${counter}. ${trimmed}`;
  });
}

// Pushes previously-collected "options" back into the stem as plain
// "a. text" lines, for when they turn out to have been a List-I column
// rather than real answer choices. Shared by the isRestart, CODE_HINT_RE,
// and LIST_HEADER_RE cases below.
function revertOptionLinesToStem(current: RawQuestionBlock) {
  for (const o of current.optionLines) {
    current.questionLines.push(`${o.letter.toLowerCase()}. ${o.text}`);
  }
  current.optionLines = [];
}

// Splits a single line that may contain more than one option marker (see
// INLINE_OPTION_MARKER_RE) into its individual options. `firstLetter` is the
// letter already matched at the start of the line; `text` is everything
// after it. Returns a single-item array unchanged when no further in-order
// marker is found, so normal one-option-per-line input is untouched.
function splitInlineOptions(
  firstLetter: string,
  text: string,
): { letter: string; text: string }[] {
  let expected = String.fromCharCode(firstLetter.charCodeAt(0) + 1);
  const cuts: { index: number; letter: string; markerLength: number }[] = [];

  INLINE_OPTION_MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_OPTION_MARKER_RE.exec(text))) {
    const letter = match[1].toUpperCase();
    if (letter === expected) {
      cuts.push({ index: match.index, letter, markerLength: match[0].length });
      expected = String.fromCharCode(expected.charCodeAt(0) + 1);
    }
  }

  if (cuts.length === 0) return [{ letter: firstLetter, text: text.trim() }];

  const result = [{ letter: firstLetter, text: text.slice(0, cuts[0].index).trim() }];
  cuts.forEach((cut, i) => {
    const start = cut.index + cut.markerLength;
    const end = i + 1 < cuts.length ? cuts[i + 1].index : text.length;
    result.push({ letter: cut.letter, text: text.slice(start, end).trim() });
  });
  return result;
}

interface RawQuestionBlock {
  sourceIndex: number;
  questionLines: string[];
  assertionLines: string[];
  reasonLines: string[];
  isAssertionReason: boolean;
  optionLines: { letter: string; text: string }[];
  answerLetter?: string;
  solutionLines: string[];
  raw: string;
}

// ---- Stage 1: split raw text into per-question blocks ------------------

function splitIntoBlocks(text: string): {
  blocks: RawQuestionBlock[];
  preamble: string[];
} {
  const lines = dedupeCrammedListHeaderLines(text.replace(/\r\n/g, '\n').split('\n'));

  const blocks: RawQuestionBlock[] = [];
  const preamble: string[] = [];

  let current: RawQuestionBlock | null = null;
  // Which section of the current question we're accumulating into.
  let mode: 'question' | 'options' | 'solution' = 'question';
  let qSubMode: 'stem' | 'assertion' | 'reason' = 'stem';
  let lastSourceIndex = 0; // tracks the most recently started question number, to validate sequencing

  function pushCurrent() {
    if (current) blocks.push(current);
    current = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') continue; // blank lines are pure separators, skip

    const qMatch = QUESTION_START_RE.exec(line);
    const candidateNumber = qMatch ? parseInt(qMatch[1], 10) : null;
    const hasTextOnSameLine = qMatch ? qMatch[2].trim().length > 0 : false;

    // A line is treated as a NEW question start if it matches the numbering
    // pattern with text on the same line, AND one of:
    //  (a) we're not yet inside an options block (mode is "question" or
    //      "solution") — the common, low-ambiguity case, OR
    //  (b) we ARE inside an options block, but the number is "sequential
    //      enough" (greater than the last question's number, and not a
    //      small number like 1-4 that's far more likely to be a
    //      sub-statement or a coincidental option-text digit). This lets a
    //      question that's missing its Answer:/Solution: lines still end
    //      correctly when the next real question begins, instead of
    //      silently swallowing everything after it.
    const isSequential = candidateNumber !== null && candidateNumber === lastSourceIndex + 1;
    const looksLikeNewQuestion =
      qMatch && hasTextOnSameLine && (mode !== 'options' || isSequential);

    if (looksLikeNewQuestion && qMatch && candidateNumber !== null) {
      pushCurrent();

      const remainder = qMatch[2];
      const assertionMatch = ASSERTION_RE.exec(remainder);
      const reasonMatch = !assertionMatch ? REASON_RE.exec(remainder) : null;

      current = {
        sourceIndex: candidateNumber,
        questionLines: assertionMatch || reasonMatch ? [] : [remainder],
        assertionLines: assertionMatch ? [assertionMatch[1]] : [],
        reasonLines: reasonMatch ? [reasonMatch[1]] : [],
        isAssertionReason: Boolean(assertionMatch || reasonMatch),
        optionLines: [],
        solutionLines: [],
        raw: line,
      };
      lastSourceIndex = candidateNumber;
      mode = 'question';
      qSubMode = assertionMatch ? 'assertion' : reasonMatch ? 'reason' : 'stem';
      continue;
    }

    if (!current) {
      // Nothing has started a question yet — stash as preamble (e.g. a
      // pasted title line, instructions, etc. above question 1).
      preamble.push(line);
      continue;
    }

    current.raw += '\n' + line;

    const answerMatch = ANSWER_RE.exec(line);
    if (answerMatch) {
      current.answerLetter = answerMatch[1].toUpperCase();
      mode = 'solution'; // anything after Answer: (before Solution:) we still treat as pre-solution buffer
      continue;
    }

    const solutionMatch = SOLUTION_START_RE.exec(line);
    if (solutionMatch) {
      mode = 'solution';
      if (solutionMatch[1]) current.solutionLines.push(solutionMatch[1]);
      continue;
    }

    if (mode === 'solution') {
      current.solutionLines.push(line);
      continue;
    }

    const optMatch = OPTION_RE.exec(line);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();

      // A letter sequence that restarts at "A" after already advancing past
      // it (e.g. reached D) signals that what we collected so far wasn't
      // really the answer options — it was an inline sub-statement list
      // (List-I/List-II matching rows, lettered a-d same as real options)
      // and the REAL options are only starting now. This happens without a
      // dedicated "कूट:" hint line in between when that instruction is
      // embedded earlier in the question stem itself. Revert the earlier
      // lines back into the stem, same as the CODE_HINT_RE case below.
      const isRestart =
        mode === 'options' &&
        current.optionLines.length > 0 &&
        letter === 'A' &&
        current.optionLines[current.optionLines.length - 1].letter !== 'A';

      if (isRestart) revertOptionLinesToStem(current);

      mode = 'options';
      for (const opt of splitInlineOptions(letter, optMatch[2])) {
        current.optionLines.push(opt);
      }
      continue;
    }

    if (LIST_HEADER_RE.test(trimmed)) {
      if (mode === 'options' && current.optionLines.length > 0) {
        revertOptionLinesToStem(current);
      }
      mode = 'question';
      qSubMode = 'stem';
      current.questionLines.push(line);
      continue;
    }

    // "कूट:" / "codes given below" etc. on their own line — signals that any
    // lettered lines collected so far as "options" were actually inline
    // sub-statement list items inside the stem (e.g. "a. निकोलो मनुची | 1.
    // इंग्लैंड" in a matching-type question), not real answer options.
    // OPTION_RE matches lowercase a-d same as real options, so a 3-item
    // lowercase list right before the real (uppercase) options gets
    // misclassified as options until this line arrives — revert them back
    // into the stem now. Checked only for lines that already failed
    // OPTION_RE above, since a real option's own text can legitimately
    // contain the word "कूट" (e.g. "...राजस्व कूट निर्देशिका...") without
    // being the dedicated codes-hint line itself.
    if (CODE_HINT_RE.test(line)) {
      if (mode === 'options' && current.optionLines.length > 0) {
        revertOptionLinesToStem(current);
      }
      mode = 'question';
      qSubMode = 'stem';
      current.questionLines.push(line);
      continue;
    }

    // Not an option/answer/solution line. If we're still in "question" mode
    // (haven't seen any options yet), this is either the next line of the
    // question stem, or a numbered sub-statement (1/2/3 inside the stem,
    // as in the DPSP example) — both belong to questionLines either way.
    if (mode === 'question') {
      const assertionMatch = ASSERTION_RE.exec(line);
      if (assertionMatch) {
        current.isAssertionReason = true;
        qSubMode = 'assertion';
        current.assertionLines.push(assertionMatch[1]);
        continue;
      }

      const reasonMatch = REASON_RE.exec(line);
      if (reasonMatch) {
        current.isAssertionReason = true;
        qSubMode = 'reason';
        current.reasonLines.push(reasonMatch[1]);
        continue;
      }

      // Wrapped continuation lines of an in-progress assertion/reason block.
      if (qSubMode === 'assertion') {
        current.assertionLines.push(line);
        continue;
      }
      if (qSubMode === 'reason') {
        current.reasonLines.push(line);
        continue;
      }

      current.questionLines.push(line);
      continue;
    }

    // We're in "options" mode but this line didn't match OPTION_RE — most
    // likely a continuation of the previous option's text wrapping onto a
    // second line (long option). Append it to the last option if one
    // exists, otherwise fall back to treating it as a question continuation.
    if (mode === 'options' && current.optionLines.length > 0) {
      current.optionLines[current.optionLines.length - 1].text += ' ' + line.trim();
      continue;
    }

    current.questionLines.push(line);
  }

  pushCurrent();

  return { blocks, preamble };
}

// ---- Stage 2: build Question objects + flags from each block ----------

function detectLanguageSplit(lines: string[]): { en: string; hi: string } {
  const joined = lines.join('\n').trim();
  const devanagariChars = (joined.match(/[\u0900-\u097F]/gu) ?? []).length;
  const isHindi = devanagariChars > joined.length * 0.15;
  return isHindi ? { en: '', hi: joined } : { en: joined, hi: '' };
}

/**
 * Pulls any "[[IMG:n]]" sentinels out of a piece of text, returning the
 * cleaned text plus the list of sentinel indices that were found (in
 * left-to-right order — relevant if more than one image landed in the same
 * line, though that's rare). Pure no-op for manually pasted text, which
 * never contains sentinels.
 */
function extractImageSentinels(text: string): { cleaned: string; indices: number[] } {
  const indices: number[] = [];
  const cleaned = text
    .replace(IMAGE_SENTINEL_RE, (_match, n) => {
      indices.push(parseInt(n, 10));
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { cleaned, indices };
}

function buildQuestion(
  block: RawQuestionBlock,
  defaultSubject: Subject,
  images?: Map<number, string>,
): Question {
  const flags: ImportFlag[] = [];

  // Strip image sentinels from the question stem before language-splitting
  // (sentinels are ASCII bracket tokens and would otherwise dilute the
  // Devanagari-ratio check on short Hindi questions).
  const questionLinesNoSentinels: string[] = [];

  // Assertion/Reason text — same sentinel-stripping treatment as the stem,
  // in case a docx import embedded a figure inside the assertion or reason.
  const assertionLinesClean: string[] = [];
  for (const line of block.assertionLines) {
    assertionLinesClean.push(extractImageSentinels(line).cleaned);
  }
  const reasonLinesClean: string[] = [];
  for (const line of block.reasonLines) {
    reasonLinesClean.push(extractImageSentinels(line).cleaned);
  }

  const { en: assertionEn, hi: assertionHi } = assertionLinesClean.length
    ? detectLanguageSplit(assertionLinesClean)
    : { en: '', hi: '' };
  const { en: reasonEn, hi: reasonHi } = reasonLinesClean.length
    ? detectLanguageSplit(reasonLinesClean)
    : { en: '', hi: '' };

  if (block.isAssertionReason && !assertionEn && !assertionHi) {
    flags.push({
      type: 'low_confidence',
      message: 'Assertion-Reason question detected but Assertion (A) text could not be parsed.',
    });
  }
  if (block.isAssertionReason && !reasonEn && !reasonHi) {
    flags.push({
      type: 'low_confidence',
      message: 'Assertion-Reason question detected but Reason (R) text could not be parsed.',
    });
  }

  const questionImageIndices: number[] = [];
  for (const line of autoNumberStatementLines(block.questionLines)) {
    const { cleaned, indices } = extractImageSentinels(line);
    questionLinesNoSentinels.push(punctuateSubStatementMarker(cleaned));
    questionImageIndices.push(...indices);
  }

  const { en: textEn, hi: textHi } = detectLanguageSplit(questionLinesNoSentinels);
  const fullQuestionText = (textEn + ' ' + textHi).replace(/\n/g, ' ').trim();

  const isMcq = block.optionLines.length > 0;

  let options: QuestionOption[] | undefined;

  if (isMcq) {
    if (block.optionLines.length < 2) {
      flags.push({
        type: 'ambiguous_options',
        message: `Only ${block.optionLines.length} option(s) detected — expected at least 2.`,
      });
    }

    options = block.optionLines.map((o) => {
      const { cleaned: optTextCleaned, indices: optImageIndices } = extractImageSentinels(o.text);
      const { en, hi } = detectLanguageSplit([optTextCleaned]);

      // Resolve the first sentinel found in this option (if any) to an
      // actual image. Multiple images in one option is rare enough in
      // this format that we keep only the first and let the rest fall
      // through silently rather than over-engineering multi-image
      // options the UI has no slot for anyway (QuestionOption has a
      // single imageDataUrl field).
      const resolvedImage =
        images && optImageIndices.length > 0 ? images.get(optImageIndices[0]) : undefined;

      const isImageLike =
        EMPTY_OR_IMAGE_OPTION_RE.test(optTextCleaned) || IMAGE_CUE_RE.test(o.text);

      if (resolvedImage) {
        // Image was actually recovered from the docx — no need to
        // flag this option as missing one, even if the leftover text
        // also matched the "looks like it should have an image" cues.
      } else if (isImageLike) {
        flags.push({
          type: 'image_option',
          message: `Option ${o.letter} looks like it should contain an image — none was pasted (paste can't carry images).`,
        });
      }

      return {
        id: crypto.randomUUID(),
        textEn: en,
        textHi: hi,
        imageDataUrl: resolvedImage,
        isCorrect: block.answerLetter ? o.letter === block.answerLetter : false,
      };
    });

    if (block.answerLetter) {
      const matched = block.optionLines.some((o) => o.letter === block.answerLetter);
      if (!matched) {
        flags.push({
          type: 'answer_letter_mismatch',
          message: `Answer key says "${block.answerLetter}" but no option with that letter was parsed.`,
        });
      }
    } else {
      flags.push({
        type: 'missing_answer',
        message: "No 'Answer:' line found for this question.",
      });
    }
  }

  // Resolve the question stem's own image (e.g. a diagram printed above
  // the question text), same first-sentinel-wins rule as options above.
  const resolvedQuestionImage =
    images && questionImageIndices.length > 0 ? images.get(questionImageIndices[0]) : undefined;

  if (!resolvedQuestionImage && IMAGE_CUE_RE.test(fullQuestionText)) {
    flags.push({
      type: 'image_question',
      message:
        'Question text references a figure/diagram — no image was pasted, attach one manually.',
    });
  }

  const solutionJoined = block.solutionLines.join('\n').trim();
  const { en: solutionEn, hi: solutionHi } = solutionJoined
    ? detectLanguageSplit(block.solutionLines)
    : { en: '', hi: '' };

  if (!solutionJoined) {
    flags.push({
      type: 'missing_solution',
      message: "No 'Solution:' block found for this question.",
    });
  }

  if (!textEn && !textHi) {
    flags.push({
      type: 'low_confidence',
      message: "Question text came out empty — the parser likely misread this block's boundaries.",
    });
  }

  return {
    id: crypto.randomUUID(),
    type: block.isAssertionReason ? 'assertion_reason' : isMcq ? 'mcq' : 'short',
    subject: defaultSubject,
    textEn,
    textHi,
    hasMath: /\$[^$]+\$/.test(fullQuestionText),
    options,
    imageDataUrl: resolvedQuestionImage,
    marks: 1,
    answerSpaceLines: isMcq ? undefined : 3,
    correctAnswerLetter: block.answerLetter,
    assertionEn: assertionEn || undefined,
    assertionHi: assertionHi || undefined,
    reasonEn: reasonEn || undefined,
    reasonHi: reasonHi || undefined,
    solutionEn: solutionEn || undefined,
    solutionHi: solutionHi || undefined,
    importFlags: flags.length > 0 ? flags : undefined,
    importSourceIndex: block.sourceIndex,
  };
}

// ---- Public entry point -------------------------------------------------

export interface BulkImportOptions {
  defaultSubject?: Subject;
  /**
   * Sentinel index -> base64 data URL, produced by docxImportExtractor.ts
   * when the source was an uploaded .docx. Omit for plain pasted text —
   * the parser behaves exactly as before when this isn't supplied.
   */
  images?: Map<number, string>;
}

export function parseBulkImportText(
  text: string,
  options: BulkImportOptions = {},
): BulkImportResult {
  const defaultSubject = options.defaultSubject ?? 'general';

  if (!text || !text.trim()) {
    return {
      questions: [],
      flaggedQuestions: [],
      totalParsed: 0,
      totalClean: 0,
      unparsedPreamble: [],
    };
  }

  const { blocks, preamble } = splitIntoBlocks(text);

  const questions = blocks.map((b) => buildQuestion(b, defaultSubject, options.images));
  const flaggedQuestions = questions.filter((q) => (q.importFlags?.length ?? 0) > 0);

  // Preamble lines containing only image sentinels (e.g. a letterhead
  // logo image above question 1) are noise, not a real "ignored content"
  // warning — strip sentinels before filtering for blank lines.
  const cleanedPreamble = preamble
    .map((l) => extractImageSentinels(l).cleaned)
    .filter((l) => l.trim().length > 0);

  return {
    questions,
    flaggedQuestions,
    totalParsed: questions.length,
    totalClean: questions.length - flaggedQuestions.length,
    unparsedPreamble: cleanedPreamble,
  };
}

// ---- Flag display helpers -------------------------------------------------

export const FLAG_LABELS: Record<ImportFlagType, string> = {
  missing_answer: 'Missing answer',
  missing_solution: 'Missing solution',
  image_question: 'Needs question image',
  image_option: 'Needs option image',
  ambiguous_options: 'Unclear options',
  answer_letter_mismatch: 'Answer mismatch',
  low_confidence: "Couldn't parse cleanly",
};

export const FLAG_SEVERITY: Record<ImportFlagType, 'warning' | 'error'> = {
  missing_answer: 'warning',
  missing_solution: 'warning',
  image_question: 'error',
  image_option: 'error',
  ambiguous_options: 'error',
  answer_letter_mismatch: 'error',
  low_confidence: 'error',
};
