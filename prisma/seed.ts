
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@examprepro.com' },
    update: {},
    create: {
      email: 'admin@examprepro.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'admin',
      emailVerified: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample exams
  const jeeExam = await prisma.exam.create({
    data: {
      name: 'JEE Main Mock Test 1',
      description: 'Full-length JEE Main practice test',
      examType: 'JEE',
      totalQuestions: 100,
      durationMinutes: 120,
      difficultyDistribution: {
        Easy: 30,
        Medium: 50,
        Hard: 20,
      },
      subjectDistribution: {
        Physics: 33,
        Chemistry: 33,
        Mathematics: 34,
      },
      correctMarks: 4,
      wrongMarks: -1,
      unattemptedMarks: 0,
      isActive: true,
      isPublished: true,
    },
  });

  console.log('✅ JEE exam created:', jeeExam.name);

  // Create sample questions
  const subjects = ['Physics', 'Chemistry', 'Mathematics'];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const topics = {
    Physics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics'],
    Chemistry: ['Organic', 'Inorganic', 'Physical', 'Analytical'],
    Mathematics: ['Algebra', 'Calculus', 'Trigonometry', 'Geometry'],
  };

  let questionCount = 0;

  for (const subject of subjects) {
    for (const difficulty of difficulties) {
      const numQuestions = difficulty === 'Easy' ? 15 : difficulty === 'Medium' ? 25 : 10;

      for (let i = 0; i < numQuestions; i++) {
        questionCount++;
        const topicList = topics[subject as keyof typeof topics];
        const topic = topicList[Math.floor(Math.random() * topicList.length)];

        const question = await prisma.question.create({
          data: {
            questionText: `Sample ${subject} question ${questionCount} (${difficulty}): A particle moves with constant acceleration. Calculate the displacement after 5 seconds if initial velocity is 10 m/s and acceleration is 2 m/s².`,
            optionA: '75 m',
            optionB: '100 m',
            optionC: '125 m',
            optionD: '150 m',
            correctOption: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
            explanation: `This is the correct answer because of ${subject} principles.`,
            subject,
            topic,
            difficulty,
            isActive: true,
            isVerified: true,
          },
        });

        // Link question to exam
        await prisma.examQuestion.create({
          data: {
            examId: jeeExam.id,
            questionId: question.id,
          },
        });
      }
    }
  }

  console.log(`✅ Created ${questionCount} questions`);

  // Create test student
  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.create({
    data: {
      email: 'student@test.com',
      passwordHash: studentPassword,
      name: 'Test Student',
      mobile: '9876543210',
      examType: 'JEE',
      role: 'student',
      emailVerified: true,
    },
  });

  console.log('✅ Test student created:', student.email);
  console.log('\n🎉 Seeding complete!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin: admin@examprepro.com / admin123');
  console.log('   Student: student@test.com / student123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });