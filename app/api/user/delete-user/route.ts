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

export async function DELETE(req: NextRequest) {
  try {
    const tokenData = verifyToken(req);

    if (!tokenData) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Delete user by ID
    await prisma.user.delete({
      where: { id: tokenData.userId }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
