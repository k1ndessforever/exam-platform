export async function POST(req: Request) {
  const { examId, userId } = await req.json();
  
  // Get exam configuration
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      totalQuestions: true,
      difficultyDistribution: true,
      subjectDistribution: true,
      durationMinutes: true
    }
  });
  
  if (!exam) {
    return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
  }
  
  // Check if user has existing incomplete attempt
  const existingAttempt = await prisma.examAttempt.findFirst({
    where: {
      userId,
      examId,
      isCompleted: false
    }
  });
  
  if (existingAttempt) {
    // Resume existing attempt
    return NextResponse.json({
      attemptId: existingAttempt.id,
      questionIds: existingAttempt.questionIds,
      startedAt: existingAttempt.startedAt,
      durationMinutes: exam.durationMinutes
    });
  }
  
  // Calculate attempt number
  const attemptCount = await prisma.examAttempt.count({
    where: { userId, examId }
  });
  const attemptNumber = attemptCount + 1;
  
  // Select questions using deterministic algorithm
  try {
    const questionIds = await selectQuestionsForAttempt({
      examId,
      userId,
      attemptNumber,
      totalQuestions: exam.totalQuestions,
      difficultyDist: exam.difficultyDistribution as any,
      subjectDist: exam.subjectDistribution as any
    });
    
    // Create attempt record
    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        examId,
        attemptNumber,
        questionIds,
        startedAt: new Date()
      }
    });
    
    return NextResponse.json({
      attemptId: attempt.id,
      questionIds: attempt.questionIds,
      startedAt: attempt.startedAt,
      durationMinutes: exam.durationMinutes
    });
    
  } catch (error: any) {
    if (error.message.includes('Insufficient')) {
      return NextResponse.json({
        error: 'Exam configuration incomplete',
        message: error.message
      }, { status: 400 });
    }
    throw error;
  }
}