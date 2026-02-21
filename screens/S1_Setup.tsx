import React, { useState, useEffect } from 'react';
import { GradingScreen, Course, Assignment, RubricCriterion } from '../types';
import { useGradingSession } from '../context/GradingSessionContext';
import { MOCK_COURSES, MOCK_ASSIGNMENTS, MOCK_RUBRICS, MOCK_SUBMISSIONS } from '../constants';
import Dropdown from '../components/Dropdown';
import Accordion from '../components/Accordion';
import Toggle from '../components/Toggle';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';

interface S1_SetupProps {
  setScreen: (screen: GradingScreen) => void;
}

const S1_Setup: React.FC<S1_SetupProps> = ({ setScreen }) => {
  const { state, setCourseAssignmentRubric, setSubmissions, setAIEnabled, resetSession } = useGradingSession();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(state.selectedCourse?.id || null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(state.selectedAssignment?.id || null);
  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
  const [rubricPreview, setRubricPreview] = useState<RubricCriterion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resetSession(); // Ensure a clean state when starting a new session
  }, [resetSession]);

  useEffect(() => {
    if (selectedCourseId) {
      setAvailableAssignments(MOCK_ASSIGNMENTS.filter(a => a.courseId === selectedCourseId));
      setSelectedAssignmentId(null); // Reset assignment when course changes
      setRubricPreview([]);
    } else {
      setAvailableAssignments([]);
      setSelectedAssignmentId(null);
      setRubricPreview([]);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedAssignmentId) {
      const assignment = MOCK_ASSIGNMENTS.find(a => a.id === selectedAssignmentId);
      if (assignment?.hasRubric) {
        const rubric = MOCK_RUBRICS[selectedAssignmentId];
        setRubricPreview(rubric || []);
        if (!rubric) {
          setError('Rubric not found for this assignment.');
        } else {
          setError(null);
        }
      } else if (assignment) {
        setError('This assignment does not have a rubric and cannot be graded with the AI assistant.');
        setRubricPreview([]);
      }
    } else {
      setRubricPreview([]);
      setError(null);
    }
  }, [selectedAssignmentId]);

  const handleBeginCalibration = async () => {
    if (!selectedCourseId || !selectedAssignmentId) {
      setError('Please select a course and an assignment.');
      return;
    }

    const course = MOCK_COURSES.find(c => c.id === selectedCourseId);
    const assignment = MOCK_ASSIGNMENTS.find(a => a.id === selectedAssignmentId);
    const rubric = MOCK_RUBRICS[selectedAssignmentId];
    const submissions = MOCK_SUBMISSIONS[selectedAssignmentId];

    if (!course || !assignment || !rubric || rubric.length === 0) {
      setError('Selected assignment is invalid or has no rubric.');
      return;
    }
    if (!submissions || submissions.length === 0) {
      setError('No submissions found for this assignment.');
      return;
    }
    if (!assignment.hasRubric) {
      setError('Assignment must include a rubric.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call/loading
      setCourseAssignmentRubric(course, assignment, rubric);
      setSubmissions(submissions);
      setScreen(GradingScreen.Calibration);
    } catch (e: any) {
      setError(`Failed to initialize session: ${e.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = selectedCourseId && selectedAssignmentId && rubricPreview.length > 0;
  const submissionCount = selectedAssignmentId ? (MOCK_SUBMISSIONS[selectedAssignmentId]?.length || 0) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Session Setup</h2>

      {error && (
        <div className="bg-danger-100 text-danger p-4 rounded-md text-sm" role="alert">
          {error}
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <Dropdown<Course>
            label="Select Course"
            id="course-select" // Added id prop
            options={MOCK_COURSES}
            valueKey="id"
            displayKey="name"
            placeholder="Choose a course"
            value={selectedCourseId || ''}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          />

          <Dropdown<Assignment>
            label="Select Assignment"
            id="assignment-select" // Added id prop
            options={availableAssignments}
            valueKey="id"
            displayKey="name"
            placeholder="Choose an assignment"
            value={selectedAssignmentId || ''}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            disabled={!selectedCourseId}
          />
        </div>
      </Card>

      {selectedAssignmentId && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Assignment Details</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">Submissions: {submissionCount}</span>
          </div>
          <Accordion title="Rubric Preview" defaultOpen={true}>
            {rubricPreview.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                {rubricPreview.map((crit) => (
                  <li key={crit.id} className="text-sm">
                    <strong className="font-medium">{crit.name}</strong> (Max Score: {crit.maxScore}): {crit.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No rubric available for preview or selected assignment has no rubric.</p>
            )}
          </Accordion>
        </Card>
      )}

      <Card>
        <Toggle
          label="Enable AI Assistance"
          checked={state.aiEnabled}
          onChange={setAIEnabled}
          id="ai-toggle"
        />
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          When enabled, the AI will provide real-time feedback on your rubric justifications.
        </p>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={handleBeginCalibration}
          disabled={!isFormValid || isLoading}
          isLoading={isLoading}
          fullWidth
          className="max-w-md mx-auto"
        >
          {isLoading ? 'Loading Session...' : 'Begin Calibration'}
        </Button>
      </div>
    </div>
  );
};

export default S1_Setup;