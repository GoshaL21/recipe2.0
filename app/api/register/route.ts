import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { username, password, name, surname } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username and password required" },
      { status: 400 }
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ 
    where: { email: username } 
  });

  if (existingUser) {
    return NextResponse.json(
      { message: "User already exists" },
      { status: 400 }
    );
  }

  // Hash the password before saving
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      email: username,
      password: hashedPassword,
      name: name,
      surname: surname,
    },
  });

  return NextResponse.json(
    { message: "User created successfully" },
    { status: 201 }
  );
}