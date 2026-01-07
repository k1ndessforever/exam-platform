import { prisma } from './prisma';
import fs from 'fs/promises';
import path from 'path';

interface ImportedQuestion {
  text: string;
  options: Record<string, string>;
  correct: string;
  subject: string;
  difficulty: string;
  topic: string;
  diagram_id?: string;
  has_diagram: boolean;
}

interface ImportedDiagram {
  id: string;
  filename: string;
  filepath: string;
  subject: string;
  page: number;
  position: number;
}

export async function importQuestionsFromJSON(filePath: string) {
  try {
    // Read JSON file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const questions: ImportedQuestion[] = JSON.parse(fileContent);

    let created = 0;
    let errors = 0;

    for (const q of questions) {
      try {
        await prisma.question.create({
          data: {
            subject: q.subject.toUpperCase() as any,
            topic: q.topic,
            difficulty: q.difficulty.toUpperCase() as any,
            type: 'MULTIPLE_CHOICE',
            questionText: q.text,
            optionsJson: JSON.stringify(q.options),
            correctAnswer: q.correct || 'A',
            diagramId: q.diagram_id,
            diagramPath: q.has_diagram ? `/diagrams/${q.subject.toLowerCase()}/diagram_${q.diagram_id}.png` : null,
          },
        });
        created++;
      } catch (err) {
        console.error(`Error importing question: ${q.text.substring(0, 50)}`, err);
        errors++;
      }
    }

    console.log(`✅ Imported ${created} questions, ${errors} errors`);
    return { created, errors };
  } catch (error) {
    console.error('Failed to import questions:', error);
    throw error;
  }
}

export async function importDiagramManifest(filePath: string) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const diagrams: ImportedDiagram[] = JSON.parse(fileContent);

    let created = 0;

    for (const d of diagrams) {
      try {
        await prisma.diagramManifest.upsert({
          where: { diagramId: d.id },
          update: {},
          create: {
            diagramId: d.id,
            filename: d.filename,
            filepath: d.filepath,
            subject: d.subject.toUpperCase() as any,
            pageNumber: d.page,
            position: d.position,
          },
        });
        created++;
      } catch (err) {
        console.error(`Error importing diagram: ${d.id}`, err);
      }
    }

    console.log(`✅ Imported ${created} diagrams`);
    return { created };
  } catch (error) {
    console.error('Failed to import diagrams:', error);
    throw error;
  }
}

export async function createExamFromQuestions(
  examName: string,
  subject: string,
  questionIds: string[]
) {
  try {
    const exam = await prisma.exam.create({
      data: {
        name: examName,
        subject: subject.toUpperCase() as any,
        totalQuestions: questionIds.length,
        duration: 180, // 3 hours
        passingScore: 40,
        questions: {
          create: questionIds.map((qId, idx) => ({
            questionId: qId,
            questionOrder: idx + 1,
          })),
        },
      },
      include: { questions: true },
    });

    console.log(`✅ Created exam: ${exam.name}`);
    return exam;
  } catch (error) {
    console.error('Failed to create exam:', error);
    throw error;
  }
}