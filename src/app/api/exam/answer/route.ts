import { validate, answerSchema } from '@/lib/validators';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    
    // Validate input
    const data = validate(answerSchema, body);
    
    // Verify attempt belongs to user and is active
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: data.attemptId,
        userId: user.id,
      },
      select: {
        questionIds: true,
        isCompleted: true,
        startedAt: true,
        exam: {
          select: {
            durationMinutes: true,
          },
        },
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
    
    // Check time
    const timeElapsed = Date.now() - attempt.startedAt.getTime();
    const timeLimit = attempt.exam.durationMinutes * 60 * 1000;
    
    if (timeElapsed > timeLimit) {
      await autoSubmitAttempt(data.attemptId);
      return NextResponse.json(
        { error: 'Time expired' },
        { status: 400 }
      );
    }
    
    // Verify question
    if (!attempt.questionIds.includes(data.questionId)) {
      return NextResponse.json(
        { error: 'Invalid question' },
        { status: 403 }
      );
    }
    
    // Save answer
    const answer = await prisma.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: data.attemptId,
          questionId: data.questionId,
        },
      },
      update: {
        selectedOption: data.selectedOption,
        isMarkedForReview: data.isMarkedForReview,
        answeredAt: new Date(),
      },
      create: {
        attemptId: data.attemptId,
        questionId: data.questionId,
        selectedOption: data.selectedOption,
        isMarkedForReview: data.isMarkedForReview,
        answeredAt: new Date(),
      },
    });
    
    return NextResponse.json({
      success: true,
      answerId: answer.id,
    });
    
  } catch (error: any) {
    console.error('Answer save error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save answer' },
      { status: 500 }
    );
  }
}