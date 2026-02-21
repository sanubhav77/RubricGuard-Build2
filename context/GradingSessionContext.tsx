import React, { createContext, useReducer, useContext, ReactNode, useCallback } from 'react';
import {
  Assignment,
  Course,
  CriterionEvaluation,
  EvaluationRecord,
  GradingScreen,
  GradingSessionAction,
  GradingSessionState,
  RubricCriterion,
  Submission,
  CalibrationBaseline,
  OverrideLog,
  // Fix: Add 'type' keyword to SessionAnalytics import for better type resolution
  type SessionAnalytics, 
} from '../types';
import { CALIBRATION_SUBMISSIONS_REQUIRED, INITIAL_ANALYTICS } from '../constants'; // Corrected import path for INITIAL_ANALYTICS

const initialState: GradingSessionState = {
  currentScreen: GradingScreen.Setup,
  selectedCourse: null,
  selectedAssignment: null,
  rubric: [],
  submissions: [],
  currentSubmissionIndex: 0,
  aiEnabled: true,
  gradedSubmissions: [],
  calibrationSubmissionsCount: CALIBRATION_SUBMISSIONS_REQUIRED,
  calibrationBaseline: null,
  sessionAnalytics: INITIAL_ANALYTICS,
  overrideLogs: [],
};

const gradingSessionReducer = (state: GradingSessionState, action: GradingSessionAction): GradingSessionState => {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'SET_COURSE_ASSIGNMENT_RUBRIC':
      return {
        ...state,
        selectedCourse: action.payload.course,
        selectedAssignment: action.payload.assignment,
        rubric: action.payload.rubric,
      };
    case 'SET_SUBMISSIONS':
      return { ...state, submissions: action.payload, currentSubmissionIndex: 0, gradedSubmissions: [], sessionAnalytics: INITIAL_ANALYTICS, overrideLogs: [] };
    case 'SET_AI_ENABLED':
      return { ...state, aiEnabled: action.payload };
    case 'SAVE_EVALUATION': {
      const { submissionIndex, evaluations } = action.payload;
      const newGradedSubmissions = [...state.gradedSubmissions];
      const existingRecordIndex = newGradedSubmissions.findIndex(
        (rec) => rec.submissionId === state.submissions[submissionIndex].id
      );

      const newRecord: EvaluationRecord = {
        submissionId: state.submissions[submissionIndex].id,
        evaluations: evaluations,
        timestamp: Date.now(),
      };

      if (existingRecordIndex !== -1) {
        newGradedSubmissions[existingRecordIndex] = newRecord;
      } else {
        newGradedSubmissions.push(newRecord);
      }

      // Mark submission as graded
      const updatedSubmissions = [...state.submissions];
      if (updatedSubmissions[submissionIndex]) {
        updatedSubmissions[submissionIndex].graded = true;
      }

      return {
        ...state,
        gradedSubmissions: newGradedSubmissions,
        submissions: updatedSubmissions,
      };
    }
    case 'ADVANCE_SUBMISSION':
      return {
        ...state,
        currentSubmissionIndex: state.currentSubmissionIndex + 1,
      };
    case 'SET_CALIBRATION_BASELINE':
      return { ...state, calibrationBaseline: action.payload };
    case 'UPDATE_ANALYTICS':
      return {
        ...state,
        sessionAnalytics: { ...state.sessionAnalytics, ...action.payload },
      };
    case 'ADD_OVERRIDE_LOG':
      return {
        ...state,
        overrideLogs: [...state.overrideLogs, action.payload],
        sessionAnalytics: {
          ...state.sessionAnalytics,
          overrideCount: state.sessionAnalytics.overrideCount + 1,
        },
      };
    case 'RESET_SESSION':
      return initialState;
    case 'SET_CURRENT_SUBMISSION_INDEX':
      return { ...state, currentSubmissionIndex: action.payload };
    default:
      return state;
  }
};

interface GradingSessionContextType {
  state: GradingSessionState;
  dispatch: React.Dispatch<GradingSessionAction>;
  // Helper functions for common actions
  setScreen: (screen: GradingScreen) => void;
  setCourseAssignmentRubric: (course: Course, assignment: Assignment, rubric: RubricCriterion[]) => void;
  setSubmissions: (submissions: Submission[]) => void;
  setAIEnabled: (enabled: boolean) => void;
  saveEvaluation: (submissionIndex: number, evaluations: CriterionEvaluation[]) => void;
  advanceSubmission: () => void;
  setCalibrationBaseline: (baseline: CalibrationBaseline) => void;
  updateAnalytics: (analytics: Partial<SessionAnalytics>) => void;
  addOverrideLog: (log: OverrideLog) => void;
  resetSession: () => void;
  goToSubmission: (index: number) => void;
}

const GradingSessionContext = createContext<GradingSessionContextType | undefined>(undefined);

export const GradingSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gradingSessionReducer, initialState);

  const setScreen = useCallback((screen: GradingScreen) => { // Removed <T,>
    dispatch({ type: 'SET_SCREEN', payload: screen });
  }, []);

  const setCourseAssignmentRubric = useCallback((course: Course, assignment: Assignment, rubric: RubricCriterion[]) => { // Removed <T,>
    dispatch({ type: 'SET_COURSE_ASSIGNMENT_RUBRIC', payload: { course, assignment, rubric } });
  }, []);

  const setSubmissions = useCallback((submissions: Submission[]) => { // Removed <T,>
    dispatch({ type: 'SET_SUBMISSIONS', payload: submissions });
  }, []);

  const setAIEnabled = useCallback((enabled: boolean) => { // Removed <T,>
    dispatch({ type: 'SET_AI_ENABLED', payload: enabled });
  }, []);

  const saveEvaluation = useCallback((submissionIndex: number, evaluations: CriterionEvaluation[]) => { // Removed <T,>
    dispatch({ type: 'SAVE_EVALUATION', payload: { submissionIndex, evaluations } });
  }, []);

  const advanceSubmission = useCallback(() => { // Removed <T,>
    dispatch({ type: 'ADVANCE_SUBMISSION' });
  }, []);

  const setCalibrationBaseline = useCallback((baseline: CalibrationBaseline) => { // Removed <T,>
    dispatch({ type: 'SET_CALIBRATION_BASELINE', payload: baseline });
  }, []);

  const updateAnalytics = useCallback((analytics: Partial<SessionAnalytics>) => { // Removed <T,>
    dispatch({ type: 'UPDATE_ANALYTICS', payload: analytics });
  }, []);

  const addOverrideLog = useCallback((log: OverrideLog) => { // Removed <T,>
    dispatch({ type: 'ADD_OVERRIDE_LOG', payload: log });
  }, []);

  const resetSession = useCallback(() => { // Removed <T,>
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const goToSubmission = useCallback((index: number) => { // Removed <T,>
    dispatch({ type: 'SET_CURRENT_SUBMISSION_INDEX', payload: index });
  }, []);

  return (
    <GradingSessionContext.Provider
      value={{
        state,
        dispatch,
        setScreen,
        setCourseAssignmentRubric,
        setSubmissions,
        setAIEnabled,
        saveEvaluation,
        advanceSubmission,
        setCalibrationBaseline,
        updateAnalytics,
        addOverrideLog,
        resetSession,
        goToSubmission,
      }}
    >
      {children}
    </GradingSessionContext.Provider>
  );
};

export const useGradingSession = () => {
  const context = useContext(GradingSessionContext);
  if (context === undefined) {
    throw new Error('useGradingSession must be used within a GradingSessionProvider');
  }
  return context;
};