import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AttachedRecipe = {
  name: string;
  ingredients?: any;
  instructions?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
  cookingTime?: string;
  cost?: number;
};

type ChatRequestBody = {
  message: string;
  history?: ChatMessage[];
  attachedRecipe?: AttachedRecipe | null;
  sessionId?: number | null;
};

function getUserIdFromAuthHeader(req: Request): number | null {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme.toLowerCase() !== "bearer" || !token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId ?? decoded.id ?? decoded?.user?.id;
    return typeof userId === "number" ? userId : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const body = (await req.json()) as ChatRequestBody;
    const { message, history = [], attachedRecipe, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing 'message' in request body." },
        { status: 400 },
      );
    }

    // Try to identify the user
    const userId = getUserIdFromAuthHeader(req);

    let profileSummary = "No user profile available.";
    let activeSessionId: number | null = null;
    let sessionTitle: string | null = null;
    let dbMessages: { role: "user" | "assistant"; content: string }[] = [];

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          age: true,
          weight: true,
          height: true,
          activityLevel: true,
          diet: true,
        },
      });

      if (user) {
        const parts: string[] = [];
        if (user.name) parts.push(`Name: ${user.name}`);
        if (user.age) parts.push(`Age: ${user.age} years`);
        if (user.weight) parts.push(`Weight: ${user.weight} kg`);
        if (user.height) parts.push(`Height: ${user.height} cm`);
        if (user.activityLevel)
          parts.push(`Activity level: ${user.activityLevel}`);
        if (user.diet) parts.push(`Diet preference: ${user.diet}`);

        profileSummary =
          parts.length > 0
            ? parts.join("; ")
            : "User is logged in but profile is mostly empty.";
      }

      // If the user is logged in, either load an existing chat session or create a new one.
      let session = null as any;
      if (sessionId) {
        session = await prisma.chatSession.findFirst({
          where: {
            id: sessionId,
            userId,
          },
        });
      }

      if (!session) {
        const baseTitle =
          message.trim().length > 0
            ? message.trim().slice(0, 60)
            : "New chat";
        const title = baseTitle.length === 60 ? baseTitle + "..." : baseTitle;
        session = await prisma.chatSession.create({
          data: {
            userId,
            title,
          },
        });
      }

      activeSessionId = session.id;
      sessionTitle = session.title;

      const savedMessages = await prisma.chatMessage.findMany({
        where: { sessionId: activeSessionId },
        orderBy: { createdAt: "asc" },
      });

      dbMessages = savedMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
    }

    const attachedRecipeSummary = attachedRecipe
      ? JSON.stringify(attachedRecipe, null, 2)
      : null;

    // System prompt: role + safety + how to behave
    const systemPrompt = `
You are an AI nutrition assistant helping users adopt healthier dietary habits.
You can answer questions about:
- general nutrition and macronutrients,
- meal ideas and substitutions,
- how their meals relate to their goals.

User profile (if available):
${profileSummary}

Requirements:
- Give practical, simple explanations.
- If you need extra info like their GOAL (lose weight, gain muscle, maintain) or GENDER to answer better, ask them politely.
- If they ask things outside your scope (diagnosis, serious symptoms, pregnancy, eating disorders), say you are not a doctor and recommend they speak with a healthcare professional.
- Do not give extreme dieting advice, starvation tips, or unsafe recommendations.
- If they ask about a specific meal or recipe, you can consider typical nutrition knowledge (e.g. chicken = protein, rice = carbs) and explain reasoning.
- Keep answers structured and not too long, but detailed enough so a beginner can understand.

Attached recipe (if provided by the user, in JSON):
${attachedRecipeSummary ?? "none"}

When an attached recipe is present and the user asks about "this recipe", "this meal", or something similar, use that recipe as the main context for your answer. You can suggest healthier modifications, replacements, or explain its nutritional profile based on its ingredients and nutrition, using typical nutrition knowledge.
`;
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    // If we have a logged-in user and a session, use DB-backed history.
    if (dbMessages.length > 0) {
      messages.push(...dbMessages);
    } else {
      // For anonymous users (no DB session), fall back to short in-memory history if provided
      for (const h of history.slice(-10)) {
        if (h.role === "user" || h.role === "assistant") {
          messages.push({
            role: h.role,
            content: h.content,
          });
        }
      }
    }

    // Current user message
    messages.push({ role: "user", content: message });

    // Persist the new user message if we have a DB-backed session
    if (activeSessionId) {
      await prisma.chatMessage.create({
        data: {
          sessionId: activeSessionId,
          role: "user",
          content: message,
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content ??
      "Sorry, I couldn't generate a response right now.";

    // Persist the assistant's reply if we have a DB-backed session
    if (activeSessionId) {
      await prisma.chatMessage.create({
        data: {
          sessionId: activeSessionId,
          role: "assistant",
          content: reply,
        },
      });
    }

    return NextResponse.json(
      {
        reply,
        sessionId: activeSessionId,
        title: sessionTitle,
      },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("Chat route error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to process chat request." },
      { status: 500 },
    );
  }
}