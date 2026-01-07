'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExamState {
  attemptId: string | null;
  questionIds: string[];
  currentIndex: number;
  currentQuestion: any;
  answers: Record<string, string | null>;
  markedForReview: Set<string>;
}

export function useExam(examId: string) {
  const [state, setState] = useState<ExamState>({
    attemptId: null,
    questionIds: [],
    currentIndex: 0,
    currentQuestion: null,
    answers: {},
    markedForReview: new Set(),
  });
  const [loading, setLoading] = useState(true);
  
  const startExam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error);
      }
      
      setState(prev => ({
        ...prev,
        attemptId: data.attemptId,
        questionIds: data.questionIds,
      }));
      
      return data;
    } catch (error) {
      console.error('Start exam error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [examId]);
  
  const fetchQuestion = useCallback(async (index: number) => {
    if (!state.attemptId || !state.questionIds[index]) return;
    
    try {
      const questionId = state.questionIds[index];
      const res = await fetch(
        `/api/exam/question/${questionId}?attemptId=${state.attemptId}`
      );
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error);
      }
      
      setState(prev => ({
        ...prev,
        currentIndex: index,
        currentQuestion: data,
        answers: {
          ...prev.answers,
          [questionId]: data.currentAnswer?.selectedOption || null,
        },
        markedForReview: data.currentAnswer?.isMarkedForReview
          ? new Set([...prev.markedForReview, questionId])
          : prev.markedForReview,
      }));
    } catch (error) {
      console.error('Fetch question error:', error);
      throw error;
    }
  }, [state.attemptId, state.questionIds]);
  
  const saveAnswer = useCallback(async (
    questionId: string,
    selectedOption: string | null
  ) => {
    if (!state.attemptId) return;
    
    try {
      const res = await fetch('/api/exam/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: state.attemptId,
          questionId,
          selectedOption,
          isMarkedForReview: state.markedForReview.has(questionId),
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save answer');
      }
      
      setState(prev => ({
        ...prev,
        answers: { ...prev.answers, [questionId]: selectedOption },
      }));
    } catch (error) {
      console.error('Save answer error:', error);
      throw error;
    }
  }, [state.attemptId, state.markedForReview]);
  
  const toggleMarkForReview = useCallback((questionId: string) => {
    setState(prev => {
      const newMarked = new Set(prev.markedForReview);
      if (newMarked.has(questionId)) {
        newMarked.delete(questionId);
      } else {
        newMarked.add(questionId);
      }
      return { ...prev, markedForReview: newMarked };
    });
  }, []);
  
  const submitExam = useCallback(async () => {
    if (!state.attemptId) return;
    
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: state.attemptId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (error) {
      console.error('Submit exam error:', error);
      throw error;
    }
  }, [state.attemptId]);
  
  return {
    state,
    loading,
    startExam,
    fetchQuestion,
    saveAnswer,
    toggleMarkForReview,
    submitExam,
  };
}