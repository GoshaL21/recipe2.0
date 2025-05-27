import {OpenAI} from 'openai';
import {NextResponse} from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const {ingredients, cookingLevel, maxPrepTime} = await req.json();

        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return NextResponse.json(
                {error: 'Please provide a valid list of ingredients'},
                {status: 400}
            );
        }

        const prompt = `Given these ingredients: ${ingredients.join(', ')}

Please suggest 3 possible recipes that:
1. Use some or all of these ingredients
2. Are suitable for a ${cookingLevel} level cook
3. Take no more than ${maxPrepTime} minutes to prepare and cook

For each recipe, provide:
1. Recipe name
2. List of all required ingredients (marking which ones are from the provided list)
3. Brief cooking instructions appropriate for a ${cookingLevel} level cook
4. Approximate cooking time (must be under ${maxPrepTime} minutes)

Format the response in JSON with this structure:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "ingredients": {
        "provided": ["ingredient1", "ingredient2"],
        "additional": ["ingredient3", "ingredient4"]
      },
      "instructions": "Cooking steps...",
      "cookingTime": "XX minutes"
    }
  ]
}`;

        const completion = await openai.chat.completions.create({
            messages: [{role: "user", content: prompt}],
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            response_format: {type: "json_object"},
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const parsedResponse = JSON.parse(content);
        return NextResponse.json(parsedResponse);

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            {error: 'Failed to get recipe suggestions'},
            {status: 500}
        );
    }
} 