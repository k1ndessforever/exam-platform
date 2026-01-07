import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { selectQuestionsForAttempt, validateExamQuestionPool } from '@/lib/question-selector';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const { examId } = await req.json();
    
    // Validate exam exists and is active
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });
    
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }
    
    if (!exam.isActive || !exam.isPublished) {
      return NextResponse.json(
        { error: 'Exam is not available' },
        { status: 400 }
      );
    }
    
    // Check date restrictions
    const now = new Date();
    if (exam.startDate && now < exam.startDate) {
      return NextResponse.json(
        { error: 'Exam has not started yet' },
        { status: 400 }
      );
    }
    
    if (exam.endDate && now > exam.endDate) {
      return NextResponse.json(
        { error: 'Exam has ended' },
        { status: 400 }
      );
    }
    
    // Check for existing incomplete attempt
    const existingAttempt = await prisma.examAttempt.findFirst({
      where: {
        userId: user.id,
        examId,
        isCompleted: false,
      },
    });
    
    if (existingAttempt) {
      // Check if time has expired
      const timeElapsed = Date.now() - existingAttempt.startedAt.getTime();
      const timeLimit = exam.durationMinutes * 60 * 1000;
      
      if (timeElapsed > timeLimit) {
        // Auto-submit expired attempt
        await autoSubmitAttempt(existingAttempt.id);
        // Continue to create new attempt
      } else {
        // Return existing attempt
        return NextResponse.json({
          attemptId: existingAttempt.id,
          questionIds: existingAttempt.questionIds,
          startedAt: existingAttempt.startedAt,
          durationMinutes: exam.durationMinutes,
          isResume: true,
        });
      }
    }
    
    // Check attempt limit
    const attemptCount = await prisma.examAttempt.count({
      where: { userId: user.id, examId },
    });
    
    if (attemptCount >= exam.maxAttempts) {
      return NextResponse.json(
        { error: `Maximum ${exam.maxAttempts} attempts reached` },
        { status: 400 }
      );
    }
    
    // Validate question pool
    const validation = await validateExamQuestionPool(examId);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Exam configuration incomplete', details: validation.errors },
        { status: 400 }
      );
    }
    
    // Select questions
    const questionIds = await selectQuestionsForAttempt({
      examId,
      userId: user.id,
      attemptNumber: attemptCount + 1,
      totalQuestions: exam.totalQuestions,
      difficultyDist: exam.difficultyDistribution as any,
      subjectDist: exam.subjectDistribution as any,
    });
    
    // Get client info
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Create attempt
    const attempt = await prisma.examAttempt.create({
      data: {
        userId: user.id,
        examId,
        attemptNumber: attemptCount + 1,
        questionIds,
        ipAddress,
        userAgent,
      },
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EXAM_STARTED',
        entityType: 'ExamAttempt',
        entityId: attempt.id,
        metadata: {
          examId,
          attemptNumber: attempt.attemptNumber,
        },
        ipAddress,
      },
    });
    
    return NextResponse.json({
      attemptId: attempt.id,
      questionIds: attempt.questionIds,
      startedAt: attempt.startedAt,
      durationMinutes: exam.durationMinutes,
      isResume: false,
    });
    
  } catch (error: any) {
    console.error('Exam start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start exam' },
      { status: 500 }
    );
  }
}

async function autoSubmitAttempt(attemptId: string) {
  // Mark as completed
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      isCompleted: true,
      submittedAt: new Date(),
    },
  });
  
  // Calculate score for submitted answers
  // (Implementation in score calculator section)
}