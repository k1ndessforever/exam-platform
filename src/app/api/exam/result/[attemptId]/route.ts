import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const user = await requireAuth();
    
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: params.attemptId,
        userId: user.id,
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
          },
        },
        result: true,
      },
    });
    
    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }
    
    if (!attempt.result) {
      return NextResponse.json(
        { error: 'Results not yet calculated' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      exam: attempt.exam,
      result: {
        totalScore: attempt.result.totalScore.toString(),
        maxScore: attempt.result.maxScore.toString(),
        accuracy: attempt.result.accuracy.toString(),
        attempted: attempt.result.attempted,
        correct: attempt.result.correct,
        wrong: attempt.result.wrong,
        unattempted: attempt.result.unattempted,
        percentile: attempt.result.percentile?.toString() || '0',
        rank: attempt.result.rank || 0,
        totalAttempts: attempt.result.totalAttempts || 0,
      },
    });
  } catch (error: any) {
    console.error('Result fetch error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch result' },
      { status: 500 }
    );
  }
}