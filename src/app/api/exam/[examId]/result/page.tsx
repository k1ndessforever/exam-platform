'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function ResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const attemptId = searchParams.get('attemptId');
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attemptId) {
      fetchResult();
    }
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/exam/result/${attemptId}`);
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to fetch result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Result not found</p>
      </div>
    );
  }

  const { exam, result: scoreData } = result;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Test Completed!</h1>
            <p className="text-xl text-gray-600">{exam.name}</p>
          </div>

          {/* Main Stats */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-8 text-center text-white">
              <p className="text-lg opacity-90 mb-2">Total Score</p>
              <p className="text-6xl font-bold">{scoreData.totalScore}</p>
              <p className="text-sm opacity-75 mt-2">out of {scoreData.maxScore}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-8 text-center text-white">
              <p className="text-lg opacity-90 mb-2">Accuracy</p>
              <p className="text-6xl font-bold">{parseFloat(scoreData.accuracy).toFixed(1)}%</p>
              <p className="text-sm opacity-75 mt-2">correctness rate</p>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Attempted</p>
              <p className="text-3xl font-bold text-gray-900">{scoreData.attempted}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Correct</p>
              <p className="text-3xl font-bold text-green-600">{scoreData.correct}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Wrong</p>
              <p className="text-3xl font-bold text-red-600">{scoreData.wrong}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Skipped</p>
              <p className="text-3xl font-bold text-gray-900">{scoreData.unattempted}</p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-purple-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="font-semibold text-gray-900">Your Rank</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">#{scoreData.rank}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold text-gray-900">Percentile</p>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{parseFloat(scoreData.percentile).toFixed(2)}%</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/history'}
              className="flex-1"
            >
              View History
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}