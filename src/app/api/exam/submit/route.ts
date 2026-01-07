import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  calculateAttemptScore,
  calculatePercentile,
  storeAttemptResult,
} from '@/lib/score-calculator';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { attemptId } = await req.json();
    
    // Verify attempt belongs to user
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        userId: user.id,
      },
      select: {
        id: true,
        isCompleted: true,
        startedAt: true,
      },
    });
    
    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }
    
    if (attempt.isCompleted) {
      return NextResponse.json(
        { error: 'Exam already submitted' },
        { status: 400 }
      );
    }
    
    // Calculate time spent
    const timeSpentSeconds = Math.floor(
      (Date.now() - attempt.startedAt.getTime()) / 1000
    );
    
    // Mark as completed
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        timeSpentSeconds,
      },
    });
    
    // Calculate score
    const scoreBreakdown = await calculateAttemptScore(attemptId);
    
    // Calculate percentile
    const percentileData = await calculatePercentile(
      attemptId,
      scoreBreakdown.totalScore
    );
    
    // Store result
    await storeAttemptResult(attemptId, scoreBreakdown, percentileData);
    
    // Update question analytics
    await updateQuestionAnalytics(attemptId);
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EXAM_SUBMITTED',
        entityType: 'ExamAttempt',
        entityId: attemptId,
        metadata: {
          score: scoreBreakdown.totalScore.toString(),
          correct: scoreBreakdown.correct,
          wrong: scoreBreakdown.wrong,
        },
      },
    });
    
    return NextResponse.json({
      score: scoreBreakdown.totalScore.toString(),
      maxScore: scoreBreakdown.maxScore.toString(),
      correct: scoreBreakdown.correct,
      wrong: scoreBreakdown.wrong,
      attempted: scoreBreakdown.attempted,
      unattempted: scoreBreakdown.unattempted,
      accuracy: scoreBreakdown.accuracy.toString(),
      percentile: percentileData.percentile.toString(),
      rank: percentileData.rank,
      totalAttempts: percentileData.totalAttempts,
      subjectScores: scoreBreakdown.subjectScores,
});
} catch (error: any) {
console.error('Submit error:', error);
if (error.message === 'Unauthorized') {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

return NextResponse.json(
  { error: 'Failed to submit exam' },
  { status: 500 }
);
}
}
async function updateQuestionAnalytics(attemptId: string) {
const answers = await prisma.attemptAnswer.findMany({
where: { attemptId },
include: {
question: {
select: {
id: true,
correctOption: true,
timesAsked: true,
timesCorrect: true,
},
},
},
});
for (const answer of answers) {
const isCorrect = answer.selectedOption === answer.question.correctOption;
await prisma.question.update({
  where: { id: answer.questionId },
  data: {
    timesAsked: { increment: 1 },
    timesCorrect: isCorrect ? { increment: 1 } : undefined,
  },
});
}
}