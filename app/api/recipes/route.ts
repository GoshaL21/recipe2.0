import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log("Fetched recipes:", recipes);
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ingredients, cookingLevel, maxPrepTime, maxBudget, dietaryPreference } = body;
    
    // Validate inputs
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one ingredient." },
        { status: 400 }
      );
    }

    if (!cookingLevel || typeof maxPrepTime !== "number" || typeof maxBudget !== "number") {
      return NextResponse.json(
        { error: "Invalid input parameters." },
        { status: 400 }
      );
    }

    const dietaryText = dietaryPreference && dietaryPreference !== "none" 
      ? `The recipes must be ${dietaryPreference}.` 
      : "";

    const prompt = `You are a professional chef creating recipes based on available ingredients.

Ingredients provided: ${ingredients.join(", ")}

Requirements:
- Cooking level: ${cookingLevel}
- Maximum preparation time: ${maxPrepTime} minutes
- Maximum budget: $${maxBudget}
${dietaryText}

Please generate 3 recipes that:
1. Use at least one provided ingredient
2. Include clear measurements
3. Have step-by-step instructions
4. Include estimated cooking time
5. Include estimated cost
6. Include basic nutrition information

Format the response as JSON with this structure:
{
  "recipes": [
    {
      "name": "Recipe name",
      "ingredients": {
        "provided": ["100g ingredient1", "200g ingredient2"],
        "additional": ["50g common_ingredient1", "2 tbsp common_ingredient2"]
      },
      "instructions": "Step 1...\nStep 2...",
      "cookingTime": "30 minutes",
      "cost": 12.50,
      "nutrition": {
        "calories": 350,
        "protein": 25,
        "fat": 10,
        "carbs": 40
      }
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-4" if you have access
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // This ensures JSON response
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content);
      return NextResponse.json(
        { error: "Received malformed response from recipe generator", details: content },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Failed to generate recipes", details: err.message },
      { status: 500 }
    );
  }
}