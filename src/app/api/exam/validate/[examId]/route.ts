import { NextResponse } from 'next/server';
import { validateExamQuestionPool } from '@/lib/question-selector';

export async function GET(
  req: Request,
  { params }: { params: { examId: string } }
) {
  try {
    const validation = await validateExamQuestionPool(params.examId);
    
    return NextResponse.json(validation);
    
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}