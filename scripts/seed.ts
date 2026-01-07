// scripts/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test exam
  const exam = await prisma.exam.create({
    data: {
      name: 'JEE Main Mock Test 1',
      examType: 'JEE',
      totalQuestions: 100,
      durationMinutes: 120,
      difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 },
      subjectDistribution: { Physics: 33, Chemistry: 33, Mathematics: 34 }
    }
  });
  
  // Create sample questions
  const questions = [];
  for (let i = 1; i <= 150; i++) {
    const question = await prisma.question.create({
      data: {
        questionText: `Sample question ${i}`,
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
        optionD: 'Option D',
        correctOption: 'A',
        subject: ['Physics', 'Chemistry', 'Mathematics'][i % 3],
        difficulty: ['Easy', 'Medium', 'Hard'][i % 3],
        topic: 'Sample Topic'
      }
    });
    questions.push(question);
  }
  
  // Link questions to exam
  for (const question of questions) {
    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: question.id
      }
    });
  }
  
  console.log('Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());