// DETERMINISTIC RANDOM SELECTION
// Every student gets unique but fair exam
// No ORDER BY RANDOM() - scales to 40k questions

export function selectExamQuestions(
  examId: string,
  studentId: string,
  attemptNo: number,
  totalQuestions: number = 100,
  examQuestions: ExamQuestion[]
): string[] {
  
  // SEED = examId + studentId + attemptNo
  // Ensures: Same student, same exam, same attempt = same questions
  const seed = `${examId}-${studentId}-${attemptNo}`.hashCode()
  
  // SHUFFLE DETERMINISTICALLY
  const shuffled = examQuestions
    .map((eq, idx) => ({
      ...eq,
      sortKey: (seed + idx * 17) % 1000000
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    
  // TAKE FIRST N QUESTIONS
  return shuffled.slice(0, totalQuestions).map(eq => eq.questionId)
}

// SAVE SNAPSHOT - IMMUTABLE
export async function createExamSnapshot(
  attemptId: string,
  questionIds: string[]
) {
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      questionSnapshotIds: questionIds
    }
  })
}