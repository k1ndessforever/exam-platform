import { parse } from 'csv-parse/sync';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const content = await file.text();
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  
  // Bulk insert questions
  await prisma.question.createMany({
    data: records.map((r: any) => ({
      questionText: r.question,
      optionA: r.optionA,
      optionB: r.optionB,
      optionC: r.optionC,
      optionD: r.optionD,
      correctOption: r.correct,
      subject: r.subject,
      difficulty: r.difficulty,
      topic: r.topic,
    })),
  });
  
  return NextResponse.json({ success: true });
}