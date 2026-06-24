// components/questions/QuestionsPanel.tsx
"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FilePlus, FolderPlus, Trash2 } from "lucide-react";
import { ExamSection, ExamMetadata } from "@/types/exam";
import { QuestionEditor } from "./QuestionEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { createEmptyQuestion, createEmptySection, QuestionType, Subject } from "../layout/CustomPdfCreator";

interface QuestionsPanelProps {
  sections: ExamSection[];
  metadata: ExamMetadata;
  onChange: (sections: ExamSection[]) => void;
  highlightedQuestionId?: string | null;
}

const QUICK_ADD: { type: QuestionType; subject: Subject; label: string }[] = [
  { type: "mcq", subject: "general", label: "MCQ" },
  { type: "mcq", subject: "mathematics", label: "Maths MCQ" },
  { type: "short", subject: "general", label: "Short answer" },
  { type: "long", subject: "general", label: "Long answer" },
];

export function QuestionsPanel({ sections, metadata, onChange, highlightedQuestionId }: Readonly<QuestionsPanelProps>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const showHindi = metadata.language !== "en";

  // If the highlighted question lives in a collapsed section, force that
  // section open so the scroll-into-view target actually exists in the DOM.
  React.useEffect(() => {
    if (!highlightedQuestionId) return;
    const owningSection = sections.find((s) => s.questions.some((q) => q.id === highlightedQuestionId));
    if (owningSection && collapsed[owningSection.id]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed((c) => ({ ...c, [owningSection.id]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedQuestionId]);

  function updateSection(id: string, patch: Partial<ExamSection>) {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSection() {
    onChange([...sections, createEmptySection(`Section ${sections.length + 1}`)]);
  }

  function deleteSection(id: string) {
    onChange(sections.filter((s) => s.id !== id));
  }

  function addQuestion(sectionId: string, type: QuestionType, subject: Subject) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { questions: [...section.questions, createEmptyQuestion(type, subject)] });
  }

  function updateQuestion(sectionId: string, questionId: string, patch: ExamSection["questions"][number]) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      questions: section.questions.map((q) => (q.id === questionId ? patch : q)),
    });
  }

  function deleteQuestion(sectionId: string, questionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { questions: section.questions.filter((q) => q.id !== questionId) });
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;

    const sourceSectionId = source.droppableId;
    const destSectionId = destination.droppableId;

    if (sourceSectionId === destSectionId) {
      const section = sections.find((s) => s.id === sourceSectionId);
      if (!section) return;
      const reordered = Array.from(section.questions);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      updateSection(sourceSectionId, { questions: reordered });
    } else {
      const srcSection = sections.find((s) => s.id === sourceSectionId);
      const destSection = sections.find((s) => s.id === destSectionId);
      if (!srcSection || !destSection) return;
      const srcQuestions = Array.from(srcSection.questions);
      const [moved] = srcQuestions.splice(source.index, 1);
      const destQuestions = Array.from(destSection.questions);
      destQuestions.splice(destination.index, 0, moved);
      onChange(
        sections.map((s) => {
          if (s.id === sourceSectionId) return { ...s, questions: srcQuestions };
          if (s.id === destSectionId) return { ...s, questions: destQuestions };
          return s;
        })
      );
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      <DragDropContext onDragEnd={handleDragEnd}>
        {sections.map((section) => {
          const isCollapsed = collapsed[section.id];
          return (
            <div key={section.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <motion.span animate={{ rotate: isCollapsed ? -90 : 0 }} className="block">
                    <ChevronDown size={15} />
                  </motion.span>
                </button>
                <Input
                  value={section.titleEn}
                  onChange={(e) => updateSection(section.id, { titleEn: e.target.value })}
                  className="!w-auto flex-1 !border-none !bg-transparent !px-1 !py-1 !text-sm !font-semibold !shadow-none focus:!ring-0"
                />
                <span className="text-xs text-stone-400">{section.questions.length} questions</span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteSection(section.id)}
                    className="text-stone-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {showHindi && (
                <Input
                  value={section.titleHi ?? ""}
                  onChange={(e) => updateSection(section.id, { titleHi: e.target.value })}
                  placeholder="अनुभाग शीर्षक (हिंदी)"
                  className="-mt-2 ml-6 !w-auto !border-none !bg-transparent !px-1 !py-0.5 !text-xs !text-stone-500 !shadow-none focus:!ring-0"
                  style={{ fontFamily: "var(--font-devanagari, inherit)" }}
                />
              )}

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Droppable droppableId={section.id}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2.5">
                          <AnimatePresence initial={false}>
                            {section.questions.map((q, index) => (
                              <Draggable key={q.id} draggableId={q.id} index={index}>
                                {(dragProvided) => (
                                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                                    <QuestionEditor
                                      question={q}
                                      index={index}
                                      showHindi={showHindi}
                                      onChange={(patch) => updateQuestion(section.id, q.id, patch)}
                                      onDelete={() => deleteQuestion(section.id, q.id)}
                                      dragHandleProps={dragProvided.dragHandleProps}
                                      isHighlighted={q.id === highlightedQuestionId}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </AnimatePresence>
                          {provided.placeholder}

                          {section.questions.length === 0 && (
                            <div className="rounded-lg border border-dashed border-stone-200 py-6 text-center text-xs text-stone-400">
                              No questions yet — add one below
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {QUICK_ADD.map((q) => (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => addQuestion(section.id, q.type, q.subject)}
                          className="rounded-md border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                        >
                          + {q.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </DragDropContext>

      <Button variant="secondary" onClick={addSection} className="w-fit">
        <FolderPlus size={15} /> Add section
      </Button>
    </div>
  );
}

export default QuestionsPanel;