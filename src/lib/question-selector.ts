import crypto from 'crypto';
import { prisma } from './prisma';

interface SelectionCriteria {
  examId: string;
  userId: string;
  attemptNumber: number;
  totalQuestions: number;
  difficultyDist: Record<string, number>; // {Easy: 30, Medium: 50, Hard: 20}
  subjectDist: Record<string, number>; // {Physics: 33, Chemistry: 33, Math: 34}
}

interface QuestionPool {
  questionId: string;
  difficulty: string;
  subject: string;
}

/**
 * Generate deterministic seed from exam, user, and attempt
 */
function generateSeed(examId: string, userId: string, attemptNumber: number): string {
  const input = `${examId}-${userId}-${attemptNumber}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Seeded random number generator (0-1 range)
 */
function seededRandom(seed: string, index: number): number {
  const input = `${seed}-${index}`;
  const hash = crypto.createHash('sha256').update(input).digest();
  return hash.readUInt32BE(0) / 0xFFFFFFFF;
}

/**
 * Fisher-Yates shuffle with seeded randomness
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Main question selection algorithm
 * DETERMINISTIC: Same inputs → Same outputs
 * FAIR: Respects difficulty & subject distribution
 * SCALABLE: Works with 40k+ questions
 */
export async function selectQuestionsForAttempt(
  criteria: SelectionCriteria
): Promise<string[]> {
  const { examId, userId, attemptNumber, totalQuestions, difficultyDist, subjectDist } = criteria;
  
  // Generate deterministic seed
  const seed = generateSeed(examId, userId, attemptNumber);
  
  console.log(`Selecting questions with seed: ${seed.substring(0, 8)}...`);
  
  // Fetch all eligible questions for this exam
  const eligibleQuestions = await prisma.question.findMany({
    where: {
      examQuestions: {
        some: { examId }
      },
      isActive: true,
    },
    select: {
      id: true,
      difficulty: true,
      subject: true,
    },
  });
  
  if (eligibleQuestions.length === 0) {
    throw new Error('No questions available for this exam');
  }
  
  console.log(`Total eligible questions: ${eligibleQuestions.length}`);
  
  // Validate we have enough questions for each category
  const required: Record<string, Record<string, number>> = {};
  
  for (const [difficulty, percentage] of Object.entries(difficultyDist)) {
    required[difficulty] = {};
    for (const [subject, count] of Object.entries(subjectDist)) {
      const needed = Math.ceil((percentage / 100) * (count / totalQuestions) * totalQuestions);
      required[difficulty][subject] = needed;
      
      const available = eligibleQuestions.filter(
        (q) => q.difficulty === difficulty && q.subject === subject
      ).length;
      
      if (available < needed) {
        throw new Error(
          `Insufficient ${difficulty} ${subject} questions: need ${needed}, have ${available}`
        );
      }
    }
  }
  
  console.log('Required distribution:', required);
  
  // Select questions by difficulty and subject
  const selectedIds: string[] = [];
  let shuffleIndex = 0;
  
  for (const [difficulty, subjectNeeds] of Object.entries(required)) {
    for (const [subject, count] of Object.entries(subjectNeeds)) {
      // Get questions matching this difficulty + subject
      const matchingQuestions = eligibleQuestions.filter(
        (q) => q.difficulty === difficulty && q.subject === subject
      );
      
      // Shuffle with deterministic seed
      const shuffled = seededShuffle(
        matchingQuestions,
        `${seed}-${difficulty}-${subject}-${shuffleIndex++}`
      );
      
      // Take required count
      const selected = shuffled.slice(0, count);
      selectedIds.push(...selected.map((q) => q.id));
      
      console.log(`Selected ${selected.length} ${difficulty} ${subject} questions`);
    }
  }
  
  // Final shuffle of all selected questions
  const finalShuffled = seededShuffle(selectedIds, `${seed}-final`);
  
  console.log(`Total selected: ${finalShuffled.length} questions`);
  
  // Trim to exact total (handle rounding errors)
  return finalShuffled.slice(0, totalQuestions);
}

/**
 * Validate exam has sufficient questions before allowing start
 */
export async function validateExamQuestionPool(examId: string): Promise<{
  isValid: boolean;
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
              subject: true,
            },
          },
        },
      },
    },
  });
  
  if (!exam) {
    return { isValid: false, errors: ['Exam not found'] };
  }
  
  const errors: string[] = [];
  const availableQuestions = exam.examQuestions;
  
  // Check total count
  if (availableQuestions.length < exam.totalQuestions) {
    errors.push(
      `Insufficient total questions: need ${exam.totalQuestions}, have ${availableQuestions.length}`
    );
  }
  
  // Check difficulty distribution
  const diffDist = exam.difficultyDistribution as Record<string, number>;
  for (const [difficulty, percentage] of Object.entries(diffDist)) {
    const needed = Math.ceil((percentage / 100) * exam.totalQuestions);
    const available = availableQuestions.filter(
      (eq) => eq.question.difficulty === difficulty
    ).length;
    
    if (available < needed) {
      errors.push(
        `Insufficient ${difficulty} questions: need ${needed}, have ${available}`
      );
    }
  }
  
  // Check subject distribution
  const subjectDist = exam.subjectDistribution as Record<string, number>;
  for (const [subject, count] of Object.entries(subjectDist)) {
    const available = availableQuestions.filter(
      (eq) => eq.question.subject === subject
    ).length;
    
    if (available < count) {
      errors.push(
        `Insufficient ${subject} questions: need ${count}, have ${available}`
      );
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}