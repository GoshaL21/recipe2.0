import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper function to verify JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenData = verifyToken(req);

    if (!tokenData) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { newEmail, currentPassword } = await req.json();

    if (!newEmail || !currentPassword) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    // Find the user in the database
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid current password' }, { status: 401 });
    }

    // Update email
    const updatedUser = await prisma.user.update({
      where: { id: tokenData.userId },
      data: {
        email: newEmail,
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
      }
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating email:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
