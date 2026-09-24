import React from "react";
import { ExamQuestion, CandidateAnswer } from "../../types";
import { Flag, CheckCircle2, Circle, HelpCircle, Layers, ArrowLeft, ArrowRight } from "lucide-react";

interface QuestionNavigatorProps {
  questions: ExamQuestion[];
  currentIndex: number;
  answers: Record<string, CandidateAnswer>;
  onSelectQuestion: (index: number) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  onSelectQuestion,
  isOpenMobile,
  onCloseMobile,
}: QuestionNavigatorProps) {
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    return (
      (a.textAnswer && a.textAnswer.trim().length > 0) ||
      a.selectedOption ||
      (a.diagramShapes && a.diagramShapes.length > 0)
    );
  }).length;

  const flaggedCount = questions.filter((q) => answers[q.id]?.isFlaggedForReview).length;

  return (
    <aside
      aria-label="Exam Question Navigator"
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col h-full"
    >
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-3">
        <div className="flex items-center gap-2 font-bold text-sm text-stone-900 dark:text-stone-100">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Questions</span>
        </div>
        <div className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400">
          {answeredCount}/{questions.length} Answered
        </div>
      </div>

      {/* Flagged and progress badges */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] font-semibold">
        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{answeredCount} Completed</span>
        </div>
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 fill-current" />
          <span>{flaggedCount} Flagged</span>
        </div>
      </div>

      {/* Question List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const ans = answers[q.id];
          const hasAnswer =
            ans &&
            ((ans.textAnswer && ans.textAnswer.trim().length > 0) ||
              ans.selectedOption ||
              (ans.diagramShapes && ans.diagramShapes.length > 0));
          const isFlagged = ans?.isFlaggedForReview;

          return (
            <button
              key={q.id}
              onClick={() => {
                onSelectQuestion(idx);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                isCurrent
                  ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/50 ring-2 ring-blue-500/40 shadow-xs"
                  : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/40 dark:bg-stone-800/30"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : hasAnswer
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {q.number}
                </span>

                <div className="truncate">
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {q.section.split(":")[0] || `Q${q.number}`}
                  </div>
                  <div className="text-[10px] text-stone-500 capitalize truncate">
                    {q.type.replace("_", " ")} • {q.marks} marks
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isFlagged && (
                  <Flag className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                )}
                {hasAnswer ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Previous / Next Page navigation controls */}
      <div className="mt-2.5 pt-2.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (currentIndex > 0) {
              onSelectQuestion(currentIndex - 1);
              if (onCloseMobile) onCloseMobile();
            }
          }}
          disabled={currentIndex === 0}
          className="flex-1 py-1.5 px-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
          title="Previous Page / Question (Alt+P)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (currentIndex < questions.length - 1) {
              onSelectQuestion(currentIndex + 1);
              if (onCloseMobile) onCloseMobile();
            }
          }}
          disabled={currentIndex === questions.length - 1}
          className="flex-1 py-1.5 px-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
          title="Next Page / Question (Alt+N)"
        >
          <span>Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Voice helper notice */}
      <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400">
        Say <strong className="font-mono text-stone-800 dark:text-stone-200">"Previous page"</strong>, <strong className="font-mono text-stone-800 dark:text-stone-200">"Next question"</strong>, or <strong className="font-mono text-stone-800 dark:text-stone-200">"Question [number]"</strong> to navigate hands-free.
      </div>
    </aside>
  );
}
