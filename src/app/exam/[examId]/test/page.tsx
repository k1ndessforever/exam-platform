'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useExam } from '@/hooks/useExam';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/Button';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { Timer } from '@/components/exam/Timer';

export default function ExamTestPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  
  const {
    state,
    loading,
    startExam,
    fetchQuestion,
    saveAnswer,
    toggleMarkForReview,
    submitExam,
  } = useExam(examId);
  
  const [examData, setExamData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    const initExam = async () => {
      try {
        const data = await startExam();
        setExamData(data);
      } catch (error: any) {
        alert(error.message);
        router.push('/dashboard');
      }
    };
    
    initExam();
  }, []);
  
  useEffect(() => {
    if (state.attemptId && state.questionIds.length > 0) {
      fetchQuestion(0);
    }
  }, [state.attemptId, state.questionIds]);
  
  const { formattedTime, isExpired } = useTimer(
    examData?.durationMinutes || 120,
    examData?.startedAt || new Date(),
    handleTimeExpired
  );
  
  async function handleTimeExpired() {
    alert('Time expired! Submitting exam...');
    await handleSubmit();
  }
  
  const handleAnswerSelect = async (option: string) => {
    if (!state.currentQuestion) return;
    await saveAnswer(state.currentQuestion.id, option);
  };
  
  const handleNext = async () => {
    if (state.currentIndex < state.questionIds.length - 1) {
      await fetchQuestion(state.currentIndex + 1);
    }
  };
  
  const handlePrevious = async () => {
    if (state.currentIndex > 0) {
      await fetchQuestion(state.currentIndex - 1);
    }
  };
  
  const handleMarkToggle = () => {
    if (!state.currentQuestion) return;
    toggleMarkForReview(state.currentQuestion.id);
  };
  
  const handleSubmit = async () => {
    if (!window.confirm('Submit exam now? You cannot undo this action.')) {
      return;
    }
    
    setSubmitting(true);
    try {
      await submitExam();
      router.push(`/exam/${examId}/result?attemptId=${state.attemptId}`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading || !state.currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }
  
  const question = state.currentQuestion;
  const questionId = state.questionIds[state.currentIndex];
  const selectedOption = state.answers[questionId];
  const isMarked = state.markedForReview.has(questionId);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Question {state.currentIndex + 1} of {state.questionIds.length}
              </h2>
              <p className="text-sm text-gray-600">{question.subject}</p>
            </div>
            
            <div className="flex items-center gap-6">
              <Timer formattedTime={formattedTime} isExpired={isExpired} />
              
              <Button
                variant="danger"
                onClick={handleSubmit}
                isLoading={submitting}
              >
                Submit Exam
              </Button>
            </div>
          </div>
          
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${((state.currentIndex + 1) / state.questionIds.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                    question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {question.difficulty}
                  </span>
                  {isMarked && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                      ⭐ Marked
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">Topic: {question.topic}</p>
              </div>
              
              <p className="text-lg text-gray-800 mb-6 leading-relaxed bg-gray-50 p-6 rounded-lg">
                {question.questionText}
              </p>
              
              {question.hasDiagram && question.diagram && (
                <div className="my-6">
                  <img
                    src={question.diagram.filePath}
                    alt={question.diagram.altText || 'Question diagram'}
                    className="max-w-full h-auto rounded-lg border"
                  />
                </div>
              )}
              
              <div className="space-y-3 mb-8">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswerSelect(opt)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition ${
                      selectedOption === opt
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        selectedOption === opt
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {opt}
                      </div>
                      <span className="flex-1">{question[`option${opt}`]}</span>
                      {selectedOption === opt && (
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={handleMarkToggle}
                  className="flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill={isMarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {isMarked ? 'Unmark' : 'Mark for Review'}
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={state.currentIndex === 0}
                >
                  ← Previous
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={state.currentIndex === state.questionIds.length - 1}
                  className="flex-1"
                >
                  Save & Next →
                </Button>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <QuestionPalette
              questionIds={state.questionIds}
              currentIndex={state.currentIndex}
              answers={state.answers}
              markedForReview={state.markedForReview}
              onQuestionSelect={fetchQuestion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}