export async function GET(
  req: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');
    
    if (!attemptId) {
      return NextResponse.json(
        { error: 'attemptId required' },
        { status: 400 }
      );
    }
    
    // Verify attempt belongs to user
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        userId: user.id,
      },
      select: {
        questionIds: true,
        isCompleted: true,
        examId: true,
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
    
    // Check time hasn't expired
    const timeElapsed = Date.now() - attempt.startedAt.getTime();
    const timeLimit = attempt.exam.durationMinutes * 60 * 1000;
    
    if (timeElapsed > timeLimit) {
      await autoSubmitAttempt(attemptId);
      return NextResponse.json(
        { error: 'Time expired, exam auto-submitted' },
        { status: 400 }
      );
    }
    
    // Verify question belongs to this attempt
    if (!attempt.questionIds.includes(params.questionId)) {
      return NextResponse.json(
        { error: 'Question not in your exam' },
        { status: 403 }
      );
    }
    
    // Fetch question (WITHOUT correct answer)
    const question = await prisma.question.findUnique({
      where: { id: params.questionId },
      select: {
        id: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        subject: true,
        topic: true,
        difficulty: true,
        hasDiagram: true,
        diagram: {
          select: {
            id: true,
            filePath: true,
            altText: true,
            width: true,
            height: true,
          },
        },
        // correctOption NOT included
        // explanation NOT included
      },
    });
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }
    
    // Get existing answer if any
    const existingAnswer = await prisma.attemptAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: params.questionId,
        },
      },
      select: {
        selectedOption: true,
        isMarkedForReview: true,
      },
    });
    
    return NextResponse.json({
      ...question,
      currentAnswer: existingAnswer,
    });
    
  } catch (error: any) {
    console.error('Question fetch error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}