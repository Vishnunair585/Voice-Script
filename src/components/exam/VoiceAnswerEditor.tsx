import React, { useState, useEffect, useRef } from "react";
import {
  ExamQuestion,
  CandidateAnswer,
  DiagramShape,
  CandidateAccommodations,
} from "../../types";
import { KaTeXText } from "../KaTeXText";
import { DiagramCanvas } from "./DiagramCanvas";
import {
  parseVoiceCommand,
  applyEditingAction,
  VoiceCommandAction,
} from "../../lib/voiceCommands";
import { spokenMathToLaTeX } from "../../lib/mathVoice";
import { VoiceCommandCheatsheet, VoiceCommandItem } from "../VoiceCommandCheatsheet";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Flag,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Hash,
  List,
  ListOrdered,
  Heading2,
  FileText,
  RotateCcw,
  Eraser,
  Eye,
  Type,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

interface VoiceAnswerEditorProps {
  question: ExamQuestion;
  answer: CandidateAnswer;
  onAnswerChange: (newAnswer: CandidateAnswer, auditDetails?: string) => void;
  accommodations: CandidateAccommodations;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onTimeQuery: () => void;
  onGoToReview: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function VoiceAnswerEditor({
  question,
  answer,
  onAnswerChange,
  accommodations,
  onNavigateNext,
  onNavigatePrev,
  onTimeQuery,
  onGoToReview,
  hasPrev,
  hasNext,
}: VoiceAnswerEditorProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastCommandFeedback, setLastCommandFeedback] = useState<string | null>(null);
  const [previewMath, setPreviewMath] = useState(true);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(true);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingTtsRef = useRef<boolean>(false);
  const lastExecutedCommandRef = useRef<{ text: string; time: number }>({ text: "", time: 0 });
  const currentAnswerRef = useRef<CandidateAnswer>(answer);
  currentAnswerRef.current = answer;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  // Auto-read question if candidate accommodation is enabled
  useEffect(() => {
    if (accommodations.autoReadQuestions) {
      speakText(`Question ${question.number}. ${question.prompt}`);
    }
  }, [question.id]);

  // Clean up speech and synthesis on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech helper
  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    isSpeakingTtsRef.current = true;
    setIsSpeakingTts(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = accommodations.speechRate || 1.0;
    utterance.onstart = () => {
      isSpeakingTtsRef.current = true;
      setIsSpeakingTts(true);
    };
    utterance.onend = () => {
      isSpeakingTtsRef.current = false;
      setIsSpeakingTts(false);
    };
    utterance.onerror = () => {
      isSpeakingTtsRef.current = false;
      setIsSpeakingTts(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeakingTts = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      isSpeakingTtsRef.current = false;
      setIsSpeakingTts(false);
    }
  };

  // Provide spoken confirmation if voiceFeedback accommodation is active
  const confirmFeedback = (msg: string) => {
    setLastCommandFeedback(msg);
    if (accommodations.voiceFeedback && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(msg);
      u.rate = 1.1;
      window.speechSynthesis.speak(u);
    }
    setTimeout(() => {
      setLastCommandFeedback((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("Web Speech Recognition is not supported on this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognizer = new SpeechRecognition();
      recognitionRef.current = recognizer;
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = "en-US";
      recognizer.maxAlternatives = 3;

      recognizer.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        confirmFeedback("Microphone active. You may speak your answer or voice commands.");
      };

      recognizer.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          console.warn("Speech recognition error:", e.error);
        }
      };

      recognizer.onend = () => {
        // If still expected to listen, restart gracefully
        if (isListeningRef.current) {
          try {
            recognizer.start();
          } catch {
            setTimeout(() => {
              if (isListeningRef.current) {
                try {
                  recognizer.start();
                } catch {}
              }
            }, 250);
          }
        } else {
          setIsListening(false);
        }
      };

      recognizer.onresult = (event: any) => {
        // Avoid picking up machine's own TTS output
        if (isSpeakingTtsRef.current) return;

        let interim = "";
        let finalUtterance = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalUtterance += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interim);

        // Immediate recognition for urgent navigation and repeat commands from interim stream!
        // This eliminates the 2-3 second delay where the user felt stuck waiting for isFinal.
        if (interim.trim()) {
          const testParse = parseVoiceCommand(interim.trim());
          if (
            testParse.isCommand &&
            (testParse.action.type === "NAVIGATE_NEXT" ||
              testParse.action.type === "NAVIGATE_PREV" ||
              testParse.action.type === "READ_QUESTION" ||
              testParse.action.type === "READ_ANSWER" ||
              testParse.action.type === "CHECK_TIME" ||
              testParse.action.type === "TOGGLE_FLAG" ||
              testParse.action.type === "TOGGLE_CHEATSHEET" ||
              testParse.action.type === "GO_TO_REVIEW")
          ) {
            const now = Date.now();
            if (now - lastExecutedCommandRef.current.time > 1100) {
              lastExecutedCommandRef.current = {
                text: interim.trim().toLowerCase(),
                time: now,
              };
              setInterimTranscript("");
              processSpokenUtterance(interim.trim());
              return;
            }
          }
        }

        if (finalUtterance.trim()) {
          const now = Date.now();
          const cleanUtterance = finalUtterance.trim().toLowerCase();
          // Avoid double execution if already handled by the interim trigger
          if (
            now - lastExecutedCommandRef.current.time < 1100 &&
            (cleanUtterance.includes(lastExecutedCommandRef.current.text) ||
              lastExecutedCommandRef.current.text.includes(cleanUtterance))
          ) {
            return;
          }
          lastExecutedCommandRef.current = { text: cleanUtterance, time: now };
          processSpokenUtterance(finalUtterance.trim());
        }
      };

      isListeningRef.current = true;
      recognizer.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setInterimTranscript("");
  };

  // Central Spoken Utterance Processor
  const processSpokenUtterance = (utterance: string) => {
    const parseResult = parseVoiceCommand(utterance);
    const currAns = currentAnswerRef.current;

    if (parseResult.isCommand) {
      const action = parseResult.action;

      // 1. Navigation
      if (action.type === "NAVIGATE_NEXT") {
        setLastCommandFeedback("Moving to next page/question");
        if (accommodations.voiceFeedback && "speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance("Moving to next page");
          u.rate = 1.2;
          window.speechSynthesis.speak(u);
        }
        onNavigateNext();
        return;
      }
      if (action.type === "NAVIGATE_PREV") {
        setLastCommandFeedback("Navigating to previous page/question");
        if (accommodations.voiceFeedback && "speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance("Moving to previous page");
          u.rate = 1.2;
          window.speechSynthesis.speak(u);
        }
        onNavigatePrev();
        return;
      }
      if (action.type === "CHECK_TIME") {
        confirmFeedback("Checking remaining time");
        onTimeQuery();
        return;
      }
      if (action.type === "GO_TO_REVIEW") {
        confirmFeedback("Opening review summary");
        onGoToReview();
        return;
      }
      if (action.type === "READ_QUESTION") {
        setLastCommandFeedback("Repeating question prompt aloud");
        speakText(`Question ${question.number}. ${question.prompt}`);
        setTimeout(() => {
          setLastCommandFeedback((prev) => (prev === "Repeating question prompt aloud" ? null : prev));
        }, 3500);
        return;
      }
      if (action.type === "READ_ANSWER") {
        const textToRead =
          currAns.textAnswer ||
          (currAns.selectedOption
            ? `Selected option ${currAns.selectedOption}`
            : "You have not recorded an answer yet.");
        setLastCommandFeedback("Reading recorded answer aloud");
        speakText(textToRead);
        setTimeout(() => {
          setLastCommandFeedback((prev) => (prev === "Reading recorded answer aloud" ? null : prev));
        }, 3500);
        return;
      }
      if (action.type === "TOGGLE_FLAG") {
        const newFlag = !currAns.isFlaggedForReview;
        onAnswerChange(
          { ...currAns, isFlaggedForReview: newFlag },
          `Toggled review flag to ${newFlag ? "FLAGGED" : "UNFLAGGED"}`
        );
        confirmFeedback(newFlag ? "Question marked for review" : "Flag removed");
        return;
      }
      if (action.type === "TOGGLE_CHEATSHEET") {
        setShowCheatsheet((prev) => !prev);
        confirmFeedback("Toggled voice command cheatsheet");
        return;
      }

      // 2. MCQ Option Selection
      if (action.type === "SELECT_OPTION") {
        onAnswerChange(
          {
            ...currAns,
            selectedOption: action.optionKey,
            lastModified: Date.now(),
          },
          `Selected MCQ Option ${action.optionKey}`
        );
        confirmFeedback(`Selected option ${action.optionKey}`);
        return;
      }

      // 3. Math Mode Conversion
      if (action.type === "MATH_MODE") {
        const mathRes = spokenMathToLaTeX(action.mathSpeech);
        const mathBlock = `\n$$${mathRes.latex}$$\n`;
        const updatedText = (currAns.textAnswer ? currAns.textAnswer.trimEnd() + mathBlock : mathBlock).trim();
        const wordCount = updatedText.split(/\s+/).filter(Boolean).length;

        onAnswerChange(
          {
            ...currAns,
            textAnswer: updatedText,
            latexMath: mathRes.latex,
            wordCount,
            lastModified: Date.now(),
            revisionCount: currAns.revisionCount + 1,
          },
          `Inserted math formula: ${mathRes.latex}`
        );
        confirmFeedback(`Formatted math formula: ${mathRes.latex}`);
        return;
      }

      // 4. Text Editing / Structuring actions
      const updatedText = applyEditingAction(currAns.textAnswer, action);
      const wordCount = updatedText.split(/\s+/).filter(Boolean).length;
      onAnswerChange(
        {
          ...currAns,
          textAnswer: updatedText,
          wordCount,
          lastModified: Date.now(),
          revisionCount: currAns.revisionCount + 1,
        },
        `Executed voice command: ${action.type}`
      );
      confirmFeedback(parseResult.feedbackMessage || "Command executed");
    } else {
      // Direct dictation text
      const newRawTranscript = (currAns.rawTranscript ? currAns.rawTranscript + " " : "") + utterance;
      const needsSpace = currAns.textAnswer.length > 0 && !/[\s\n]$/.test(currAns.textAnswer);
      const updatedText = currAns.textAnswer + (needsSpace ? " " : "") + utterance;
      const wordCount = updatedText.split(/\s+/).filter(Boolean).length;

      onAnswerChange(
        {
          ...currAns,
          textAnswer: updatedText,
          rawTranscript: newRawTranscript,
          wordCount,
          lastModified: Date.now(),
          revisionCount: currAns.revisionCount + 1,
        },
        `Dictated: "${utterance.slice(0, 40)}..."`
      );
    }
  };

  // Manual MCQ Selection
  const handleSelectOption = (key: string) => {
    onAnswerChange(
      {
        ...answer,
        selectedOption: key,
        lastModified: Date.now(),
      },
      `Selected Option ${key}`
    );
  };

  // Diagram change handler
  const handleDiagramChange = (shapes: DiagramShape[]) => {
    onAnswerChange(
      {
        ...answer,
        diagramShapes: shapes,
        lastModified: Date.now(),
      },
      `Modified diagram elements (count: ${shapes.length})`
    );
  };

  // Structuring shortcuts
  const handleInsertStructure = (template: "intro" | "conclusion" | "bullet" | "numbered" | "heading") => {
    let action: VoiceCommandAction;
    switch (template) {
      case "intro":
        action = { type: "INSERT_INTRO" };
        break;
      case "conclusion":
        action = { type: "INSERT_CONCLUSION" };
        break;
      case "bullet":
        action = { type: "ADD_BULLET", bulletText: "" };
        break;
      case "numbered":
        action = { type: "ADD_NUMBERED", pointText: "" };
        break;
      case "heading":
        action = { type: "INSERT_HEADING", headingText: "Key Analysis" };
        break;
    }
    const updated = applyEditingAction(answer.textAnswer, action);
    onAnswerChange(
      {
        ...answer,
        textAnswer: updated,
        wordCount: updated.split(/\s+/).filter(Boolean).length,
        lastModified: Date.now(),
      },
      `Inserted structuring: ${template}`
    );
  };

  const highContrast = !!accommodations.highContrast;

  return (
    <div className={`flex-1 flex flex-col gap-3 min-h-0 overflow-hidden ${highContrast ? "text-yellow-300" : ""}`}>
      {/* Question Header Card (Compact, Non-Scrollable) */}
      <div className={`shrink-0 ${highContrast ? "bg-black border-2 border-yellow-400 text-yellow-300" : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"} rounded-2xl p-4 sm:p-5 shadow-xs`}>
        <div className={`flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b ${highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"}`}>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg ${highContrast ? "bg-yellow-400 text-black font-black" : "bg-blue-600 text-white font-black"} font-mono text-xs sm:text-sm`}>
              Q{question.number}
            </span>
            <span className={`text-xs font-bold ${highContrast ? "text-yellow-400" : "text-stone-500"} uppercase tracking-wider`}>
              {question.section}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-md ${highContrast ? "bg-yellow-950 border border-yellow-400 text-yellow-300" : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"} font-semibold capitalize`}>
              {question.type.replace("_", " ")}
            </span>
            <span className={`text-xs font-mono font-bold ${highContrast ? "text-yellow-400" : "text-blue-600 dark:text-blue-400"}`}>
              {question.marks} Marks
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick navigation to Previous Page */}
            {hasPrev !== undefined && (
              <button
                type="button"
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                className={`px-2.5 py-1.5 rounded-xl border ${
                  highContrast
                    ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                    : "border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                } text-xs font-semibold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs`}
                title="Navigate to Previous Page / Question (Alt+P or speak 'Previous page')"
                aria-label="Previous Page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Previous Page</span>
              </button>
            )}

            {/* Quick navigation to Next Page */}
            {hasNext !== undefined && (
              <button
                type="button"
                onClick={onNavigateNext}
                disabled={!hasNext}
                className={`px-2.5 py-1.5 rounded-xl border ${
                  highContrast
                    ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                    : "border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                } text-xs font-semibold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs`}
                title="Navigate to Next Page / Question (Alt+N or speak 'Next question')"
                aria-label="Next Page"
              >
                <span className="hidden sm:inline">Next Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Flag button */}
            <button
              type="button"
              onClick={() => {
                const newFlag = !answer.isFlaggedForReview;
                onAnswerChange(
                  { ...answer, isFlaggedForReview: newFlag },
                  `Toggled review flag to ${newFlag}`
                );
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                answer.isFlaggedForReview
                  ? (highContrast ? "bg-yellow-400 text-black border-yellow-400" : "bg-amber-500 text-white border-amber-600 shadow-xs")
                  : (highContrast ? "bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/40" : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-amber-400")
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${answer.isFlaggedForReview ? (highContrast ? "fill-black" : "fill-white") : ""}`} />
              <span className="hidden sm:inline">{answer.isFlaggedForReview ? "Flagged" : "Flag"}</span>
            </button>

            {/* Read question TTS button */}
            <button
              type="button"
              onClick={() => {
                if (isSpeakingTts) {
                  stopSpeakingTts();
                } else {
                  speakText(`Question ${question.number}. ${question.prompt}`);
                }
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isSpeakingTts
                  ? (highContrast ? "bg-yellow-400 text-black border-yellow-400 animate-pulse" : "bg-blue-600 text-white border-blue-600 animate-pulse")
                  : (highContrast ? "bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/40" : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-blue-500")
              }`}
              title={isSpeakingTts ? "Stop reading" : "Read question prompt aloud"}
            >
              {isSpeakingTts ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-400" : "text-blue-600"}`} />}
              <span className="hidden sm:inline">{isSpeakingTts ? "Stop Audio" : "Read Prompt"}</span>
            </button>
          </div>
        </div>

        {/* Prompt Text */}
        <div className={`mt-2.5 text-sm sm:text-base font-medium ${highContrast ? "text-yellow-200" : "text-stone-900 dark:text-stone-100"} leading-snug`}>
          {question.prompt}
        </div>

        {/* Math Template Hint if available */}
        {question.mathTemplate && (
          <div className={`mt-2 p-2 rounded-lg border flex items-center justify-between text-xs ${
            highContrast ? "bg-yellow-950/50 border-yellow-400 text-yellow-300" : "bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900"
          }`}>
            <span className={highContrast ? "text-yellow-300 font-medium" : "text-blue-800 dark:text-blue-300 font-medium"}>
              Expression reference:
            </span>
            <span className={`font-mono font-bold ${highContrast ? "text-yellow-300" : "text-stone-800 dark:text-stone-200"}`}>
              ${question.mathTemplate}$
            </span>
          </div>
        )}
      </div>

      {/* 2-COLUMN SIDE-BY-SIDE SPLIT: Text Box on One Side, Voice Commands & Formulas on Other Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* SIDE 1: Text Box & Dictation Workspace (7 cols) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 h-full">
          <div className={`h-full flex flex-col rounded-2xl border p-3.5 sm:p-4 shadow-xs overflow-hidden ${
            highContrast
              ? "bg-black border-2 border-yellow-400 text-yellow-300"
              : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
          }`}>
            {/* Toolbar: Mic & Structure Shortcuts */}
            <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b shrink-0 ${
              highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"
            }`}>
              <div className="flex items-center gap-2">
                {/* Primary Mic Toggle */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    isListening
                      ? (highContrast ? "bg-red-600 text-white ring-2 ring-yellow-400 animate-pulse shadow-md" : "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 animate-pulse")
                      : (highContrast ? "bg-yellow-400 text-black hover:bg-yellow-300 font-black shadow-xs" : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs")
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isListening ? "Stop Voice Input" : "Start Voice Dictation"}</span>
                </button>

                {/* Read Answer Aloud */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeakingTts) {
                      stopSpeakingTts();
                    } else {
                      speakText(answer.textAnswer || "No answer recorded yet.");
                    }
                  }}
                  disabled={!answer.textAnswer.trim()}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                    isSpeakingTts
                      ? (highContrast ? "bg-yellow-400 text-black border-yellow-400 font-black animate-pulse" : "bg-blue-600 text-white border-blue-600 animate-pulse")
                      : (highContrast ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40" : "border-stone-300 dark:border-stone-700 hover:border-blue-500 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300")
                  }`}
                  title="Listen to your current answer"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-400" : "text-blue-600"}`} />
                  <span className="hidden sm:inline">Listen</span>
                </button>
              </div>

              {/* Formatting & Structure Shortcuts */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleInsertStructure("intro")}
                  className={`px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                    highContrast
                      ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                      : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300"
                  }`}
                  title="Say or click 'Insert Introduction'"
                >
                  + Intro
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertStructure("bullet")}
                  className={`p-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                    highContrast
                      ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                      : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300"
                  }`}
                  title="Say or click 'Add bullet point'"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertStructure("numbered")}
                  className={`p-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                    highContrast
                      ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                      : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300"
                  }`}
                  title="Say or click 'Numbered point'"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertStructure("conclusion")}
                  className={`px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                    highContrast
                      ? "border-yellow-400 bg-black text-yellow-300 hover:bg-yellow-950/40"
                      : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300"
                  }`}
                  title="Say or click 'In conclusion'"
                >
                  + End
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMath(!previewMath)}
                  className={`px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                    highContrast
                      ? previewMath
                        ? "bg-yellow-400 text-black border-yellow-400 font-bold"
                        : "border-yellow-400 bg-black text-yellow-300"
                      : previewMath
                      ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                      : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400"
                  }`}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  LaTeX
                </button>
              </div>
            </div>

            {/* Live Command Feedback & Interim Indicator */}
            {lastCommandFeedback && (
              <div className={`mt-2 p-2 rounded-lg border text-xs font-bold flex items-center justify-between shrink-0 animate-fadeIn ${
                highContrast
                  ? "bg-yellow-950/80 border border-yellow-400 text-yellow-300"
                  : "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300"
              }`}>
                <span className="flex items-center gap-1.5">
                  <Sparkles className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-400" : "text-blue-600"}`} />
                  {lastCommandFeedback}
                </span>
                <button
                  type="button"
                  onClick={() => setLastCommandFeedback(null)}
                  className={`${highContrast ? "text-yellow-400 hover:text-white" : "text-stone-400 hover:text-stone-600"} font-bold ml-2`}
                >
                  ×
                </button>
              </div>
            )}

            {isListening && interimTranscript && (
              <div className={`mt-2 p-2 rounded-lg border border-dashed text-xs italic shrink-0 ${
                highContrast
                  ? "bg-black border-yellow-400 text-yellow-300"
                  : "bg-stone-50 dark:bg-stone-800/80 border-blue-400 text-stone-700 dark:text-stone-300"
              }`}>
                Hearing: <span className={`font-bold ${highContrast ? "text-yellow-300 underline" : "text-blue-600 dark:text-blue-400"}`}>"{interimTranscript}"</span>
              </div>
            )}

            {/* Multiple Choice Options (If MCQ) */}
            {question.type === "mcq" && question.options && (
              <div className="my-2 shrink-0">
                <span className={`text-[11px] font-bold ${highContrast ? "text-yellow-400" : "text-stone-500"} uppercase tracking-wider block mb-1.5`}>
                  Choose Option (or say "Select option A/B/C/D"):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {question.options.map((opt) => {
                    const isSelected = answer.selectedOption === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectOption(opt.key)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                          highContrast
                            ? isSelected
                              ? "border-2 border-yellow-400 bg-yellow-950/60 text-yellow-300 shadow-xs"
                              : "border border-yellow-600/70 hover:border-yellow-400 bg-black text-yellow-200"
                            : isSelected
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 ring-1 ring-blue-500 shadow-xs"
                            : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 ${
                            highContrast
                              ? isSelected
                                ? "bg-yellow-400 text-black font-black"
                                : "bg-yellow-950 border border-yellow-500 text-yellow-300"
                              : isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className={`text-xs font-medium truncate ${highContrast ? "text-yellow-200 font-bold" : "text-stone-900 dark:text-stone-100"}`}>
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Diagram Canvas (If Diagram question) */}
            {question.type === "diagram" && (
              <div className="my-2 shrink-0">
                <DiagramCanvas
                  shapes={answer.diagramShapes || []}
                  onShapesChange={handleDiagramChange}
                  initialPrompt={question.diagramInitialPrompt}
                  isListening={isListening}
                />
              </div>
            )}

            {/* The Text Box: Takes available height without window scrolling */}
            <div className="mt-2.5 flex-1 min-h-0 flex flex-col">
              <textarea
                value={answer.textAnswer}
                onChange={(e) => {
                  const text = e.target.value;
                  const wordCount = text.split(/\s+/).filter(Boolean).length;
                  onAnswerChange(
                    {
                      ...answer,
                      textAnswer: text,
                      wordCount,
                      lastModified: Date.now(),
                    },
                    "Manual text edit"
                  );
                }}
                placeholder="Speak your answer directly... (Say 'scratch that' to delete last word, or 'math mode' for formulas)"
                className={`w-full flex-1 p-3.5 rounded-xl border leading-relaxed font-sans resize-none ${
                  highContrast
                    ? "border-2 border-yellow-400 bg-black text-yellow-300 placeholder-yellow-600/70 focus:outline-hidden focus:ring-1 focus:ring-yellow-400 font-bold"
                    : "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                } ${
                  accommodations.fontSize === "x-large"
                    ? "text-lg"
                    : accommodations.fontSize === "large"
                    ? "text-base"
                    : "text-sm sm:text-base"
                } ${accommodations.dyslexiaFont ? "tracking-wider font-mono" : ""}`}
              />

              {/* KaTeX Live Math Preview (Overlay / Under text box) */}
              {previewMath && answer.textAnswer.includes("$") && (
                <div className={`mt-2 p-2.5 rounded-xl border shrink-0 max-h-24 overflow-y-auto ${
                  highContrast
                    ? "bg-black border border-yellow-400 text-yellow-300"
                    : "bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${highContrast ? "text-yellow-400" : "text-stone-500"}`}>
                    Live Math Preview:
                  </span>
                  <KaTeXText text={answer.textAnswer} />
                </div>
              )}
            </div>

            {/* Answer Card Footer */}
            <div className={`flex items-center justify-between text-xs pt-2 mt-2 border-t shrink-0 ${
              highContrast
                ? "border-yellow-500 text-yellow-300"
                : "border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400"
            }`}>
              <div className="flex items-center gap-2.5">
                <span>
                  Words: <strong className={`font-mono ${highContrast ? "text-yellow-300 font-black" : "text-stone-800 dark:text-stone-200"}`}>{answer.wordCount}</strong>
                  {question.wordLimit && ` / ${question.wordLimit}`}
                </span>
                <span>•</span>
                <span>Revisions: <strong className={`font-mono ${highContrast ? "text-yellow-300" : ""}`}>{answer.revisionCount}</strong></span>
              </div>

              <div className={`flex items-center gap-1 font-medium ${highContrast ? "text-yellow-300 font-bold" : "text-emerald-600 dark:text-emerald-400"}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Autosaved</span>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE 2: Voice Commands & Academic Formula Reference (5 cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 h-full">
          <VoiceCommandCheatsheet
            mode="answering"
            variant="side-panel"
            highContrast={highContrast}
            onSelectCommand={(cmd) => {
              if (cmd.phrase.startsWith("select option")) {
                const match = cmd.phrase.match(/select option\s+([A-D])/i);
                if (match) handleSelectOption(match[1].toUpperCase());
              } else {
                processSpokenUtterance(cmd.exampleSpeech);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
