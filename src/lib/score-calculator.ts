import { prisma } from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface ScoreBreakdown {
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  totalScore: Decimal;
  maxScore: Decimal;
  accuracy: Decimal;
  subjectScores: Record<string, number>;
}

/**
 * Calculate comprehensive score for an exam attempt
 */
export async function calculateAttemptScore(attemptId: string): Promise<ScoreBreakdown> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        select: {
          totalQuestions: true,
          correctMarks: true,
          wrongMarks: true,
          unattemptedMarks: true,
        },
      },
      answers: {
        include: {
          question: {
            select: {
              id: true,
              correctOption: true,
              subject: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });
  
  if (!attempt) {
    throw new Error('Attempt not found');
  }
  
  const { correctMarks, wrongMarks, unattemptedMarks } = attempt.exam;
  
  let correct = 0;
  let wrong = 0;
  let totalScore = new Decimal(0);
  const subjectScores: Record<string, number> = {};
  
  // Calculate scores
  for (const answer of attempt.answers) {
    const { question, selectedOption } = answer;
    
    // Initialize subject score if needed
    if (!subjectScores[question.subject]) {
      subjectScores[question.subject] = 0;
    }
    
    if (selectedOption === null) {
      // Unanswered
      totalScore = totalScore.plus(unattemptedMarks);
    } else if (selectedOption === question.correctOption) {
      // Correct
      correct++;
      totalScore = totalScore.plus(correctMarks);
      subjectScores[question.subject] += correctMarks.toNumber();
    } else {
      // Wrong
      wrong++;
      totalScore = totalScore.plus(wrongMarks);
      subjectScores[question.subject] += wrongMarks.toNumber();
    }
  }
  
  const attempted = attempt.answers.length;
  const unattempted = attempt.exam.totalQuestions - attempted;
  
  // Add unattempted marks
  totalScore = totalScore.plus(unattemptedMarks.times(unattempted));
  
  // Calculate max possible score
  const maxScore = correctMarks.times(attempt.exam.totalQuestions);
  
  // Calculate accuracy
  const accuracy = attempted > 0 
    ? new Decimal(correct).div(attempted).times(100) 
    : new Decimal(0);
  
  return {
    totalQuestions: attempt.exam.totalQuestions,
    attempted,
    correct,
    wrong,
    unattempted,
    totalScore,
    maxScore,
    accuracy,
    subjectScores,
  };
}

/**
 * Calculate percentile and rank for an attempt
 */
export async function calculatePercentile(attemptId: string, score: Decimal): Promise<{
  percentile: Decimal;
  rank: number;
  totalAttempts: number;
}> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { examId: true },
  });
  
  if (!attempt) {
    throw new Error('Attempt not found');
  }
  
  // Get all completed attempts for this exam
  const allResults = await prisma.attemptResult.findMany({
    where: {
      attempt: {
        examId: attempt.examId,
        isCompleted: true,
      },
    },
    select: {
      totalScore: true,
    },
    orderBy: {
      totalScore: 'desc',
    },
  });
  
  if (allResults.length === 0) {
    return {
      percentile: new Decimal(100),
      rank: 1,
      totalAttempts: 1,
    };
  }
  
  // Calculate rank (how many scored higher)
  const higherScores = allResults.filter(r => r.totalScore.gt(score)).length;
  const rank = higherScores + 1;
  
  // Calculate percentile
  const totalAttempts = allResults.length + 1; // Include current attempt
  const percentile = new Decimal(totalAttempts - rank + 1)
    .div(totalAttempts)
    .times(100);
  
  return {
    percentile,
    rank,
    totalAttempts,
  };
}

/**
 * Store calculated result in database
 */
export async function storeAttemptResult(
  attemptId: string,
  scoreBreakdown: ScoreBreakdown,
  percentileData: { percentile: Decimal; rank: number; totalAttempts: number }
): Promise<void> {
  await prisma.attemptResult.create({
    data: {
      attemptId,
      totalQuestions: scoreBreakdown.totalQuestions,
      attempted: scoreBreakdown.attempted,
      correct: scoreBreakdown.correct,
      wrong: scoreBreakdown.wrong,
      unattempted: scoreBreakdown.unattempted,
      totalScore: scoreBreakdown.totalScore,
      maxScore: scoreBreakdown.maxScore,
      accuracy: scoreBreakdown.accuracy,
      percentile: percentileData.percentile,
      rank: percentileData.rank,
      totalAttempts: percentileData.totalAttempts,
      subjectScores: scoreBreakdown.subjectScores,
    },
  });
}