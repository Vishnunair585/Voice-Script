import React, { useState, useEffect, useRef } from "react";
import {
  ExamCandidate,
  ExamPaper,
  CandidateAnswer,
  ExamAuditLogEntry,
  ExamSessionState,
} from "../../types";
import { ExamTimer } from "./ExamTimer";
import { QuestionNavigator } from "./QuestionNavigator";
import { VoiceAnswerEditor } from "./VoiceAnswerEditor";
import { createAuditEntry } from "../../lib/security";
import { saveExamSession } from "../../lib/storage";
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Eye,
  Type,
  Flag,
  FileCheck,
  Menu,
  X,
  Volume2,
  Sparkles,
  Command,
} from "lucide-react";

interface ExamWorkspaceProps {
  candidate: ExamCandidate;
  paper: ExamPaper;
  answers: Record<string, CandidateAnswer>;
  onAnswersChange: (answers: Record<string, CandidateAnswer>) => void;
  initialQuestionIndex?: number;
  onQuestionIndexChange?: (index: number) => void;
  remainingSeconds: number;
  onRemainingSecondsChange: (secs: number) => void;
  auditLog: ExamAuditLogEntry[];
  onAddAuditLog: (entry: ExamAuditLogEntry) => void;
  onGoToReview: () => void;
  onTimeExpired: () => void;
}

export function ExamWorkspace({
  candidate,
  paper,
  answers,
  onAnswersChange,
  initialQuestionIndex,
  onQuestionIndexChange,
  remainingSeconds,
  onRemainingSecondsChange,
  auditLog,
  onAddAuditLog,
  onGoToReview,
  onTimeExpired,
}: ExamWorkspaceProps) {
  const [currentIndex, setCurrentIndex] = useState(
    initialQuestionIndex !== undefined &&
      initialQuestionIndex >= 0 &&
      initialQuestionIndex < paper.questions.length
      ? initialQuestionIndex
      : 0
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(candidate.accommodations.highContrast);
  const [dyslexiaFont, setDyslexiaFont] = useState(candidate.accommodations.dyslexiaFont);
  const [fontSize, setFontSize] = useState(candidate.accommodations.fontSize);

  useEffect(() => {
    if (
      initialQuestionIndex !== undefined &&
      initialQuestionIndex >= 0 &&
      initialQuestionIndex < paper.questions.length &&
      initialQuestionIndex !== currentIndex
    ) {
      setCurrentIndex(initialQuestionIndex);
    }
  }, [initialQuestionIndex, paper.questions.length]);

  const currentQuestion = paper.questions[currentIndex];

  // Initialize answer record for question if missing
  const currentAnswer: CandidateAnswer =
    answers[currentQuestion.id] || {
      questionId: currentQuestion.id,
      textAnswer: "",
      rawTranscript: "",
      wordCount: 0,
      isFlaggedForReview: false,
      lastModified: Date.now(),
      revisionCount: 0,
    };

  const answeredCount = paper.questions.filter((q) => {
    const a = answers[q.id];
    return (
      a &&
      ((a.textAnswer && a.textAnswer.trim().length > 0) ||
        a.selectedOption ||
        (a.diagramShapes && a.diagramShapes.length > 0))
    );
  }).length;
  const allAnswered = answeredCount === paper.questions.length;

  // Timer countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      onRemainingSecondsChange(Math.max(0, remainingSeconds - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds, onRemainingSecondsChange]);

  // Periodic autosave to local storage
  useEffect(() => {
    const sessionState: ExamSessionState = {
      candidate,
      examPaper: paper,
      currentQuestionIndex: currentIndex,
      answers,
      remainingSeconds,
      initialTotalSeconds: Math.round(
        paper.totalMinutes *
          (candidate.accommodations.extraTime === "2x"
            ? 2
            : candidate.accommodations.extraTime === "1.5x"
            ? 1.5
            : candidate.accommodations.extraTime === "1.25x"
            ? 1.25
            : 1) *
          60
      ),
      isExamActive: true,
      isPaused: false,
      auditLog,
      lastAutosavedAt: Date.now(),
    };
    saveExamSession(sessionState);
  }, [answers, remainingSeconds, currentIndex]);

  // Answer modification handler
  const handleSingleAnswerChange = (newAnswer: CandidateAnswer, auditDetails?: string) => {
    const updated = {
      ...answers,
      [currentQuestion.id]: newAnswer,
    };
    onAnswersChange(updated);

    if (auditDetails) {
      const entry = createAuditEntry(
        "VOICE_EDIT",
        auditDetails,
        currentQuestion.id,
        currentQuestion.number
      );
      onAddAuditLog(entry);
    }
  };

  const handleNavigateQuestion = (index: number) => {
    if (index >= 0 && index < paper.questions.length) {
      setCurrentIndex(index);
      if (onQuestionIndexChange) {
        onQuestionIndexChange(index);
      }
      const targetQ = paper.questions[index];
      const entry = createAuditEntry(
        "NAVIGATE",
        `Navigated to Question ${targetQ.number} (${targetQ.type})`,
        targetQ.id,
        targetQ.number
      );
      onAddAuditLog(entry);
    }
  };

  const handleToggleFlag = () => {
    const newFlag = !currentAnswer.isFlaggedForReview;
    handleSingleAnswerChange(
      { ...currentAnswer, isFlaggedForReview: newFlag },
      `Toggled flag for Q${currentQuestion.number} to ${newFlag ? "FLAGGED" : "UNFLAGGED"}`
    );
  };

  const handleTimeQuery = () => {
    const entry = createAuditEntry(
      "TIME_QUERY",
      `Queried remaining time: ${Math.round(remainingSeconds / 60)} minutes left`
    );
    onAddAuditLog(entry);

    if ("speechSynthesis" in window) {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const utterance = new SpeechSynthesisUtterance(
        `You have ${mins} minutes and ${secs} seconds remaining in this exam.`
      );
      window.speechSynthesis.speak(utterance);
    }
  };

  // Keyboard shortcut navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNavigateQuestion(currentIndex + 1);
      } else if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleNavigateQuestion(currentIndex - 1);
      } else if (e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleToggleFlag();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentAnswer]);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        highContrast
          ? "bg-black text-amber-300 font-bold"
          : "bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
      }`}
    >
      {/* Top Application Header */}
      <header
        className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
          highContrast
            ? "border-amber-400 bg-black"
            : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
            aria-label="Toggle navigation list"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                {paper.code}
              </span>
              <h1 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 truncate max-w-[200px] sm:max-w-md">
                {paper.title}
              </h1>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              Candidate: <strong className="text-stone-800 dark:text-stone-200">{candidate.candidateName}</strong> ({candidate.candidateId})
            </div>
          </div>
        </div>

        {/* Center Page / Question Navigation bar */}
        <div className="hidden lg:flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200 dark:border-stone-700/60 shadow-2xs">
          <button
            type="button"
            onClick={() => handleNavigateQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
            title="Navigate to Previous Page / Question (Alt+P or speak 'Previous page')"
            aria-label="Previous Page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Page</span>
          </button>
          <span className="font-mono text-xs font-bold text-stone-600 dark:text-stone-300 px-2 select-none">
            Page {currentIndex + 1} of {paper.questions.length}
          </span>
          <button
            type="button"
            onClick={() => handleNavigateQuestion(currentIndex + 1)}
            disabled={currentIndex === paper.questions.length - 1}
            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
            title="Navigate to Next Page / Question (Alt+N or speak 'Next question')"
            aria-label="Next Page"
          >
            <span>Next Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Timer Countdown */}
          <ExamTimer
            remainingSeconds={remainingSeconds}
            initialTotalSeconds={
              paper.totalMinutes *
              (candidate.accommodations.extraTime === "2x"
                ? 2
                : candidate.accommodations.extraTime === "1.5x"
                ? 1.5
                : candidate.accommodations.extraTime === "1.25x"
                ? 1.25
                : 1) *
              60
            }
            accommodationsExtraTime={candidate.accommodations.extraTime}
            onTimeExpired={onTimeExpired}
            voiceFeedback={candidate.accommodations.voiceFeedback}
          />

          {/* Accessibility Quick Toggles */}
          <button
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
              highContrast
                ? "bg-amber-400 text-black border-amber-400"
                : "border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
            }`}
            title="Toggle High-Contrast Mode"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setFontSize((prev) =>
                prev === "normal" ? "large" : prev === "large" ? "x-large" : "normal"
              );
            }}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold cursor-pointer"
            title="Cycle Font Sizing (Normal -> Large -> XL)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Answer progress status pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              allAnswered
                ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
            }`}
            title={
              allAnswered
                ? "All questions answered. Ready to submit."
                : `${paper.questions.length - answeredCount} questions remaining (all must be answered to submit)`
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                allAnswered ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`}
            />
            <span>
              {answeredCount}/{paper.questions.length} Answered
            </span>
          </div>

          {/* Go to Review & Submit */}
          <button
            type="button"
            onClick={onGoToReview}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
          >
            <FileCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Review & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 flex overflow-hidden p-3 sm:p-4 gap-4">
        {/* Left Side Question Navigator (Desktop) */}
        <div className="hidden md:block w-72 shrink-0 h-full">
          <QuestionNavigator
            questions={paper.questions}
            currentIndex={currentIndex}
            answers={answers}
            onSelectQuestion={handleNavigateQuestion}
          />
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex md:hidden p-4">
            <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-xs p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
                <span className="font-bold text-sm">Exam Questions</span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 rounded-lg text-stone-500 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <QuestionNavigator
                  questions={paper.questions}
                  currentIndex={currentIndex}
                  answers={answers}
                  onSelectQuestion={handleNavigateQuestion}
                  onCloseMobile={() => setMobileNavOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Center Question Answer Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <VoiceAnswerEditor
            question={currentQuestion}
            answer={currentAnswer}
            onAnswerChange={handleSingleAnswerChange}
            accommodations={{
              ...candidate.accommodations,
              highContrast,
              dyslexiaFont,
              fontSize,
            }}
            onNavigateNext={() => handleNavigateQuestion(currentIndex + 1)}
            onNavigatePrev={() => handleNavigateQuestion(currentIndex - 1)}
            onTimeQuery={handleTimeQuery}
            onGoToReview={onGoToReview}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex < paper.questions.length - 1}
          />

          {/* Bottom Bar: Prev / Flag / Next */}
          <footer className="mt-3 py-2 px-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center justify-between shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => handleNavigateQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
              title="Navigate to Previous Page / Question (Alt+P or speak 'Previous page')"
              aria-label="Previous Page"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Page (Alt+P)</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-stone-500">
                Question {currentIndex + 1} of {paper.questions.length}
              </span>
              <button
                type="button"
                onClick={handleToggleFlag}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  currentAnswer.isFlaggedForReview
                    ? "bg-amber-500 text-white border-amber-600"
                    : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-400"
                }`}
                title="Flag question for review (Alt+F)"
              >
                <Flag className={`w-3.5 h-3.5 ${currentAnswer.isFlaggedForReview ? "fill-white" : ""}`} />
                <span className="hidden sm:inline">Flag</span>
              </button>
            </div>

            {currentIndex < paper.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => handleNavigateQuestion(currentIndex + 1)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Next Question (Alt+N)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToReview}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Proceed to Review</span>
                <FileCheck className="w-4 h-4" />
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
