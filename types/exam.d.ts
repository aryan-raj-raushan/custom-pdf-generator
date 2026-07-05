export interface GeneralInstruction {
  id: string;
  en: string;
  hi: string;
}

export interface ExamMetadata {
  examTitle: string;
  examTitleHi?: string;
  organisation: string; // e.g. Staff Selection Commission
  organisationHi?: string;
  examCode?: string; // e.g. SSC-CGL-2026
  subject?: string;
  date: string; // ISO date
  duration: string; // e.g. "2 Hours" / "120 Minutes"
  maxMarks: number;
  totalQuestions: number;
  rollNoLabel?: boolean; // show Roll No. box
  candidateNameLabel?: boolean; // show Candidate Name line
  setCode?: string; // Set A / Set B etc.
  bookletSeries?: string; // Booklet Series e.g. "A"
  generalInstructionsEnabled?: boolean;
  generalInstructions: string[]; // English instructions
  generalInstructionsHi?: string[]; // Hindi instructions
  negativeMarking?: {
    enabled: boolean;
    value: number; // e.g. 0.25
  };
  marksPerQuestion?: number;
  language: 'en' | 'hi' | 'bilingual';
  logoDataUrl?: string; // optional uploaded org logo, base64

  /** Layout preference persisted with the paper: 1 | 2 | 3 columns. Default 2. */
  columns?: 1 | 2 | 3;
  fontSize?: number;
  /** Which header/footer template to use. Default: 'classic'. */
  headerTemplate?: 'classic' | 'coaching' | 'minimal';

  /**
   * Coaching template only.
   * The number shown inside the circle badge (e.g. "02").
   * Falls back to setCode, then '01'.
   */
  coachingSetNumber?: string;

  /**
   * Coaching template only.
   * Text shown in the brand subbar at the bottom of the header title box.
   * e.g. "Your Brand | बिहार पुलिस मॉडल प्रैक्टिस सेट"
   */
  footerBrand?: string;

  /**
   * Coaching template only.
   * Text shown in the dark bar at the absolute bottom of every page.
   */
  footerBrandText?: string;

  /** Coaching template only. Hex color for badge block + footer bars. Default '#1a1a1a'. */
  footerBrandColor?: string;

  watermark?: {
    enabled: boolean;
    type: 'text' | 'image';
    /** Text watermark string. Devanagari supported. */
    text?: string;
    /** Image watermark — base64 data URL. PNG with transparency recommended. */
    imageDataUrl?: string;
    /** Opacity 0–1. Default 0.12. Slider range: 0.04–0.30. */
    opacity?: number;
    /** Rotation angle in degrees. */
    rotation?: number;
  };

  coverPage?: {
    enabled: boolean;
    /** Base64 data URL of the uploaded cover image. */
    imageDataUrl?: string;
  };

  headerMode?: 'template' | 'banner';
  headerBannerImageUrl?: string;
}
export interface QuestionOption {
  id: string;
  textEn: string;
  textHi?: string;
  isCorrect?: boolean;
  hasMath?: boolean;
  imageDataUrl?: string; // optional option image (e.g. figure-based options)
}

export interface ImportFlag {
  type:
    | 'missing_answer' // no "Answer: X" line found for an MCQ
    | 'missing_solution' // no "Solution: ..." block found
    | 'image_question' // question text references/implies an image, none attached
    | 'image_option' // an option references/implies an image, none attached
    | 'ambiguous_options' // fewer than 2 options parsed, or option lettering broke
    | 'answer_letter_mismatch' // "Answer: X" letter doesn't match any parsed option
    | 'low_confidence';
  message: string;
}

export interface Question {
  id: string;
  type: 'mcq' | 'short' | 'long' | 'assertion_reason';
  subject: 'general' | 'mathematics' | 'reasoning' | 'english' | 'hindi' | 'gk';
  textEn: string;
  textHi?: string;
  hasMath?: boolean;
  options?: QuestionOption[]; // for mcq AND assertion_reason (the A/B/C/D "codes")
  marks?: number;
  answerSpaceLines?: number;
  imageDataUrl?: string;

  // Assertion-Reason specific
  assertionEn?: string;
  assertionHi?: string;
  reasonEn?: string;
  reasonHi?: string;

  correctAnswerLetter?: string;
  solutionEn?: string;
  solutionHi?: string;

  importFlags?: ImportFlag[];
  importSourceIndex?: number;
}

export interface ExamSection {
  id: string;
  titleEn: string;
  titleHi?: string;
  questions: Question[];
}

export interface ExamPaper {
  metadata: ExamMetadata;
  sections: ExamSection[];
}
