import React, { useState, useRef, useEffect } from "react";
import { signInWithPopup, User as FirebaseUser } from "firebase/auth";
import { auth, googleAuthProvider, db } from "./lib/firebase";
import { handleFirestoreError, OperationType } from "./lib/firestoreErrors";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  FileText,
  RefreshCw,
  User,
  BookOpen,
  Languages,
  TriangleAlert,
  Download,
  Volume2,
  VolumeX,
  Info,
  Layers,
  Compass,
  FileCheck,
  Settings,
  HelpCircle,
  Award,
  Sun,
  Moon,
  Command,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { KaTeXText } from "./components/KaTeXText";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { DocumentsView } from "./components/DocumentsView";
import { VoiceCommandCheatsheet } from "./components/VoiceCommandCheatsheet";
import {
  ScreenState,
  Subject,
  Language,
  SheetSize,
  SheetOrientation,
  DocumentPage,
  ExamCandidate,
  ExamPaper,
  CandidateAnswer,
  ExamAuditLogEntry,
  ExamSubmissionReceipt,
} from "./types";
import { ExamLogin } from "./components/exam/ExamLogin";
import { ExamInstructions } from "./components/exam/ExamInstructions";
import { ExamWorkspace } from "./components/exam/ExamWorkspace";
import { ExamReview } from "./components/exam/ExamReview";
import { ExamSubmissionReceiptView } from "./components/exam/ExamSubmissionReceiptView";
import { createExamSubmissionReceipt, createAuditEntry } from "./lib/security";
import { loadExamSession, clearExamSession } from "./lib/storage";
import { SAMPLE_EXAM_PAPERS, DEFAULT_EXAM_PAPER } from "./lib/sampleQuestions";
import { ShieldCheck, GraduationCap } from "lucide-react";

// Constant mappings for languages
const LANGUAGES: { name: Language; code: string; localName: string }[] = [
  { name: "English", code: "en-IN", localName: "English (India)" },
];

const SUBJECTS: Subject[] = [
  "General",
  "Mathematics",
  "Chemistry",
  "Physics",
  "Biology",
  "English",
  "History",
  "Computer Science",
];

// Subject guides for spoken advice helper
const SUBJECT_HELPER: Record<Subject, string> = {
  General:
    "Speak naturally. Avoid pauses. Use 'point number 1', 'next point' or 'new paragraph' to structure notes.",
  Mathematics:
    "Say 'x squared plus 2x plus 5 equals 0' or 'integral of x dx'. We'll format it with LaTeX standard $...$ symbols.",
  Chemistry:
    "Equations like '2 H2 plus O2 gives 2 H2O' will be balanced, and compounds like 'H2SO4' will get chemical subscripts automatically.",
  Physics:
    "Units (e.g., '10 meters per second squared', '50 kilograms') and formulas (e.g., 'E equals m c squared') will format correctly.",
  Biology:
    "Use biological terms or lists. Say 'point 1: cell respiration occurs in mitochondria...' to draw headers.",
  English:
    "Dictate essay paragraphs or punctuation explicitly like 'comma', 'period' or 'new line'.",
  History:
    "Format events and timelines by mentioning dates like '15 August 1947' or lists of historical emperors.",
  "Computer Science":
    "Speak code commands like 'hash include IO stream', 'using namespace std', 'integer main', 'print hello world'. We will convert them to actual executive code blocks!",
};

export default function App() {
  // App screen navigation
  const [screen, setScreen] = useState<ScreenState>("SETUP_VIEW");
  const [screenHistory, setScreenHistory] = useState<ScreenState[]>([]);

  // Navigation management with history tracking
  const navigateTo = (newScreen: ScreenState, replace = false) => {
    if (newScreen === screen) return;
    if (!replace) {
      setScreenHistory((prev) => [...prev, screen]);
    }
    try {
      window.history.pushState({ screen: newScreen }, "", "");
    } catch {}
    setScreen(newScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateBack = () => {
    if (screenHistory.length > 0) {
      const prevScreen = screenHistory[screenHistory.length - 1];
      setScreenHistory((prev) => prev.slice(0, -1));
      setScreen(prevScreen);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Default logical fallbacks if history is empty
    switch (screen) {
      case "WORKSPACE_VIEW":
      case "DOCUMENTS_VIEW":
      case "EXAM_LOGIN":
        setScreen("SETUP_VIEW");
        break;
      case "EXAM_INSTRUCTIONS":
        setScreen("EXAM_LOGIN");
        break;
      case "EXAM_WORKSPACE":
        setScreen("EXAM_INSTRUCTIONS");
        break;
      case "EXAM_REVIEW":
        setScreen("EXAM_WORKSPACE");
        break;
      case "EXAM_SUBMITTED":
        setScreen("EXAM_LOGIN");
        break;
      case "PDF_SUCCESS":
        setScreen("WORKSPACE_VIEW");
        break;
      default:
        setScreen("SETUP_VIEW");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getScreenDisplayName = (s: ScreenState): string => {
    switch (s) {
      case "SETUP_VIEW":
        return "Setup & Configuration";
      case "WORKSPACE_VIEW":
        return "Scribe Workspace";
      case "PDF_SUCCESS":
        return "Document Complete";
      case "DOCUMENTS_VIEW":
        return "My Documents";
      case "EXAM_LOGIN":
        return "Candidate Login";
      case "EXAM_INSTRUCTIONS":
        return "Exam Instructions";
      case "EXAM_WORKSPACE":
        return "Active Exam Workspace";
      case "EXAM_REVIEW":
        return "Exam Review";
      case "EXAM_SUBMITTED":
        return "Submission Receipt";
      default:
        return "Previous Page";
    }
  };

  const previousPageName = screenHistory.length > 0
    ? getScreenDisplayName(screenHistory[screenHistory.length - 1])
    : (screen === "WORKSPACE_VIEW" || screen === "DOCUMENTS_VIEW" || screen === "EXAM_LOGIN"
      ? "Setup & Configuration"
      : screen === "EXAM_INSTRUCTIONS"
      ? "Candidate Login"
      : screen === "EXAM_WORKSPACE"
      ? "Exam Instructions"
      : screen === "EXAM_REVIEW"
      ? "Exam Workspace"
      : "Previous Page");

  // Scribe Configurations
  const [sheetSize, setSheetSize] = useState<SheetSize>("A4");
  const [sheetOrientation, setSheetOrientation] =
    useState<SheetOrientation>("Portrait");
  const [language, setLanguage] = useState<Language>("English");
  const [targetLanguage, setTargetLanguage] = useState<Language>("English");
  const [subject, setSubject] = useState<Subject>("General");
  const [studentName, setStudentName] = useState("");
  const [examinerName, setExaminerName] = useState("");
  const [setupSubmitted, setSetupSubmitted] = useState(false);

  // Scribe Live Data State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedAnswer, setFormattedAnswer] = useState("");
  const [providerUsed, setProviderUsed] = useState("AI Scribe Service");

  // Status Alerts
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showScribeCheatsheet, setShowScribeCheatsheet] = useState(false);
  const [exportFormat, setExportFormat] = useState<"PDF" | "Markdown">("PDF");

  // Multi-Page Document State for Scriptorium Workspace
  const [documentPages, setDocumentPages] = useState<DocumentPage[]>([
    { id: "page-1", pageNumber: 1, transcript: "", formattedAnswer: "" },
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pageSwitchFeedback, setPageSwitchFeedback] = useState<string | null>(null);

  // Sync refs so voice recognition handlers & callbacks always read current state
  const currentPageIndexRef = useRef(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;

  const documentPagesRef = useRef(documentPages);
  documentPagesRef.current = documentPages;

  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;

  const formattedAnswerRef = useRef(formattedAnswer);
  formattedAnswerRef.current = formattedAnswer;

  // Multi-Page Document Navigation Helpers
  const currentPageNumber = currentPageIndex + 1;
  const totalDocumentPages = documentPages.length;
  const hasPreviousDocumentPage = currentPageIndex > 0;
  const hasNextDocumentPage = currentPageIndex < totalDocumentPages - 1;

  // Synchronize active page text whenever transcript or formattedAnswer changes
  useEffect(() => {
    setDocumentPages((prev) => {
      const idx = currentPageIndex;
      if (!prev[idx]) return prev;
      if (
        prev[idx].transcript === transcript &&
        prev[idx].formattedAnswer === formattedAnswer
      ) {
        return prev;
      }
      const nextPages = [...prev];
      nextPages[idx] = {
        ...nextPages[idx],
        transcript,
        formattedAnswer,
      };
      return nextPages;
    });
  }, [transcript, formattedAnswer, currentPageIndex]);

  const handleAccessPreviousDocumentPage = () => {
    const idx = currentPageIndexRef.current;
    if (idx <= 0) return;
    const targetIdx = idx - 1;
    const pages = documentPagesRef.current;
    const targetPage = pages[targetIdx];
    if (targetPage) {
      setCurrentPageIndex(targetIdx);
      setTranscript(targetPage.transcript || "");
      setFormattedAnswer(targetPage.formattedAnswer || "");
      setInterimTranscript("");

      const msg = `Navigated to Previous Page (${targetIdx + 1} of ${pages.length})`;
      setPageSwitchFeedback(msg);
      setTimeout(() => setPageSwitchFeedback(null), 3000);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`Previous page, page ${targetIdx + 1}`);
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      }
    }
  };

  const handleAccessNextDocumentPage = () => {
    const idx = currentPageIndexRef.current;
    const pages = documentPagesRef.current;
    if (idx >= pages.length - 1) return;
    const targetIdx = idx + 1;
    const targetPage = pages[targetIdx];
    if (targetPage) {
      setCurrentPageIndex(targetIdx);
      setTranscript(targetPage.transcript || "");
      setFormattedAnswer(targetPage.formattedAnswer || "");
      setInterimTranscript("");

      const msg = `Navigated to Next Page (${targetIdx + 1} of ${pages.length})`;
      setPageSwitchFeedback(msg);
      setTimeout(() => setPageSwitchFeedback(null), 3000);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`Next page, page ${targetIdx + 1}`);
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      }
    }
  };

  const handleAddNewDocumentPage = () => {
    const pages = documentPagesRef.current;
    const newPageNum = pages.length + 1;
    const newPage: DocumentPage = {
      id: `page-${Date.now()}`,
      pageNumber: newPageNum,
      transcript: "",
      formattedAnswer: "",
    };
    const updated = [...pages, newPage];
    setDocumentPages(updated);
    setCurrentPageIndex(updated.length - 1);
    setTranscript("");
    setFormattedAnswer("");
    setInterimTranscript("");

    const msg = `Added Page ${newPageNum}. Switched to Page ${newPageNum} of ${newPageNum}`;
    setPageSwitchFeedback(msg);
    setTimeout(() => setPageSwitchFeedback(null), 3500);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`New page added. You are now on Page ${newPageNum}`);
      u.rate = 1.1;
      window.speechSynthesis.speak(u);
    }
  };

  const handleSelectDocumentPage = (targetIdx: number) => {
    const pages = documentPagesRef.current;
    if (targetIdx < 0 || targetIdx >= pages.length || targetIdx === currentPageIndexRef.current) return;
    const targetPage = pages[targetIdx];
    if (targetPage) {
      setCurrentPageIndex(targetIdx);
      setTranscript(targetPage.transcript || "");
      setFormattedAnswer(targetPage.formattedAnswer || "");
      setInterimTranscript("");

      const msg = `Viewing Page ${targetIdx + 1} of ${pages.length}`;
      setPageSwitchFeedback(msg);
      setTimeout(() => setPageSwitchFeedback(null), 2500);
    }
  };

  const handleDeleteDocumentPage = (targetIdx: number) => {
    const pages = documentPagesRef.current;
    if (pages.length <= 1) return;
    const filtered = pages.filter((_, i) => i !== targetIdx);
    const renumbered = filtered.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    setDocumentPages(renumbered);
    const newIdx = Math.max(0, Math.min(targetIdx, renumbered.length - 1));
    setCurrentPageIndex(newIdx);
    setTranscript(renumbered[newIdx]?.transcript || "");
    setFormattedAnswer(renumbered[newIdx]?.formattedAnswer || "");
  };

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Web Speech API check
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  // Hands-Free Exam Platform State
  const [examCandidate, setExamCandidate] = useState<ExamCandidate | null>(null);
  const [examPaper, setExamPaper] = useState<ExamPaper>(DEFAULT_EXAM_PAPER);
  const [examAnswers, setExamAnswers] = useState<Record<string, CandidateAnswer>>({});
  const [examRemainingSeconds, setExamRemainingSeconds] = useState<number>(
    DEFAULT_EXAM_PAPER.totalMinutes * 60
  );
  const [examAuditLog, setExamAuditLog] = useState<ExamAuditLogEntry[]>([]);
  const [examReceipt, setExamReceipt] = useState<ExamSubmissionReceipt | null>(null);
  const [restoredExamNotice, setRestoredExamNotice] = useState<boolean>(false);
  const [examCurrentQuestionIndex, setExamCurrentQuestionIndex] = useState<number>(0);
  const [savedDocsCount, setSavedDocsCount] = useState<number>(0);

  const refreshSavedDocsCount = () => {
    try {
      const stored = localStorage.getItem("voice_saved_documents");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedDocsCount(Array.isArray(parsed) ? parsed.length : 0);
      } else {
        setSavedDocsCount(0);
      }
    } catch {
      setSavedDocsCount(0);
    }
  };

  useEffect(() => {
    refreshSavedDocsCount();
  }, [screen]);

  // Check for auto-saved exam session on mount
  useEffect(() => {
    const saved = loadExamSession();
    if (saved && saved.isExamActive && saved.remainingSeconds > 0) {
      setRestoredExamNotice(true);
    }
  }, []);

  const handleResumeExamSession = () => {
    const saved = loadExamSession();
    if (saved && saved.isExamActive) {
      setExamCandidate(saved.candidate);
      setExamPaper(saved.examPaper);
      setExamAnswers(saved.answers);
      setExamRemainingSeconds(saved.remainingSeconds);
      setExamAuditLog([
        ...saved.auditLog,
        createAuditEntry("SYSTEM_RECOVERY", "Active examination session recovered from local storage"),
      ]);
      setRestoredExamNotice(false);
      navigateTo("EXAM_WORKSPACE");
    }
  };

  const handleDismissExamSession = () => {
    clearExamSession();
    setRestoredExamNotice(false);
  };

  const handleCandidateLogin = (candidate: ExamCandidate, paper: ExamPaper) => {
    setExamCandidate(candidate);
    setExamPaper(paper);

    // Compute duration with accommodations extra time
    const multiplier =
      candidate.accommodations.extraTime === "2x"
        ? 2.0
        : candidate.accommodations.extraTime === "1.5x"
        ? 1.5
        : candidate.accommodations.extraTime === "1.25x"
        ? 1.25
        : 1.0;
    const totalSecs = Math.round(paper.totalMinutes * multiplier * 60);
    setExamRemainingSeconds(totalSecs);

    // Initial empty answers map
    const initialAnswers: Record<string, CandidateAnswer> = {};
    paper.questions.forEach((q) => {
      initialAnswers[q.id] = {
        questionId: q.id,
        textAnswer: "",
        rawTranscript: "",
        wordCount: 0,
        isFlaggedForReview: false,
        lastModified: Date.now(),
        revisionCount: 0,
      };
    });
    setExamAnswers(initialAnswers);

    // Initial audit log
    const entry = createAuditEntry(
      "LOGIN",
      `Candidate logged in: ${candidate.candidateName} (${candidate.candidateId}) for ${paper.code}`
    );
    setExamAuditLog([entry]);
    navigateTo("EXAM_INSTRUCTIONS");
  };

  const handleBeginExam = () => {
    setExamCurrentQuestionIndex(0);
    const entry = createAuditEntry(
      "EXAM_START",
      `Examination session started for paper ${examPaper.code}. Total allocated time: ${Math.round(
        examRemainingSeconds / 60
      )} minutes`
    );
    setExamAuditLog((prev) => [...prev, entry]);
    navigateTo("EXAM_WORKSPACE");
  };

  const handleGoToExamReview = () => {
    const entry = createAuditEntry("REVIEW_START", "Candidate entered final review screen");
    setExamAuditLog((prev) => [...prev, entry]);
    navigateTo("EXAM_REVIEW");
  };

  const handleBackToWorkspace = () => {
    navigateBack();
  };

  const handleAutoFillUnanswered = () => {
    const updatedAnswers: Record<string, CandidateAnswer> = { ...examAnswers };
    let filledCount = 0;

    examPaper.questions.forEach((q) => {
      const existing = updatedAnswers[q.id];
      const hasAns =
        existing &&
        ((existing.textAnswer && existing.textAnswer.trim().length > 0) ||
          existing.selectedOption ||
          (existing.diagramShapes && existing.diagramShapes.length > 0));

      if (!hasAns) {
        filledCount++;
        if (q.type === "mcq") {
          const chosenKey = q.options && q.options.length > 0 ? q.options[0].key : "A";
          updatedAnswers[q.id] = {
            questionId: q.id,
            selectedOption: chosenKey,
            textAnswer: `Selected Option: ${chosenKey}`,
            rawTranscript: `Option ${chosenKey}`,
            wordCount: 3,
            isFlaggedForReview: false,
            lastModified: Date.now(),
            revisionCount: 1,
          };
        } else if (q.type === "math") {
          updatedAnswers[q.id] = {
            questionId: q.id,
            textAnswer:
              "$$\\int_{0}^{3} (3x^2 - 4x + 7)\\,dx = \\left[ x^3 - 2x^2 + 7x \\right]_{0}^{3} = (27 - 18 + 21) - 0 = 30$$\n\nStep 1: Computed anti-derivative term-by-term: $\\int 3x^2 dx = x^3$, $\\int -4x dx = -2x^2$, $\\int 7 dx = 7x$.\nStep 2: Evaluated definite limits at $x = 3$ and $x = 0$.\nFinal Result = 30",
            rawTranscript: "integral from 0 to 3 of 3 x squared minus 4 x plus 7 d x equals 30",
            wordCount: 32,
            isFlaggedForReview: false,
            lastModified: Date.now(),
            revisionCount: 1,
          };
        } else if (q.type === "diagram") {
          updatedAnswers[q.id] = {
            questionId: q.id,
            textAnswer:
              "Free-Body Diagram constructed: Applied force vector $F_{\\text{applied}}$ directed rightward, frictional resistance $F_{\\text{friction}}$ directed leftward, normal force $N$ pointing upward, and gravitational force $W = mg$ downward. Equations of motion satisfy $\\Sigma F_x = m \\cdot a_x$ and $\\Sigma F_y = N - mg = 0$.",
            diagramShapes: [
              { id: "rect1", type: "rect", x: 150, y: 150, width: 100, height: 60, stroke: "#000000", fill: "rgba(37,99,235,0.1)", strokeWidth: 2 },
              { id: "arrow1", type: "arrow", x: 250, y: 180, x2: 350, y2: 180, stroke: "#2563eb", fill: "#2563eb", strokeWidth: 2, label: "F_applied" },
              { id: "arrow2", type: "arrow", x: 150, y: 180, x2: 50, y2: 180, stroke: "#dc2626", fill: "#dc2626", strokeWidth: 2, label: "F_friction" },
              { id: "arrow3", type: "arrow", x: 200, y: 150, x2: 200, y2: 70, stroke: "#16a34a", fill: "#16a34a", strokeWidth: 2, label: "Normal Force N" },
            ],
            rawTranscript: "draw rectangle at center, arrow pointing right applied force, arrow left friction, arrow up normal force",
            wordCount: 42,
            isFlaggedForReview: false,
            lastModified: Date.now(),
            revisionCount: 1,
          };
        } else {
          updatedAnswers[q.id] = {
            questionId: q.id,
            textAnswer:
              "**Introduction:**\nThe Fundamental Theorem of Calculus (FTC) establishes the core bridge between differential and integral calculus, demonstrating that differentiation and integration are inverse mathematical processes.\n\n**Part 1 (First Fundamental Theorem):**\nLet $f$ be continuous on $[a, b]$. Then the accumulation function $g(x) = \\int_{a}^{x} f(t)\\,dt$ is continuous and differentiable on $(a, b)$, satisfying $g'(x) = f(x)$.\n\n**Part 2 (Net Change Theorem):**\nIf $F'(x) = f(x)$, then $\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$.\n\n**Physical Application:**\nWhen velocity $v(t) = s'(t)$, the integral $\\int_{t_1}^{t_2} v(t)\\,dt = s(t_2) - s(t_1)$ computes exact total displacement.\n\n**Conclusion:**\nThe theorem enables exact analytic evaluation of areas and accumulated quantities without manual Riemann limits.",
            rawTranscript: "Fundamental theorem of calculus explanation with parts 1 and 2 and physical example",
            wordCount: 120,
            isFlaggedForReview: false,
            lastModified: Date.now(),
            revisionCount: 1,
          };
        }
      }
    });

    setExamAnswers(updatedAnswers);
    if (filledCount > 0) {
      const entry = createAuditEntry(
        "ASSIST",
        `Sample answers populated for ${filledCount} remaining questions in assist mode`
      );
      setExamAuditLog((prev) => [...prev, entry]);
    }
  };

  const handleConfirmFinalSubmit = async () => {
    if (!examCandidate) return;
    const finalSubmitEntry = createAuditEntry(
      "SUBMISSION",
      `Candidate finalized and sealed examination ${examPaper.code}`
    );
    const updatedAuditLog = [...examAuditLog, finalSubmitEntry];
    setExamAuditLog(updatedAuditLog);

    const initialTotalSecs = Math.round(
      examPaper.totalMinutes *
        (examCandidate.accommodations.extraTime === "2x"
          ? 2
          : examCandidate.accommodations.extraTime === "1.5x"
          ? 1.5
          : examCandidate.accommodations.extraTime === "1.25x"
          ? 1.25
          : 1) *
        60
    );
    const timeSpent = Math.max(0, initialTotalSecs - examRemainingSeconds);

    const receipt = await createExamSubmissionReceipt(
      examCandidate,
      examPaper,
      examAnswers,
      updatedAuditLog,
      timeSpent
    );

    // Save to Saved Documents collection so student can always inspect and export later
    const examDocPages = examPaper.questions.map((q, idx) => {
      const a = examAnswers[q.id];
      const ansText = a?.selectedOption
        ? `Selected Option: ${a.selectedOption}`
        : a?.textAnswer || "No answer recorded";
      return {
        id: `q-${q.id}`,
        pageNumber: idx + 1,
        transcript: `[Question ${q.number} - ${q.section}]\n${q.prompt}\n\nCandidate Answer:\n${ansText}`,
        formattedAnswer: `### Question ${q.number}: ${q.prompt}\n\n**Candidate Recorded Answer:**\n${ansText}`,
      };
    });

    const newSavedDoc = {
      id: receipt.submissionId,
      studentName: examCandidate.candidateName,
      examinerName: examinerName || "Assigned Room Invigilator",
      subject: examPaper.subject || "Examination",
      examCode: examPaper.code,
      examTitle: examPaper.title,
      type: "exam" as const,
      totalPages: examDocPages.length,
      pages: examDocPages,
      rawTranscript: examDocPages.map((p) => p.transcript).join("\n\n"),
      formattedText: examDocPages.map((p) => p.formattedAnswer).join("\n\n"),
      createdAt: Date.now(),
      sha256Hash: receipt.sha256Hash,
      receipt,
    };

    try {
      const existing = localStorage.getItem("voice_saved_documents");
      const list = existing ? JSON.parse(existing) : [];
      const updatedList = [newSavedDoc, ...list.filter((d: any) => d.id !== newSavedDoc.id)];
      localStorage.setItem("voice_saved_documents", JSON.stringify(updatedList));
      refreshSavedDocsCount();
    } catch (e) {
      console.warn("Could not save exam to local storage:", e);
    }

    if (user) {
      try {
        await addDoc(collection(db, `users/${user.uid}/documents`), {
          userId: user.uid,
          ...newSavedDoc,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Could not save exam to firestore:", e);
      }
    }

    clearExamSession();
    setExamReceipt(receipt);
    navigateTo("EXAM_SUBMITTED");
  };

  const handleStartNewExam = () => {
    clearExamSession();
    setExamCandidate(null);
    setExamAnswers({});
    setExamAuditLog([]);
    setExamReceipt(null);
    navigateTo("EXAM_LOGIN");
  };

  const [user, setUser] = useState<FirebaseUser | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [previewFontSize, setPreviewFontSize] = useState<number>(14);

  // Auto-save & Local Storage
  const isInitialMount = useRef(true);

  useEffect(() => {
    const savedTranscript = localStorage.getItem("scribe_transcript");
    const savedFormatted = localStorage.getItem("scribe_formatted");
    const savedFontSize = localStorage.getItem("scribe_font_size");
    const savedTheme = localStorage.getItem("scribe_theme") as "light" | "dark";

    if (savedTranscript) setTranscript(savedTranscript);
    if (savedFormatted) setFormattedAnswer(savedFormatted);
    if (savedFontSize) setPreviewFontSize(Number(savedFontSize));
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) return;
    localStorage.setItem("scribe_transcript", transcript);
  }, [transcript]);

  useEffect(() => {
    if (isInitialMount.current) return;
    localStorage.setItem("scribe_formatted", formattedAnswer);
  }, [formattedAnswer]);

  useEffect(() => {
    if (isInitialMount.current) return;
    localStorage.setItem("scribe_font_size", previewFontSize.toString());
  }, [previewFontSize]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    localStorage.setItem("scribe_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      const code = err?.code || "";
      const message = err?.message || "";

      // Benign user dismissal or cancelled popup request
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        message.includes("auth/popup-closed-by-user") ||
        message.includes("cancelled-popup-request")
      ) {
        // User closed or dismissed the popup voluntarily; do not treat as an error
        return;
      }

      if (code === "auth/popup-blocked") {
        setWarningMessage(
          "Sign-in popup was blocked by your browser. Please allow popups for this site and try again."
        );
        return;
      }

      console.error("Firebase Sign-in error:", err);
      setErrorMessage("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Firebase Sign-out error:", err);
    }
  };

  const handleSaveToFirebase = async () => {
    const pagesToSave = documentPages.map((p, idx) => {
      if (idx === currentPageIndex) {
        return {
          pageNumber: idx + 1,
          transcript: transcript.trim(),
          formattedAnswer: formattedAnswer.trim(),
        };
      }
      return {
        pageNumber: idx + 1,
        transcript: (p.transcript || "").trim(),
        formattedAnswer: (p.formattedAnswer || "").trim(),
      };
    });

    const hasAnyContent = pagesToSave.some(
      (p) => p.transcript.length > 0 || p.formattedAnswer.length > 0
    );

    if (!hasAnyContent) {
      setWarningMessage("Cannot save an empty document.");
      return;
    }

    const combinedTranscript = pagesToSave
      .map((p) => `[Page ${p.pageNumber}]\n${p.transcript}`)
      .filter((t) => t.trim().length > 0)
      .join("\n\n");

    const combinedFormatted = pagesToSave
      .map((p) => `### Page ${p.pageNumber}\n${p.formattedAnswer || p.transcript}`)
      .filter((t) => t.trim().length > 0)
      .join("\n\n");

    const localScribeDoc = {
      id: "doc-" + Date.now(),
      studentName: studentName.trim() || "Candidate",
      examinerName: examinerName.trim() || "Assigned Scribe / Invigilator",
      subject,
      type: "scribe" as const,
      totalPages: pagesToSave.length,
      pages: pagesToSave,
      rawTranscript: combinedTranscript || transcript,
      formattedText: combinedFormatted || formattedAnswer,
      createdAt: Date.now(),
    };

    try {
      const existing = localStorage.getItem("voice_saved_documents");
      const list = existing ? JSON.parse(existing) : [];
      localStorage.setItem("voice_saved_documents", JSON.stringify([localScribeDoc, ...list]));
      refreshSavedDocsCount();
    } catch (e) {
      console.warn("Could not save to local storage:", e);
    }

    if (!user) {
      // Successfully saved locally for offline/guest candidate
      navigateTo("PDF_SUCCESS");
      return;
    }

    const docPath = `users/${user.uid}/documents`;
    try {
      await addDoc(collection(db, docPath), {
        userId: user.uid,
        rawTranscript: combinedTranscript || transcript,
        formattedText: combinedFormatted || formattedAnswer,
        pages: pagesToSave,
        totalPages: pagesToSave.length,
        subject,
        studentName: studentName.trim() || "Candidate",
        examinerName: examinerName.trim() || "Assigned Scribe / Invigilator",
        createdAt: serverTimestamp(),
      });
      navigateTo("PDF_SUCCESS");
    } catch (err: any) {
      if (
        err?.code === "permission-denied" ||
        err?.message?.includes("Missing or insufficient permissions")
      ) {
        try {
          handleFirestoreError(err, OperationType.CREATE, docPath);
        } catch {
          // Processed FirestoreErrorInfo
        }
      } else {
        console.error("Firebase Error: ", err);
      }
      // Local save already succeeded, so take user to success screen
      navigateTo("PDF_SUCCESS");
    }
  };

  useEffect(() => {
    if (!SpeechRecognition) {
      setErrorMessage(
        "Web Speech API is not fully supported in this browser. VoiceScript works best on Google Chrome or Microsoft Edge.",
      );
    }
  }, []);

  // Cleanup microphones on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleTextToSpeech = () => {
    if (!formattedAnswer.trim()) {
      setWarningMessage("No formatted text to read aloud.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip basic markdown/LaTeX characters to make speech cleaner
    const cleanText = formattedAnswer
      .replace(/[*_#`~>]/g, "")
      .replace(/\$+.*?\$+/g, " math equation ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-IN";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const getLangCode = (lang: Language) => {
    const found = LANGUAGES.find((l) => l.name === lang);
    return found ? found.code : "en-IN";
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported in this browser.");
      return;
    }

    setWarningMessage(null);
    setErrorMessage(null);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getLangCode(language);

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
      };

      recognition.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";
        let latestConfidence: number | null = null;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript + " ";
            latestConfidence = event.results[i][0].confidence;
          } else {
            interimText += event.results[i][0].transcript;
            if (latestConfidence === null) {
              latestConfidence = event.results[i][0].confidence;
            }
          }
        }

        if (latestConfidence !== null) {
          setConfidenceScore(latestConfidence);
        }

        if (finalText) {
          const lowerCmd = finalText.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
          // Voice commands for multi-page document navigation
          if (
            lowerCmd === "previous page" ||
            lowerCmd === "go to previous page" ||
            lowerCmd === "access previous page" ||
            lowerCmd === "prior page" ||
            lowerCmd === "back page" ||
            lowerCmd === "last page" ||
            lowerCmd === "previous sheet" ||
            lowerCmd === "go back a page"
          ) {
            if (currentPageIndexRef.current > 0) {
              handleAccessPreviousDocumentPage();
              setInterimTranscript("");
              return;
            } else if (screenHistory.length > 0) {
              navigateBack();
              setInterimTranscript("");
              return;
            }
          }

          if (
            lowerCmd === "next page" ||
            lowerCmd === "go to next page" ||
            lowerCmd === "access next page" ||
            lowerCmd === "forward page" ||
            lowerCmd === "next sheet"
          ) {
            if (currentPageIndexRef.current < documentPagesRef.current.length - 1) {
              handleAccessNextDocumentPage();
              setInterimTranscript("");
              return;
            }
          }

          if (
            lowerCmd === "new page" ||
            lowerCmd === "add page" ||
            lowerCmd === "add new page" ||
            lowerCmd === "create page" ||
            lowerCmd === "add sheet" ||
            lowerCmd === "new sheet"
          ) {
            handleAddNewDocumentPage();
            setInterimTranscript("");
            return;
          }

          const pageMatch = lowerCmd.match(/^(?:go to\s+)?page\s+(\d+)$/);
          if (pageMatch) {
            const pageNum = parseInt(pageMatch[1], 10);
            if (pageNum >= 1 && pageNum <= documentPagesRef.current.length) {
              handleSelectDocumentPage(pageNum - 1);
              setInterimTranscript("");
              return;
            }
          }

          if (
            lowerCmd === "back to setup" ||
            lowerCmd === "go back" ||
            lowerCmd === "navigate to previous page"
          ) {
            navigateBack();
            setInterimTranscript("");
            return;
          }

          if (
            lowerCmd === "scratch that" ||
            lowerCmd === "undo" ||
            lowerCmd === "delete last word"
          ) {
            setTranscript((prev) => {
              const trimmed = prev.trimEnd();
              const lastSpace = trimmed.lastIndexOf(" ");
              return lastSpace === -1 ? "" : trimmed.slice(0, lastSpace);
            });
            setPageSwitchFeedback("Erased last spoken word (scratch that)");
            setTimeout(() => setPageSwitchFeedback(null), 2500);
            setInterimTranscript("");
            return;
          }

          if (
            lowerCmd === "clear text" ||
            lowerCmd === "clear transcript" ||
            lowerCmd === "erase text"
          ) {
            setTranscript("");
            setPageSwitchFeedback("Cleared spoken transcription");
            setTimeout(() => setPageSwitchFeedback(null), 2500);
            setInterimTranscript("");
            return;
          }

          if (
            lowerCmd === "new paragraph" ||
            lowerCmd === "next paragraph"
          ) {
            setTranscript((prev) => (prev ? prev.trimEnd() + "\n\n" : ""));
            setPageSwitchFeedback("Inserted new paragraph");
            setTimeout(() => setPageSwitchFeedback(null), 2000);
            setInterimTranscript("");
            return;
          }

          if (
            lowerCmd === "new line" ||
            lowerCmd === "next line" ||
            lowerCmd === "line break"
          ) {
            setTranscript((prev) => (prev ? prev.trimEnd() + "\n" : ""));
            setPageSwitchFeedback("Inserted new line");
            setTimeout(() => setPageSwitchFeedback(null), 2000);
            setInterimTranscript("");
            return;
          }

          if (
            lowerCmd === "format answer" ||
            lowerCmd === "format text" ||
            lowerCmd === "clean up" ||
            lowerCmd === "structure answer"
          ) {
            setInterimTranscript("");
            handleFormatAnswer();
            return;
          }

          if (
            lowerCmd === "download pdf" ||
            lowerCmd === "export pdf" ||
            lowerCmd === "save document"
          ) {
            setInterimTranscript("");
            handleDownloadFile();
            return;
          }

          if (
            lowerCmd === "stop listening" ||
            lowerCmd === "stop scribe" ||
            lowerCmd === "stop microphone"
          ) {
            stopListening();
            return;
          }

          if (
            lowerCmd === "cheat sheet" ||
            lowerCmd === "cheatsheet" ||
            lowerCmd === "voice commands" ||
            lowerCmd === "show commands" ||
            lowerCmd === "help commands"
          ) {
            setShowScribeCheatsheet((prev) => !prev);
            setPageSwitchFeedback("Toggled voice cheatsheet");
            setTimeout(() => setPageSwitchFeedback(null), 2500);
            setInterimTranscript("");
            return;
          }

          setTranscript((prev) => {
            const trimmedPrev = prev.trim();
            const trimmedNew = finalText.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedNew}` : trimmedNew;
          });
        }
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage(
            "Microphone permission was denied. Please allow microphone access in your browser settings to speak your answers.",
          );
        } else if (event.error === "no-speech") {
          // Standard no-speech silent block
        } else {
          setErrorMessage(
            `Microphone error: ${event.error}. Please try reloading the app.`,
          );
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Could not start voice scribe: ${err.message || err}`);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Submit spoken answer to the format API
  const handleFormatAnswer = async () => {
    if (isListening) {
      stopListening();
    }

    if (!transcript.trim()) {
      setWarningMessage(
        "Please speak your answer first so it can be structured.",
      );
      return;
    }

    setWarningMessage(null);
    setErrorMessage(null);
    setIsFormatting(true);

    try {
      const response = await fetch("/api/format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: transcript,
          subject: subject,
          language: language,
          targetLanguage: targetLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to format text using AI.");
      }

      setFormattedAnswer(data.formattedText);
      setProviderUsed(data.provider || "Gemini Scribe Service");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message ||
          "An error occurred while connecting to the primary format API.",
      );
    } finally {
      setIsFormatting(false);
    }
  };

  // Triggers chemical or standard PDF download via html2pdf dynamically or Markdown download
  const handleDownloadFile = async () => {
    if (!transcript.trim() && !formattedAnswer.trim()) {
      setWarningMessage("Cannot download an empty document sheet.");
      return;
    }

    setWarningMessage(null);
    setErrorMessage(null);
    setIsDownloading(true);
    setPdfProgress(10);

    const safeName = studentName.trim()
      ? studentName.trim().replace(/\s+/g, "_")
      : "Candidate";

    if (exportFormat === "Markdown") {
      try {
        let mdContent = `# Academic Examination Answer Sheet\n\n`;
        mdContent += `- **Candidate:** ${studentName.trim() || "Candidate"}\n`;
        mdContent += `- **Witness Scribe / Room Evaluator:** ${examinerName.trim() || "Assigned Room Invigilator"}\n`;
        mdContent += `- **Subject:** ${subject}\n`;
        mdContent += `- **Language:** ${language}${language !== targetLanguage ? ` → ${targetLanguage}` : ""}\n`;
        mdContent += `- **Format:** ${sheetSize} (${sheetOrientation})\n`;
        mdContent += `- **Total Pages:** ${documentPages.length}\n`;
        mdContent += `- **Generated:** ${new Date().toLocaleString()}\n\n`;
        mdContent += `---\n\n`;

        documentPages.forEach((pg, i) => {
          mdContent += `## Page ${i + 1} of ${documentPages.length}\n\n`;
          const text = (i === currentPageIndex ? (formattedAnswer || transcript) : (pg.formattedAnswer || pg.transcript)) || "*(Empty page)*";
          mdContent += `${text}\n\n`;
          if (i < documentPages.length - 1) {
            mdContent += `---\n\n`;
          }
        });

        const blob = new Blob([mdContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ExamSheet_${safeName}_${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setPdfProgress(100);
        setTimeout(() => {
          navigateTo("PDF_SUCCESS");
          setPdfProgress(0);
        }, 500);
      } catch (err: any) {
        setErrorMessage(`Markdown generation failed: ${err.message}`);
        setPdfProgress(0);
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    try {
      // Dynamic load of html2pdf to make it extremely bulletproof and bypass Vite static build problems
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      setPdfProgress(30);

      // If multi-page, target the complete multi-page export container
      const multiPageContainer = document.getElementById("pdf-multi-page-export-container");
      const singlePageContainer = document.getElementById("pdf-render-target");
      const pdfContent = (documentPages.length > 1 && multiPageContainer) ? multiPageContainer : singlePageContainer;
      
      if (!pdfContent) {
        throw new Error("Could not locate sheet preview target for render.");
      }

      const paperSize = sheetSize === "A4" ? "a4" : "letter";
      const isLandscape = sheetOrientation === "Landscape";

      const opt = {
        margin: 0.35,
        filename: `ExamSheet_${safeName}_${Date.now()}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        pagebreak: { mode: ["css", "legacy"] },
        jsPDF: {
          unit: "in" as const,
          format: paperSize,
          orientation: (isLandscape ? "landscape" : "portrait") as
            "landscape" | "portrait",
        },
      };

      setPdfProgress(50);
      const pdfWorker = (html2pdf as any)().set(opt).from(pdfContent);

      const progressInterval = setInterval(() => {
        setPdfProgress((p) => (p < 95 ? p + 5 : p));
      }, 300);

      await pdfWorker.save();
      clearInterval(progressInterval);
      setPdfProgress(100);

      setTimeout(() => {
        navigateTo("PDF_SUCCESS");
        setPdfProgress(0);
      }, 500);
    } catch (err: any) {
      console.error("PDF generation failure:", err);
      setErrorMessage(
        `PDF rendering failed: ${err.message || err}. Please try downloading again.`,
      );
      setPdfProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStartProject = () => {
    setSetupSubmitted(true);
    const hasStudent = studentName.trim().length > 0;
    const hasExaminer = examinerName.trim().length > 0;
    if (!hasStudent || !hasExaminer) {
      setWarningMessage(
        "Both Student Candidate Name and Authorized Room Invigilator Name are strictly required to create the scribe document and open the workspace. Please enter both names."
      );
      return;
    }
    setWarningMessage(null);
    navigateTo("WORKSPACE_VIEW");
  };

  // Keyboard shortcuts and previous page navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // PageUp or Alt + [ to access previous page of the document created
      if (e.key === "PageUp" || (e.altKey && e.key === "[")) {
        if (screen === "WORKSPACE_VIEW" && currentPageIndexRef.current > 0) {
          e.preventDefault();
          handleAccessPreviousDocumentPage();
          return;
        }
      }
      // PageDown or Alt + ] to access next page of the document created
      if (e.key === "PageDown" || (e.altKey && e.key === "]")) {
        if (screen === "WORKSPACE_VIEW" && currentPageIndexRef.current < documentPagesRef.current.length - 1) {
          e.preventDefault();
          handleAccessNextDocumentPage();
          return;
        }
      }

      // Alt + Left Arrow to navigate back to previous screen
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        navigateBack();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const toggleBtn = document.getElementById("mic-toggle-btn");
        if (toggleBtn) toggleBtn.click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const formatBtn = document.getElementById("format-text-btn");
        if (formatBtn) formatBtn.click();
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen) {
        setScreen(e.state.screen);
      } else {
        navigateBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [screenHistory, screen]);

  const resetAll = () => {
    setDocumentPages([
      { id: "page-1", pageNumber: 1, transcript: "", formattedAnswer: "" },
    ]);
    setCurrentPageIndex(0);
    setTranscript("");
    setInterimTranscript("");
    setFormattedAnswer("");
    setStudentName("");
    setExaminerName("");
    navigateTo("SETUP_VIEW");
    setSubject("General");
    setLanguage("English");
    setTargetLanguage("English");
    setSheetSize("A4");
    setSheetOrientation("Portrait");
    setWarningMessage(null);
    setErrorMessage(null);
  };

  const handleResetCurrentPage = () => {
    setTranscript("");
    setInterimTranscript("");
    setFormattedAnswer("");
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#111827] flex flex-col justify-between text-[#2D2926] dark:text-[#F3F4F6] antialiased font-sans transition-colors duration-300">
      {/* HIGH-CONTRAST HEADER INFO BANNER */}
      <div className="w-full bg-[#FEF3C7] dark:bg-[#78350f] text-[#92400E] dark:text-amber-100 text-center py-2.5 px-6 text-sm font-semibold tracking-wide flex items-center justify-center gap-2 border-b border-[#E7E5E4]/60 dark:border-transparent shadow-xs leading-relaxed transition-colors duration-300">
        <Info className="w-4 h-4 flex-shrink-0 text-[#B45309]" />
        <span>
          For students who cannot write — speak your exam answer clearly.
          Supports real-time layout rendering.
        </span>
      </div>

      {/* TOP HEADER */}
      <header className="w-full bg-white dark:bg-[#1f2937] border-b border-[#E7E5E4] dark:border-[#374151] py-4.5 px-6 md:px-10 shadow-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Universal Previous Page Navigation Button */}
            {(screenHistory.length > 0 || screen !== "SETUP_VIEW") && (
              <button
                type="button"
                onClick={navigateBack}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors cursor-pointer shadow-2xs mr-1"
                title={`Go to previous page: ${previousPageName} (Alt + Left Arrow)`}
                aria-label={`Navigate to previous page: ${previousPageName}`}
              >
                <ArrowLeft className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <span className="hidden sm:inline">Previous Page</span>
                <span className="hidden lg:inline text-stone-500 font-normal">
                  ({previousPageName})
                </span>
                <span className="sm:hidden">Back</span>
              </button>
            )}

            <div className="bg-[#2563EB] p-2.5 rounded-xl text-white shadow-md shadow-blue-100 dark:shadow-none">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#1C1917] dark:text-white leading-none">
                VoiceScript
              </h1>
              <p className="text-[10px] text-[#78716C] dark:text-gray-400 uppercase tracking-widest font-extrabold mt-1">
                AI Academic Scribe & Page Layout Renderer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mode switch between Freeform Scribe and Timed Hands-Free Exam Platform */}
            {screen.startsWith("EXAM_") ? (
              <button
                onClick={() => navigateTo("SETUP_VIEW")}
                className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors mr-1 border border-stone-200 dark:border-stone-700"
                title="Switch to Free-form Scribe"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Scribe Workspace</span>
              </button>
            ) : (
              <button
                onClick={() => navigateTo("EXAM_LOGIN")}
                className="text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs mr-1"
                title="Enter Hands-Free Exam Platform"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Exam Platform</span>
                <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded font-black hidden sm:inline">NEW</span>
              </button>
            )}

            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 transition-colors cursor-pointer mr-1"
              title="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {/* Saved Documents Button visible to all users */}
            <button
              onClick={() => navigateTo("DOCUMENTS_VIEW")}
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors border ${
                screen === "DOCUMENTS_VIEW"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
              }`}
              title="Open Saved Documents & Exam Submissions"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Saved Documents</span>
              {savedDocsCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {savedDocsCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 hidden sm:inline-block">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-200 bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="text-xs font-bold uppercase tracking-widest text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-1.5 rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isLoggingIn && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{isLoggingIn ? "Signing In..." : "Log in"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex-grow flex flex-col">
        {/* Errors / Warnings overlay */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-950 flex items-start gap-3 shadow-md border border-red-100"
              role="alert"
            >
              <TriangleAlert className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-base text-red-900">
                  Scribe Service Notification
                </h3>
                <p className="text-sm mt-1">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="mt-2 text-xs font-bold text-red-700 hover:text-red-950 underline uppercase tracking-wider cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}

          {restoredExamNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/60 border-l-4 border-blue-600 rounded-xl text-blue-950 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-blue-200 dark:border-blue-900"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-blue-900 dark:text-blue-100">
                    Active Examination Session In-Progress
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    An autosaved exam session was detected. You can resume right where you left off.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleResumeExamSession}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  Resume Exam
                </button>
                <button
                  onClick={handleDismissExamSession}
                  className="px-2.5 py-1.5 text-stone-500 hover:text-stone-700 dark:text-stone-400 text-xs font-medium cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}

          {warningMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-[#FEF3C7] border-l-4 border-amber-500 rounded-xl text-amber-950 flex items-start gap-3 shadow-sm border border-amber-200"
            >
              <TriangleAlert className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{warningMessage}</p>
                <button
                  onClick={() => setWarningMessage(null)}
                  className="mt-1.5 text-xs font-bold text-amber-850 hover:text-amber-950 underline uppercase tracking-wider cursor-pointer"
                >
                  Close Warning
                </button>
              </div>
            </motion.div>
          )}

          {pageSwitchFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/70 border-l-4 border-blue-600 rounded-xl text-blue-950 dark:text-blue-100 flex items-center justify-between gap-3 shadow-md border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-950 dark:text-white">
                    {pageSwitchFeedback}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Document navigation updated. Use "previous page" or PageUp key to access earlier pages.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPageSwitchFeedback(null)}
                className="text-xs font-bold text-blue-800 dark:text-blue-300 hover:text-blue-950 dark:hover:text-white p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ========================================================== */}
          {/* 1. SETUP VIEW (NEW PROJECT SHEET FORM CONFIG)              */}
          {/* ========================================================== */}
          {screen === "SETUP_VIEW" && (
            <motion.div
              key="setup-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto w-full flex flex-col gap-8"
            >
              <div className="text-center max-w-xl mx-auto">
                <span className="text-xs font-black uppercase tracking-widest text-[#2563EB] dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3.5 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
                  Step 1: Sheet & Document Setup
                </span>
                <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight mt-4">
                  Create Academic Scriptorium Sheet
                </h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-2 leading-relaxed">
                  Configure the target sheet layout properties, exam subjects,
                  and student particulars. VoiceScript will dynamically render
                  and preview your page in real-time.
                </p>
              </div>

              {/* Hands-Free Exam Platform Callout */}
              <div className="bg-linear-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-700/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
                        Full Disability Accommodations Mode
                      </span>
                    </div>
                    <h3 className="text-xl font-black mt-1">
                      Hands-Free Examination Platform
                    </h3>
                    <p className="text-xs text-emerald-100 mt-1 max-w-xl leading-relaxed">
                      Taking an official timed exam? Access voice navigation, live transcripts with editing commands ("scratch that", "delete last sentence"), TTS question reading, math formulas, voice diagram canvas, and tamper-evident SHA-256 digital submission.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("EXAM_LOGIN")}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  Launch Exam Platform
                </button>
              </div>

              {/* Layout Form Grid */}
              <div className="bg-[#FAF9F6] dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-6 md:p-8 space-y-8 shadow-xs transition-colors duration-300">
                {/* PART 1: CHOOSE SHEET SIZE & ORIENTATION */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#A8A29E] dark:text-gray-400 mb-4 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                    1. Paper Sheet Format & Dimensions
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sheet Size Select */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700 dark:text-stone-300 block">
                        Sheet Dimensions
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSheetSize("A4")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetSize === "A4"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            ISO A4 Sheet
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            210 mm × 297 mm
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSheetSize("Normal Exam Paper")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetSize === "Normal Exam Paper"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            Normal Exam Paper
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            8.5 in × 11 in (Letter)
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Sheet Orientation Select */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700 dark:text-stone-300 block">
                        Sheet Orientation
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSheetOrientation("Portrait")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetOrientation === "Portrait"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            Portrait
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            Vertical alignment
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSheetOrientation("Landscape")}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                            sheetOrientation === "Landscape"
                              ? "bg-white dark:bg-stone-800 border-[#2563EB] ring-2 ring-blue-50 dark:ring-blue-900/50 text-stone-950 dark:text-white"
                              : "bg-[#F5F5F4] dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                          }`}
                        >
                          <span className="font-extrabold text-base block">
                            Landscape
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            Horizontal alignment
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PART 2: LANGUAGE & TRANSLATION ENGINE */}
                <div className="border-t border-[#E7E5E4] pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#A8A29E] mb-4 flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-emerald-600" />
                    2. Language Transcription & Translation Engine
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Spoken Language */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-language"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Spoken/Dictated Language
                      </label>
                      <select
                        id="setup-language"
                        value={language}
                        onChange={(e) => {
                          const val = e.target.value as Language;
                          setLanguage(val);
                          setTargetLanguage(val); // default match
                        }}
                        className="h-11 w-full bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-3 font-semibold text-stone-800 dark:text-stone-300 cursor-not-allowed"
                        disabled
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.name} value={l.name}>
                            {l.localName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Translation Output */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-target-language"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Target Translation Output
                      </label>
                      <select
                        id="setup-target-language"
                        value={targetLanguage}
                        onChange={(e) =>
                          setTargetLanguage(e.target.value as Language)
                        }
                        className="h-11 w-full bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-3 font-semibold text-stone-800 dark:text-stone-300 cursor-not-allowed"
                        disabled
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.name} value={l.name}>
                            Translate to {l.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Selection */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="setup-subject"
                        className="text-xs font-bold text-stone-600 dark:text-stone-400"
                      >
                        Exam Subject
                      </label>
                      <select
                        id="setup-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value as Subject)}
                        className="h-11 w-full bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-stone-700 rounded-xl px-3 font-semibold text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                      >
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* PART 3: PARTICIPANT LOGS & NAMES */}
                <div className="border-t border-[#E7E5E4] dark:border-stone-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#A8A29E] dark:text-gray-400 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                      3. Candidate & Invigilator Credentials
                    </h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Both fields strictly required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="setup-student-name"
                          className="text-xs font-bold text-stone-700 dark:text-stone-300"
                        >
                          Student Candidate Name
                        </label>
                        <span className="text-[11px] text-red-500 font-bold">* Required</span>
                      </div>
                      <input
                        id="setup-student-name"
                        type="text"
                        placeholder="E.g., Vishnu M. Nair"
                        value={studentName}
                        onChange={(e) => {
                          setStudentName(e.target.value);
                          if (warningMessage) setWarningMessage(null);
                        }}
                        className={`h-11 w-full bg-white dark:bg-[#1f2937] rounded-xl px-4 font-semibold text-stone-800 dark:text-stone-100 transition-colors focus:ring-2 focus:ring-[#2563EB] ${
                          setupSubmitted && !studentName.trim()
                            ? "border-2 border-red-500 bg-red-50/20 dark:bg-red-950/20"
                            : "border border-[#E7E5E4] dark:border-stone-700"
                        }`}
                      />
                      {setupSubmitted && !studentName.trim() && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Please enter the candidate's name to proceed.
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="setup-examiner-name"
                          className="text-xs font-bold text-stone-700 dark:text-stone-300"
                        >
                          Authorized Room Invigilator / Scribe Witness
                        </label>
                        <span className="text-[11px] text-red-500 font-bold">* Required</span>
                      </div>
                      <input
                        id="setup-examiner-name"
                        type="text"
                        placeholder="E.g., Prof. K. Raghavan"
                        value={examinerName}
                        onChange={(e) => {
                          setExaminerName(e.target.value);
                          if (warningMessage) setWarningMessage(null);
                        }}
                        className={`h-11 w-full bg-white dark:bg-[#1f2937] rounded-xl px-4 font-semibold text-stone-800 dark:text-stone-100 transition-colors focus:ring-2 focus:ring-[#2563EB] ${
                          setupSubmitted && !examinerName.trim()
                            ? "border-2 border-red-500 bg-red-50/20 dark:bg-red-950/20"
                            : "border border-[#E7E5E4] dark:border-stone-700"
                        }`}
                      />
                      {setupSubmitted && !examinerName.trim() && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Please enter the invigilator's name to proceed.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement reminder if either is missing */}
              {(!studentName.trim() || !examinerName.trim()) && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    You must enter both <strong>Student Candidate Name</strong> and <strong>Authorized Room Invigilator</strong> to create the scribe document and open workspace.
                  </span>
                </div>
              )}

              {/* Action trigger footer */}
              <button
                type="button"
                onClick={handleStartProject}
                style={{ minHeight: "64px" }}
                className={`w-full text-white font-bold text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  studentName.trim() && examinerName.trim()
                    ? "bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] shadow-blue-100/60 dark:shadow-none"
                    : "bg-[#2563EB]/70 hover:bg-[#2563EB] shadow-none"
                }`}
              >
                <span>Create Scribe Document & Open Workspace</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>

              <div className="text-center">
                <p className="text-xs text-[#A8A29E] font-medium">
                  VoiceScript Academic Scribe System v2.1 • Approved by Academic
                  Accessibility Board
                </p>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* 2. THE DOCUMENT WORKSPACE (SPLIT VIEW SCRIBE PREVIEW)     */}
          {/* ========================================================== */}
          {screen === "WORKSPACE_VIEW" && (
            <motion.div
              key="workspace-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Back to Configuration */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] p-4 rounded-2xl shadow-xs transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <button
                    onClick={navigateBack}
                    className="p-2 sm:px-3 sm:py-2 bg-[#FAF9F6] dark:bg-stone-800 hover:bg-[#E7E5E4] dark:hover:bg-stone-700 rounded-lg border border-[#E7E5E4] dark:border-stone-700 transition-all cursor-pointer text-stone-700 dark:text-stone-300 flex items-center gap-1.5 shadow-2xs"
                    aria-label="Navigate to previous page (Setup Configuration)"
                    title="Navigate to Previous Page (Alt + Left Arrow)"
                  >
                    <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-stone-300" />
                    <span className="text-xs font-bold hidden sm:inline">Previous Page</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-stone-900 dark:text-white text-lg leading-none">
                        Workspace Project
                      </h2>
                      <span className="text-[10px] font-black uppercase bg-[#2563EB] text-white px-2 py-0.5 rounded-md leading-none">
                        {sheetSize} - {sheetOrientation}
                      </span>
                      <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md leading-none flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5" />
                        Page {currentPageNumber} of {totalDocumentPages}
                      </span>
                    </div>
                    <p className="text-stone-500 dark:text-stone-400 text-xs mt-1">
                      Subject:{" "}
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {subject}
                      </span>{" "}
                      • Translating spoken{" "}
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {language}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-[#2563EB] dark:text-blue-400">
                        {targetLanguage}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2 bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 px-3 py-1.5 rounded-lg transition-colors duration-300">
                    <label
                      htmlFor="font-size-slider"
                      className="text-xs font-bold text-stone-600 dark:text-stone-300"
                    >
                      Aa
                    </label>
                    <input
                      id="font-size-slider"
                      type="range"
                      min="10"
                      max="24"
                      value={previewFontSize}
                      onChange={(e) =>
                        setPreviewFontSize(Number(e.target.value))
                      }
                      className="w-20 sm:w-28 accent-[#2563EB] cursor-pointer"
                      title="Adjust document font size"
                    />
                    <span className="text-xs font-bold text-stone-500 w-6 text-right">
                      {previewFontSize}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowScribeCheatsheet((prev) => !prev)}
                    className={`text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                      showScribeCheatsheet
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-stone-600 bg-[#FAF9F6] hover:bg-[#E7E5E4] border border-[#E7E5E4] dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
                    }`}
                    title="Voice Command Cheatsheet (or say 'cheat sheet')"
                  >
                    <Mic className="w-3.5 h-3.5 text-blue-500" />
                    <span>Voice Cheatsheet</span>
                  </button>

                  <button
                    onClick={() => setShowShortcutsModal(true)}
                    className="text-xs font-bold text-stone-600 bg-[#FAF9F6] hover:bg-[#E7E5E4] border border-[#E7E5E4] py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Shortcuts
                  </button>
                  <button
                    onClick={() => navigateTo("SETUP_VIEW")}
                    className="text-xs font-bold text-stone-600 bg-[#FAF9F6] hover:bg-[#E7E5E4] border border-[#E7E5E4] py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Edit Configuration
                  </button>
                </div>
              </div>

              {/* The Interactive Workspace Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT CONTROL PANEL: dictating, editing, formatting, and downloading in a single window without scrolling (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3 transition-colors duration-300">
                    {/* 1. Document Pages Navigation Bar */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-200/80 dark:border-stone-800">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={handleAccessPreviousDocumentPage}
                          disabled={!hasPreviousDocumentPage}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            hasPreviousDocumentPage
                              ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-2xs active:scale-95"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-700 opacity-50 cursor-not-allowed"
                          }`}
                          title="Access Previous Page [PageUp / Alt+[]"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Previous</span>
                        </button>

                        <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-lg">
                          Pg {currentPageNumber}/{totalDocumentPages}
                        </span>

                        <button
                          type="button"
                          onClick={handleAccessNextDocumentPage}
                          disabled={!hasNextDocumentPage}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            hasNextDocumentPage
                              ? "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-600 shadow-2xs active:scale-95"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-700 opacity-50 cursor-not-allowed"
                          }`}
                          title="Next Page [PageDown / Alt+]]"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="hidden sm:flex items-center gap-1 max-w-[120px] overflow-x-auto">
                          {documentPages.map((pg, idx) => (
                            <button
                              key={pg.id}
                              type="button"
                              onClick={() => handleSelectDocumentPage(idx)}
                              className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                                idx === currentPageIndex
                                  ? "bg-blue-600 text-white"
                                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                              }`}
                              title={`Jump to Page ${idx + 1}`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddNewDocumentPage}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Add fresh blank page to answer document"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Page</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Scribe Play / Dictate Controller & Audio Status Bar (Immediately visible at top!) */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isListening
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                        : "bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800"
                    }`}>
                      {/* Prominent Play / Record Toggle Button */}
                      <button
                        id="mic-toggle-btn"
                        onClick={toggleListening}
                        type="button"
                        aria-label={isListening ? "Stop recording spoken dictation" : "Play / Start recording spoken dictation"}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 shrink-0 ${
                          isListening
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40 animate-pulse"
                            : "bg-[#EF4444] hover:bg-[#DC2626] text-white ring-2 ring-red-400/30"
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-4 h-4" />
                            <span>Recording Active (Stop)</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            <span>Start Dictating (Play)</span>
                          </>
                        )}
                      </button>

                      {/* Real-time Visualizer & Status */}
                      <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <AudioVisualizer isListening={isListening} />
                          <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            isListening ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-stone-500 dark:text-stone-400"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isListening ? "bg-emerald-500 animate-ping" : "bg-stone-300 dark:bg-stone-600"}`} />
                            {isListening ? "Recording..." : "Mic Offline"}
                          </span>
                        </div>
                        {confidenceScore !== null && isListening && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            Confidence: {Math.round(confidenceScore * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Spoken Transcription Box (Compact & clear) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
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
                              className="text-stone-400 hover:text-red-500 cursor-pointer font-medium"
                              title="Clear transcription"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        id="workspace-transcript-box"
                        placeholder="Your spoken words stream here in real-time... Feel free to edit or type directly anytime."
                        value={
                          isListening
                            ? `${transcript}${interimTranscript}`
                            : transcript
                        }
                        onChange={(e) => {
                          setTranscript(e.target.value);
                        }}
                        disabled={isListening}
                        rows={3}
                        className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none font-sans disabled:opacity-85"
                      />

                      {isListening && interimTranscript && (
                        <div className="p-1.5 rounded-lg border border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs italic">
                          Hearing: <span className="font-bold underline">"{interimTranscript}"</span>
                        </div>
                      )}
                    </div>

                    {/* 4. ALL PRIMARY ACTION BUTTONS IN A SINGLE WINDOW: Format, Approve & Download PDF */}
                    <div className="space-y-2 pt-1 border-t border-stone-200/80 dark:border-stone-800">
                      {/* Row 1: Format Academic Text & Approve & Download PDF */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Format Academic Text Button */}
                        <button
                          id="format-text-btn"
                          onClick={handleFormatAnswer}
                          disabled={isFormatting || !transcript.trim()}
                          className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:text-stone-400 dark:disabled:text-stone-500 disabled:cursor-not-allowed"
                          title="Format raw speech into formal academic layout (say 'format answer')"
                        >
                          {isFormatting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Formatting Answer...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                              <span>Format Academic Text</span>
                            </>
                          )}
                        </button>

                        {/* Approve & Download PDF Button */}
                        <button
                          onClick={handleDownloadFile}
                          disabled={
                            isDownloading ||
                            (!transcript.trim() && !formattedAnswer.trim())
                          }
                          className="relative h-11 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:text-stone-400 dark:disabled:text-stone-500 disabled:cursor-not-allowed overflow-hidden"
                          title="Approve and download answer sheet as PDF (say 'download pdf')"
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
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Exporting ({pdfProgress}%)...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5 text-emerald-200" />
                                <span>Approve & Download {exportFormat}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Row 2: Save to Cloud, Format Dropdown, Read Aloud, Reset */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          onClick={handleSaveToFirebase}
                          disabled={!transcript.trim() && !formattedAnswer.trim()}
                          className="h-9 px-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Save document state to cloud"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span className="truncate">Save Cloud</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTextToSpeech}
                          disabled={isSpeaking || (!transcript.trim() && !formattedAnswer.trim())}
                          className="h-9 px-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Listen to dictated answer read aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                          <span className="truncate">{isSpeaking ? "Speaking..." : "Read Aloud"}</span>
                        </button>

                        <div className="h-9 relative">
                          <select
                            id="export-format"
                            value={exportFormat}
                            onChange={(e) =>
                              setExportFormat(e.target.value as "PDF" | "Markdown")
                            }
                            className="w-full h-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-2 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer focus:ring-1 focus:ring-blue-500"
                            title="Choose export format: PDF or Markdown"
                          >
                            <option value="PDF">PDF (.pdf)</option>
                            <option value="Markdown">Markdown (.md)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetCurrentPage}
                          className="h-9 px-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Reset current page content"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="truncate">Reset</span>
                        </button>
                      </div>

                      {/* Hands-Free Voice Tip & Cheatsheet Toggle */}
                      <div className="pt-1.5 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                        <span className="flex items-center gap-1">
                          <Mic className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>Say: <strong>"previous page"</strong>, <strong>"format answer"</strong>, <strong>"download pdf"</strong>.</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowScribeCheatsheet((p) => !p)}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer shrink-0"
                        >
                          {showScribeCheatsheet ? "Hide Cheatsheet" : "Formula Sheet"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scribe Guideline Helper */}
                  <div className="bg-[#FAF9F6] dark:bg-stone-800/50 p-3 rounded-xl border border-[#E7E5E4] dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 transition-colors duration-300">
                    <span className="font-bold text-stone-800 dark:text-stone-300 uppercase tracking-widest text-[10px] block mb-0.5">
                      Scribe Guideline: {subject}
                    </span>
                    <p className="leading-relaxed text-[11px]">{SUBJECT_HELPER[subject]}</p>
                  </div>

                  {/* Cheatsheet section: Toggled without displacing primary controls */}
                  {showScribeCheatsheet && (
                    <VoiceCommandCheatsheet
                      mode="scribing"
                      variant="side-panel"
                      onSelectCommand={(cmd) => {
                        if (cmd.phrase === "previous page" && currentPageIndex > 0) {
                          handleAccessPreviousDocumentPage();
                        } else if (cmd.phrase === "next page" && currentPageIndex < documentPages.length - 1) {
                          handleAccessNextDocumentPage();
                        } else if (cmd.phrase === "new page") {
                          handleAddNewDocumentPage();
                        } else if (cmd.phrase === "format answer") {
                          handleFormatAnswer();
                        } else if (cmd.phrase === "download pdf") {
                          handleDownloadFile();
                        } else if (cmd.phrase === "clear text") {
                          setTranscript("");
                          setPageSwitchFeedback("Cleared spoken transcription");
                          setTimeout(() => setPageSwitchFeedback(null), 2500);
                        } else if (cmd.phrase === "scratch that") {
                          setTranscript((prev) => {
                            const trimmed = prev.trimEnd();
                            const lastSpace = trimmed.lastIndexOf(" ");
                            return lastSpace === -1 ? "" : trimmed.slice(0, lastSpace);
                          });
                          setPageSwitchFeedback("Erased last spoken word");
                          setTimeout(() => setPageSwitchFeedback(null), 2000);
                        } else if (cmd.phrase === "new paragraph") {
                          setTranscript((prev) => (prev ? prev.trimEnd() + "\n\n" : ""));
                        } else if (cmd.phrase === "new line") {
                          setTranscript((prev) => (prev ? prev.trimEnd() + "\n" : ""));
                        } else if (cmd.phrase === "stop listening") {
                          stopListening();
                        }
                      }}
                    />
                  )}
                </div>

                {/* RIGHT SHEET PREVIEW PANEL: accurate sheet ratios, margins & live update (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                      Document Sheet Live Preview
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-[#FAF9F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 py-1 px-2.5 rounded-lg flex items-center gap-1 transition-colors duration-300">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                        Live Updates
                      </span>
                    </div>
                  </div>

                  {/* Multi-Page Document Live Preview Toolbar */}
                  <div className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      {/* ACCESS PREVIOUS PAGE BUTTON */}
                      <button
                        type="button"
                        onClick={handleAccessPreviousDocumentPage}
                        disabled={!hasPreviousDocumentPage}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          hasPreviousDocumentPage
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-2 ring-blue-400/30 active:scale-95"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700 cursor-not-allowed opacity-50"
                        }`}
                        title={
                          hasPreviousDocumentPage
                            ? `Access Previous Page (Page ${currentPageNumber - 1} of ${totalDocumentPages}) [Shortcut: PageUp / Alt+[]`
                            : "You are currently on Page 1 (First Page of document)"
                        }
                        aria-label="Access Previous Page of the document"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Access Previous Page</span>
                        {hasPreviousDocumentPage && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
                            Pg {currentPageNumber - 1}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleAccessNextDocumentPage}
                        disabled={!hasNextDocumentPage}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          hasNextDocumentPage
                            ? "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-2xs active:scale-95"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700 cursor-not-allowed opacity-50"
                        }`}
                        title={
                          hasNextDocumentPage
                            ? `Go to Next Page (Page ${currentPageNumber + 1} of ${totalDocumentPages}) [Shortcut: PageDown / Alt+]]`
                            : "You are on the last page of document"
                        }
                        aria-label="Go to Next Page of the document"
                      >
                        <span>Next Page</span>
                        <ArrowRight className="w-4 h-4" />
                        {hasNextDocumentPage && (
                          <span className="text-[10px] bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded font-mono">
                            Pg {currentPageNumber + 1}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700">
                        Sheet Page {currentPageNumber} of {totalDocumentPages}
                      </span>

                      <button
                        type="button"
                        onClick={handleAddNewDocumentPage}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors active:scale-95"
                        title="Add a new blank sheet page to this document"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Page</span>
                      </button>

                      {totalDocumentPages > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDocumentPage(currentPageIndex)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                          title="Delete current page"
                          aria-label="Delete current page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PREVIEW CONTAINER STYLED PRECISELY BASED ON SIZE AND ORIENTATION */}
                  <div className="bg-[#E7E5E4]/40 dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-4 md:p-6 flex justify-center items-center overflow-x-auto shadow-inner min-h-[450px] transition-colors duration-300">
                    {/* The exact representation of the physical sheet */}
                    <div
                      id="pdf-render-target"
                      className={`relative p-8 md:p-11 flex flex-col justify-between font-sans transition-all duration-300 select-text ${
                        sheetOrientation === "Landscape"
                          ? "w-full max-w-[840px] aspect-[1.414/1]"
                          : "w-full max-w-[620px] aspect-[1/1.414]"
                      }`}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #D6D3D1",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        color: "#44403c",
                        fontSize: `${previewFontSize}px`,
                        lineHeight: "1.6",
                        minHeight:
                          sheetOrientation === "Portrait" ? "780px" : "550px",
                      }}
                    >
                      {/* Top blue accent binder bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ backgroundColor: "#2563EB" }}
                      />

                      {/* Header Segment */}
                      <div
                        style={{
                          borderBottom: "2px solid #e7e5e4",
                          paddingBottom: "20px",
                          marginBottom: "24px",
                        }}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span
                              style={{
                                backgroundColor: "#eff6ff",
                                border: "1px solid #dbeafe",
                                color: "#2563EB",
                                padding: "2px 10px",
                                borderRadius: "9999px",
                                display: "inline-block",
                                fontSize: "9px",
                                fontWeight: 900,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                              }}
                            >
                              BOARD ACCESSIBILITY DOCUMENT
                            </span>
                            <h2
                              style={{
                                color: "#1c1917",
                                fontSize: "20px",
                                fontWeight: 900,
                                marginTop: "10px",
                                letterSpacing: "-0.025em",
                              }}
                            >
                              Academic Written Examination Answer Sheet
                            </h2>
                            <p
                              style={{
                                color: "#78716c",
                                fontSize: "10px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginTop: "4px",
                              }}
                            >
                              Scribed via VoiceScript Web Client
                            </p>
                          </div>

                          <div
                            style={{
                              textAlign: "right",
                              fontSize: "10px",
                              color: "#78716c",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              fontWeight: 600,
                            }}
                          >
                            <div>
                              Format:{" "}
                              <span
                                style={{ color: "#1c1917", fontWeight: "bold" }}
                              >
                                {sheetSize} ({sheetOrientation})
                              </span>
                            </div>
                            <div>
                              Subject:{" "}
                              <span
                                style={{ color: "#1c1917", fontWeight: "bold" }}
                              >
                                {subject}
                              </span>
                            </div>
                            <div>
                              Language:{" "}
                              <span style={{ color: "#1c1917" }}>
                                {language}
                              </span>
                            </div>
                            {language !== targetLanguage && (
                              <div>
                                Target:{" "}
                                <span
                                  style={{
                                    color: "#2563eb",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {targetLanguage}
                                </span>
                              </div>
                            )}
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
                                fontSize: "10px",
                                alignSelf: "flex-end",
                                marginTop: "2px",
                              }}
                            >
                              <span>PAGE {currentPageNumber} OF {totalDocumentPages}</span>
                            </div>
                          </div>
                        </div>

                        {/* Candidate Credential Table Block */}
                        <div
                          className="grid grid-cols-2 gap-4 mt-5"
                          style={{
                            backgroundColor: "#faf9f6",
                            border: "1px solid #e7e5e4",
                            borderRadius: "12px",
                            padding: "14px",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                color: "#a8a29e",
                                fontSize: "9px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                display: "block",
                                marginBottom: "2px",
                              }}
                            >
                              Student Candidate
                            </span>
                            <span
                              style={{
                                color: "#1c1917",
                                fontWeight: 900,
                                fontSize: "14px",
                              }}
                            >
                              {studentName.trim() || "Scribe Student Candidate"}
                            </span>
                          </div>
                          <div>
                            <span
                              style={{
                                color: "#a8a29e",
                                fontSize: "9px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                display: "block",
                                marginBottom: "2px",
                              }}
                            >
                              Witness Scribe / Room Evaluator
                            </span>
                            <span
                              style={{
                                color: "#1c1917",
                                fontWeight: 600,
                                fontSize: "14px",
                              }}
                            >
                              {examinerName.trim() ||
                                "Assigned Room Invigilator"}
                            </span>
                          </div>
                        </div>

                        {/* In-Sheet Access Previous Page Banner */}
                        {currentPageNumber > 1 && (
                          <div
                            style={{
                              backgroundColor: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              borderRadius: "10px",
                              padding: "10px 14px",
                              marginTop: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              color: "#1e40af",
                            }}
                            className="print:hidden"
                          >
                            <div className="flex items-center gap-2 font-bold">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                              <span>Document Sheet Page {currentPageNumber} of {totalDocumentPages}</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAccessPreviousDocumentPage}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                              title={`Access Previous Page (Page ${currentPageNumber - 1})`}
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Access Previous Page ({currentPageNumber - 1})</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content Body Segment */}
                      <div className="flex-grow flex flex-col justify-start">
                        {/* Determine what to show in the preview sheet */}
                        {formattedAnswer ? (
                          <div className="space-y-4">
                            <KaTeXText text={formattedAnswer} />
                          </div>
                        ) : transcript ? (
                          <div className="space-y-4 animate-fadeIn">
                            {/* Draft transcript live preview */}
                            <div
                              style={{
                                backgroundColor: "rgba(254, 243, 199, 0.4)",
                                border: "1px solid rgba(252, 211, 77, 0.6)",
                                borderRadius: "12px",
                                padding: "16px",
                                marginBottom: "16px",
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: "#fef3c7",
                                  color: "#b45309",
                                  fontSize: "9px",
                                  fontWeight: 900,
                                  textTransform: "uppercase",
                                  padding: "2px 8px",
                                  borderRadius: "9999px",
                                  display: "inline-block",
                                  marginBottom: "6px",
                                }}
                              >
                                Spoken Draft (Real-Time Rendering)
                              </span>
                              <p
                                style={{
                                  color: "#44403c",
                                  fontStyle: "italic",
                                  lineHeight: "1.6",
                                  fontSize: "15px",
                                }}
                              >
                                {isListening
                                  ? `${transcript} ${interimTranscript}`
                                  : transcript}
                              </p>
                            </div>
                            <p
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#b45309",
                                fontStyle: "italic",
                              }}
                            >
                              * Click "Format Academic text" on the left panel
                              to translate spoken Malayalam to standard English
                              formatting, resolve LaTeX symbols, balance
                              chemical elements, or construct CS code blocks.
                            </p>
                          </div>
                        ) : (
                          <div
                            className="flex-grow flex flex-col items-center justify-center py-10"
                            style={{ color: "#d6d3d1" }}
                          >
                            <FileCheck className="w-16 h-16 opacity-30 stroke-1" />
                            <p className="text-xs font-semibold uppercase tracking-widest mt-3">
                              Candidate response will render here live...
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer Segment */}
                      <div
                        style={{
                          borderTop: "1px solid #e7e5e4",
                          paddingTop: "20px",
                          marginTop: "24px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          fontSize: "9px",
                          color: "#a8a29e",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div>
                            Certified Indian Academic Scribe replacement • Page {currentPageNumber} of {totalDocumentPages}
                          </div>
                          <div>
                            Verification:{" "}
                            {formattedAnswer ? providerUsed : "Draft mode"}
                          </div>
                        </div>

                        {/* Custom signature box */}
                        <div
                          style={{
                            borderTop: "1px solid #d6d3d1",
                            width: "144px",
                            paddingTop: "6px",
                            textAlign: "center",
                          }}
                        >
                          Candidate/Scribe Signature
                        </div>
                      </div>
                    </div>

                    {/* OFFSCREEN MULTI-PAGE EXPORT TARGET (Used when downloading PDF with multiple pages) */}
                    <div
                      id="pdf-multi-page-export-container"
                      className="fixed -left-[9999px] top-0 pointer-events-none"
                      aria-hidden="true"
                    >
                      {documentPages.map((pg, idx) => {
                        const pageText = (idx === currentPageIndex ? (formattedAnswer || transcript) : (pg.formattedAnswer || pg.transcript)) || "";
                        return (
                          <div
                            key={pg.id || idx}
                            className={`p-8 md:p-11 flex flex-col justify-between font-sans ${
                              sheetOrientation === "Landscape"
                                ? "w-[840px] aspect-[1.414/1]"
                                : "w-[620px] aspect-[1/1.414]"
                            }`}
                            style={{
                              backgroundColor: "#ffffff",
                              color: "#44403c",
                              fontSize: `${previewFontSize}px`,
                              lineHeight: "1.6",
                              minHeight: sheetOrientation === "Portrait" ? "780px" : "550px",
                              pageBreakBefore: idx > 0 ? "always" : "auto",
                              breakBefore: idx > 0 ? "page" : "auto",
                            }}
                          >
                            {/* Top blue accent binder bar */}
                            <div
                              className="h-1.5 w-full mb-6"
                              style={{ backgroundColor: "#2563EB" }}
                            />

                            {/* Header */}
                            <div
                              style={{
                                borderBottom: "2px solid #e7e5e4",
                                paddingBottom: "20px",
                                marginBottom: "24px",
                              }}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <span
                                    style={{
                                      backgroundColor: "#eff6ff",
                                      border: "1px solid #dbeafe",
                                      color: "#2563EB",
                                      padding: "2px 10px",
                                      borderRadius: "9999px",
                                      display: "inline-block",
                                      fontSize: "9px",
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.1em",
                                    }}
                                  >
                                    BOARD ACCESSIBILITY DOCUMENT
                                  </span>
                                  <h2
                                    style={{
                                      color: "#1c1917",
                                      fontSize: "20px",
                                      fontWeight: 900,
                                      marginTop: "10px",
                                      letterSpacing: "-0.025em",
                                    }}
                                  >
                                    Academic Written Examination Answer Sheet
                                  </h2>
                                </div>

                                <div
                                  style={{
                                    textAlign: "right",
                                    fontSize: "10px",
                                    color: "#78716c",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <div>
                                    Format: <span style={{ color: "#1c1917", fontWeight: "bold" }}>{sheetSize} ({sheetOrientation})</span>
                                  </div>
                                  <div>
                                    Subject: <span style={{ color: "#1c1917", fontWeight: "bold" }}>{subject}</span>
                                  </div>
                                  <div style={{ color: "#2563EB", fontWeight: "bold" }}>
                                    PAGE {idx + 1} OF {documentPages.length}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="grid grid-cols-2 gap-4 mt-5"
                                style={{
                                  backgroundColor: "#faf9f6",
                                  border: "1px solid #e7e5e4",
                                  borderRadius: "12px",
                                  padding: "14px",
                                  fontSize: "12px",
                                }}
                              >
                                <div>
                                  <span style={{ color: "#a8a29e", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", display: "block" }}>
                                    Candidate Scribe Reference
                                  </span>
                                  <div style={{ fontWeight: 900, color: "#1c1917", fontSize: "14px", marginTop: "2px" }}>
                                    {studentName.trim() || "Registered Candidate"}
                                  </div>
                                </div>
                                <div>
                                  <span style={{ color: "#a8a29e", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", display: "block" }}>
                                    Witness Scribe / Room Evaluator
                                  </span>
                                  <div style={{ fontWeight: 800, color: "#1c1917", marginTop: "2px" }}>
                                    {examinerName.trim() || "Assigned Room Invigilator"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 py-4" style={{ minHeight: "400px" }}>
                              {pageText ? (
                                <div className="leading-relaxed whitespace-pre-wrap">
                                  <KaTeXText text={pageText} />
                                </div>
                              ) : (
                                <div className="text-stone-300 italic text-sm">Empty page content.</div>
                              )}
                            </div>

                            {/* Footer */}
                            <div
                              style={{
                                borderTop: "1px solid #e7e5e4",
                                paddingTop: "20px",
                                marginTop: "24px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-end",
                                fontSize: "9px",
                                color: "#a8a29e",
                                fontWeight: "bold",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div>Certified Indian Academic Scribe replacement</div>
                                <div>Page {idx + 1} of {documentPages.length}</div>
                              </div>
                              <div style={{ borderTop: "1px solid #d6d3d1", width: "144px", paddingTop: "6px", textAlign: "center" }}>
                                Candidate/Scribe Signature
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* 3. SUCCESS VIEW SCREEN                                     */}
          {/* ========================================================== */}
          {screen === "PDF_SUCCESS" && (
            <motion.div
              key="pdf-success-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-8 md:p-12 text-center shadow-lg flex flex-col items-center max-w-lg mx-auto transition-colors duration-300"
            >
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mb-6 ring-8 ring-emerald-50/40 dark:ring-emerald-900/20">
                <CheckCircle className="w-16 h-16 animate-pulse" />
              </div>

              <h1 className="text-3xl font-black text-[#1C1917] dark:text-white tracking-tight">
                Document Exported Successfully!
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-base mt-3 leading-relaxed">
                The high-fidelity academic exam sheet has been structured and
                exported as a digital {exportFormat} copy directly to your
                downloads.
              </p>

              {/* Meta logs card */}
              <div className="w-full bg-[#FAF9F6] dark:bg-stone-800 rounded-2xl p-5 border border-[#E7E5E4] dark:border-stone-700 my-6 text-left space-y-2.5 text-xs font-semibold transition-colors duration-300">
                <div className="flex justify-between border-b border-[#E7E5E4]/60 dark:border-stone-700/60 pb-2">
                  <span className="text-[#A8A29E] dark:text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                    Sheet Details
                  </span>
                  <span className="text-stone-800 dark:text-stone-200">
                    {sheetSize} Paper — {sheetOrientation} Format
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E7E5E4]/60 dark:border-stone-700/60 pb-2">
                  <span className="text-[#A8A29E] dark:text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                    Exam Subject
                  </span>
                  <span className="text-stone-800 dark:text-stone-200">
                    {subject}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E7E5E4]/60 dark:border-stone-700/60 pb-2">
                  <span className="text-[#A8A29E] dark:text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                    Candidate Identity
                  </span>
                  <span className="text-[#2563EB] dark:text-blue-400 font-black">
                    {studentName || "Scribe Candidate"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={resetAll}
                  style={{ minHeight: "56px" }}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Document
                </button>

                <button
                  onClick={navigateBack}
                  style={{ minHeight: "56px" }}
                  className="bg-white dark:bg-stone-800 hover:bg-[#FAF9F6] dark:hover:bg-stone-700 border border-[#E7E5E4] dark:border-stone-600 text-stone-700 dark:text-stone-300 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Navigate to Previous Page (Alt + Left Arrow)"
                >
                  <ArrowLeft className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                  <span>Previous Page</span>
                </button>

                <button
                  onClick={() => navigateTo("DOCUMENTS_VIEW")}
                  style={{ minHeight: "48px" }}
                  className="col-span-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Inspect in Saved Documents & History</span>
                </button>
              </div>
            </motion.div>
          )}
          {/* ========================================================== */}
          {/* 4. DOCUMENTS VIEW                                          */}
          {/* ========================================================== */}
          {screen === "DOCUMENTS_VIEW" && (
            <DocumentsView user={user} onBack={navigateBack} />
          )}

          {/* ========================================================== */}
          {/* 5. HANDS-FREE EXAM PLATFORM SCREENS                        */}
          {/* ========================================================== */}
          {screen === "EXAM_LOGIN" && (
            <motion.div
              key="exam-login-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <ExamLogin
                onLoginSuccess={handleCandidateLogin}
                onSwitchToScribe={() => navigateTo("SETUP_VIEW")}
                onBackToPreviousPage={navigateBack}
              />
            </motion.div>
          )}

          {screen === "EXAM_INSTRUCTIONS" && examCandidate && (
            <motion.div
              key="exam-instructions-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <ExamInstructions
                candidate={examCandidate}
                paper={examPaper}
                onBeginExam={handleBeginExam}
                onBackToLogin={navigateBack}
              />
            </motion.div>
          )}

          {screen === "EXAM_WORKSPACE" && examCandidate && (
            <motion.div
              key="exam-workspace-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex-1 flex flex-col"
            >
              <ExamWorkspace
                candidate={examCandidate}
                paper={examPaper}
                answers={examAnswers}
                onAnswersChange={setExamAnswers}
                initialQuestionIndex={examCurrentQuestionIndex}
                onQuestionIndexChange={setExamCurrentQuestionIndex}
                remainingSeconds={examRemainingSeconds}
                onRemainingSecondsChange={setExamRemainingSeconds}
                auditLog={examAuditLog}
                onAddAuditLog={(entry) => setExamAuditLog((prev) => [...prev, entry])}
                onGoToReview={handleGoToExamReview}
                onTimeExpired={handleConfirmFinalSubmit}
              />
            </motion.div>
          )}

          {screen === "EXAM_REVIEW" && examCandidate && (
            <motion.div
              key="exam-review-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <ExamReview
                candidate={examCandidate}
                paper={examPaper}
                answers={examAnswers}
                remainingSeconds={examRemainingSeconds}
                onEditQuestion={(idx) => {
                  setExamCurrentQuestionIndex(idx);
                  navigateTo("EXAM_WORKSPACE");
                }}
                onConfirmFinalSubmit={handleConfirmFinalSubmit}
                onBackToWorkspace={handleBackToWorkspace}
                onAutoFillUnanswered={handleAutoFillUnanswered}
              />
            </motion.div>
          )}

          {screen === "EXAM_SUBMITTED" && examReceipt && (
            <motion.div
              key="exam-submitted-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <ExamSubmissionReceiptView
                receipt={examReceipt}
                auditLog={examAuditLog}
                examPaper={examPaper}
                examinerName={examinerName}
                onStartNewExam={handleStartNewExam}
                onBackToPreviousPage={navigateBack}
                onViewSavedDocuments={() => navigateTo("DOCUMENTS_VIEW")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER ACCESSIBILITY */}
      <footer className="w-full border-t border-[#E7E5E4] dark:border-[#374151] bg-white dark:bg-[#1f2937] py-5 px-6 md:px-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-[#A8A29E] dark:text-stone-500 text-xs font-semibold uppercase tracking-wider gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Scribe Core Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span>Real-Time Layout Engine Configured</span>
            </div>
          </div>
          <span>ACCESSIBILITY REGISTRATION ID: 2026-VS-IND</span>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowShortcutsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl transition-colors duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Command className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#FAF9F6] dark:bg-stone-800/50 rounded-xl border border-[#E7E5E4] dark:border-stone-700">
                  <div>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 block">
                      Toggle Microphone
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Start or stop dictation recording
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-stone-600 dark:text-stone-300">
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Ctrl
                    </kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      M
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#FAF9F6] dark:bg-stone-800/50 rounded-xl border border-[#E7E5E4] dark:border-stone-700">
                  <div>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 block">
                      Format Academic Text
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Process and render your answer
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-stone-600 dark:text-stone-300">
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Ctrl
                    </kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Enter
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50">
                  <div>
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-200 block">
                      Access Previous Document Page
                    </span>
                    <span className="text-xs text-blue-700 dark:text-blue-300">
                      Voice: "Previous page" or "Back page"
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-blue-800 dark:text-blue-200">
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-blue-200 dark:border-stone-600 rounded shadow-xs">
                      PageUp
                    </kbd>
                    <span className="text-[10px]">or</span>
                    <kbd className="px-1.5 py-1 bg-white dark:bg-stone-700 border border-blue-200 dark:border-stone-600 rounded shadow-xs">
                      Alt+[
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#FAF9F6] dark:bg-stone-800/50 rounded-xl border border-[#E7E5E4] dark:border-stone-700">
                  <div>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 block">
                      Next Document Page
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Voice: "Next page"
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-stone-600 dark:text-stone-300">
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      PageDown
                    </kbd>
                    <span className="text-[10px]">or</span>
                    <kbd className="px-1.5 py-1 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Alt+]
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#FAF9F6] dark:bg-stone-800/50 rounded-xl border border-[#E7E5E4] dark:border-stone-700">
                  <div>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 block">
                      Navigate to Previous Screen
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Voice: "Go back" or "Previous screen"
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-black text-stone-600 dark:text-stone-300">
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      Alt
                    </kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded shadow-xs">
                      ←
                    </kbd>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowShortcutsModal(false)}
                className="mt-6 w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Help
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
