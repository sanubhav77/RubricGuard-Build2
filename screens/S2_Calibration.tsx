import React, { useState, useEffect, useRef } from 'react';
import { GradingScreen, CriterionEvaluation, Submission, AIAnalysis, ValidationStatus, CalibrationBaseline } from '../types';
import { useGradingSession } from '../context/GradingSessionContext';
import { CALIBRATION_SUBMISSIONS_REQUIRED } from '../constants';
import Button from '../components/Button';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';
import TextArea from '../components/TextArea';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { validateJustification, analyzeExplanationTone } from '../services/geminiService';

interface S2_CalibrationProps {
  setScreen: (screen: GradingScreen) => void;
}

interface CriterionFormState {
  score: number | '';
  explanation: string;
  highlightedText: string;
  aiAnalysis?: AIAnalysis;
  isLoadingAI?: boolean;
}

const S2_Calibration: React.FC<S2_CalibrationProps> = ({ setScreen }) => {
  const { state, saveEvaluation, advanceSubmission, setCalibrationBaseline, setScreen: setGlobalScreen } = useGradingSession();
  const { currentSubmissionIndex, submissions, rubric, aiEnabled, gradedSubmissions } = state;

  const currentSubmission = submissions[currentSubmissionIndex];
  const isCalibrationComplete = gradedSubmissions.length >= CALIBRATION_SUBMISSIONS_REQUIRED;

  const [criterionStates, setCriterionStates] = useState<{ [criterionId: string]: CriterionFormState }>(() => {
    const initialStates: { [criterionId: string]: CriterionFormState } = {};
    rubric.forEach(crit => {
      initialStates[crit.id] = { score: '', explanation: '', highlightedText: '' };
    });
    return initialStates;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix: Replaced NodeJS.Timeout with number for browser environment
  const debounceRef = useRef<{ [criterionId: string]: number }>({});

  // Reset form state when submission changes
  useEffect(() => {
    if (currentSubmission) {
      const existingEvaluation = gradedSubmissions.find(
        (rec) => rec.submissionId === currentSubmission.id
      );

      const initialStates: { [criterionId: string]: CriterionFormState } = {};
      rubric.forEach(crit => {
        const evalForCrit = existingEvaluation?.evaluations.find(e => e.criterionId === crit.id);
        initialStates[crit.id] = {
          score: evalForCrit?.score ?? '',
          explanation: evalForCrit?.explanation ?? '',
          highlightedText: evalForCrit?.highlightedText ?? '',
          aiAnalysis: evalForCrit?.aiAnalysis,
        };
      });
      setCriterionStates(initialStates);
      setError(null);
    }
  }, [currentSubmission, rubric, gradedSubmissions]);

  const handleScoreChange = (criterionId: string, value: string) => {
    const score = value === '' ? '' : parseInt(value, 10);
    setCriterionStates(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], score: score }
    }));
    // Clear AI analysis if score changes
    if (aiEnabled) {
      setCriterionStates(prev => ({
        ...prev,
        [criterionId]: { ...prev[criterionId], aiAnalysis: undefined, isLoadingAI: false }
      }));
    }
  };

  const handleExplanationChange = (criterionId: string, value: string) => {
    setCriterionStates(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], explanation: value }
    }));

    if (aiEnabled) {
      setCriterionStates(prev => ({
        ...prev,
        [criterionId]: { ...prev[criterionId], aiAnalysis: undefined, isLoadingAI: true }
      }));

      // Clear previous debounce
      if (debounceRef.current[criterionId]) {
        clearTimeout(debounceRef.current[criterionId]);
      }

      // Set new debounce
      debounceRef.current[criterionId] = setTimeout(async () => {
        const currentCritState = criterionStates[criterionId];
        if (value.trim() !== '' && currentSubmission) {
          try {
            const crit = rubric.find(c => c.id === criterionId);
            if (!crit) return;
            const aiAnalysis = await validateJustification(
              currentSubmission.content,
              crit,
              currentCritState.score === '' ? 0 : currentCritState.score,
              value,
              currentCritState.highlightedText
            );
            setCriterionStates(prev => ({
              ...prev,
              [criterionId]: { ...prev[criterionId], aiAnalysis, isLoadingAI: false }
            }));
          } catch (e) {
            console.error("AI validation failed:", e);
            setCriterionStates(prev => ({
              ...prev,
              [criterionId]: { ...prev[criterionId], aiAnalysis: { status: ValidationStatus.Error, error: "AI analysis failed." }, isLoadingAI: false }
            }));
          }
        } else {
           setCriterionStates(prev => ({
            ...prev,
            [criterionId]: { ...prev[criterionId], aiAnalysis: undefined, isLoadingAI: false }
          }));
        }
      }, 600); // Debounce time
    }
  };

  const handleHighlightSelection = () => {
    const selection = window.getSelection();
    if (selection && currentSubmission && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      // Heuristic to check if selection is within the submission content div
      const submissionContentElement = document.getElementById('submission-content');
      if (submissionContentElement && submissionContentElement.contains(selection.anchorNode) && submissionContentElement.contains(selection.focusNode)) {
        // For simplicity, we'll apply the same highlight to all criteria for now
        // In a more complex app, user might highlight for a specific criterion
        setCriterionStates(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(critId => {
            newState[critId] = { ...newState[critId], highlightedText: selectedText };
            // Trigger AI re-evaluation if AI is enabled
            if (aiEnabled && newState[critId].explanation.trim() !== '') {
              handleExplanationChange(critId, newState[critId].explanation);
            }
          });
          return newState;
        });
      }
    }
  };

  const handleSaveAndContinue = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const evaluationsToSave: CriterionEvaluation[] = [];
      let allValid = true;

      for (const crit of rubric) {
        const stateForCrit = criterionStates[crit.id];
        if (stateForCrit.score === '' || stateForCrit.explanation.trim() === '') {
          allValid = false;
          break;
        }
        evaluationsToSave.push({
          criterionId: crit.id,
          score: stateForCrit.score as number,
          explanation: stateForCrit.explanation.trim(),
          highlightedText: stateForCrit.highlightedText || undefined,
          aiAnalysis: stateForCrit.aiAnalysis,
        });
      }

      if (!allValid) {
        setError('Please provide a score and an explanation for all rubric criteria.');
        setIsSaving(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate save
      saveEvaluation(currentSubmissionIndex, evaluationsToSave);

      if (currentSubmissionIndex < submissions.length - 1) {
        advanceSubmission();
      } else {
        setError('All submissions graded!'); // End of submissions, should lead to reflection
      }
    } catch (e: any) {
      setError(`Failed to save: ${e.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateCalibrationBaseline = async () => {
    const allCriterionScores: { [criterionId: string]: number[] } = {};
    const explanationStrengths: number[] = [];
    const toneAnalyses: { [toneType: string]: number[] } = {}; // Simplified: just count occurrences or average sentiment scores

    for (const record of gradedSubmissions) {
      for (const evalItem of record.evaluations) {
        if (evalItem.score !== null) {
          allCriterionScores[evalItem.criterionId] = allCriterionScores[evalItem.criterionId] || [];
          allCriterionScores[evalItem.criterionId].push(evalItem.score);

          // Simulate explanation strength (e.g., length, keyword count)
          // For now, let's use explanation length as a proxy for 'strength'
          explanationStrengths.push(evalItem.explanation.length);

          // Simulate tone analysis
          if (aiEnabled && evalItem.explanation.trim() !== '') {
            try {
              const tone = await analyzeExplanationTone(evalItem.explanation);
              // Simple heuristic for tone: if it contains "constructive", mark as 1, else 0
              const toneCategory = tone.includes("constructive") ? "constructive" : "other";
              toneAnalyses[toneCategory] = toneAnalyses[toneCategory] || [];
              toneAnalyses[toneCategory].push(1);
            } catch (e) {
              console.warn("Could not analyze tone for calibration:", e);
            }
          }
        }
      }
    }

    const meanScores: { [criterionId: string]: number } = {};
    for (const critId in allCriterionScores) {
      const sum = allCriterionScores[critId].reduce((acc, score) => acc + score, 0);
      meanScores[critId] = sum / allCriterionScores[critId].length;
    }

    const explanationStrengthMean = explanationStrengths.length > 0
      ? explanationStrengths.reduce((acc, val) => acc + val, 0) / explanationStrengths.length
      : 0;

    const toneMean: { [toneType: string]: number } = {};
    for (const toneCategory in toneAnalyses) {
      toneMean[toneCategory] = toneAnalyses[toneCategory].length / gradedSubmissions.length;
    }

    setCalibrationBaseline({
      meanScores,
      explanationStrengthMean,
      toneMean,
    });
  };

  useEffect(() => {
    if (isCalibrationComplete && !state.calibrationBaseline) {
      calculateCalibrationBaseline();
    }
  }, [isCalibrationComplete, gradedSubmissions.length, state.calibrationBaseline]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnterActiveGrading = () => {
    if (!isCalibrationComplete) {
      setError(`Please grade at least ${CALIBRATION_SUBMISSIONS_REQUIRED} submissions to complete calibration.`);
      return;
    }
    if (!state.calibrationBaseline) {
      setError('Calibration baseline not established. Please try again.');
      calculateCalibrationBaseline(); // Attempt to recalculate if somehow missed
      return;
    }
    setGlobalScreen(GradingScreen.ActiveGrading);
  };

  if (!currentSubmission) {
    return (
      <div className="flex justify-center items-center h-full text-gray-600 dark:text-gray-400">
        <LoadingSpinner className="mr-2" /> Loading submission...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 h-full">
      {/* Left Column: Submission Viewer */}
      <Card className="md:col-span-1 lg:col-span-2 overflow-y-auto h-full flex flex-col">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Submission for {currentSubmission.studentName}
        </h3>
        <div
          id="submission-content"
          className="prose dark:prose-invert text-gray-700 dark:text-gray-200 text-base leading-relaxed flex-grow overflow-y-auto p-2"
          onMouseUp={handleHighlightSelection}
        >
          {currentSubmission.content}
        </div>
      </Card>

      {/* Right Column: Rubric Cards and Controls */}
      <div className="md:col-span-1 lg:col-span-1 flex flex-col space-y-4">
        <Card className="flex-grow overflow-y-auto">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Grade Rubric</h3>
          {error && (
            <div className="bg-danger-100 text-danger p-3 rounded-md text-sm mb-4" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-6">
            {rubric.map(crit => (
              <div key={crit.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-2">{crit.name} (Max: {crit.maxScore})</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{crit.description}</p>
                <div className="flex items-center gap-4 mb-3">
                  <Input
                    label="Score"
                    type="number"
                    min="0"
                    max={crit.maxScore.toString()}
                    value={criterionStates[crit.id]?.score}
                    onChange={(e) => handleScoreChange(crit.id, e.target.value)}
                    className="w-24 font-mono"
                    id={`score-${crit.id}`}
                  />
                  {aiEnabled && (criterionStates[crit.id]?.isLoadingAI ? (
                    <LoadingSpinner className="text-primary h-5 w-5" />
                  ) : (
                    criterionStates[crit.id]?.aiAnalysis?.status && (
                      <Badge status={criterionStates[crit.id]?.aiAnalysis?.status || ValidationStatus.NotAnalyzed} />
                    )
                  ))}
                </div>
                {criterionStates[crit.id]?.highlightedText && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    Highlighted text: "{criterionStates[crit.id]?.highlightedText}"
                  </div>
                )}
                <TextArea
                  label="Explanation"
                  placeholder="Justify your score based on the rubric and submission content."
                  value={criterionStates[crit.id]?.explanation}
                  onChange={(e) => handleExplanationChange(crit.id, e.target.value)}
                  id={`explanation-${crit.id}`}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Persistent Call-to-Action and Progress */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-subtle border-t border-gray-200 dark:border-gray-700">
          <ProgressBar
            current={gradedSubmissions.length}
            total={CALIBRATION_SUBMISSIONS_REQUIRED}
            label={`Calibration Progress`}
            className="mb-4"
          />
          <Button
            onClick={handleSaveAndContinue}
            disabled={isSaving || currentSubmissionIndex >= submissions.length}
            isLoading={isSaving}
            fullWidth
            className="mb-2"
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>
          <Button
            onClick={handleEnterActiveGrading}
            disabled={!isCalibrationComplete || !state.calibrationBaseline}
            fullWidth
            variant="secondary"
          >
            Enter Active Grading
          </Button>
          {!isCalibrationComplete && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Grade {CALIBRATION_SUBMISSIONS_REQUIRED - gradedSubmissions.length} more submissions to enable Active Grading.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default S2_Calibration;