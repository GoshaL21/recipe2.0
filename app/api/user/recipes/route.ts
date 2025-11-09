import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function getUserIdFromRequest(req: NextRequest): number | null {
  try {
    const auth = req.headers.get("authorization") || "";
    let token: string | null = null;
    if (auth.startsWith("Bearer ")) token = auth.slice(7);
    if (!token) token = req.cookies.get("token")?.value || null;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: number };
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

// GET /api/user/recipes → list only the current user’s recipes
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const recipes = await prisma.recipe.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(recipes);
  } catch (e) {
    console.error("GET /api/user/recipes error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/user/recipes?id=123 → delete only if owned by user
export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    let id = idParam ? Number(idParam) : undefined;
    if (!id) {
      try {
        const body = await req.json();
        id = Number(body?.id);
      } catch {}
    }
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { error: "Recipe id is required" },
        { status: 400 },
      );
    }

    const result = await prisma.recipe.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/user/recipes error:", e);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 },
    );
  }
}
