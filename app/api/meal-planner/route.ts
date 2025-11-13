import { NextResponse } from "next/server";
import OpenAI from "openai";

type Body = {
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: "male" | "female";
  activity:
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "very_active"
    | string;
  diet: "none" | "vegetarian" | "vegan" | "gluten-free" | "keto" | string;
  goal: "lose" | "maintain" | "gain" | "eat_healthy" | "recomp" | string;
};

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function mifflinStJeor({ gender, weight, height, age }: Body) {
  // weight kg, height cm, age years
  const s = gender === "male" ? 5 : -161;
  return 10 * weight + 6.25 * height - 5 * age + s;
}

function caloriesForGoal(tdee: number, goal: string) {
  switch (goal) {
    case "lose":
      return tdee * 0.8; // ~20% deficit
    case "gain":
      return tdee * 1.15; // ~15% surplus
    case "recomp":
      return tdee * 1.05; // slight surplus, high protein
    case "eat_healthy":
    case "maintain":
    default:
      return tdee;
  }
}

function proteinPerKg(goal: string) {
  switch (goal) {
    case "lose":
      return 2.0; // g/kg
    case "gain":
      return 1.8;
    case "recomp":
      return 2.0;
    default:
      return 1.6;
  }
}

function planMacros(totalCalories: number, weight: number, goal: string) {
  const protein = proteinPerKg(goal) * weight; // g
  const calsFromProtein = protein * 4;

  // fat ~25–30% of calories (higher on keto handled later)
  const fatPct = goal === "lose" ? 0.27 : goal === "gain" ? 0.25 : 0.28;
  const fat = (totalCalories * fatPct) / 9; // g
  const calsFromFat = fat * 9;

  const carbs = Math.max(
    0,
    (totalCalories - calsFromProtein - calsFromFat) / 4,
  ); // g
  return { protein, fat, carbs };
}

function round(v: number) {
  return Math.round(v * 10) / 10;
}

interface GeneratedMeal {
  name: string;
  ingredients: string[];
  instructions: string[];
  cookingTime: string;
  cost: number;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const age = clamp(Number(body.age || 25), 10, 120); // 10–120
    const weight = clamp(Number(body.weight || 70), 20, 300); // 20–300 kg
    const height = clamp(Number(body.height || 175), 120, 230);
    const gender = (body.gender === "female" ? "female" : "male") as
      | "male"
      | "female";
    const activity = String(body.activity || "moderate");
    const diet = String(body.diet || "none");
    const goal = String(body.goal || "maintain");

    const bmr = mifflinStJeor({
      gender,
      weight,
      height,
      age,
      activity,
      diet,
      goal,
    } as any);
    const mult = ACTIVITY_MULTIPLIER[activity] ?? 1.55;
    const tdee = bmr * mult;
    let targetCalories = caloriesForGoal(tdee, goal);

    // Keto: bias fat higher if selected
    let { protein, fat, carbs } = planMacros(targetCalories, weight, goal);
    if (diet === "keto") {
      // ~5% carbs cap
      const carbsCap = Math.max(
        0,
        Math.min(carbs, (targetCalories * 0.05) / 4),
      );
      const freedCals = (carbs - carbsCap) * 4;
      carbs = carbsCap;
      fat += freedCals / 9;
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
  You are a nutrition and cooking expert. Create a daily meal plan with 3 meals (breakfast, lunch, dinner).
  The user profile:
  Age: ${age}
  Weight: ${weight} kg
  Height: ${height} cm
  Gender: ${gender}
  Activity level: ${activity}
  Diet preference: ${diet}
  Goal: ${goal}

  Daily macro targets:
  Calories: ${round(targetCalories)}
  Protein: ${round(protein)} g
  Fat: ${round(fat)} g
  Carbs: ${round(carbs)} g

  For each meal:
  - Provide a descriptive meal name.
  - Provide "ingredients" as an array of strings.
  - Provide "instructions" as an array of 4–8 detailed steps for beginners.
  - Provide estimated "cookingTime" (string).
  - Provide estimated "cost" (number).
  - Provide a "nutrition" object { calories, protein, fat, carbs }.

  Respond ONLY in this JSON format:

  {
    "meals": [
      {
        "name": "",
        "ingredients": [],
        "instructions": [],
        "cookingTime": "",
        "cost": 0,
        "nutrition": { "calories": 0, "protein": 0, "fat": 0, "carbs": 0 }
      }
    ]
  }
  `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.8,
      messages: [
        { role: "system", content: "You generate structured meal plans." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const rawMeals = Array.isArray(parsed.meals) ? parsed.meals : [];
    let meals: GeneratedMeal[] = rawMeals
      .slice(0, 3)
      .map((m: any, idx: number) => {
        const ingredients = Array.isArray(m?.ingredients)
          ? m.ingredients.map((x: any) => String(x))
          : [];
        const instructions = Array.isArray(m?.instructions)
          ? m.instructions.map((x: any) => String(x))
          : typeof m?.instructions === "string" && m.instructions.trim().length
            ? [m.instructions]
            : [];

        const nutrition = m?.nutrition || {};
        return {
          name: String(m?.name || `Meal ${idx + 1}`),
          ingredients,
          instructions,
          cookingTime: String(m?.cookingTime || "20 minutes"),
          cost: Number.isFinite(Number(m?.cost)) ? Number(m.cost) : 5,
          nutrition: {
            calories: Number.isFinite(Number(nutrition.calories))
              ? Number(nutrition.calories)
              : round(targetCalories / 3),
            protein: Number.isFinite(Number(nutrition.protein))
              ? Number(nutrition.protein)
              : round(protein / 3),
            fat: Number.isFinite(Number(nutrition.fat))
              ? Number(nutrition.fat)
              : round(fat / 3),
            carbs: Number.isFinite(Number(nutrition.carbs))
              ? Number(nutrition.carbs)
              : round(carbs / 3),
          },
        };
      });

    // --- Adjust meals to better match daily targets and add a snack if needed ---

    // Sum up current totals from all meals
    const totals = meals.reduce(
      (acc, m) => {
        acc.calories += m.nutrition.calories;
        acc.protein += m.nutrition.protein;
        acc.fat += m.nutrition.fat;
        acc.carbs += m.nutrition.carbs;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    );

    // If total calories are significantly below target, add a simple snack
    if (totals.calories < targetCalories * 0.7) {
      const remainingCalories = targetCalories - totals.calories;
      const snackCalories = Math.max(150, Math.min(remainingCalories, 400));
      const remainingProtein = Math.max(0, protein - totals.protein);
      const remainingFat = Math.max(0, fat - totals.fat);
      const remainingCarbs = Math.max(0, carbs - totals.carbs);

      const snack: GeneratedMeal = {
        name: "Snack to reach your daily target",
        ingredients: [
          "1 serving Greek yogurt",
          "1 piece of fruit (e.g. banana or apple)",
          "A small handful of nuts or seeds",
        ],
        instructions: [
          "Place the yogurt into a bowl.",
          "Wash and slice the fruit into bite-sized pieces and add it on top of the yogurt.",
          "Sprinkle the nuts or seeds over the top.",
          "Serve immediately as a simple snack to help close the gap to your daily calorie and macro targets.",
        ],
        cookingTime: "5 minutes",
        cost: 3.5,
        nutrition: {
          calories: round(snackCalories),
          protein: round(remainingProtein || protein * 0.2),
          fat: round(remainingFat || fat * 0.15),
          carbs: round(remainingCarbs || carbs * 0.2),
        },
      };

      meals.push(snack);
    }

    // Recalculate totals after possibly adding a snack
    const newTotals = meals.reduce(
      (acc, m) => {
        acc.calories += m.nutrition.calories;
        acc.protein += m.nutrition.protein;
        acc.fat += m.nutrition.fat;
        acc.carbs += m.nutrition.carbs;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    );

    // Compute scaling factors towards the daily targets
    const scale = {
      calories:
        targetCalories > 0 && newTotals.calories > 0
          ? targetCalories / newTotals.calories
          : 1,
      protein:
        protein > 0 && newTotals.protein > 0 ? protein / newTotals.protein : 1,
      fat: fat > 0 && newTotals.fat > 0 ? fat / newTotals.fat : 1,
      carbs: carbs > 0 && newTotals.carbs > 0 ? carbs / newTotals.carbs : 1,
    };

    // Only apply scaling if the totals are noticeably off (>10% diff)
    const shouldScale =
      Math.abs(newTotals.calories - targetCalories) > targetCalories * 0.1 ||
      Math.abs(newTotals.protein - protein) > protein * 0.1 ||
      Math.abs(newTotals.fat - fat) > fat * 0.1 ||
      Math.abs(newTotals.carbs - carbs) > carbs * 0.1;

    if (shouldScale) {
      meals = meals.map((m) => ({
        ...m,
        nutrition: {
          calories: round(m.nutrition.calories * scale.calories),
          protein: round(m.nutrition.protein * scale.protein),
          fat: round(m.nutrition.fat * scale.fat),
          carbs: round(m.nutrition.carbs * scale.carbs),
        },
      }));
    }

    const resp = {
      targetCalories: round(targetCalories),
      proteinTarget: round(protein),
      fatTarget: round(fat),
      carbTarget: round(carbs),
      meals,
    };

    return NextResponse.json(resp, { status: 200 });
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to generate plan", {
      status: 400,
    });
  }
}
