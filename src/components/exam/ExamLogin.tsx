import React, { useState } from "react";
import {
  ExamCandidate,
  ExamPaper,
  CandidateAccommodations,
  AccommodationExtraTime,
} from "../../types";
import { SAMPLE_EXAM_PAPERS } from "../../lib/sampleQuestions";
import {
  ShieldCheck,
  Clock,
  Volume2,
  Eye,
  Type,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  UserCheck,
} from "lucide-react";

interface ExamLoginProps {
  onLoginSuccess: (candidate: ExamCandidate, paper: ExamPaper) => void;
  onSwitchToScribe: () => void;
  onBackToPreviousPage?: () => void;
}

export function ExamLogin({ onLoginSuccess, onSwitchToScribe, onBackToPreviousPage }: ExamLoginProps) {
  const [candidateName, setCandidateName] = useState("Alex Rivera");
  const [candidateId, setCandidateId] = useState("CAND-8942");
  const [selectedPaperId, setSelectedPaperId] = useState<string>(SAMPLE_EXAM_PAPERS[0].id);

  // Accommodations
  const [extraTime, setExtraTime] = useState<AccommodationExtraTime>("1.5x");
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "x-large">("large");
  const [voiceFeedback, setVoiceFeedback] = useState(true);
  const [autoReadQuestions, setAutoReadQuestions] = useState(true);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStartLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!candidateName.trim() || !candidateId.trim()) {
      setValidationError("Please enter your Candidate Name and Examination ID.");
      return;
    }

    const paper = SAMPLE_EXAM_PAPERS.find((p) => p.id === selectedPaperId) || SAMPLE_EXAM_PAPERS[0];

    const accommodations: CandidateAccommodations = {
      extraTime,
      highContrast,
      dyslexiaFont,
      fontSize,
      speechRate: 1.0,
      voiceFeedback,
      autoReadQuestions,
      soundEffects: true,
    };

    const candidate: ExamCandidate = {
      candidateId: candidateId.trim().toUpperCase(),
      candidateName: candidateName.trim(),
      examPin: "EXAM-SECURE",
      seatNumber: "A-14",
      accommodations,
    };

    onLoginSuccess(candidate, paper);
  };

  const loadPreset = (preset: "adhd" | "low_vision" | "standard") => {
    if (preset === "adhd") {
      setExtraTime("1.5x");
      setDyslexiaFont(true);
      setFontSize("large");
      setVoiceFeedback(true);
      setAutoReadQuestions(true);
      setHighContrast(false);
    } else if (preset === "low_vision") {
      setExtraTime("2x");
      setFontSize("x-large");
      setHighContrast(true);
      setVoiceFeedback(true);
      setAutoReadQuestions(true);
    } else {
      setExtraTime("none");
      setDyslexiaFont(false);
      setFontSize("normal");
      setHighContrast(false);
      setVoiceFeedback(false);
      setAutoReadQuestions(false);
    }
  };

  return (
    <div className={`min-h-screen ${highContrast ? "bg-black text-yellow-300" : "bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100"} flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 transition-colors`}>
      <div className="max-w-3xl mx-auto w-full">
        {/* Previous Page top navigation bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToPreviousPage || onSwitchToScribe}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
              highContrast
                ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
            } font-semibold text-xs transition-colors cursor-pointer shadow-2xs`}
            title="Navigate to Previous Page (Alt + Left Arrow)"
            aria-label="Previous Page"
          >
            <ArrowLeft className={`w-4 h-4 ${highContrast ? "text-yellow-400" : "text-stone-600 dark:text-stone-300"}`} />
            <span>Previous Page</span>
          </button>

          <span className={`text-xs ${highContrast ? "text-yellow-400" : "text-stone-500"} font-medium`}>
            Examination Portal • Candidate Authentication
          </span>
        </div>

        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
            highContrast ? "bg-yellow-950 border border-yellow-400 text-yellow-300" : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
          } text-xs font-semibold tracking-wide uppercase mb-3`}>
            <ShieldCheck className="w-4 h-4" />
            Secure Hands-Free Examination Portal
          </div>
          <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"}`}>
            VoiceScript Accessible Examination
          </h1>
          <p className={`mt-2 text-base ${highContrast ? "text-yellow-200" : "text-stone-600 dark:text-stone-400"} max-w-xl mx-auto`}>
            Designed for students with physical disabilities, dyslexia, or motor impairments. Completely navigable and answerable via natural voice.
          </p>
        </div>

        {/* Main Card */}
        <div className={`${
          highContrast ? "bg-black border-2 border-yellow-400" : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
        } rounded-2xl shadow-xl p-6 sm:p-8`}>
          {validationError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm font-medium flex items-center justify-between">
              <span>{validationError}</span>
              <button
                onClick={() => setValidationError(null)}
                className="text-red-500 hover:text-red-700 font-bold ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleStartLogin} className="space-y-6">
            {/* Candidate Details */}
            <div>
              <div className="pb-2 border-b border-stone-200 dark:border-stone-800">
                <h2 className={`text-lg font-bold ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"} flex items-center gap-2`}>
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  1. Candidate Identification
                </h2>
                <p className={`text-xs ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} mt-1`}>
                  Enter official examination credentials. These identity details are digitally stamped onto your cryptographic submission receipt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={`block text-xs font-semibold ${highContrast ? "text-yellow-300" : "text-stone-700 dark:text-stone-300"} uppercase tracking-wider mb-1`}>
                    Candidate Full Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-lg border ${
                      highContrast
                        ? "border-yellow-400 bg-black text-yellow-300 placeholder-yellow-600"
                        : "border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    } focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium`}
                    placeholder="e.g. Jane Doe"
                  />
                  <p className={`text-[11px] ${highContrast ? "text-yellow-400/80" : "text-stone-500"} mt-1`}>
                    Official student name as registered on your examination hall ticket / admit card.
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-semibold ${highContrast ? "text-yellow-300" : "text-stone-700 dark:text-stone-300"} uppercase tracking-wider mb-1`}>
                    Candidate Exam ID <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateId}
                    onChange={(e) => setCandidateId(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-lg border ${
                      highContrast
                        ? "border-yellow-400 bg-black text-yellow-300 placeholder-yellow-600"
                        : "border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    } font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase font-bold`}
                    placeholder="CAND-0000"
                  />
                  <p className={`text-[11px] ${highContrast ? "text-yellow-400/80" : "text-stone-500"} mt-1`}>
                    Unique candidate roll number or session registration identifier.
                  </p>
                </div>
              </div>
            </div>

            {/* Exam Paper Selection */}
            <div>
              <div className="pb-2 border-b border-stone-200 dark:border-stone-800">
                <h2 className={`text-lg font-bold ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"} flex items-center gap-2`}>
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  2. Select Examination Paper
                </h2>
                <p className={`text-xs ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} mt-1`}>
                  Choose your designated curriculum exam paper. Each paper includes standard timed sections, questions, and marking rubrics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {SAMPLE_EXAM_PAPERS.map((paper) => {
                  const isSelected = selectedPaperId === paper.id;
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => setSelectedPaperId(paper.id)}
                      className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        highContrast
                          ? isSelected
                            ? "border-2 border-yellow-300 bg-yellow-950/60 ring-2 ring-yellow-400"
                            : "border border-yellow-600 bg-black text-yellow-200 hover:border-yellow-400"
                          : isSelected
                          ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500 shadow-xs"
                          : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-mono text-xs font-bold ${highContrast ? "text-yellow-300" : "text-blue-600 dark:text-blue-400"}`}>
                          {paper.code}
                        </span>
                        <span className={`text-xs ${highContrast ? "text-yellow-400" : "text-stone-500"} flex items-center gap-1 font-medium`}>
                          <Clock className="w-3.5 h-3.5" />
                          {paper.totalMinutes} mins
                        </span>
                      </div>
                      <div className={`font-bold ${highContrast ? "text-yellow-100" : "text-stone-900 dark:text-stone-100"} text-sm line-clamp-2`}>
                        {paper.title}
                      </div>
                      <div className={`mt-2 text-xs ${highContrast ? "text-yellow-400" : "text-stone-500 dark:text-stone-400"}`}>
                        {paper.questions.length} questions • {paper.totalMarks} total marks
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accessibility Accommodations & Presets */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800 gap-2">
                <div>
                  <h2 className={`text-lg font-bold ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"} flex items-center gap-2`}>
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    3. Accessibility Accommodations
                  </h2>
                  <p className={`text-xs ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} mt-0.5`}>
                    Configure personalized assistive tools to ensure equitable test-taking conditions.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`${highContrast ? "text-yellow-400" : "text-stone-500"} font-medium`}>Presets:</span>
                  <button
                    type="button"
                    onClick={() => loadPreset("adhd")}
                    className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-950 border border-yellow-500 text-yellow-300" : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"} font-medium cursor-pointer`}
                    title="Quick preset for Dyslexia, ADHD, or focus support"
                  >
                    Dyslexia/ADHD
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("low_vision")}
                    className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-950 border border-yellow-500 text-yellow-300" : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"} font-medium cursor-pointer`}
                    title="Quick preset with High Contrast and Extra Large text for Low Vision"
                  >
                    Low Vision
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("standard")}
                    className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-950 border border-yellow-500 text-yellow-300" : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"} font-medium cursor-pointer`}
                    title="Standard examination settings without modifications"
                  >
                    Standard
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Extra Time */}
                <div className={`p-4 rounded-xl border ${
                  highContrast ? "border-yellow-500 bg-black text-yellow-300" : "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30"
                }`}>
                  <label className={`block text-xs font-bold ${highContrast ? "text-yellow-300" : "text-stone-700 dark:text-stone-300"} uppercase tracking-wider mb-1 flex items-center gap-1.5`}>
                    <Clock className="w-4 h-4 text-blue-600" />
                    Time Extension Accommodation
                  </label>
                  <p className={`text-[11px] ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} mb-2.5 leading-relaxed`}>
                    Compensatory examination time (25%, 50%, or 100% extra) granted to allow equitable pacing for reading, voice dictation, and reviewing answers.
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["none", "1.25x", "1.5x", "2x"] as AccommodationExtraTime[]).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setExtraTime(val)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          extraTime === val
                            ? highContrast
                              ? "bg-yellow-400 text-black border-yellow-300 font-black"
                              : "bg-blue-600 text-white border-blue-600"
                            : highContrast
                            ? "bg-black text-yellow-300 border-yellow-600 hover:border-yellow-400"
                            : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                        }`}
                      >
                        {val === "none" ? "Standard" : val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography Size */}
                <div className={`p-4 rounded-xl border ${
                  highContrast ? "border-yellow-500 bg-black text-yellow-300" : "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30"
                }`}>
                  <label className={`block text-xs font-bold ${highContrast ? "text-yellow-300" : "text-stone-700 dark:text-stone-300"} uppercase tracking-wider mb-1 flex items-center gap-1.5`}>
                    <Type className="w-4 h-4 text-blue-600" />
                    Typography & Sizing
                  </label>
                  <p className={`text-[11px] ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} mb-2.5 leading-relaxed`}>
                    Adjusts interface scaling and text magnification across questions, transcripts, and menus to prevent eye strain and support partial vision.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["normal", "large", "x-large"] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFontSize(val)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-colors capitalize cursor-pointer ${
                          fontSize === val
                            ? highContrast
                              ? "bg-yellow-400 text-black border-yellow-300 font-black"
                              : "bg-blue-600 text-white border-blue-600"
                            : highContrast
                            ? "bg-black text-yellow-300 border-yellow-600 hover:border-yellow-400"
                            : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                        }`}
                      >
                        {val.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles with clear descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <label className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                  highContrast ? "border-yellow-400 bg-yellow-950/20" : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40"
                } cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-stone-300"
                  />
                  <div>
                    <span className={`text-sm font-bold ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"} flex items-center gap-1.5`}>
                      <Eye className="w-4 h-4 text-amber-500" /> High-Contrast Visual Mode
                    </span>
                    <span className={`text-xs ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} block mt-0.5 leading-relaxed`}>
                      Applies stark contrast (deep pitch-black background with vibrant yellow text and thick borders) for candidates with low vision or photophobia.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                  highContrast ? "border-yellow-400 bg-yellow-950/20" : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40"
                } cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={dyslexiaFont}
                    onChange={(e) => setDyslexiaFont(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-stone-300"
                  />
                  <div>
                    <span className={`text-sm font-bold ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"}`}>
                      Dyslexia-Friendly Letter Spacing
                    </span>
                    <span className={`text-xs ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} block mt-0.5 leading-relaxed`}>
                      Expands letter tracking, word separation, and line spacing to avoid visual crowding and support reading fluency for candidates with dyslexia.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                  highContrast ? "border-yellow-400 bg-yellow-950/20" : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40"
                } cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={voiceFeedback}
                    onChange={(e) => setVoiceFeedback(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-stone-300"
                  />
                  <div>
                    <span className={`text-sm font-bold ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"} flex items-center gap-1.5`}>
                      <Volume2 className="w-4 h-4 text-blue-600" /> Spoken Audio Confirmation
                    </span>
                    <span className={`text-xs ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} block mt-0.5 leading-relaxed`}>
                      Audibly speaks verbal feedback through your speakers whenever a voice command, navigation step, or edit is registered.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                  highContrast ? "border-yellow-400 bg-yellow-950/20" : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40"
                } cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={autoReadQuestions}
                    onChange={(e) => setAutoReadQuestions(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 border-stone-300"
                  />
                  <div>
                    <span className={`text-sm font-bold ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"}`}>
                      Auto-Read Questions Aloud
                    </span>
                    <span className={`text-xs ${highContrast ? "text-yellow-200" : "text-stone-500 dark:text-stone-400"} block mt-0.5 leading-relaxed`}>
                      Text-to-Speech automatically dictates the prompt whenever you navigate to a new examination question or page.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={onSwitchToScribe}
                className={`text-sm ${highContrast ? "text-yellow-400 hover:text-yellow-200" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"} underline underline-offset-4 cursor-pointer`}
              >
                Switch to Free-Form Scribe Mode
              </button>

              <button
                type="submit"
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl ${
                  highContrast
                    ? "bg-yellow-400 hover:bg-yellow-300 text-black font-black"
                    : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold shadow-lg shadow-blue-500/20"
                } flex items-center justify-center gap-2 transition-all cursor-pointer text-base`}
              >
                Continue to System Check
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
