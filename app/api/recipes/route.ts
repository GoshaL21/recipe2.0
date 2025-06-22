import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ingredients, cookingLevel, maxPrepTime, maxBudget } = body;
    if (
      !Array.isArray(ingredients) ||
      ingredients.length === 0 ||
      !cookingLevel ||
      typeof maxPrepTime !== "number" ||
      typeof maxBudget !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid input. Please provide all required fields." },
        { status: 400 },
      );
    }
    const prompt = `
You are a recipe generator.

Given the following user-provided ingredients: ${ingredients.join(", ")}

Strict constraints:
1. Identify and filter out any non-edible ingredients (e.g. car, metal, phone, plastic, etc.).
2. If an ingredient seems like a typo, correct it only if the result is a common edible food item.
// In your prompt string:
3. If **none** of the ingredients are edible, return the following JSON:
{
  "recipes": [],
  "warning": "Please remove non-edible ingredients and try again."
}
4. If at least one edible ingredient is found, generate up to 3 recipes that:
  - Include at least one of the edible provided ingredients
  - Are suitable for a ${cookingLevel} level cook
  - Take no more than ${maxPrepTime} minutes to prepare and cook
  - Cost no more than $${maxBudget} total
  - Use no more than 2 additional common ingredients

Each recipe must include:
1. Recipe name
2. Ingredients object:
   - "provided": list of used ingredients from the user
   - "additional": list of extra ingredients used (max 2)
3. Detailed, step-by-step instructions including times, temperatures, and cooking tips
4. Estimated cooking time (must be ≤ ${maxPrepTime} minutes)
5. Estimated total cost in USD (as a number)
6. Basic nutrition info: calories, protein (g), fat (g), carbs (g)

Return the result strictly in this JSON format:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "ingredients": {
        "provided": ["ingredient1", "ingredient2"],
        "additional": ["ingredient3"]
      },
      "instructions": "Step-by-step instructions...",
      "cookingTime": "XX minutes",
      "cost": 12.5,
      "nutrition": {
        "calories": 500,
        "protein": 30,
        "fat": 15,
        "carbs": 60
      }
    }
  ]
}

If no recipes can be created due to non-edible input, return:
{
  "recipes": [],
  "warning": "Please remove non-edible ingredients and try again."
}
`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from OpenAI." },
        { status: 502 },
      );
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse OpenAI response." },
        { status: 500 },
      );
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("Error in /api/recipes:", error);
    return NextResponse.json(
      { error: "Failed to get recipe suggestions." },
      { status: 500 },
    );
  }
}
