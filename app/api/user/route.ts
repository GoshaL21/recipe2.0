import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt, { JwtPayload } from "jsonwebtoken";

// Prisma singleton (prevents too many connections during dev hot reloads)
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
export async function GET(req: NextRequest) {
  try {
    const tokenData = verifyToken(req);
    if (!tokenData || tokenData.userId == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIdNum = Number(tokenData.userId);
    if (Number.isNaN(userIdNum)) {
      return NextResponse.json(
        { error: "Invalid user id in token" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        age: true,
        weight: true,
        activityLevel: true,
        diet: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface TokenData extends JwtPayload {
  userId?: number | string;
}

function verifyToken(req: NextRequest): TokenData | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.split(" ")[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as TokenData;
  } catch {
    return null;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenData = verifyToken(req);
    if (!tokenData || tokenData.userId == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Our Prisma schema uses Int for User.id, so ensure we have a number
    const userIdNum = Number(tokenData.userId);
    if (Number.isNaN(userIdNum)) {
      return NextResponse.json(
        { error: "Invalid user id in token" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as {
      name?: string | null;
      surname?: string | null;
      age?: number | null;
      weight?: number | null;
      activityLevel?: string | null;
      diet?: string | null;
    };

    const { name, surname, age, weight, activityLevel, diet } = body;

    // Validate inputs
    if (
      (name !== undefined && typeof name !== "string" && name !== null) ||
      (surname !== undefined &&
        typeof surname !== "string" &&
        surname !== null) ||
      (age !== undefined &&
        age !== null &&
        (typeof age !== "number" || age < 10 || age > 120)) ||
      (weight !== undefined &&
        weight !== null &&
        (typeof weight !== "number" || weight < 20 || weight > 300)) ||
      (activityLevel !== undefined &&
        activityLevel !== null &&
        typeof activityLevel !== "string") ||
      (diet !== undefined && diet !== null && typeof diet !== "string")
    ) {
      return NextResponse.json(
        { error: "Invalid input. Check data types and value ranges." },
        { status: 400 },
      );
    }

    const updateData: {
      name?: string | null;
      surname?: string | null;
      age?: number | null;
      weight?: number | null;
      activityLevel?: string | null;
      diet?: string | null;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (age !== undefined) updateData.age = age;
    if (weight !== undefined) updateData.weight = weight;
    if (activityLevel !== undefined) updateData.activityLevel = activityLevel;
    if (diet !== undefined) updateData.diet = diet;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update provided." },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userIdNum },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        age: true,
        weight: true,
        activityLevel: true,
        diet: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
