export function validate<T>(schema: (data: any) => T, data: any): T {
  return schema(data);
}

export const registerSchema = (data: any) => {
  if (!data.email || !data.password || !data.name) {
    throw new Error('Missing required fields');
  }
  if (data.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return data as {
    email: string;
    password: string;
    name: string;
    mobile?: string;
    examType?: string;
  };
};

export const loginSchema = (data: any) => {
  if (!data.email || !data.password) {
    throw new Error('Missing email or password');
  }
  return data as { email: string; password: string };
};

export const answerSchema = (data: any) => {
  if (!data.attemptId || !data.questionId) {
    throw new Error('Missing attemptId or questionId');
  }
  return data as {
    attemptId: string;
    questionId: string;
    selectedOption: string | null;
    isMarkedForReview?: boolean;
  };
};