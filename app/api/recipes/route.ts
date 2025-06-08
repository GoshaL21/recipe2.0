import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ingredients, cookingLevel, maxPrepTime, maxBudget } = body;

        // Validate input
        if (
            !Array.isArray(ingredients) ||
            ingredients.length === 0 ||
            !cookingLevel ||
            typeof maxPrepTime !== 'number' ||
            typeof maxBudget !== 'number'
        ) {
            return NextResponse.json(
                { error: 'Invalid input. Please provide all required fields.' },
                { status: 400 }
            );
        }

        // Build prompt for OpenAI
        const prompt = `
Given these ingredients: ${ingredients.join(', ')}

Please suggest 3 possible recipes that:
1. Use some or all of these ingredients
2. Are suitable for a ${cookingLevel} level cook
3. Take no more than ${maxPrepTime} minutes to prepare and cook
4. Cost no more than $${maxBudget} total for all ingredients

For each recipe, provide:
1. Recipe name
2. List of all required ingredients (marking which ones are from the provided list)
3. Use as few additional ingredients as possible (ideally 0–2 per recipe)
4. Step-by-step, highly detailed cooking instructions (include specific times, temperatures, spice/seasoning amounts, and any tips for best results)
5. Approximate cooking time (must be under ${maxPrepTime} minutes)
6. Estimated total cost in USD (as a number)
7. Nutrition info: calories, protein (g), fat (g), carbs (g)

Format the response in JSON with this structure:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "ingredients": {
        "provided": ["ingredient1", "ingredient2"],
        "additional": ["ingredient3", "ingredient4"]
      },
      "instructions": "Step-by-step, detailed instructions...",
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
`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            return NextResponse.json(
                { error: 'No response from OpenAI.' },
                { status: 502 }
            );
        }

        // Parse and return the response
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(content);
        } catch {
            return NextResponse.json(
                { error: 'Failed to parse OpenAI response.' },
                { status: 500 }
            );
        }

        return NextResponse.json(parsedResponse);
    } catch (error) {
        console.error('Error in /api/recipes:', error);
        return NextResponse.json(
            { error: 'Failed to get recipe suggestions.' },
            { status: 500 }
        );
    }
}