import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { username, password, name, surname } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ message: 'Username and password required' }, { status: 400 });
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email: username } });
  if (existingUser) {
    return NextResponse.json({ message: 'User already exists' }, { status: 409 });
  }

  // In production, hash the password before storing!
  await prisma.user.create({
    data: {
      email: username,
      password,
      name: name || undefined,
      surname: surname || undefined,
    },
  });

  return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
}