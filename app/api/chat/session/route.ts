export async function PATCH(req: Request) {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const idParam = url.searchParams.get("id");
    const sessionId = idParam ? Number(idParam) : NaN;

    if (!sessionId || Number.isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Missing or invalid session id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const title = body?.title;
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Invalid title" },
        { status: 400 },
      );
    }

    const existing = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: title.trim() },
    });

    return NextResponse.json(
      { id: updated.id, title: updated.title },
      { status: 200 },
    );
  } catch (e) {
    console.error("Error in PATCH /api/chat/session:", e);
    return NextResponse.json(
      { error: "Failed to update chat session" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const idParam = url.searchParams.get("id");
    const sessionId = idParam ? Number(idParam) : NaN;

    if (!sessionId || Number.isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Missing or invalid session id" },
        { status: 400 },
      );
    }

    const existing = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    // Delete messages first, then the session
    await prisma.chatMessage.deleteMany({
      where: { sessionId },
    });

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("Error in DELETE /api/chat/session:", e);
    return NextResponse.json(
      { error: "Failed to delete chat session" },
      { status: 500 },
    );
  }
}
// app/api/chat/session/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function getUserIdFromAuthHeader(req: Request): number | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && typeof decoded.userId === "number") {
      return decoded.userId;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const idParam = url.searchParams.get("id");
    const sessionId = idParam ? Number(idParam) : NaN;

    if (!sessionId || Number.isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Missing or invalid session id" },
        { status: 400 },
      );
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("Error in GET /api/chat/session:", e);
    return NextResponse.json(
      { error: "Failed to load chat session" },
      { status: 500 },
    );
  }
}