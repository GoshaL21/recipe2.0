import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---- Pantry / default items (won't be asked from the user) ----
const PANTRY_ITEMS = [
  "salt",
  "black pepper",
  "pepper",
  "olive oil",
  "vegetable oil",
  "cooking oil",
  "butter",
  "sugar",
  "vinegar",
  "soy sauce",
  "garlic",
  "garlic powder",
  "onion",
  "onion powder",
  "paprika",
  "chili flakes",
  "dried oregano",
  "dried basil",
  "mixed herbs",
];

const PANTRY_SET = new Set(PANTRY_ITEMS.map((s) => s.toLowerCase()));

// Price-tier guidance (since real prices vary by location)
const PREMIUM_INGREDIENT_KEYWORDS = [
  "steak",
  "ribeye",
  "tenderloin",
  "wagyu",
  "duck",
  "lamb",
  "lobster",
  "scallops",
  "caviar",
  "truffle",
  "saffron",
  "prosciutto",
  "parmesan",
  "burrata",
  "goat cheese",
  "prawns",
  "shrimp",
  "salmon",
  "tuna steak",
  "avocado",
  "pine nuts",
  "macadamia",
];

// ---- Lightweight nutrition calculator (per 100g or per piece for some items) ----
// Values are approximate; replace with external API later if desired.
// calories (kcal), protein (g), fat (g), carbs (g)
const NUTRITION_DB: Record<
  string,
  {
    per: "100g" | "piece";
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }
> = {
  // proteins
  "chicken breast": {
    per: "100g",
    calories: 165,
    protein: 31,
    fat: 3.6,
    carbs: 0,
  },
  beef: { per: "100g", calories: 250, protein: 26, fat: 15, carbs: 0 },
  pork: { per: "100g", calories: 242, protein: 27, fat: 14, carbs: 0 },
  salmon: { per: "100g", calories: 208, protein: 20, fat: 13, carbs: 0 },
  tuna: { per: "100g", calories: 132, protein: 29, fat: 1, carbs: 0 },
  egg: { per: "piece", calories: 78, protein: 6, fat: 5, carbs: 0.6 },
  eggs: { per: "piece", calories: 78, protein: 6, fat: 5, carbs: 0.6 },
  yogurt: { per: "100g", calories: 59, protein: 10, fat: 0.4, carbs: 3.6 },
  "greek yogurt": { per: "100g", calories: 97, protein: 9, fat: 5, carbs: 4 },
  // grains / carbs
  rice: { per: "100g", calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  "cooked rice": {
    per: "100g",
    calories: 130,
    protein: 2.7,
    fat: 0.3,
    carbs: 28,
  },
  pasta: { per: "100g", calories: 157, protein: 5.8, fat: 0.9, carbs: 30 },
  oats: { per: "100g", calories: 389, protein: 17, fat: 7, carbs: 66 },
  bread: { per: "100g", calories: 265, protein: 9, fat: 3.2, carbs: 49 },
  flour: { per: "100g", calories: 364, protein: 10, fat: 1, carbs: 76 },
  sugar: { per: "100g", calories: 387, protein: 0, fat: 0, carbs: 100 },
  // vegetables / fruits
  tomato: { per: "100g", calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  onion: { per: "100g", calories: 40, protein: 1.1, fat: 0.1, carbs: 9 },
  garlic: { per: "100g", calories: 149, protein: 6.4, fat: 0.5, carbs: 33 },
  "bell pepper": { per: "100g", calories: 31, protein: 1, fat: 0.3, carbs: 6 },
  carrot: { per: "100g", calories: 41, protein: 0.9, fat: 0.2, carbs: 10 },
  potato: { per: "100g", calories: 77, protein: 2, fat: 0.1, carbs: 17 },
  broccoli: { per: "100g", calories: 55, protein: 3.7, fat: 0.6, carbs: 11 },
  spinach: { per: "100g", calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6 },
  // fats / dairy
  "olive oil": { per: "100g", calories: 884, protein: 0, fat: 100, carbs: 0 },
  butter: { per: "100g", calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
  cheese: { per: "100g", calories: 402, protein: 25, fat: 33, carbs: 1.3 },
  milk: { per: "100g", calories: 42, protein: 3.4, fat: 1, carbs: 5 },
  honey: { per: "100g", calories: 304, protein: 0.3, fat: 0, carbs: 82 },
  // seafood
  shrimp: { per: "100g", calories: 99, protein: 24, fat: 0.3, carbs: 0.2 },
  cod: { per: "100g", calories: 82, protein: 18, fat: 0.7, carbs: 0 },
  tilapia: { per: "100g", calories: 96, protein: 20, fat: 2, carbs: 0 },
  // more meats
  "chicken thigh": {
    per: "100g",
    calories: 209,
    protein: 26,
    fat: 11,
    carbs: 0,
  },
  turkey: { per: "100g", calories: 135, protein: 29, fat: 1, carbs: 0 },
  "beef (lean)": { per: "100g", calories: 176, protein: 26, fat: 7, carbs: 0 },
  "pork loin": { per: "100g", calories: 242, protein: 27, fat: 14, carbs: 0 },
  // plant proteins
  tofu: { per: "100g", calories: 76, protein: 8, fat: 4.8, carbs: 1.9 },
  tempeh: { per: "100g", calories: 193, protein: 19, fat: 11, carbs: 9 },
  // common vegetables
  zucchini: { per: "100g", calories: 17, protein: 1.2, fat: 0.3, carbs: 3.1 },
  cucumber: { per: "100g", calories: 16, protein: 0.7, fat: 0.1, carbs: 3.6 },
  mushroom: { per: "100g", calories: 22, protein: 3.1, fat: 0.3, carbs: 3.3 },
  lettuce: { per: "100g", calories: 15, protein: 1.4, fat: 0.2, carbs: 2.9 },
  cabbage: { per: "100g", calories: 25, protein: 1.3, fat: 0.1, carbs: 6 },
  // fruits
  apple: { per: "100g", calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  banana: { per: "100g", calories: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  // nuts & seeds
  almond: { per: "100g", calories: 579, protein: 21, fat: 50, carbs: 22 },
  walnut: { per: "100g", calories: 654, protein: 15, fat: 65, carbs: 14 },
  peanut: { per: "100g", calories: 567, protein: 26, fat: 49, carbs: 16 },
  chia: { per: "100g", calories: 486, protein: 17, fat: 31, carbs: 42 },
  flaxseed: { per: "100g", calories: 534, protein: 18, fat: 42, carbs: 29 },
  // grains / starches
  quinoa: { per: "100g", calories: 120, protein: 4.4, fat: 1.9, carbs: 21.3 },
  buckwheat: {
    per: "100g",
    calories: 343,
    protein: 13.3,
    fat: 3.4,
    carbs: 71.5,
  },
  barley: { per: "100g", calories: 354, protein: 12.5, fat: 2.3, carbs: 73.5 },
  couscous: { per: "100g", calories: 112, protein: 3.8, fat: 0.2, carbs: 23 },
  // cheeses & dairy extras
  mozzarella: { per: "100g", calories: 280, protein: 28, fat: 17, carbs: 3 },
  cream: { per: "100g", calories: 340, protein: 2, fat: 35, carbs: 3 },
  // oils
  "canola oil": { per: "100g", calories: 884, protein: 0, fat: 100, carbs: 0 },
  // legumes
  beans: { per: "100g", calories: 347, protein: 21, fat: 1.2, carbs: 63 },
  chickpeas: { per: "100g", calories: 364, protein: 19, fat: 6, carbs: 61 },
  lentils: { per: "100g", calories: 352, protein: 25, fat: 1.1, carbs: 60 },
};

// Generic fallback nutrition estimates for unknown ingredients (per 100g)
const GENERIC_NUTRITION = [
  {
    keywords: [
      "zucchini",
      "cucumber",
      "lettuce",
      "cabbage",
      "vegetable",
      "veg",
    ],
    val: { calories: 25, protein: 1, fat: 0.2, carbs: 5 },
  },
  {
    keywords: ["apple", "banana", "fruit", "berry"],
    val: { calories: 50, protein: 0.5, fat: 0.2, carbs: 12 },
  },
  {
    keywords: ["quinoa", "buckwheat", "barley", "grain", "cereal", "starch"],
    val: { calories: 120, protein: 4, fat: 2, carbs: 21 },
  },
  {
    keywords: ["almond", "walnut", "peanut", "nut", "seed", "chia", "flax"],
    val: { calories: 600, protein: 20, fat: 50, carbs: 20 },
  },
  {
    keywords: [
      "chicken",
      "beef",
      "pork",
      "turkey",
      "meat",
      "fish",
      "shrimp",
      "cod",
      "tilapia",
      "tofu",
      "tempeh",
      "protein",
    ],
    val: { calories: 200, protein: 20, fat: 10, carbs: 0 },
  },
  {
    keywords: ["cheese", "cream", "dairy", "milk", "yogurt"],
    val: { calories: 200, protein: 8, fat: 15, carbs: 6 },
  },
  {
    keywords: ["sauce", "dressing", "condiment"],
    val: { calories: 150, protein: 1, fat: 10, carbs: 12 },
  },
  {
    keywords: ["default"],
    val: { calories: 100, protein: 3, fat: 3, carbs: 15 },
  },
];

function matchNutritionKey(name: string): string | null {
  const n = normalize(name);
  const keys = Object.keys(NUTRITION_DB);
  // exact contains
  for (const k of keys) {
    if (n.includes(k)) return k;
  }
  // fallback singular/plural trims
  const singular = n.replace(/s\b/, "");
  for (const k of keys) {
    if (singular.includes(k)) return k;
  }
  return null;
}

// Basic unit conversions; rough averages for spoons/cups if density unknown
const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1, // assume water-like
  l: 1000,
  tbsp: 15,
  tsp: 5,
  cup: 240,
  cups: 240,
};

// Some ingredient-specific overrides for spoons/cups (better densities)
const DENSITY_HINTS: Record<
  string,
  { tbsp?: number; tsp?: number; cup?: number }
> = {
  "olive oil": { tbsp: 14, tsp: 4.5 },
  butter: { tbsp: 14, tsp: 5 },
  sugar: { tbsp: 12, tsp: 4.2, cup: 200 },
  flour: { tbsp: 8, tsp: 2.6, cup: 120 },
  oats: { cup: 90 },
  rice: { cup: 195 }, // cooked
};

// Default serving size hints (used when no explicit amount is provided)
const DEFAULT_SERVING_GRAMS: Record<string, number> = {
  honey: 21, // ~1 tbsp by default if no amount given
};

function extractAmountInGrams(raw: string, key: string): number {
  const text = raw.toLowerCase();
  // Try to get explicit grams/ml/kg first
  const mG = text.match(/(\d+[\d./]*)\s*(g|gram|grams)/);
  if (mG)
    return (
      parseFloat(mG[1]) * UNIT_TO_GRAMS[mG[2] as keyof typeof UNIT_TO_GRAMS]
    );
  const mKg = text.match(/(\d+[\d./]*)\s*(kg)/);
  if (mKg) return parseFloat(mKg[1]) * 1000;
  const mMl = text.match(/(\d+[\d./]*)\s*(ml)/);
  if (mMl) return parseFloat(mMl[1]);
  const mL = text.match(/(\d+[\d./]*)\s*(l)\b/);
  if (mL) return parseFloat(mL[1]) * 1000;

  // spoons / cups
  const mTbsp = text.match(/(\d+[\d./]*)\s*(tbsp|tablespoon)/);
  if (mTbsp) {
    const val = parseFloat(mTbsp[1]);
    const hint = DENSITY_HINTS[key]?.tbsp ?? UNIT_TO_GRAMS.tbsp;
    return val * hint;
  }
  const mTsp = text.match(/(\d+[\d./]*)\s*(tsp|teaspoon)/);
  if (mTsp) {
    const val = parseFloat(mTsp[1]);
    const hint = DENSITY_HINTS[key]?.tsp ?? UNIT_TO_GRAMS.tsp;
    return val * hint;
  }
  const mCup = text.match(/(\d+[\d./]*)\s*(cup|cups)/);
  if (mCup) {
    const val = parseFloat(mCup[1]);
    const hint = DENSITY_HINTS[key]?.cup ?? UNIT_TO_GRAMS.cup;
    return val * hint;
  }

  // pieces/units (eggs)
  const mPiece = text.match(/(\d+[\d./]*)\s*(x|pcs?|pieces?|eggs?|egg)\b/);
  if (mPiece) {
    // if DB entry is per piece, use count; else approximate 60g per egg
    const count = parseFloat(mPiece[1]);
    if (NUTRITION_DB[key].per === "piece") return count; // handled specially
    return count * 60;
  }

  // fallback: try to capture leading number as grams
  const mAny = text.match(/(\d+[\d./]*)/);
  if (mAny) return parseFloat(mAny[1]);

  // If we have no amount, assume a reasonable single-serving default
  if (NUTRITION_DB[key].per === "piece") return 1; // one egg, etc.
  if (DEFAULT_SERVING_GRAMS[key] != null) return DEFAULT_SERVING_GRAMS[key];
  return 100; // 100g default
}

function addNut(
  acc: { calories: number; protein: number; fat: number; carbs: number },
  part: { calories: number; protein: number; fat: number; carbs: number },
) {
  acc.calories += part.calories;
  acc.protein += part.protein;
  acc.fat += part.fat;
  acc.carbs += part.carbs;
}

function computeNutritionForItems(items: string[]): {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
} {
  const total = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  for (const raw of items) {
    if (!raw) continue;
    const key = matchNutritionKey(raw);
    if (!key) {
      const n = normalize(raw);
      const grams = extractAmountInGrams(raw, n);
      let picked = GENERIC_NUTRITION.find((g) =>
        g.keywords.some((kw) => n.includes(kw)),
      );
      if (!picked)
        picked = GENERIC_NUTRITION.find((g) => g.keywords.includes("default"));
      const factor = grams / 100;
      addNut(total, {
        calories: picked!.val.calories * factor,
        protein: picked!.val.protein * factor,
        fat: picked!.val.fat * factor,
        carbs: picked!.val.carbs * factor,
      });
      continue;
    }
    const entry = NUTRITION_DB[key];
    if (entry.per === "piece") {
      const pieces = extractAmountInGrams(raw, key); // returns piece count for per-piece items
      addNut(total, {
        calories: entry.calories * pieces,
        protein: entry.protein * pieces,
        fat: entry.fat * pieces,
        carbs: entry.carbs * pieces,
      });
    } else {
      const grams = extractAmountInGrams(raw, key);
      const factor = grams / 100;
      addNut(total, {
        calories: entry.calories * factor,
        protein: entry.protein * factor,
        fat: entry.fat * factor,
        carbs: entry.carbs * factor,
      });
    }
  }
  // round to sensible integers
  return {
    calories: Math.round(total.calories),
    protein: Math.round(total.protein),
    fat: Math.round(total.fat),
    carbs: Math.round(total.carbs),
  };
}

// Canonicalization helpers for better matching between provided and generated items
const DESCRIPTORS = new Set([
  "fresh",
  "ripe",
  "large",
  "small",
  "medium",
  "chopped",
  "diced",
  "minced",
  "sliced",
  "crushed",
  "grated",
  "shredded",
  "optional",
  "to",
  "taste",
  "ground",
  "whole",
  "skinless",
  "boneless",
  "cooked",
  "uncooked",
  "raw",
  "peeled",
  "seeded",
  "halved",
  "drained",
  "rinsed",
  "extra",
  "virgin",
]);

function singularize(word: string): string {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y"; // berries -> berry
  if (word.endsWith("oes")) return word.slice(0, -2); // tomatoes -> tomato
  if (word.endsWith("ses")) return word.slice(0, -2); // cheeses -> cheese
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1); // eggs -> egg
  return word;
}

function normalize(str: string): string {
  const cleaned = str
    .toLowerCase()
    .replace(/^[\d\s./-]+(g|kg|ml|l|tbsp|tsp|cup|cups)?\s*/g, "") // drop leading qty/units
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  const core = tokens
    .filter((t) => !DESCRIPTORS.has(t))
    .map(singularize)
    .join(" ")
    .trim();
  return core;
}

function roughlyMatches(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // allow substring match for multi-word items (e.g., "bell pepper" vs "pepper")
  return a.includes(b) || b.includes(a);
}

// ---- Fuzzy helpers for typo correction ----
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function bestFuzzyMatch(
  term: string,
  candidates: string[],
): { match: string | null; distance: number } {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(term, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { match: best, distance: bestDist };
}

function extractQtyPrefix(raw: string): string {
  const m = raw.match(
    /^\s*([\d\s./xX]+\s*(g|kg|ml|l|tbsp|tsp|cup|cups|pcs?|pieces?)?)\s*/i,
  );
  return m ? m[0].trim() : "";
}

function rebuildWithName(raw: string, correctedName: string): string {
  const qty = extractQtyPrefix(raw);
  return qty ? `${qty} ${correctedName}` : correctedName;
}

function containsAny(hay: string, needles: string[]): boolean {
  const h = normalize(hay);
  return needles.some((n) => h.includes(normalize(n)));
}

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
    });
    console.log("Fetched recipes:", recipes);
    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      ingredients,
      cookingLevel,
      maxPrepTime,
      maxBudget,
      dietaryPreference,
      priceTier,
      avoidPremium,
    } = body as {
      ingredients: string[];
      cookingLevel: string;
      maxPrepTime: number;
      maxBudget?: number;
      dietaryPreference?: string;
      priceTier?: "off" | "budget" | "mid" | "premium";
      avoidPremium?: boolean;
    };

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one ingredient." },
        { status: 400 },
      );
    }
    if (!cookingLevel || typeof maxPrepTime !== "number") {
      return NextResponse.json(
        { error: "Invalid input parameters." },
        { status: 400 },
      );
    }

    const dietaryText =
      dietaryPreference && dietaryPreference !== "none"
        ? `The recipes must be ${dietaryPreference}.`
        : "";

    const tier = priceTier ?? "off";
    const avoidPremiumText = avoidPremium
      ? `Additionally, avoid premium/luxury ingredients.`
      : "";

    const budgetText =
      tier === "off"
        ? "Budget is OFF: do not optimize for price."
        : tier === "budget"
          ? `Budget tier is CHEAPER: prefer everyday affordable ingredients (e.g., eggs, oats, rice, pasta, beans, lentils, seasonal vegetables, chicken thighs/breast). Avoid luxury/premium items such as: ${PREMIUM_INGREDIENT_KEYWORDS.join(", ")}.`
          : tier === "mid"
            ? `Budget tier is MEDIUM: allow common-to-moderate ingredients; avoid heavy luxury items such as: ${PREMIUM_INGREDIENT_KEYWORDS.join(", ")}.`
            : `Budget tier is MORE EXPENSIVE: you may include premium ingredients and delicacies (e.g., seafood, quality cheeses, steak), but keep it reasonable and coherent.`;

    // ---- Prompt with explicit rules to fix issues (1)-(3) ----
    const prompt = `You are a professional chef creating recipes based on available ingredients.

Assume the cook always has these pantry items available and they should NOT be listed in additional ingredients: ${PANTRY_ITEMS.join(", ")}.

Ingredients provided by the user: ${ingredients.join(", ")}
Generate exactly 3 different recipes; do not return fewer or more.

Hard requirements:
- Cooking level: ${cookingLevel}
- Maximum preparation time: ${maxPrepTime} minutes
- Budget guidance: ${budgetText} ${avoidPremiumText}
${dietaryText}

Output rules (CRITICAL):
1) Use at least one relevant provided ingredient per recipe. You may ignore provided ingredients that are not needed. Only list used provided ingredients under "ingredients.provided"; do not include unused provided items anywhere.
2) Do NOT include pantry items (${PANTRY_ITEMS.join(", ")}) in either list unless a specific non-pantry variant is required (e.g., "smoked paprika").
3) Keep "ingredients.additional" minimal (at most 3 items), common and inexpensive; remove anything non-essential.
3b) Respect the budget guidance: for CHEAPER and MEDIUM tiers, do not include luxury/premium ingredients. For MORE EXPENSIVE tier, premium ingredients are allowed.
4) Every item listed in either ingredients list MUST be referenced in the instructions. If instructions require a non‑pantry item and the user provided it, it belongs in "ingredients.provided"; otherwise put it in "ingredients.additional".
5) Provide explicit measurements for every listed ingredient (grams / tbsp / cups) so nutrition can be calculated.

Return a JSON object exactly in this schema:
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
      "cost": 12.5,
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
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from OpenAI");

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content);
      return NextResponse.json(
        {
          error: "Received malformed response from recipe generator",
          details: content,
        },
        { status: 500 },
      );
    }

    // Ensure we have exactly 3 recipes; if not, try once more with a stricter instruction
    if (
      !parsed.recipes ||
      !Array.isArray(parsed.recipes) ||
      parsed.recipes.length !== 3
    ) {
      const retryPrompt =
        prompt +
        "\nIMPORTANT: Return exactly 3 different recipes in the JSON array.";
      const retry = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: retryPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      const retryContent = retry.choices[0]?.message?.content;
      if (retryContent) {
        try {
          const retryParsed = JSON.parse(retryContent);
          if (
            retryParsed?.recipes &&
            Array.isArray(retryParsed.recipes) &&
            retryParsed.recipes.length === 3
          ) {
            parsed = retryParsed;
          }
        } catch {}
      }
    }

    // As a final safeguard, if still not 3, trim or pad by duplicating with minor variations
    if (!parsed.recipes || !Array.isArray(parsed.recipes)) parsed.recipes = [];
    if (parsed.recipes.length > 3) parsed.recipes = parsed.recipes.slice(0, 3);
    while (parsed.recipes.length < 3 && parsed.recipes.length > 0) {
      const base = parsed.recipes[parsed.recipes.length - 1];
      parsed.recipes.push({
        ...base,
        name: base.name + " (variation)",
      });
    }

    // ---- Post-processing guard rails to fix issues (1)-(3) even if model slips) ----
    try {
      const provided = ingredients.map((i: string) => normalize(i));

      parsed.recipes = (parsed.recipes || []).map((r: any) => {
        const prov: string[] = Array.isArray(r?.ingredients?.provided)
          ? r.ingredients.provided
          : [];
        const addl: string[] = Array.isArray(r?.ingredients?.additional)
          ? r.ingredients.additional
          : [];

        // Normalize and re-bucket items: anything matching provided → provided list
        const newProvided: string[] = [];
        const newAdditional: string[] = [];

        const pushProvided = (item: string) => {
          if (!newProvided.some((p) => normalize(p) === normalize(item)))
            newProvided.push(item);
        };
        const pushAdditional = (item: string) => {
          if (!newAdditional.some((p) => normalize(p) === normalize(item)))
            newAdditional.push(item);
        };

        // build canonical sets/maps
        const providedCanon = new Set(provided.map((p) => normalize(p)));
        const providedOriginalMap = new Map(
          provided.map((pRaw, idx) => [
            normalize(ingredients[idx] || pRaw),
            ingredients[idx] || pRaw,
          ]),
        );
        const correctionDict = Array.from(
          new Set(
            [
              ...Object.keys(NUTRITION_DB),
              ...PANTRY_ITEMS,
              ...Array.from(providedCanon),
            ].map((k) => normalize(k)),
          ),
        );

        [...prov, ...addl].forEach((raw) => {
          if (!raw) return;
          const n = normalize(raw);

          // Check if this item corresponds to a user-provided ingredient (allow fuzzy)
          let matchedProvided: string | null = null;
          for (const pi of providedCanon) {
            if (roughlyMatches(n, pi) || levenshtein(n, pi) <= 2) {
              matchedProvided = pi;
              break;
            }
          }

          if (matchedProvided) {
            // Correct the name using our dictionary; prefer nutrition DB term if close, else the user's original provided text
            const { match, distance } = bestFuzzyMatch(
              matchedProvided,
              correctionDict,
            );
            const display =
              match && distance <= 2
                ? match
                : providedOriginalMap.get(matchedProvided) || matchedProvided;
            const corrected = rebuildWithName(raw, display);
            pushProvided(corrected);
            return;
          }

          // Not provided by user: if it's not pantry, it belongs to additional
          if (!PANTRY_SET.has(n) && !containsAny(n, Array.from(PANTRY_SET))) {
            pushAdditional(raw);
          }
        });

        // --- Ensure items referenced in instructions are listed ---
        const instr = String(r?.instructions || "");
        const instrNorm = normalize(instr);

        // prune any items not mentioned in instructions (non-pantry only)
        const pruneIfUnused = (arr: string[]) =>
          arr.filter((item) => instrNorm.includes(normalize(item)));

        // 1) If instructions mention a provided item, ensure it's in provided (correct spelling)
        for (const pi of providedCanon) {
          if (instrNorm.includes(pi)) {
            const already = newProvided.some((it) =>
              roughlyMatches(normalize(it), pi),
            );
            if (!already) {
              const { match, distance } = bestFuzzyMatch(pi, correctionDict);
              const display =
                match && distance <= 2
                  ? match
                  : providedOriginalMap.get(pi) || pi;
              pushProvided(display);
            }
          }
        }

        // 2) If instructions mention a non-pantry known item the user did not provide, ensure it's in additional
        for (const key of Object.keys(NUTRITION_DB)) {
          const k = normalize(key);
          if (!instrNorm.includes(k)) continue;
          if (PANTRY_SET.has(k) || containsAny(k, Array.from(PANTRY_SET)))
            continue;
          // skip if user provided it (handled above)
          if (
            Array.from(providedCanon).some(
              (pi) => roughlyMatches(k, pi) || levenshtein(k, pi) <= 2,
            )
          )
            continue;
          const alreadyInProvided = newProvided.some((it) =>
            roughlyMatches(normalize(it), k),
          );
          const alreadyInAdditional = newAdditional.some((it) =>
            roughlyMatches(normalize(it), k),
          );
          if (!alreadyInProvided && !alreadyInAdditional) {
            pushAdditional(key);
          }
        }

        // Remove pantry items from additional explicitly and ensure no overlap with provided (fuzzy and typo)
        const filteredAdditional = newAdditional.filter((item) => {
          const n = normalize(item);
          if (!instrNorm.includes(n)) return false; // must be used
          if (PANTRY_SET.has(n) || containsAny(n, Array.from(PANTRY_SET)))
            return false;
          for (const pi of providedCanon) {
            if (roughlyMatches(n, pi) || levenshtein(n, pi) <= 2) return false;
          }
          return true;
        });

        // Only keep provided items that instructions actually use
        const usedProvided = pruneIfUnused(newProvided);

        // Cap additional to max 3 items (most essential first: keep original order)
        const cappedAdditional = filteredAdditional.slice(0, 3);

        const combinedItems = [...usedProvided, ...cappedAdditional];
        const nutrition = computeNutritionForItems(combinedItems);

        return {
          ...r,
          ingredients: {
            provided: usedProvided,
            additional: cappedAdditional,
          },
          nutrition,
        };
      });
    } catch (ppErr) {
      console.warn("Post-processing warning:", ppErr);
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate recipes",
        details: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
