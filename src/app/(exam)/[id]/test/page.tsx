'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function TestPage() {
  const params = useParams();
  const [attemptId, setAttemptId] = useState<string>('');
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(7200);
  
  // Start exam
  useEffect(() => {
    fetch('/api/exam/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: params.id,
        userId: 'USER_ID_FROM_AUTH' // Get from session
      })
    })
      .then(res => res.json())
      .then(data => {
        setAttemptId(data.attemptId);
        setQuestionIds(data.questionIds);
      });
  }, [params.id]);
  
  // Fetch current question
  useEffect(() => {
    if (attemptId && questionIds.length > 0) {
      const questionId = questionIds[currentIndex];
      fetch(`/api/exam/question/${questionId}?attemptId=${attemptId}`)
        .then(res => res.json())
        .then(data => setCurrentQuestion(data));
    }
  }, [attemptId, questionIds, currentIndex]);
  
  // Timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      handleSubmit();
    }
  }, [timeRemaining]);
  
  const handleAnswer = async (option: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: option });
    
    await fetch('/api/exam/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        questionId: currentQuestion.id,
        selectedOption: option
      })
    });
  };
  
  const handleSubmit = async () => {
    const res = await fetch('/api/exam/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId })
    });
    
    const result = await res.json();
    // Redirect to results page
    window.location.href = `/exam/${params.id}/result?attemptId=${attemptId}`;
  };
  
  if (!currentQuestion) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with timer */}
      <div className="bg-white shadow p-4 flex justify-between">
        <h1>Question {currentIndex + 1} of {questionIds.length}</h1>
        <div className="text-red-600 font-mono text-xl">
          {Math.floor(timeRemaining / 3600)}:
          {Math.floor((timeRemaining % 3600) / 60).toString().padStart(2, '0')}:
          {(timeRemaining % 60).toString().padStart(2, '0')}
        </div>
      </div>
      
      {/* Question */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-lg mb-4">{currentQuestion.questionText}</p>
          
          {currentQuestion.hasDiagram && currentQuestion.diagram && (
            <img
              src={currentQuestion.diagram.filePath}
              alt={currentQuestion.diagram.altText}
              className="my-4 max-w-full"
            />
          )}
          
          {/* Options */}
          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map(opt => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  answers[currentQuestion.id] === opt
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="font-bold mr-3">({opt})</span>
                {currentQuestion[`option${opt}`]}
              </button>
            ))}
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-gray-200 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          
          {currentIndex === questionIds.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-red-600 text-white rounded-lg"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}