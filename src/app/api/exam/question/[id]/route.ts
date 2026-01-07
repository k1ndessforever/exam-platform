// /app/api/exam/question/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get('attemptId');
  
  if (!attemptId) {
    return NextResponse.json({ error: 'Attempt ID required' }, { status: 400 });
  }
  
  // Verify question belongs to this attempt
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { questionIds: true, isCompleted: true }
  });
  
  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }
  
  if (attempt.isCompleted) {
    return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });
  }
  
  if (!attempt.questionIds.includes(params.id)) {
    return NextResponse.json({ error: 'Question not in your exam' }, { status: 403 });
  }
  
  // Fetch question (without correct answer)
  const question = await prisma.question.findUnique({
    where: { id: params.id },
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
          altText: true
        }
      }
      // NOTE: correctOption NOT included
    }
  });
  
  return NextResponse.json(question);
}

// /app/api/exam/answer/route.ts
export async function POST(req: Request) {
  const { attemptId, questionId, selectedOption, isMarkedForReview } = await req.json();
  
  // Verify attempt is active
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { isCompleted: true, questionIds: true }
  });
  
  if (!attempt || attempt.isCompleted) {
    return NextResponse.json({ error: 'Exam not active' }, { status: 400 });
  }
  
  if (!attempt.questionIds.includes(questionId)) {
    return NextResponse.json({ error: 'Invalid question' }, { status: 403 });
  }
  
  // Upsert answer (allow changing answer)
  await prisma.attemptAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId
      }
    },
    update: {
      selectedOption,
      isMarkedForReview,
      answeredAt: new Date()
    },
    create: {
      attemptId,
      questionId,
      selectedOption,
      isMarkedForReview,
      answeredAt: new Date()
    }
  });
  
  return NextResponse.json({ success: true });
}

// /app/api/exam/submit/route.ts
export async function POST(req: Request) {
  const { attemptId } = await req.json();
  
  // Lock the attempt
  const attempt = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      isCompleted: true,
      submittedAt: new Date()
    },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id: true,
              correctOption: true
            }
          }
        }
      }
    }
  });
  
  // Calculate results (backend only)
  let correct = 0;
  let wrong = 0;
  let attempted = attempt.answers.length;
  
  for (const answer of attempt.answers) {
    if (answer.selectedOption === answer.question.correctOption) {
      correct++;
    } else {
      wrong++;
    }
  }
  
  const totalQuestions = attempt.questionIds.length;
  const unattempted = totalQuestions - attempted;
  const score = (correct * 4) - (wrong * 1); // JEE marking
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
  
  // Store result
  await prisma.attemptResult.create({
    data: {
      attemptId,
      totalQuestions,
      attempted,
      correct,
      wrong,
      unattempted,
      score,
      accuracy,
      calculatedAt: new Date()
    }
  });
  
  return NextResponse.json({
    score,
    correct,
    wrong,
    attempted,
    unattempted,
    accuracy
  });
}