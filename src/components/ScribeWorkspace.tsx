import React, { useState } from "react";
import {
  Mic,
  MicOff,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  FileText,
  RefreshCw,
  Sparkles,
  Download,
  Layers,
  Volume2,
  RotateCcw,
  Compass,
  FileCheck,
  Command,
  Settings,
} from "lucide-react";
import { KaTeXText } from "./KaTeXText";
import { AudioVisualizer } from "./AudioVisualizer";
import {
  MATH_FORMULA_SHEET,
} from "./VoiceCommandCheatsheet";
import {
  Subject,
  Language,
  SheetSize,
  SheetOrientation,
  DocumentPage,
  ScreenState,
} from "../types";

interface ScribeWorkspaceProps {
  studentName: string;
  examinerName: string;
  subject: Subject;
  language: Language;
  targetLanguage: Language;
  sheetSize: SheetSize;
  sheetOrientation: SheetOrientation;
  previewFontSize: number;
  setPreviewFontSize: (size: number) => void;
  isListening: boolean;
  toggleListening: () => void;
  stopListening: () => void;
  confidenceScore: number | null;
  transcript: string;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  interimTranscript: string;
  formattedAnswer: string;
  setFormattedAnswer: React.Dispatch<React.SetStateAction<string>>;
  isFormatting: boolean;
  handleFormatAnswer: () => void;
  isDownloading: boolean;
  pdfProgress: number;
  exportFormat: "PDF" | "Markdown";
  setExportFormat: (f: "PDF" | "Markdown") => void;
  handleDownloadFile: () => void;
  handleSaveToFirebase: () => void;
  handleTextToSpeech: () => void;
  isSpeaking: boolean;
  handleResetCurrentPage: () => void;
  documentPages: DocumentPage[];
  currentPageIndex: number;
  currentPageNumber: number;
  totalDocumentPages: number;
  hasPreviousDocumentPage: boolean;
  hasNextDocumentPage: boolean;
  handleAccessPreviousDocumentPage: () => void;
  handleAccessNextDocumentPage: () => void;
  handleAddNewDocumentPage: () => void;
  handleDeleteDocumentPage: (idx: number) => void;
  handleSelectDocumentPage: (idx: number) => void;
  navigateBack: () => void;
  navigateTo: (screen: ScreenState) => void;
  setShowShortcutsModal: (show: boolean) => void;
  setPageSwitchFeedback: (fb: string | null) => void;
  providerUsed?: string;
}

export const ScribeWorkspace: React.FC<ScribeWorkspaceProps> = ({
  studentName,
  examinerName,
  subject,
  language,
  targetLanguage,
  sheetSize,
  sheetOrientation,
  previewFontSize,
  setPreviewFontSize,
  isListening,
  toggleListening,
  stopListening,
  confidenceScore,
  transcript,
  setTranscript,
  interimTranscript,
  formattedAnswer,
  setFormattedAnswer,
  isFormatting,
  handleFormatAnswer,
  isDownloading,
  pdfProgress,
  exportFormat,
  setExportFormat,
  handleDownloadFile,
  handleSaveToFirebase,
  handleTextToSpeech,
  isSpeaking,
  handleResetCurrentPage,
  documentPages,
  currentPageIndex,
  currentPageNumber,
  totalDocumentPages,
  hasPreviousDocumentPage,
  hasNextDocumentPage,
  handleAccessPreviousDocumentPage,
  handleAccessNextDocumentPage,
  handleAddNewDocumentPage,
  handleDeleteDocumentPage,
  handleSelectDocumentPage,
  navigateBack,
  navigateTo,
  setShowShortcutsModal,
  setPageSwitchFeedback,
}) => {
  const [workspaceViewTab, setWorkspaceViewTab] = useState<"editor" | "sheetPreview">("editor");
  const [pageChangesTab, setPageChangesTab] = useState<"changes" | "math" | "science">("changes");
  const [pageChangesSearch, setPageChangesSearch] = useState("");

  const handleSpeakSample = (sample: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sample);
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
      setPageSwitchFeedback(`Say: "${sample}"`);
      setTimeout(() => setPageSwitchFeedback(null), 2500);
    }
  };

  const handleInsertSampleToTranscript = (sample: string) => {
    setTranscript((prev) => (prev ? `${prev.trimEnd()} ${sample}` : sample));
    setPageSwitchFeedback(`Added: "${sample}"`);
    setTimeout(() => setPageSwitchFeedback(null), 2000);
  };

  return (
    <div className="h-[calc(100vh-68px)] max-h-[calc(100vh-68px)] flex flex-col overflow-hidden w-full max-w-[1740px] mx-auto px-2 sm:px-4 py-2 select-text">
      {/* ======================================================== */}
      {/* TOP FIXED COMPACT TOOLBAR (No Page Scroll)               */}
      {/* ======================================================== */}
      <div className="shrink-0 flex items-center justify-between gap-3 bg-white dark:bg-[#1f2937] border border-stone-200 dark:border-stone-800 px-3.5 py-2 rounded-2xl shadow-xs mb-2 transition-colors duration-300">
        {/* Left: Setup back button + candidate & subject meta */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={navigateBack}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#FAF9F6] dark:bg-stone-800 hover:bg-[#E7E5E4] dark:hover:bg-stone-700 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
            title="Return to Setup Configuration [Alt + Left Arrow]"
          >
            <ArrowLeft className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            <span className="hidden sm:inline">Setup</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <span className="font-extrabold text-stone-900 dark:text-white text-sm truncate">
              {studentName ? studentName.trim() : "Student Candidate"}
            </span>
            <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md shrink-0">
              {subject}
            </span>
            <span className="hidden md:inline-flex text-[10px] font-mono text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md shrink-0">
              {sheetSize} ({sheetOrientation})
            </span>
          </div>
        </div>

        {/* Center: View Switcher Tabs (Dictation Studio vs Full Sheet Preview) */}
        <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={() => setWorkspaceViewTab("editor")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              workspaceViewTab === "editor"
                ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Dictation Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceViewTab("sheetPreview")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              workspaceViewTab === "sheetPreview"
                ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Full Sheet Preview</span>
          </button>
        </div>

        {/* Right: Font size, Shortcuts, Config */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 bg-[#FAF9F6] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-1 rounded-lg">
            <label htmlFor="font-size-slider-top" className="text-xs font-bold text-stone-500">Aa</label>
            <input
              id="font-size-slider-top"
              type="range"
              min="10"
              max="24"
              value={previewFontSize}
              onChange={(e) => setPreviewFontSize(Number(e.target.value))}
              className="w-16 accent-blue-600 cursor-pointer"
              title="Font Size"
            />
            <span className="text-[11px] font-mono font-bold text-stone-500 w-4 text-right">{previewFontSize}</span>
          </div>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 text-xs font-bold text-stone-600 bg-[#FAF9F6] hover:bg-[#E7E5E4] border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Keyboard Shortcuts"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>

          <button
            onClick={() => navigateTo("SETUP_VIEW")}
            className="p-1.5 sm:px-2.5 sm:py-1 text-xs font-bold text-stone-600 bg-[#FAF9F6] hover:bg-[#E7E5E4] border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Edit Configuration"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Config</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* THREE-PANEL NON-SCROLLABLE TEMPLATE                      */}
      {/* ======================================================== */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* ======================================================== */}
        {/* 1. LEFT PANEL: PAGE NAVIGATION CHEATSHEET & CONTROLS     */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 h-full flex flex-col overflow-hidden bg-white dark:bg-[#1f2937] border border-stone-200 dark:border-stone-800 rounded-2xl p-3 shadow-xs">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-100">
                  Page Navigation
                </h3>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                  Voice Cheats & Controls
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
              Pg {currentPageNumber}/{totalDocumentPages}
            </span>
          </div>

          {/* Interactive Page Navigation Box (Direct Controls) */}
          <div className="shrink-0 p-2.5 mb-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={handleAccessPreviousDocumentPage}
                disabled={!hasPreviousDocumentPage}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  hasPreviousDocumentPage
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-95"
                    : "bg-stone-200/60 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed"
                }`}
                title="Access Previous Page [PageUp / Alt+[]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleAccessNextDocumentPage}
                disabled={!hasNextDocumentPage}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  hasNextDocumentPage
                    ? "bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-2xs active:scale-95"
                    : "bg-stone-200/60 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed"
                }`}
                title="Next Page [PageDown / Alt+]]"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Jump to specific page pills + Add page */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-200/80 dark:border-stone-800">
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {documentPages.map((pg, idx) => (
                  <button
                    key={pg.id}
                    type="button"
                    onClick={() => handleSelectDocumentPage(idx)}
                    className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                      idx === currentPageIndex
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 border border-stone-200 dark:border-stone-700"
                    }`}
                    title={`Jump to Page ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleAddNewDocumentPage}
                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                  title="Add fresh blank page to answer document"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
                {totalDocumentPages > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDocumentPage(currentPageIndex)}
                    className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Delete current page"
                    aria-label="Delete page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Navigation Cheat Codes */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
              Navigation Voice Commands
            </div>

            {/* Command: Previous Page */}
            <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">
                  "previous page"
                </span>
                <span className="text-[10px] font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded">
                  PageUp / Alt+[
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Switches back to preceding sheet in document.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={handleAccessPreviousDocumentPage}
                  disabled={!hasPreviousDocumentPage}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer disabled:opacity-40"
                >
                  Jump
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeakSample("previous page")}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                >
                  🔊 Say
                </button>
              </div>
            </div>

            {/* Command: Next Page */}
            <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">
                  "next page"
                </span>
                <span className="text-[10px] font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded">
                  PageDown / Alt+]
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Advances forward to next sheet page.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={handleAccessNextDocumentPage}
                  disabled={!hasNextDocumentPage}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer disabled:opacity-40"
                >
                  Jump
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeakSample("next page")}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                >
                  🔊 Say
                </button>
              </div>
            </div>

            {/* Command: New Page */}
            <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300">
                  "new page" / "add page"
                </span>
                <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                  + Sheet
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Appends a brand new blank page to document.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={handleAddNewDocumentPage}
                  className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded cursor-pointer"
                >
                  + Add Page
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeakSample("new page")}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                >
                  🔊 Say
                </button>
              </div>
            </div>

            {/* Command: Go to Page N */}
            <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-stone-800 dark:text-stone-200">
                  "go to page [1, 2...]"
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Say e.g. "go to page 1" to jump to that sheet immediately.
              </p>
              <div className="flex items-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => handleSpeakSample("go to page 1")}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                >
                  🔊 Say "go to page 1"
                </button>
              </div>
            </div>

            {/* Command: First Page / Last Page */}
            <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
              <span className="font-mono text-xs font-black text-stone-800 dark:text-stone-200">
                "first page" • "last page"
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Jumps directly to the beginning or end of your exam sheets.
              </p>
            </div>

            {/* Command: Back to Setup */}
            <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-stone-800 dark:text-stone-200">
                  "back to setup"
                </span>
                <span className="text-[10px] font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded">
                  Alt + ←
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Returns back to candidate registration and exam configuration.
              </p>
            </div>
          </div>

          {/* Footer Tip */}
          <div className="shrink-0 pt-2 border-t border-stone-200 dark:border-stone-800 text-[10px] text-stone-400 flex items-center gap-1">
            <Mic className="w-3 h-3 text-blue-500" />
            <span>Speak commands naturally during dictation</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. CENTER PANEL: STUDIO / LIVE SHEET PREVIEW             */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 h-full flex flex-col overflow-hidden bg-white dark:bg-[#1f2937] border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 shadow-xs">
          {workspaceViewTab === "editor" ? (
            <>
              {/* Status bar */}
              <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Sheet Page {currentPageNumber} of {totalDocumentPages}
                  </span>
                  <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                    {subject}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-md ${
                    isListening
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse"
                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isListening ? "bg-emerald-500 animate-ping" : "bg-stone-400"}`} />
                    {isListening ? "Recording Active" : "Mic Offline"}
                  </span>
                </div>
              </div>

              {/* ENLARGED ACCESSIBLE MICROPHONE BUTTON (Prominent, High-Contrast) */}
              <div className="shrink-0 mb-3">
                <button
                  id="mic-toggle-btn"
                  onClick={toggleListening}
                  type="button"
                  aria-label={isListening ? "Stop recording spoken dictation" : "Play / Start recording spoken dictation"}
                  className={`w-full min-h-[64px] sm:min-h-[72px] px-5 py-3 rounded-2xl font-black flex items-center justify-between cursor-pointer transition-all shadow-md active:scale-[0.99] select-none ${
                    isListening
                      ? "bg-[#059669] hover:bg-[#047857] text-white ring-4 ring-emerald-500/30 animate-pulse"
                      : "bg-[#EF4444] hover:bg-[#DC2626] text-white ring-4 ring-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className={`p-2.5 rounded-xl ${isListening ? "bg-white/20 animate-bounce" : "bg-white/20"}`}>
                      {isListening ? (
                        <MicOff className="w-7 h-7 sm:w-8 h-8 text-white" />
                      ) : (
                        <Mic className="w-7 h-7 sm:w-8 h-8 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-black tracking-wide leading-none mb-1">
                        {isListening ? "RECORDING ACTIVE (STOP)" : "START DICTATING (RECORD)"}
                      </div>
                      <div className="text-xs text-white/90 font-medium">
                        {isListening
                          ? "Listening in real-time... Tap anywhere here to pause dictation"
                          : "Microphone offline • Tap here to begin speaking • [Shortcut: Ctrl+M]"}
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <AudioVisualizer isListening={isListening} />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-white/80">
                      {isListening ? "Audio Stream On" : "Ready"}
                    </span>
                  </div>
                </button>
              </div>

              {/* SPOKEN TRANSCRIPTION TEXT BOX */}
              <div className="flex-1 min-h-0 flex flex-col gap-1.5 mb-2.5">
                <div className="shrink-0 flex items-center justify-between text-xs">
                  <label
                    htmlFor="workspace-transcript-box"
                    className="font-bold uppercase tracking-wider text-stone-700 dark:text-stone-200 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Spoken Transcription</span>
                  </label>
                  <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                    <span>{transcript.length} chars</span>
                    {transcript.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setTranscript("");
                          setFormattedAnswer("");
                          setPageSwitchFeedback("Cleared transcription");
                          setTimeout(() => setPageSwitchFeedback(null), 2000);
                        }}
                        className="text-stone-400 hover:text-red-500 cursor-pointer font-bold transition-colors"
                        title="Clear transcription"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  id="workspace-transcript-box"
                  placeholder="Your spoken words stream here in real-time... Speak answers, math formulas, and commands naturally. You may also edit directly anytime."
                  value={
                    isListening
                      ? `${transcript}${interimTranscript}`
                      : transcript
                  }
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isListening}
                  className="w-full flex-1 min-h-[120px] p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none font-sans disabled:opacity-90 transition-colors"
                />

                {isListening && interimTranscript && (
                  <div className="shrink-0 p-1.5 rounded-lg border border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs italic">
                    Hearing: <span className="font-bold underline">"{interimTranscript}"</span>
                  </div>
                )}
              </div>

              {/* PRIMARY ACTIONS: FORMAT ACADEMIC TEXT & APPROVE & DOWNLOAD PDF */}
              <div className="shrink-0 space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Format Academic Text Button */}
                  <button
                    id="format-text-btn"
                    onClick={handleFormatAnswer}
                    disabled={isFormatting || !transcript.trim()}
                    className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:text-stone-400 dark:disabled:text-stone-500 disabled:cursor-not-allowed active:scale-95"
                    title="Format raw speech into formal academic layout (say 'format answer')"
                  >
                    {isFormatting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Formatting Answer...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-200" />
                        <span>Format Academic Text</span>
                      </>
                    )}
                  </button>

                  {/* Download Official PDF Button */}
                  <button
                    onClick={handleDownloadFile}
                    disabled={
                      isDownloading ||
                      (!transcript.trim() && !formattedAnswer.trim())
                    }
                    className="relative h-11 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:text-stone-400 dark:disabled:text-stone-500 disabled:cursor-not-allowed overflow-hidden active:scale-95"
                    title="Download complete examination answer sheet as PDF (say 'download pdf')"
                  >
                    {isDownloading && (
                      <div
                        className="absolute left-0 top-0 h-full bg-[#059669] transition-all duration-300 ease-out"
                        style={{ width: `${pdfProgress}%` }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isDownloading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Exporting PDF ({pdfProgress}%)...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-emerald-200" />
                          <span>Download Official {exportFormat}</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {/* Secondary Tools Row: Cloud, Read Aloud, Format Selector, Reset */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={handleSaveToFirebase}
                    disabled={!transcript.trim() && !formattedAnswer.trim()}
                    className="h-8 px-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Save document state to cloud"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="truncate">Save Cloud</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTextToSpeech}
                    disabled={isSpeaking || (!transcript.trim() && !formattedAnswer.trim())}
                    className="h-8 px-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Listen to dictated answer read aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                    <span className="truncate">{isSpeaking ? "Speaking..." : "Read Aloud"}</span>
                  </button>

                  <div className="h-8 relative">
                    <select
                      id="export-format"
                      value={exportFormat}
                      onChange={(e) =>
                        setExportFormat(e.target.value as "PDF" | "Markdown")
                      }
                      className="w-full h-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-2 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer focus:ring-1 focus:ring-blue-500"
                      title="Export Format"
                    >
                      <option value="PDF">PDF (.pdf)</option>
                      <option value="Markdown">Markdown (.md)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetCurrentPage}
                    className="h-8 px-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Reset current page content"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="truncate">Reset</span>
                  </button>
                </div>
              </div>

              {/* DOCUMENT LIVE SUMMARY CARD (Compact, non-scrollable) */}
              <div className="shrink-0 mt-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-0.5">
                    <span>Student: <strong className="text-stone-700 dark:text-stone-200">{studentName ? studentName.trim() : "Registered Candidate"}</strong></span>
                    <span>•</span>
                    <span>Evaluator: <strong className="text-stone-700 dark:text-stone-200">{examinerName ? examinerName.trim() : "Room Invigilator"}</strong></span>
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-300 truncate">
                    {formattedAnswer ? (
                      <span>Formatted: {formattedAnswer.slice(0, 90)}...</span>
                    ) : transcript ? (
                      <span>Spoken: {transcript.slice(0, 90)}...</span>
                    ) : (
                      <span className="italic text-stone-400">Sheet is currently blank. Tap dictating above to begin.</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWorkspaceViewTab("sheetPreview")}
                  className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                  title="Open full sheet preview canvas"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Preview Sheet ↗</span>
                </button>
              </div>
            </>
          ) : (
            /* FULL SHEET PREVIEW CANVAS (Inside Center Panel when toggled) */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setWorkspaceViewTab("editor")}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dictation Studio</span>
                </button>
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  Page {currentPageNumber} of {totalDocumentPages} Preview
                </span>
              </div>

              {/* Interactive Sheet Preview Target */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 bg-[#E7E5E4]/40 dark:bg-stone-900 rounded-xl flex justify-center">
                <div
                  id="pdf-render-target"
                  className="w-full max-w-[620px] p-6 bg-white text-stone-800 shadow-md rounded-lg flex flex-col justify-between font-sans text-xs"
                  style={{ minHeight: "680px" }}
                >
                  {/* Blue Accent Bar */}
                  <div className="h-1 bg-blue-600 w-full mb-4" />

                  {/* Sheet Header */}
                  <div className="border-b border-stone-200 pb-3 mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          BOARD ACCESSIBILITY DOCUMENT
                        </span>
                        <h2 className="text-base font-black text-stone-900 mt-1">
                          Academic Written Examination Answer Sheet
                        </h2>
                      </div>
                      <div className="text-right text-[10px] text-stone-500 font-mono">
                        <div>Format: <strong>{sheetSize} ({sheetOrientation})</strong></div>
                        <div>Subject: <strong>{subject}</strong></div>
                        <div className="text-blue-600 font-bold">PAGE {currentPageNumber} OF {totalDocumentPages}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-stone-50 rounded-lg border border-stone-200 text-xs">
                      <div>
                        <span className="text-[9px] text-stone-400 font-bold uppercase block">Student Candidate</span>
                        <strong className="text-stone-900">{studentName.trim() || "Registered Candidate"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-stone-400 font-bold uppercase block">Witness Scribe / Invigilator</span>
                        <strong className="text-stone-900">{examinerName.trim() || "Assigned Room Invigilator"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Sheet Content */}
                  <div className="flex-1 py-2">
                    {formattedAnswer ? (
                      <KaTeXText text={formattedAnswer} />
                    ) : transcript ? (
                      <div className="text-stone-800 whitespace-pre-wrap leading-relaxed">{transcript}</div>
                    ) : (
                      <div className="text-stone-300 italic text-center py-10">This page has no transcribed content yet.</div>
                    )}
                  </div>

                  {/* Sheet Footer */}
                  <div className="border-t border-stone-200 pt-3 mt-3 flex justify-between items-end text-[9px] text-stone-400 font-mono">
                    <div>
                      <div>Certified Scribe Replacement • Page {currentPageNumber} of {totalDocumentPages}</div>
                      <div>Security: SHA-256 Verified Examination Token</div>
                    </div>
                    <div className="border-t border-stone-300 w-32 pt-1 text-center font-sans text-[10px] text-stone-500">
                      Candidate/Scribe Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. RIGHT PANEL: PAGE CHANGES CHEATSHEET                  */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 h-full flex flex-col overflow-hidden bg-white dark:bg-[#1f2937] border border-stone-200 dark:border-stone-800 rounded-2xl p-3 shadow-xs">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-100">
                  Page Changes
                </h3>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                  Editing, Math & Science
                </p>
              </div>
            </div>
          </div>

          {/* Category Tabs: Changes, Math & LaTeX, Science */}
          <div className="shrink-0 flex items-center bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700 mb-2">
            <button
              type="button"
              onClick={() => setPageChangesTab("changes")}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                pageChangesTab === "changes"
                  ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Changes
            </button>
            <button
              type="button"
              onClick={() => setPageChangesTab("math")}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                pageChangesTab === "math"
                  ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Math & LaTeX
            </button>
            <button
              type="button"
              onClick={() => setPageChangesTab("science")}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                pageChangesTab === "science"
                  ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Science
            </button>
          </div>

          {/* Filter Search Input */}
          <div className="shrink-0 mb-2">
            <input
              type="text"
              placeholder="Search cheat codes..."
              value={pageChangesSearch}
              onChange={(e) => setPageChangesSearch(e.target.value)}
              className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Scrollable Cheat Codes Content */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {pageChangesTab === "changes" && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                  Editing & Action Commands
                </div>

                {/* Format Answer */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">
                      "format answer" / "format text"
                    </span>
                    <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      Ctrl+Enter
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Formats speech into academic answer sheet layout with LaTeX formulas.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={handleFormatAnswer}
                      className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      Test Run
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("format answer")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                  </div>
                </div>

                {/* Scratch that */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:border-red-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">
                      "scratch that"
                    </span>
                    <span className="text-[10px] font-mono bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                      Undo Word
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Immediately erases the last spoken word from the transcription.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTranscript((prev) => {
                          const trimmed = prev.trimEnd();
                          const lastSpace = trimmed.lastIndexOf(" ");
                          return lastSpace === -1 ? "" : trimmed.slice(0, lastSpace);
                        });
                        setPageSwitchFeedback("Erased last word");
                        setTimeout(() => setPageSwitchFeedback(null), 2000);
                      }}
                      className="px-2 py-0.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      Erase Word
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("scratch that")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                  </div>
                </div>

                {/* Delete Last Sentence */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <span className="font-mono text-xs font-black text-stone-800 dark:text-stone-200">
                    "delete last sentence"
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Deletes the previous spoken sentence up to the last period.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("delete last sentence")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                  </div>
                </div>

                {/* Clear Text */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">
                      "clear text" / "clear transcript"
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Clears the entire transcription on the active sheet.
                  </p>
                </div>

                {/* New Paragraph & New Line */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <span className="font-mono text-xs font-black text-stone-800 dark:text-stone-200">
                    "new paragraph" • "new line"
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Inserts paragraph breaks (\n\n) or line breaks (\n).
                  </p>
                </div>

                {/* Download PDF Voice Command */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300">
                      "download pdf" / "export pdf"
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                      Export PDF
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Generates and downloads the official PDF examination sheet.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={handleDownloadFile}
                      className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      Export Now
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("download pdf")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                  </div>
                </div>

                {/* Read Aloud */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <span className="font-mono text-xs font-black text-stone-800 dark:text-stone-200">
                    "read aloud" / "read answer"
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                    Synthesizes and speaks the written answer back to the student.
                  </p>
                </div>
              </>
            )}

            {pageChangesTab === "math" && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                  Mathematical & LaTeX Dictation
                </div>

                {MATH_FORMULA_SHEET.filter((item) => {
                  if (!pageChangesSearch.trim()) return true;
                  const q = pageChangesSearch.toLowerCase();
                  return item.title.toLowerCase().includes(q) || item.spokenPhrase.toLowerCase().includes(q);
                }).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800 dark:text-stone-200">{item.title}</span>
                      <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded uppercase">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-stone-600 dark:text-stone-300 mt-0.5">
                      Say: <strong className="text-blue-600 dark:text-blue-400">{item.spokenPhrase}</strong>
                    </p>
                    <div className="my-1.5 p-1.5 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 text-center overflow-x-auto">
                      <KaTeXText text={`$${item.latex}$`} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => handleSpeakSample(item.spokenPhrase.replace(/"/g, ""))}
                        className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                      >
                        🔊 Pronounce
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertSampleToTranscript(item.spokenPhrase.replace(/"/g, ""))}
                        className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer"
                      >
                        + Insert
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {pageChangesTab === "science" && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                  Chemistry & Science Speech
                </div>

                {/* H2O */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200">Water / H2O</span>
                  <p className="text-[11px] font-mono text-stone-600 dark:text-stone-300 mt-0.5">
                    Say: <strong className="text-blue-600 dark:text-blue-400">"H two O"</strong>
                  </p>
                  <div className="my-1 p-1 bg-white dark:bg-stone-800 rounded text-center">
                    <KaTeXText text="$\text{H}_2\text{O}$" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("H two O")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSampleToTranscript("H2O")}
                      className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      + Insert
                    </button>
                  </div>
                </div>

                {/* Carbon Dioxide */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200">Carbon Dioxide</span>
                  <p className="text-[11px] font-mono text-stone-600 dark:text-stone-300 mt-0.5">
                    Say: <strong className="text-blue-600 dark:text-blue-400">"C O two"</strong>
                  </p>
                  <div className="my-1 p-1 bg-white dark:bg-stone-800 rounded text-center">
                    <KaTeXText text="$\text{CO}_2$" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("C O two")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSampleToTranscript("CO2")}
                      className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      + Insert
                    </button>
                  </div>
                </div>

                {/* Sulfuric Acid */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200">Sulfuric Acid</span>
                  <p className="text-[11px] font-mono text-stone-600 dark:text-stone-300 mt-0.5">
                    Say: <strong className="text-blue-600 dark:text-blue-400">"H two S O four"</strong>
                  </p>
                  <div className="my-1 p-1 bg-white dark:bg-stone-800 rounded text-center">
                    <KaTeXText text="$\text{H}_2\text{SO}_4$" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("H two S O four")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSampleToTranscript("H2SO4")}
                      className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      + Insert
                    </button>
                  </div>
                </div>

                {/* Einstein Equation */}
                <div className="p-2 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                  <span className="font-bold text-xs text-stone-800 dark:text-stone-200">Mass-Energy Equivalence</span>
                  <p className="text-[11px] font-mono text-stone-600 dark:text-stone-300 mt-0.5">
                    Say: <strong className="text-blue-600 dark:text-blue-400">"E equals m c squared"</strong>
                  </p>
                  <div className="my-1 p-1 bg-white dark:bg-stone-800 rounded text-center">
                    <KaTeXText text="$E = mc^2$" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSpeakSample("E equals m c squared")}
                      className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      🔊 Say
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSampleToTranscript("E = mc^2")}
                      className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded cursor-pointer"
                    >
                      + Insert
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Tip */}
          <div className="shrink-0 pt-2 border-t border-stone-200 dark:border-stone-800 text-[10px] text-stone-400 flex items-center justify-between">
            <span>Tap any code to test or insert</span>
            <Sparkles className="w-3 h-3 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. OFFSCREEN MULTI-PAGE EXPORT TARGET (Official PDF)     */}
      {/* ======================================================== */}
      <div
        id="pdf-multi-page-export-container"
        className="fixed -left-[9999px] top-0 pointer-events-none"
        aria-hidden="true"
      >
        {documentPages.map((pg, idx) => {
          const pageText =
            (idx === currentPageIndex
              ? formattedAnswer || transcript
              : pg.formattedAnswer || pg.transcript) || "";
          return (
            <div
              key={pg.id || idx}
              className={`p-10 flex flex-col justify-between font-sans ${
                sheetOrientation === "Landscape"
                  ? "w-[1020px] min-h-[720px]"
                  : "w-[794px] min-h-[1080px]"
              }`}
              style={{
                backgroundColor: "#ffffff",
                color: "#1c1917",
                fontSize: `${previewFontSize}px`,
                lineHeight: "1.65",
                pageBreakBefore: idx > 0 ? "always" : "auto",
                breakBefore: idx > 0 ? "page" : "auto",
              }}
            >
              {/* Top blue accent bar */}
              <div
                className="h-2 w-full mb-6"
                style={{ backgroundColor: "#2563EB" }}
              />

              {/* Official Exam Header */}
              <div
                style={{
                  borderBottom: "2px solid #e7e5e4",
                  paddingBottom: "18px",
                  marginBottom: "20px",
                }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span
                      style={{
                        backgroundColor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#1d4ed8",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        display: "inline-block",
                        fontSize: "10px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      BOARD ACCESSIBILITY DOCUMENT
                    </span>
                    <h2
                      style={{
                        color: "#0c0a09",
                        fontSize: "22px",
                        fontWeight: 900,
                        marginTop: "8px",
                        letterSpacing: "-0.025em",
                      }}
                    >
                      Academic Written Examination Answer Sheet
                    </h2>
                    <p
                      style={{
                        color: "#78716c",
                        fontSize: "11px",
                        fontWeight: 600,
                        marginTop: "2px",
                      }}
                    >
                      Scribed via VoiceScript Academic Assistive Client
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "11px",
                      color: "#57534e",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      fontWeight: 600,
                    }}
                  >
                    <div>
                      Format: <strong style={{ color: "#0c0a09" }}>{sheetSize} ({sheetOrientation})</strong>
                    </div>
                    <div>
                      Subject: <strong style={{ color: "#0c0a09" }}>{subject}</strong>
                    </div>
                    <div>
                      Spoken Language: <span style={{ color: "#0c0a09" }}>{language}</span>
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        border: "1px solid #bfdbfe",
                        fontWeight: "bold",
                        fontSize: "11px",
                        alignSelf: "flex-end",
                        marginTop: "2px",
                      }}
                    >
                      PAGE {idx + 1} OF {documentPages.length}
                    </div>
                  </div>
                </div>

                {/* Student Candidate & Invigilator Box */}
                <div
                  className="grid grid-cols-2 gap-4 mt-4"
                  style={{
                    backgroundColor: "#f5f5f4",
                    border: "1px solid #d6d3d1",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: "#78716c",
                        fontSize: "9px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        display: "block",
                        marginBottom: "2px",
                      }}
                    >
                      Student Candidate Name
                    </span>
                    <div
                      style={{
                        color: "#0c0a09",
                        fontWeight: 900,
                        fontSize: "15px",
                      }}
                    >
                      {studentName.trim() || "Registered Candidate"}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        color: "#78716c",
                        fontSize: "9px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        display: "block",
                        marginBottom: "2px",
                      }}
                    >
                      Witness Scribe / Room Invigilator
                    </span>
                    <div
                      style={{
                        color: "#0c0a09",
                        fontWeight: 800,
                        fontSize: "15px",
                      }}
                    >
                      {examinerName.trim() || "Assigned Room Invigilator"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div
                className="flex-1 py-4"
                style={{ minHeight: "550px" }}
              >
                {pageText ? (
                  <div className="leading-relaxed whitespace-pre-wrap">
                    <KaTeXText text={pageText} />
                  </div>
                ) : (
                  <div
                    style={{
                      color: "#a8a29e",
                      fontStyle: "italic",
                      fontSize: "13px",
                    }}
                  >
                    [Empty page content]
                  </div>
                )}
              </div>

              {/* Official Footer with Signatures & Timestamp */}
              <div
                style={{
                  borderTop: "1px solid #d6d3d1",
                  paddingTop: "16px",
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  fontSize: "10px",
                  color: "#78716c",
                  fontWeight: "bold",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div>Certified Indian Academic Assistive Scribe Document</div>
                  <div>Document Sheet: Page {idx + 1} of {documentPages.length}</div>
                  <div style={{ fontSize: "9px", color: "#a8a29e" }}>
                    Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1.5px solid #78716c",
                    width: "160px",
                    paddingTop: "6px",
                    textAlign: "center",
                    fontSize: "10px",
                    color: "#44403c",
                  }}
                >
                  Candidate / Scribe Signature
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
