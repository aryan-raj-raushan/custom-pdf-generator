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
    generalInstructions: string[]; // English instructions
    generalInstructionsHi?: string[]; // Hindi instructions
    negativeMarking?: {
        enabled: boolean;
        value: number; // e.g. 0.25
    };
    marksPerQuestion?: number;
    language: "en" | "hi" | "bilingual";
    logoDataUrl?: string; // optional uploaded org logo, base64

    /** Layout preference persisted with the paper: 1 | 2 | 3 columns. Default 2. */
    columns?: 1 | 2 | 3;
    fontSize?: number;
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
        | "missing_answer" // no "Answer: X" line found for an MCQ
        | "missing_solution" // no "Solution: ..." block found
        | "image_question" // question text references/implies an image, none attached
        | "image_option" // an option references/implies an image, none attached
        | "ambiguous_options" // fewer than 2 options parsed, or option lettering broke
        | "answer_letter_mismatch" // "Answer: X" letter doesn't match any parsed option
        | "low_confidence";
    message: string;
}

export interface Question {
    id: string;
    type: "mcq" | "short" | "long";
    subject:
        | "general"
        | "mathematics"
        | "reasoning"
        | "english"
        | "hindi"
        | "gk";
    textEn: string;
    textHi?: string;
    hasMath?: boolean; // whether textEn/textHi contain LaTeX segments ($...$)
    options?: QuestionOption[]; // for mcq
    marks?: number;
    answerSpaceLines?: number; // for short/long answer blank space
    imageDataUrl?: string; // optional question image (diagram etc.)

    // Answer key fields — populated by bulk import or filled manually.
    correctAnswerLetter?: string; // "A" | "B" | "C" | "D" ... mirrors options[].isCorrect
    solutionEn?: string;
    solutionHi?: string;

    // Bulk import bookkeeping — not rendered on the paper, used by the review UI.
    importFlags?: ImportFlag[];
    importSourceIndex?: number; // original 1-based number in the pasted text, for traceability
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
