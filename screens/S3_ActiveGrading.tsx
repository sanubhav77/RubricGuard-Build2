import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GradingScreen, CriterionEvaluation, Submission, AIAnalysis, ValidationStatus, OverrideLog } from '../types';
import { useGradingSession } from '../context/GradingSessionContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import TextArea from '../components/TextArea';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { validateJustification, analyzeExplanationTone } from '../services/geminiService';

interface S3_ActiveGradingProps {
  setScreen: (screen: GradingScreen) => void;
}

interface CriterionFormState {
  score: number | '';
  explanation: string;
  highlightedText: string;
  aiAnalysis?: AIAnalysis;
  isLoadingAI?: boolean;
}

const S3_ActiveGrading: React.FC<S3_ActiveGradingProps> = ({ setScreen }) => {
  const { state, saveEvaluation, advanceSubmission, updateAnalytics, addOverrideLog, goToSubmission, setScreen: setGlobalScreen } = useGradingSession();
  const { currentSubmissionIndex, submissions, rubric, aiEnabled, gradedSubmissions, calibrationBaseline } = state;

  const currentSubmission = submissions[currentSubmissionIndex];
  const [criterionStates, setCriterionStates] = useState<{ [criterionId: string]: CriterionFormState }>(() => {
    const initialStates: { [criterionId: string]: CriterionFormState } = {};
    rubric.forEach(crit => {
      initialStates[crit.id] = { score: '', explanation: '', highlightedText: '' };
    });
    return initialStates;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  const [selectedCritForAnalysis, setSelectedCritForAnalysis] = useState<string | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [currentOverrideCritId, setCurrentOverrideCritId] = useState<string | null>(null);
  const [overrideJustification, setOverrideJustification] = useState('');

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
    if (aiEnabled) {
      setCriterionStates(prev => ({
        ...prev,
        [criterionId]: { ...prev[criterionId], aiAnalysis: undefined, isLoadingAI: false }
      }));
    }
  };

  const triggerAIAnalysis = useCallback(async (criterionId: string, explanationValue: string, currentHighlight?: string) => {
    const currentCritState = criterionStates[criterionId];
    if (explanationValue.trim() !== '' && currentSubmission) {
      setCriterionStates(prev => ({
        ...prev,
        [criterionId]: { ...prev[criterionId], isLoadingAI: true, aiAnalysis: undefined }
      }));
      try {
        const crit = rubric.find(c => c.id === criterionId);
        if (!crit) return;
        const aiAnalysis = await validateJustification(
          currentSubmission.content,
          crit,
          currentCritState.score === '' ? 0 : currentCritState.score,
          explanationValue,
          currentHighlight || currentCritState.highlightedText
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
  }, [criterionStates, currentSubmission, rubric, aiEnabled]);

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

      if (debounceRef.current[criterionId]) {
        clearTimeout(debounceRef.current[criterionId]);
      }

      debounceRef.current[criterionId] = setTimeout(() => {
        triggerAIAnalysis(criterionId, value);
      }, 600); // Debounce time
    }
  };

  const handleHighlightSelection = () => {
    const selection = window.getSelection();
    if (selection && currentSubmission && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      const submissionContentElement = document.getElementById('submission-content');
      if (submissionContentElement && submissionContentElement.contains(selection.anchorNode) && submissionContentElement.contains(selection.focusNode)) {
        setCriterionStates(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(critId => {
            newState[critId] = { ...newState[critId], highlightedText: selectedText };
            if (aiEnabled && newState[critId].explanation.trim() !== '') {
              // Re-trigger AI analysis with new highlight
              triggerAIAnalysis(critId, newState[critId].explanation, selectedText);
            }
          });
          return newState;
        });
      }
    }
  };

  const calculateAnalytics = useCallback(async () => {
    if (!calibrationBaseline || gradedSubmissions.length === 0) return;

    // Explanation Validity Rate
    let supportedCount = 0;
    let partialCount = 0;
    let notSupportedCount = 0;
    let analyzedCount = 0;

    // Score Drift & Criterion Variance
    const latestSubmissionRecord = gradedSubmissions[gradedSubmissions.length - 1];
    const currentSubmissionMeanScores: { [criterionId: string]: number } = {};
    const criterionScoreHistory: { [criterionId: string]: number[] } = {};

    gradedSubmissions.forEach(record => {
      record.evaluations.forEach(evalItem => {
        if (evalItem.aiAnalysis && evalItem.aiAnalysis.status !== ValidationStatus.Error && evalItem.aiAnalysis.status !== ValidationStatus.NotAnalyzed) {
          analyzedCount++;
          if (evalItem.aiAnalysis.status === ValidationStatus.Supported) supportedCount++;
          if (evalItem.aiAnalysis.status === ValidationStatus.Partial) partialCount++;
          if (evalItem.aiAnalysis.status === ValidationStatus.NotSupported) notSupportedCount++;
        }

        if (evalItem.score !== null) {
          criterionScoreHistory[evalItem.criterionId] = criterionScoreHistory[evalItem.criterionId] || [];
          criterionScoreHistory[evalItem.criterionId].push(evalItem.score);
        }
      });
    });

    latestSubmissionRecord.evaluations.forEach(evalItem => {
      if (evalItem.score !== null) {
        currentSubmissionMeanScores[evalItem.criterionId] = evalItem.score; // For latest, it's just the score
      }
    });

    // Simple validity rate (Supported + Partial)
    const explanationValidityRate = analyzedCount > 0 ? ((supportedCount + partialCount) / analyzedCount) * 100 : 0;

    // Score Drift Percentage (average deviation from baseline)
    let totalDrift = 0;
    let driftCriterionCount = 0;
    for (const critId in currentSubmissionMeanScores) {
      if (calibrationBaseline.meanScores[critId] !== undefined) {
        totalDrift += Math.abs(currentSubmissionMeanScores[critId] - calibrationBaseline.meanScores[critId]);
        driftCriterionCount++;
      }
    }
    const scoreDriftPercentage = driftCriterionCount > 0 ? (totalDrift / driftCriterionCount) : 0;

    // Criterion Variance (simple variance over time for each criterion)
    const criterionVarianceHeatmap: { [criterionId: string]: number[] } = {};
    rubric.forEach(crit => {
        const scores = criterionScoreHistory[crit.id] || [];
        if (scores.length > 1) {
            // Calculate variance for the scores
            const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            const variance = scores.map(s => (s - mean) ** 2).reduce((sum, s) => sum + s, 0) / (scores.length -1 || 1);
            criterionVarianceHeatmap[crit.id] = [...(criterionVarianceHeatmap[crit.id] || []), variance];
        } else {
            criterionVarianceHeatmap[crit.id] = [...(criterionVarianceHeatmap[crit.id] || []), 0]; // No variance for single score
        }
    });


    // Justification Strength Trend (using explanation length as proxy)
    const justificationStrengthTrend: number[] = gradedSubmissions.map(record => {
      const totalLength = record.evaluations.reduce((sum, evalItem) => sum + evalItem.explanation.length, 0);
      return totalLength / record.evaluations.length;
    });

    // High-risk grading flags (simplified example)
    const highRiskFlags: string[] = [];
    if (explanationValidityRate < 80 && analyzedCount > 0) highRiskFlags.push('Low explanation validity rate');
    if (scoreDriftPercentage > 5) highRiskFlags.push('Significant score drift detected');

    updateAnalytics({
      explanationValidityRate,
      scoreDriftPercentage,
      criterionVarianceHeatmap,
      justificationStrengthTrend,
      highRiskFlags,
    });
  }, [calibrationBaseline, gradedSubmissions, rubric, updateAnalytics]);

  useEffect(() => {
    // Only calculate analytics after a submission is saved
    if (gradedSubmissions.length > 0) {
      calculateAnalytics();
    }
  }, [gradedSubmissions.length, calculateAnalytics]);

  const handleSaveAndContinue = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const evaluationsToSave: CriterionEvaluation[] = [];
      let allValid = true;
      let needsOverride = false;

      for (const crit of rubric) {
        const stateForCrit = criterionStates[crit.id];
        if (stateForCrit.score === '' || stateForCrit.explanation.trim() === '') {
          allValid = false;
          break;
        }

        const aiStatus = stateForCrit.aiAnalysis?.status;
        if (aiEnabled && (aiStatus === ValidationStatus.Partial || aiStatus === ValidationStatus.NotSupported)) {
            // If AI assistance is enabled and flags an issue, prompt for override
            if (!stateForCrit.aiAnalysis?.overrideJustification) { // Only prompt if not already overridden
                needsOverride = true;
                setCurrentOverrideCritId(crit.id);
                setOverrideModalOpen(true);
                setIsSaving(false); // Pause saving to wait for override
                return;
            }
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
        // All submissions graded, go to Reflection
        setGlobalScreen(GradingScreen.Reflection);
      }
    } catch (e: any) {
      setError(`Failed to save: ${e.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverrideSubmit = () => {
    if (currentOverrideCritId && overrideJustification.trim()) {
      const originalAIAnalysis = criterionStates[currentOverrideCritId]?.aiAnalysis;
      if (originalAIAnalysis && originalAIAnalysis.status !== ValidationStatus.Supported) {
        // Update the AI analysis for the criterion to include the override justification
        setCriterionStates(prev => ({
          ...prev,
          [currentOverrideCritId]: {
            ...prev[currentOverrideCritId],
            aiAnalysis: {
              ...originalAIAnalysis,
              overrideJustification: overrideJustification.trim(),
            },
          },
        }));

        // Log the override
        addOverrideLog({
          submissionId: currentSubmission!.id,
          criterionId: currentOverrideCritId,
          originalAIStatus: originalAIAnalysis.status,
          professorJustification: overrideJustification.trim(),
          timestamp: Date.now(),
        });

        setOverrideModalOpen(false);
        setOverrideJustification('');
        setCurrentOverrideCritId(null);
        // Continue with the save process
        handleSaveAndContinue();
      }
    } else {
      setError('Override justification is required.');
    }
  };

  if (!currentSubmission || !calibrationBaseline) {
    return (
      <div className="flex justify-center items-center h-full text-gray-600 dark:text-gray-400">
        <LoadingSpinner className="mr-2" /> Loading submission or calibration data...
      </div>
    );
  }

  const aiAnalysisForModal = selectedCritForAnalysis ? criterionStates[selectedCritForAnalysis]?.aiAnalysis : undefined;

  // Calculate overall consistency (simple heuristic)
  const consistencyIndicator = state.sessionAnalytics.scoreDriftPercentage <= 3 ? 'Good' : 'Needs Attention';
  const consistencyColor = state.sessionAnalytics.scoreDriftPercentage <= 3 ? 'text-success' : 'text-warning';

  const submissionNavButtons = submissions.map((_, index) => (
    <button
      key={index}
      onClick={() => goToSubmission(index)}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-150
        ${index === currentSubmissionIndex
          ? 'bg-primary text-white'
          : gradedSubmissions.some(g => g.submissionId === submissions[index].id)
            ? 'bg-gray-200 text-gray-700 hover:bg-primary-100 hover:text-primary dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-dark'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700'
        }
      `}
      aria-current={index === currentSubmissionIndex ? 'page' : undefined}
    >
      {index + 1}
    </button>
  ));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 h-full">
      {/* Left Column: Submission Text & Highlight Tool */}
      <Card className="lg:col-span-1 xl:col-span-2 overflow-y-auto h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Submission for {currentSubmission.studentName}
          </h3>
          <div className="flex gap-2">
            {submissionNavButtons}
          </div>
        </div>
        <div
          id="submission-content"
          className="prose dark:prose-invert text-gray-700 dark:text-gray-200 text-base leading-relaxed flex-grow overflow-y-auto p-2 cursor-text select-text"
          onMouseUp={handleHighlightSelection}
        >
          {currentSubmission.content}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Highlight text in the submission to associate it with your explanation.
        </p>
      </Card>

      {/* Center Column: Rubric Grading */}
      <div className="lg:col-span-1 flex flex-col space-y-4">
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
                      <div className="flex items-center gap-2">
                         <Badge status={criterionStates[crit.id]?.aiAnalysis?.status || ValidationStatus.NotAnalyzed} />
                         {(criterionStates[crit.id]?.aiAnalysis?.status === ValidationStatus.Partial ||
                           criterionStates[crit.id]?.aiAnalysis?.status === ValidationStatus.NotSupported ||
                           criterionStates[crit.id]?.aiAnalysis?.error) &&
                           !criterionStates[crit.id]?.aiAnalysis?.overrideJustification && (
                            <Button
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              onClick={() => {
                                setCurrentOverrideCritId(crit.id);
                                setOverrideModalOpen(true);
                              }}
                            >
                              Override
                            </Button>
                         )}
                        {criterionStates[crit.id]?.aiAnalysis?.overrideJustification && (
                          <Badge status="info" className="!bg-accent-100 !text-accent">Overridden</Badge>
                        )}
                        <Button
                           variant="secondary"
                           className="px-2 py-1 text-xs"
                           onClick={() => {
                             setSelectedCritForAnalysis(crit.id);
                             setShowAIAnalysisModal(true);
                           }}
                         >
                           Review AI Analysis
                         </Button>
                      </div>
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

        {/* Persistent Call-to-Action for Grading */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-subtle border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleSaveAndContinue}
            disabled={isSaving || currentSubmissionIndex >= submissions.length}
            isLoading={isSaving}
            fullWidth
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>

      {/* Right Column: Compact Live Analytics Panel */}
      <Card className="lg:col-span-1 flex flex-col space-y-4 xl:sticky xl:top-24 h-fit max-h-[80vh]">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Live Analytics</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Explanation Validity:</span>
            <span className="font-medium text-primary">
              {state.sessionAnalytics.explanationValidityRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Score Drift:</span>
            <span className={`font-medium ${consistencyColor}`}>
              {state.sessionAnalytics.scoreDriftPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Consistency:</span>
            <span className={`font-medium ${consistencyColor}`}>
              {consistencyIndicator}
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setGlobalScreen(GradingScreen.LiveAnalytics)}
          fullWidth
          className="mt-4"
        >
          View Full Analytics
        </Button>
      </Card>

      {/* AI Analysis Modal */}
      <Modal
        isOpen={showAIAnalysisModal}
        onClose={() => setShowAIAnalysisModal(false)}
        title="AI Analysis"
      >
        {selectedCritForAnalysis && aiAnalysisForModal ? (
          <div className="space-y-4 text-gray-700 dark:text-gray-200">
            <h4 className="font-semibold text-lg">{rubric.find(c => c.id === selectedCritForAnalysis)?.name}</h4>
            <p><strong>Status:</strong> <Badge status={aiAnalysisForModal.status} className="ml-2" /></p>
            {aiAnalysisForModal.error && (
              <p className="text-danger"><strong>Error:</strong> {aiAnalysisForModal.error}</p>
            )}
            {aiAnalysisForModal.referencedExcerpt && (
              <p><strong>AI-referenced Excerpt:</strong> "<span className="italic bg-blue-50 dark:bg-blue-900 px-1 rounded">{aiAnalysisForModal.referencedExcerpt}</span>"</p>
            )}
            {aiAnalysisForModal.suggestedRefinement && (
              <p><strong>Suggested Refinement:</strong> {aiAnalysisForModal.suggestedRefinement}</p>
            )}
            {aiAnalysisForModal.overrideJustification && (
              <p><strong>Professor's Override Justification:</strong> "<span className="italic bg-gray-100 dark:bg-gray-700 px-1 rounded">{aiAnalysisForModal.overrideJustification}</span>"</p>
            )}
          </div>
        ) : (
          <p>No AI analysis available for this criterion.</p>
        )}
      </Modal>

      {/* Override Justification Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => {
          setOverrideModalOpen(false);
          setError(null);
          setOverrideJustification('');
          setCurrentOverrideCritId(null);
          setIsSaving(false); // Release saving block
        }}
        title="Justify Override"
        footer={
          <Button onClick={handleOverrideSubmit} disabled={!overrideJustification.trim()}>
            Submit Justification
          </Button>
        }
      >
        <p className="mb-4 text-gray-700 dark:text-gray-200">
          The AI analysis for "{rubric.find(c => c.id === currentOverrideCritId)?.name}" indicates
          "{criterionStates[currentOverrideCritId!]?.aiAnalysis?.status}". Please provide a justification for
          overriding this suggestion.
        </p>
        {error && (
          <div className="bg-danger-100 text-danger p-3 rounded-md text-sm mb-4" role="alert">
            {error}
          </div>
        )}
        <TextArea
          label="Override Justification"
          value={overrideJustification}
          onChange={(e) => setOverrideJustification(e.target.value)}
          placeholder="Explain why you are overriding the AI's feedback."
          id="override-justification"
        />
      </Modal>
    </div>
  );
};

export default S3_ActiveGrading;