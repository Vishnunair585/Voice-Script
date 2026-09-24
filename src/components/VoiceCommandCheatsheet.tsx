import React, { useState } from "react";
import {
  Mic,
  Sparkles,
  Command,
  FileText,
  Navigation,
  Edit3,
  Calculator,
  ListOrdered,
  HelpCircle,
  CheckCircle2,
  Atom,
  Flame,
  Binary,
  Layers,
  Search,
} from "lucide-react";
import { KaTeXText } from "./KaTeXText";

export interface VoiceCommandItem {
  phrase: string;
  alternatives?: string[];
  action: string;
  category: "navigation" | "editing" | "structuring" | "math" | "tools";
  exampleSpeech: string;
  shortcut?: string;
  latexExample?: string;
}

export interface MathFormulaExample {
  title: string;
  spokenPhrase: string;
  latex: string;
  category: "algebra" | "calculus" | "symbols" | "chemistry" | "physics";
}

const MATH_FORMULA_SHEET: MathFormulaExample[] = [
  {
    title: "Fractions & Quotients",
    spokenPhrase: '"fraction a over b" or "fraction 1 over 2"',
    latex: "\\frac{a}{b} \\quad \\text{or} \\quad \\frac{1}{2}",
    category: "algebra",
  },
  {
    title: "Powers & Exponents",
    spokenPhrase: '"x squared", "y cubed", "10 to the power minus 3"',
    latex: "x^2, \\quad y^3, \\quad 10^{-3}",
    category: "algebra",
  },
  {
    title: "Square Roots & Radicals",
    spokenPhrase: '"square root of x" or "cube root of 27"',
    latex: "\\sqrt{x} \\quad \\text{or} \\quad \\sqrt[3]{27}",
    category: "algebra",
  },
  {
    title: "Quadratic Equations",
    spokenPhrase: '"x squared plus 2x plus 1 equals 0"',
    latex: "x^2 + 2x + 1 = 0",
    category: "algebra",
  },
  {
    title: "Calculus Integrals",
    spokenPhrase: '"integral of x dx" or "integral from 0 to 1 of x squared dx"',
    latex: "\\int x\\,dx \\quad \\text{or} \\quad \\int_{0}^{1} x^2\\,dx",
    category: "calculus",
  },
  {
    title: "Limits & Approximations",
    spokenPhrase: '"limit as x approaches 0 of sine x over x"',
    latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
    category: "calculus",
  },
  {
    title: "Summations (Sigma)",
    spokenPhrase: '"sum from i equals 1 to n of i squared"',
    latex: "\\sum_{i=1}^{n} i^2",
    category: "calculus",
  },
  {
    title: "Greek Mathematical Symbols",
    spokenPhrase: '"alpha, beta, gamma, theta, pi, lambda, omega, delta"',
    latex: "\\alpha, \\; \\beta, \\; \\gamma, \\; \\theta, \\; \\pi, \\; \\lambda, \\; \\Omega, \\; \\Delta",
    category: "symbols",
  },
  {
    title: "Inequalities & Logic",
    spokenPhrase: '"plus minus", "not equal to", "greater than or equal to", "infinity"',
    latex: "\\pm, \\; \\neq, \\; \\ge, \\; \\le, \\; \\infty, \\; \\approx",
    category: "symbols",
  },
  {
    title: "Chemical Compounds",
    spokenPhrase: '"H2O", "CO2", "H2SO4", "NaCl", "C6H12O6"',
    latex: "\\text{H}_2\\text{O}, \\; \\text{CO}_2, \\; \\text{H}_2\\text{SO}_4, \\; \\text{NaCl}",
    category: "chemistry",
  },
  {
    title: "Chemical Reaction Equations",
    spokenPhrase: '"2 H2 plus O2 gives 2 H2O"',
    latex: "2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}",
    category: "chemistry",
  },
  {
    title: "Physics Formulas & Units",
    spokenPhrase: '"E equals m c squared" or "meters per second squared"',
    latex: "E = mc^2 \\quad \\text{or} \\quad \\text{m/s}^2, \\; \\text{kg}, \\; \\text{N}, \\; \\text{J}, \\; \\Omega",
    category: "physics",
  },
];

const SCRIBING_COMMANDS: VoiceCommandItem[] = [
  {
    phrase: "previous page",
    alternatives: ["back page", "go to previous page", "prior page", "previous sheet"],
    action: "Access previous page in the multi-page exam sheet",
    category: "navigation",
    exampleSpeech: "previous page",
    shortcut: "PageUp / Alt+[",
  },
  {
    phrase: "next page",
    alternatives: ["go to next page", "next sheet", "forward page"],
    action: "Advance to the next page in the exam sheet",
    category: "navigation",
    exampleSpeech: "next page",
    shortcut: "PageDown / Alt+]",
  },
  {
    phrase: "new page",
    alternatives: ["add page", "add sheet", "create page"],
    action: "Append a fresh blank sheet page to the document",
    category: "navigation",
    exampleSpeech: "add page",
  },
  {
    phrase: "back to setup",
    alternatives: ["go back", "navigate to previous page"],
    action: "Return to the previous screen or setup page",
    category: "navigation",
    exampleSpeech: "go back",
    shortcut: "Alt+←",
  },
  {
    phrase: "scratch that",
    alternatives: ["undo", "delete last word"],
    action: "Erase the most recently spoken word or phrase",
    category: "editing",
    exampleSpeech: "scratch that",
  },
  {
    phrase: "delete last sentence",
    alternatives: ["remove last sentence", "erase sentence"],
    action: "Delete the entire preceding sentence",
    category: "editing",
    exampleSpeech: "delete last sentence",
  },
  {
    phrase: "clear text",
    alternatives: ["clear transcript", "erase text"],
    action: "Clear all spoken transcript on the active page",
    category: "editing",
    exampleSpeech: "clear text",
  },
  {
    phrase: "new paragraph",
    alternatives: ["next paragraph"],
    action: "Insert a double line break into spoken answer",
    category: "editing",
    exampleSpeech: "new paragraph",
  },
  {
    phrase: "new line",
    alternatives: ["next line", "line break"],
    action: "Insert a single line break in transcript",
    category: "editing",
    exampleSpeech: "new line",
  },
  {
    phrase: "format answer",
    alternatives: ["format text", "clean up", "structure answer"],
    action: "Trigger AI Academic Formatting with KaTeX & LaTeX formulas",
    category: "tools",
    exampleSpeech: "format answer",
  },
  {
    phrase: "download pdf",
    alternatives: ["export pdf", "save document", "download file"],
    action: "Generate and download multi-page examination sheet PDF",
    category: "tools",
    exampleSpeech: "download pdf",
  },
  {
    phrase: "stop listening",
    alternatives: ["stop microphone", "stop scribe"],
    action: "Pause speech recognition and microphone",
    category: "tools",
    exampleSpeech: "stop listening",
    shortcut: "Alt+M",
  },
];

const ANSWERING_COMMANDS: VoiceCommandItem[] = [
  {
    phrase: "move to next page",
    alternatives: ["next page", "next question", "move to next question", "go to next page"],
    action: "Advance immediately to the next examination question / page",
    category: "navigation",
    exampleSpeech: "move to next page",
    shortcut: "Alt+N",
  },
  {
    phrase: "previous page",
    alternatives: ["move to previous page", "previous question", "go to previous page"],
    action: "Navigate back to previous examination question / page",
    category: "navigation",
    exampleSpeech: "previous page",
    shortcut: "Alt+P",
  },
  {
    phrase: "repeat this question again",
    alternatives: ["repeat question", "read question", "read prompt"],
    action: "Text-to-Speech immediately re-reads question prompt aloud",
    category: "tools",
    exampleSpeech: "repeat this question again",
  },
  {
    phrase: "read answer",
    alternatives: ["read back my answer", "listen to answer"],
    action: "Speaks your currently recorded answer response aloud",
    category: "tools",
    exampleSpeech: "read answer",
  },
  {
    phrase: "go to question [number]",
    alternatives: ["question 2", "jump to question 3"],
    action: "Jump directly to specified question number",
    category: "navigation",
    exampleSpeech: "go to question 2",
  },
  {
    phrase: "check time",
    alternatives: ["time remaining", "how much time left"],
    action: "Speaks remaining exam duration aloud via Text-to-Speech",
    category: "navigation",
    exampleSpeech: "check time",
  },
  {
    phrase: "scratch that",
    alternatives: ["undo", "delete last word"],
    action: "Removes the last spoken word or phrase",
    category: "editing",
    exampleSpeech: "scratch that",
  },
  {
    phrase: "delete last sentence",
    alternatives: ["erase sentence"],
    action: "Deletes the most recently dictated sentence",
    category: "editing",
    exampleSpeech: "delete last sentence",
  },
  {
    phrase: "clear answer",
    alternatives: ["clear text", "reset answer"],
    action: "Clears all text in the answer buffer for this question",
    category: "editing",
    exampleSpeech: "clear answer",
  },
  {
    phrase: "select option [A-D]",
    alternatives: ["option A", "choose option B", "pick option C"],
    action: "Selects multiple choice answer option hands-free",
    category: "tools",
    exampleSpeech: "select option B",
  },
  {
    phrase: "flag question",
    alternatives: ["mark for review", "toggle flag"],
    action: "Marks question for later review before submission",
    category: "tools",
    exampleSpeech: "flag question",
    shortcut: "Alt+F",
  },
  {
    phrase: "review exam",
    alternatives: ["go to review", "review answers"],
    action: "Open exam review summary and submission status",
    category: "navigation",
    exampleSpeech: "review exam",
  },
];

export { MATH_FORMULA_SHEET, SCRIBING_COMMANDS, ANSWERING_COMMANDS };

interface VoiceCommandCheatsheetProps {
  mode: "scribing" | "answering";
  onSelectCommand?: (command: VoiceCommandItem) => void;
  className?: string;
  defaultExpanded?: boolean; // Kept for backwards-compatibility
  variant?: "default" | "side-panel";
  highContrast?: boolean;
}

export function VoiceCommandCheatsheet({
  mode,
  onSelectCommand,
  className = "",
  variant = "default",
  highContrast = false,
}: VoiceCommandCheatsheetProps) {
  const [spokenFeedback, setSpokenFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"commands" | "math" | "science">("commands");
  const [searchTerm, setSearchTerm] = useState("");

  const commands = mode === "scribing" ? SCRIBING_COMMANDS : ANSWERING_COMMANDS;

  // Text-to-speech demonstration helper (allows clicking or hearing correct pronunciation)
  const handleDemonstrateSpeech = (phrase: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      setSpokenFeedback(`Pronouncing: "${phrase}"`);
      setTimeout(() => setSpokenFeedback(null), 3000);
    }
  };

  // Filtered lists for side-panel mode
  const filteredCommands = commands.filter(
    (c) =>
      c.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.shortcut && c.shortcut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const mathFormulas = MATH_FORMULA_SHEET.filter(
    (f) => f.category === "algebra" || f.category === "calculus" || f.category === "symbols"
  ).filter(
    (f) =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.spokenPhrase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scienceFormulas = MATH_FORMULA_SHEET.filter(
    (f) => f.category === "chemistry" || f.category === "physics"
  ).filter(
    (f) =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.spokenPhrase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (variant === "side-panel") {
    return (
      <div
        className={`h-full flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
          highContrast
            ? "bg-black border-2 border-yellow-400 text-yellow-300"
            : "bg-white dark:bg-[#1a2332] border-stone-200 dark:border-stone-800"
        } ${className}`}
        aria-label="Voice Commands & Mathematical Reference Side Panel"
      >
        {/* Header */}
        <div
          className={`p-3.5 border-b shrink-0 flex items-center justify-between gap-2 ${
            highContrast ? "border-yellow-500 bg-yellow-950/30" : "border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                highContrast ? "bg-yellow-400 text-black font-black" : "bg-blue-600 text-white shadow-xs"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black uppercase tracking-wider ${highContrast ? "text-yellow-300" : "text-stone-900 dark:text-stone-100"}`}>
                  Voice Commands & Reference
                </span>
              </div>
              <p className={`text-[10px] ${highContrast ? "text-yellow-400/80" : "text-stone-500 dark:text-stone-400"}`}>
                Always visible • Speak or tap
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              highContrast
                ? "bg-yellow-400 text-black font-black"
                : "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
            }`}
          >
            Hands-Free
          </span>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className={`p-2.5 border-b shrink-0 space-y-2 ${highContrast ? "border-yellow-500" : "border-stone-200 dark:border-stone-800"}`}>
          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("commands")}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer truncate ${
                activeTab === "commands"
                  ? highContrast
                    ? "bg-yellow-400 text-black font-black shadow-xs"
                    : "bg-white dark:bg-stone-900 text-blue-700 dark:text-blue-300 shadow-xs"
                  : highContrast
                  ? "text-yellow-400 hover:text-white"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Commands ({commands.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("math")}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer truncate ${
                activeTab === "math"
                  ? highContrast
                    ? "bg-yellow-400 text-black font-black shadow-xs"
                    : "bg-white dark:bg-stone-900 text-blue-700 dark:text-blue-300 shadow-xs"
                  : highContrast
                  ? "text-yellow-400 hover:text-white"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Math & LaTeX
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("science")}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer truncate ${
                activeTab === "science"
                  ? highContrast
                    ? "bg-yellow-400 text-black font-black shadow-xs"
                    : "bg-white dark:bg-stone-900 text-blue-700 dark:text-blue-300 shadow-xs"
                  : highContrast
                  ? "text-yellow-400 hover:text-white"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Science
            </button>
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search className={`w-3 h-3 absolute left-2.5 top-2.5 ${highContrast ? "text-yellow-400" : "text-stone-400"}`} />
            <input
              type="text"
              placeholder={`Search ${activeTab === "commands" ? "voice commands" : "formulas"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-7 pr-3 py-1.5 rounded-lg text-xs ${
                highContrast
                  ? "bg-black border border-yellow-400 text-yellow-300 placeholder-yellow-600"
                  : "bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-400"
              } focus:outline-hidden`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-stone-400 hover:text-stone-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {spokenFeedback && (
          <div
            className={`mx-2.5 mt-2 text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center justify-between shrink-0 ${
              highContrast
                ? "bg-yellow-950 border-yellow-400 text-yellow-300"
                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900"
            }`}
          >
            <span>{spokenFeedback}</span>
            <button type="button" onClick={() => setSpokenFeedback(null)}>×</button>
          </div>
        )}

        {/* Scrollable Items List - strictly within side-panel container */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
          {activeTab === "commands" && (
            <div className="space-y-1.5">
              {filteredCommands.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching commands found</p>
              ) : (
                filteredCommands.map((cmd) => (
                  <div
                    key={cmd.phrase}
                    onClick={() => {
                      handleDemonstrateSpeech(cmd.phrase);
                      if (onSelectCommand) onSelectCommand(cmd);
                    }}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 group ${
                      highContrast
                        ? "border-yellow-500/70 bg-black hover:bg-yellow-950/50 hover:border-yellow-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                    title={`Click or speak: "${cmd.phrase}". Action: ${cmd.action}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-mono font-bold text-xs flex items-center gap-1 ${
                          highContrast ? "text-yellow-300 group-hover:underline" : "text-blue-700 dark:text-blue-300 group-hover:underline"
                        }`}
                      >
                        <Mic className="w-2.5 h-2.5 shrink-0 opacity-70" />
                        "{cmd.phrase}"
                      </span>
                      {cmd.shortcut && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            highContrast
                              ? "bg-yellow-950 text-yellow-300 border border-yellow-500"
                              : "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                          }`}
                        >
                          {cmd.shortcut}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-tight ${highContrast ? "text-yellow-200/90" : "text-stone-600 dark:text-stone-400"}`}>
                      {cmd.action}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "math" && (
            <div className="space-y-2">
              {mathFormulas.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching formulas found</p>
              ) : (
                mathFormulas.map((f, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleDemonstrateSpeech(f.spokenPhrase.replace(/"/g, ""))}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      highContrast
                        ? "border-yellow-500/70 bg-black hover:border-yellow-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${highContrast ? "text-yellow-400" : "text-stone-500 dark:text-stone-400"}`}>
                        {f.title}
                      </span>
                      <span className="text-[10px] text-blue-500 font-medium">Tap to hear</span>
                    </div>
                    <p className={`text-xs font-mono font-medium ${highContrast ? "text-yellow-300" : "text-blue-700 dark:text-blue-300"}`}>
                      Speak: {f.spokenPhrase}
                    </p>
                    <div
                      className={`p-1.5 rounded-lg border text-center text-xs overflow-x-auto ${
                        highContrast
                          ? "bg-yellow-950/40 border-yellow-500/50 text-yellow-300"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"
                      }`}
                    >
                      <KaTeXText text={`$${f.latex}$`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "science" && (
            <div className="space-y-2">
              {scienceFormulas.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No matching science items</p>
              ) : (
                scienceFormulas.map((f, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleDemonstrateSpeech(f.spokenPhrase.replace(/"/g, ""))}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      highContrast
                        ? "border-yellow-500/70 bg-black hover:border-yellow-400"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${highContrast ? "text-yellow-400" : "text-stone-500 dark:text-stone-400"}`}>
                        {f.title}
                      </span>
                      <span className="text-[10px] text-blue-500 font-medium">Tap to hear</span>
                    </div>
                    <p className={`text-xs font-mono font-medium ${highContrast ? "text-yellow-300" : "text-blue-700 dark:text-blue-300"}`}>
                      Speak: {f.spokenPhrase}
                    </p>
                    <div
                      className={`p-1.5 rounded-lg border text-center text-xs overflow-x-auto ${
                        highContrast
                          ? "bg-yellow-950/40 border-yellow-500/50 text-yellow-300"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100"
                      }`}
                    >
                      <KaTeXText text={`$${f.latex}$`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white dark:bg-[#1a2332] border-stone-200 dark:border-stone-700 shadow-sm flex flex-col gap-4 p-4 sm:p-5 ${className}`}
      aria-label="Voice Commands & Mathematical Formula Sheet"
    >
      {/* HEADER: Always fully open and visible without any dropdowns or collapsing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 dark:text-stone-100">
                Voice Commands & Academic Formula Sheet
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Always Visible • Hands-Free
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Speak any phrase below clearly into your microphone. No clicking or dropdown required.
            </p>
          </div>
        </div>

        {spokenFeedback && (
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900 shrink-0">
            {spokenFeedback}
          </div>
        )}
      </div>

      {/* SECTION 1: VOICE CONTROL COMMANDS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            1. Spoken Control & Editing Commands
          </span>
          <span className="text-[11px] font-medium text-stone-500">
            {commands.length} Commands Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {commands.map((cmd) => (
            <div
              key={cmd.phrase}
              onClick={() => {
                handleDemonstrateSpeech(cmd.phrase);
                if (onSelectCommand) onSelectCommand(cmd);
              }}
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
              title={`Click or speak: "${cmd.phrase}". Action: ${cmd.action}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 group-hover:underline">
                  "{cmd.phrase}"
                </span>
                {cmd.shortcut && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                    {cmd.shortcut}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1">
                {cmd.action}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: COMPLETE MATHEMATICAL & SCIENTIFIC FORMULA SHEET */}
      <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            2. Spoken Formula & Symbol Reference Sheet (LaTeX & KaTeX)
          </span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
            Automatically Formatted
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400">
          Speak equations, powers, roots, or scientific terms normally. Our Academic Scribe engine renders them with standard academic mathematical notation:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MATH_FORMULA_SHEET.map((f, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/40 flex flex-col justify-between gap-2"
            >
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  {f.title}
                </span>
                <p className="text-xs font-mono font-medium text-blue-700 dark:text-blue-300 mt-0.5">
                  Speak: {f.spokenPhrase}
                </p>
              </div>

              {/* Live KaTeX Rendered Preview */}
              <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-x-auto text-xs text-center py-2 text-stone-900 dark:text-stone-100 font-serif">
                <KaTeXText text={`$${f.latex}$`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
