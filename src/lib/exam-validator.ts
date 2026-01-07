// /lib/exam-validator.ts
export async function validateExamReadiness(examId: string): Promise<{
  isReady: boolean;
  errors: string[];
}> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      examQuestions: {
        include: {
          question: {
            select: {
              difficulty: true,
              subject: true
            }
          }
        }
      }
    }
  });
  
  if (!exam) {
    return { isReady: false, errors: ['Exam not found'] };
  }
  
  const errors: string[] = [];
  
  // Check total question count
  const availableCount = exam.examQuestions.length;
  if (availableCount < exam.totalQuestions) {
    errors.push(
      `Insufficient questions: need ${exam.totalQuestions}, have ${availableCount}`
    );
  }
  
  // Check difficulty distribution
  const diffDist = exam.difficultyDistribution as any;
  for (const [difficulty, percentage] of Object.entries(diffDist)) {
    const needed = Math.ceil((percentage as number / 100) * exam.totalQuestions);
    const available = exam.examQuestions.filter(
      eq => eq.question.difficulty === difficulty
    ).length;
    
    if (available < needed) {
      errors.push(
        `Insufficient ${difficulty} questions: need ${needed}, have ${available}`
      );
    }
  }
  
  // Check subject distribution
  const subjectDist = exam.subjectDistribution as any;
  for (const [subject, count] of Object.entries(subjectDist)) {
    const available = exam.examQuestions.filter(
      eq => eq.question.subject === subject
    ).length;
    
if (available < (count as number)) {
      errors.push(
        `Insufficient ${subject} questions: need ${count}, have ${available}`
      );
    }
  }
  
  // Check diagram availability
  const questionsWithMissingDiagrams = await prisma.question.count({
    where: {
      examQuestions: {
        some: { examId }
      },
      hasDiagram: true,
      diagramId: null
    }
  });
  
  if (questionsWithMissingDiagrams > 0) {
    errors.push(
      `${questionsWithMissingDiagrams} questions have missing diagram references`
    );
  }
  
  return {
    isReady: errors.length === 0,
    errors
  };
}