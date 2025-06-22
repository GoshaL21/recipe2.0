import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username and password required" },
      { status: 400 },
    );
  }

  // In production, hash the password and compare hashes!
  const user = await prisma.user.findUnique({ where: { email: username } });

  if (!user || user.password !== password) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  return NextResponse.json({ message: "Login successful" }, { status: 200 });
}
