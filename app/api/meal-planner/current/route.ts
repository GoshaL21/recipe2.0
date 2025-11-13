import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function getUserIdFromAuthHeader(req: Request): number | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const [, token] = auth.split(" ");
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;
    return typeof userId === "number" ? userId : null;
  } catch {
    return null;
  }
}

// GET /api/meal-planner/current  -> return current plan for this user (if any)
export async function GET(req: Request) {
  const userId = getUserIdFromAuthHeader(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const current = await prisma.currentMealPlan.findUnique({
      where: { userId },
    });

    if (!current) {
      return NextResponse.json({ currentPlan: null }, { status: 200 });
    }

    return NextResponse.json(
      { currentPlan: current.plan, updatedAt: current.updatedAt },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load current meal plan" },
      { status: 500 },
    );
  }
}

// PUT /api/meal-planner/current  -> set/overwrite current plan for this user
export async function PUT(req: Request) {
  const userId = getUserIdFromAuthHeader(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plan = await req.json(); // this should be the same structure as your /api/meal-planner response

    await prisma.currentMealPlan.upsert({
      where: { userId },
      create: { userId, plan },
      update: { plan },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to save current meal plan" },
      { status: 400 },
    );
  }
}