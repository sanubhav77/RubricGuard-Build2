export enum GradingScreen {
  Setup = 'Setup',
  Calibration = 'Calibration',
  ActiveGrading = 'ActiveGrading',
  LiveAnalytics = 'LiveAnalytics',
  Reflection = 'Reflection',
  Finalization = 'Finalization',
}

export interface Course {
  id: string;
  name: string;
}

export interface Assignment {
  id: string;
  name: string;
  courseId: string;
  hasRubric: boolean;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentName: string;
  content: string; // The actual essay/submission text
  graded: boolean;
}

export enum ValidationStatus {
  Supported = 'Supported',
  Partial = 'Partial',
  NotSupported = 'Not Supported',
  NotAnalyzed = 'Not Analyzed',
  Error = 'Error',
}

export interface AIAnalysis {
  status: ValidationStatus;
  referencedExcerpt?: string;
  suggestedRefinement?: string;
  tone?: string;
  error?: string;
}

export interface CriterionEvaluation {
  criterionId: string;
  score: number | null;
  explanation: string;
  highlightedText?: string;
  aiAnalysis?: AIAnalysis;
  overrideJustification?: string;
}

export interface EvaluationRecord {
  submissionId: string;
  evaluations: CriterionEvaluation[];
  timestamp: number; // When this submission was graded
}

export interface OverrideLog {
  submissionId: string;
  criterionId: string;
  originalAIStatus: ValidationStatus;
  professorJustification: string;
  timestamp: number;
}

export interface CalibrationBaseline {
  meanScores: { [criterionId: string]: number };
  explanationStrengthMean: number;
  toneMean: { [toneType: string]: number }; // e.g., { "professional": 0.8, "empathetic": 0.5 }
}

export interface SessionAnalytics {
  explanationValidityRate: number; // %
  scoreDriftPercentage: number; // % vs. calibration baseline
  criterionVarianceHeatmap: { [criterionId: string]: number[] }; // Variance over time/submissions
  justificationStrengthTrend: number[]; // Array of strength values per submission
  highRiskFlags: string[]; // List of flagged decisions (e.g., poor validity, high drift)
  overrideCount: number;
  earlyVsLateScores: {
    early: { [criterionId: string]: number[] };
    late: { [criterionId: string]: number[] };
  };
  rubricAdherencePercentage: number;
  sessionConfidenceScore: number;
  aiAssistanceSummary: {
    totalInterventions: number;
    refinementsApplied: number;
    overridesAfterIntervention: number;
  };
}

// Context type
export interface GradingSessionState {
  currentScreen: GradingScreen;
  selectedCourse: Course | null;
  selectedAssignment: Assignment | null;
  rubric: RubricCriterion[];
  submissions: Submission[];
  currentSubmissionIndex: number;
  aiEnabled: boolean;
  gradedSubmissions: EvaluationRecord[];
  calibrationSubmissionsCount: number; // Number of submissions to complete calibration (e.g., 3 or 5)
  calibrationBaseline: CalibrationBaseline | null;
  sessionAnalytics: SessionAnalytics;
  overrideLogs: OverrideLog[];
}

export type GradingSessionAction =
  | { type: 'SET_SCREEN'; payload: GradingScreen }
  | { type: 'SET_COURSE_ASSIGNMENT_RUBRIC'; payload: { course: Course; assignment: Assignment; rubric: RubricCriterion[] } }
  | { type: 'SET_SUBMISSIONS'; payload: Submission[] }
  | { type: 'SET_AI_ENABLED'; payload: boolean }
  | { type: 'SAVE_EVALUATION'; payload: { submissionIndex: number; evaluations: CriterionEvaluation[] } }
  | { type: 'ADVANCE_SUBMISSION' }
  | { type: 'SET_CALIBRATION_BASELINE'; payload: CalibrationBaseline }
  | { type: 'UPDATE_ANALYTICS'; payload: Partial<SessionAnalytics> }
  | { type: 'ADD_OVERRIDE_LOG'; payload: OverrideLog }
  | { type: 'RESET_SESSION' }
  | { type: 'SET_CURRENT_SUBMISSION_INDEX'; payload: number };
