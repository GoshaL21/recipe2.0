import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

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

export async function GET(req: NextRequest) {
  try {
    const tokenData = verifyToken(req);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { 
        id: tokenData.userId
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Add PUT handler for updating name and surname
export async function PUT(req: NextRequest) {
  try {
    const tokenData = verifyToken(req);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { name, surname } = body;

    // Validate inputs - only accept string or null (optional)
    if (
      (name !== undefined && typeof name !== 'string' && name !== null) ||
      (surname !== undefined && typeof surname !== 'string' && surname !== null)
    ) {
      return NextResponse.json(
        { error: 'Invalid input. Name and surname must be strings or null.' },
        { status: 400 }
      );
    }

    // Prepare update data object, only include fields if provided
    const updateData: { name?: string | null; surname?: string | null } = {};
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update provided.' },
        { status: 400 }
      );
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: tokenData.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
      },
    });

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
