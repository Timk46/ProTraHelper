/**
 * Modelle für Code-Submission und Feedback im tutor-kai Modul
 */

export interface TestResult {
  name: string;
  passed: boolean;
  exception?: string;
}

export interface CodeSubmissionResult {
  CodeSubmissionResult: {
    output: string | null;
    score: number;
    testResults?: TestResult[];
    testsPassed?: boolean;
  };
  encryptedCodeSubissionId: string;
}

// Entspricht dem DTO auf der Server-Seite
export type CodeSubmissionResultDto = CodeSubmissionResult;

export enum FeedbackLevel {
  LOW = 'Wenig Unterstützung',
  STANDARD = 'Standard Unterstützung',
  HIGH = 'Viel Unterstützung'
}

export enum FlavorType {
  STANDARD = 'Standard Feedback',
  CONCEPT = 'Feedback mit Konzept-Erklärung'
}

export enum WorkspaceState {
  START = 'start',
  EDITING_CODE = 'editingCode',
  SUBMITTED_CODE = 'submittedCode',
  GENERATING_FEEDBACK = 'generatingFeedback',
  RECEIVING_FEEDBACK = 'receivingFeedback',
  FINISHED_FEEDBACK = 'finishedFeedback',
  FEEDBACK_RATED = 'feedbackRated'
}

export interface FeedbackRating {
  rating: number;
  comment: string;
  submissionId: string;
}

/**
 * Neue Modelle für die erweiterten Feedback-Optionen
 */

// Interface für eine Feedback-Frage
export interface FeedbackQuestion {
  id: string;
  text: string;
  value: string; // Wert, der an den Server gesendet wird
}

// Interface für eine Feedback-Kategorie
export interface FeedbackCategory {
  id: string;
  name: string;
  icon: string;
  keyword: string;
  questions: FeedbackQuestion[];
}

// Konstante mit allen Feedback-Kategorien und -Fragen
export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  {
    id: 'mistakes',
    name: 'Knowledge about Mistakes',
    icon: '🔍',
    keyword: 'Fehleranalyse',
    questions: [
      { id: 'test-failures', text: 'Welcher Test schlägt fehl?', value: 'KM_TEST_FAILURES' },
      { id: 'compiler-errors', text: 'Welche Compiler-Fehler habe ich gemacht?', value: 'KM_COMPILER_ERRORS' },
      { id: 'solution-errors', text: 'Was ist falsch an meiner Lösung?', value: 'KM_SOLUTION_ERRORS' },
      { id: 'location-hint', text: 'Wo finde ich meinen Fehler?', value: 'KM_LOCATION_HINT' }
    ]
  },
  {
    id: 'how-to-proceed',
    name: 'Knowledge on How to Proceed',
    icon: '🧭',
    keyword: 'Wegweiser',
    questions: [
      { id: 'task-processing-steps', text: 'Was ist der nächste konkrete Schritt?', value: 'KH_TASK_PROCESSING_STEPS' },
      { id: 'improvements', text: 'Wie könnte ich meine Lösung verbessern?', value: 'KH_IMPROVEMENTS' },
      { id: 'data-hints', text: 'Welche Variablenwerte brauche ich?', value: 'KH_DATA_HINTS' }
    ]
  },
  {
    id: 'task-constraints',
    name: 'Knowledge on Task Constraints',
    icon: '📋',
    keyword: 'Anforderungen',
    questions: [
      { id: 'requirements', text: 'Welche Anforderungen hat die Aufgabe?', value: 'KTCL_REQUIREMENTS' },
      { id: 'explain', text: 'Kannst du mir die Aufgabenstellung noch einmal erklären?', value: 'KTC_EXPLAIN' },
    ]
  },
  {
    id: 'concepts',
    name: 'Knowledge about Concepts',
    icon: '💡',
    keyword: 'Konzepte',
    questions: [
      { id: 'concept-explanation', text: 'Kannst du mir das Konzept genauer erklären?', value: 'KC_CONCEPT_EXPLANATION' },
      { id: 'concept-example', text: 'Hast du ein Beispiel für dieses Konzept?', value: 'KC_CONCEPT_EXAMPLE' },
    ]
  },
  /*
  { 
    id: 'meta-cognition',
    name: 'Knowledge on Meta-cognition',
    icon: '🧠',
    keyword: 'Denkstrategien',
    questions: [
      // SPS = neuer Feedbacktyp nach Kiesler bei metakognitivem Wissen // Kiesler: Strategic Processing Steps (SPS) als Feedback-Typ, der Informationen über das systematische, strategische Lösen einer Aufgabe und damit vergleichbarer Aufgaben liefert, z. B. durch die Vorgabe von Arbeitsschritten, Nutzung bestimmter Kontrollstrukturen, Datentypen, etc.
      { id: 'strategic-processing-steps', text: 'Wie würdest du eine ähnliche Aufgabe lösen?', value: 'KMC_SPS' }, // schon eher KCR Feedback?!?

      { id: 'understanding-strategy', text: 'Welche Strategie könnte mir helfen, die Aufgabe besser zu verstehen?', value: 'KMC_UNDERSTANDING_STRATEGY' },
    ]
  },
  */
  {
    id: 'additional-options',
    name: 'Zusätzliche Optionen',
    icon: '✨',
    keyword: 'Sonstiges',
    questions: [
      { id: 'small-hint', text: 'Ich brauche einen kleinen Hinweis.', value: 'AO_SMALL_HINT' }, // sokratisch
      { id: 'other-question', text: 'Ich habe eine andere Frage.', value: 'AO_OTHER_QUESTION' } // immer als textfeld unten
    ]
  }
];
