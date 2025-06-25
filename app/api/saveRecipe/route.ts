import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET!; // Your JWT secret

async function getUserIdFromToken(authHeader: string | null): Promise<number | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const userId = await getUserIdFromToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing token." },
        { status: 401 }
      );
    }

    const recipeData = await req.json();

    // Basic validation (you can expand this)
    const {
      name,
      ingredients,
      instructions,
      cookingTime,
      cost,
      nutrition,
    } = recipeData;

    if (
      !name ||
      !ingredients ||
      !instructions ||
      !cookingTime ||
      cost === undefined ||
      !nutrition
    ) {
      return NextResponse.json(
        { error: "Missing required recipe fields." },
        { status: 400 }
      );
    }

    const createdRecipe = await prisma.recipe.create({
      data: {
        userId,
        name,
        ingredients,
        instructions,
        cookingTime,
        cost,
        nutrition,
      },
    });

    return NextResponse.json({ message: "Recipe saved", recipe: createdRecipe }, { status: 201 });
  } catch (error) {
    console.error("SaveRecipe error:", error);
    return NextResponse.json(
      { error: "Failed to save recipe" },
      { status: 500 }
    );
  }
}
