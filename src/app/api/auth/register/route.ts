// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { registerSchema, validate } from '@/lib/validators';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const data = validate(registerSchema, body);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(data.password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        mobile: data.mobile,
        examType: data.examType,
        role: 'student',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    // Set cookie
    await setAuthCookie(token);
    
    return NextResponse.json({
      user,
      message: 'Registration successful',
    });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

// src/app/api/auth/login/route.ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const data = validate(loginSchema, body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
           { status: 401 }
  );
}

// Verify password
const isValid = await verifyPassword(data.password, user.passwordHash);

if (!isValid) {
  return NextResponse.json(
    { error: 'Invalid credentials' },
    { status: 401 }
  );
}

// Check if account is active
if (!user.isActive) {
  return NextResponse.json(
    { error: 'Account is inactive' },
    { status: 403 }
  );
}

// Update last login
await prisma.user.update({
  where: { id: user.id },
  data: { lastLoginAt: new Date() },
});

// Generate token
const token = generateToken({
  userId: user.id,
  email: user.email,
  role: user.role,
});

// Set cookie
await setAuthCookie(token);

return NextResponse.json({
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  },
  message: 'Login successful',
});
} catch (error: any) {
console.error('Login error:', error);
return NextResponse.json(
{ error: 'Login failed' },
{ status: 500 }
);
}
}
// src/app/api/auth/logout/route.ts
export async function POST() {
await clearAuthCookie();
return NextResponse.json({ message: 'Logged out successfully' });
}
// src/app/api/auth/me/route.ts
export async function GET() {
try {
const user = await getCurrentUser();
if (!user) {
  return NextResponse.json(
    { error: 'Not authenticated' },
    { status: 401 }
  );
}

return NextResponse.json({ user });
} catch (error) {
return NextResponse.json(
{ error: 'Failed to get user' },
{ status: 500 }
);
}
}