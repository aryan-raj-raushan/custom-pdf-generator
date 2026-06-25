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

interface RawQuestionBlock {
  sourceIndex: number; // 1-based number as it appeared in the pasted text
  questionLines: string[];
  optionLines: { letter: string; text: string }[];
  answerLetter?: string;
  solutionLines: string[];
  raw: string; // full original block, for the "view raw" affordance in review UI
}

// ---- Stage 1: split raw text into per-question blocks ------------------

function splitIntoBlocks(text: string): {
  blocks: RawQuestionBlock[];
  preamble: string[];
} {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  const blocks: RawQuestionBlock[] = [];
  const preamble: string[] = [];

  let current: RawQuestionBlock | null = null;
  // Which section of the current question we're accumulating into.
  let mode: 'question' | 'options' | 'solution' = 'question';
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
      current = {
        sourceIndex: candidateNumber,
        questionLines: [qMatch[2]],
        optionLines: [],
        solutionLines: [],
        raw: line,
      };
      lastSourceIndex = candidateNumber;
      mode = 'question';
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
      mode = 'options';
      current.optionLines.push({
        letter: optMatch[1].toUpperCase(),
        text: optMatch[2],
      });
      continue;
    }

    // Not an option/answer/solution line. If we're still in "question" mode
    // (haven't seen any options yet), this is either the next line of the
    // question stem, or a numbered sub-statement (1/2/3 inside the stem,
    // as in the DPSP example) — both belong to questionLines either way.
    if (mode === 'question') {
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
  // Many pasted papers are Hindi-only (as in the sample data) or
  // English-only, not interleaved per-line. We don't try to guess a
  // per-line bilingual split (too fragile); instead the whole block goes
  // into whichever language it's predominantly written in, and the other
  // field is left empty for the user to fill in if they want bilingual
  // output.
  const joined = lines.join(' ').trim();
  const devanagariChars = (joined.match(/[\u0900-\u097F]/gu) ?? []).length;
  const isHindi = devanagariChars > joined.length * 0.15; // >15% Devanagari chars → treat as Hindi block
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
  const questionImageIndices: number[] = [];
  for (const line of block.questionLines) {
    const { cleaned, indices } = extractImageSentinels(line);
    questionLinesNoSentinels.push(cleaned);
    questionImageIndices.push(...indices);
  }

  const { en: textEn, hi: textHi } = detectLanguageSplit(questionLinesNoSentinels);
  const fullQuestionText = (textEn + ' ' + textHi).trim();

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

  const solutionJoined = block.solutionLines.join(' ').replace(/\s+/g, ' ').trim();
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
    type: isMcq ? 'mcq' : 'short',
    subject: defaultSubject,
    textEn,
    textHi,
    hasMath: /\$[^$]+\$/.test(fullQuestionText),
    options,
    imageDataUrl: resolvedQuestionImage,
    marks: 1,
    answerSpaceLines: isMcq ? undefined : 3,
    correctAnswerLetter: block.answerLetter,
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
