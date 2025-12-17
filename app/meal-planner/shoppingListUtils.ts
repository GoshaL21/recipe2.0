

export type ShoppingLine = { name: string; qty: number; unit: string };

const PANTRY_EXCLUDE_KEYWORDS = [
  "salt",
  "pepper",
  "black pepper",
  "oil",
  "olive oil",
  "vegetable oil",
  "canola oil",
  "butter",
  "water",
];

export function isExcludedPantryItem(name: string) {
  const n = (name || "").toLowerCase().trim();
  return PANTRY_EXCLUDE_KEYWORDS.some((k) => n === k || n.includes(k));
}

function normalizeUnit(u: string) {
  const unit = (u || "").toLowerCase().trim();
  if (unit === "kgs") return "kg";
  if (unit === "grams" || unit === "gram") return "g";
  if (unit === "mls") return "ml";
  if (unit === "liters" || unit === "liter") return "l";
  if (unit === "tablespoon" || unit === "tablespoons") return "tbsp";
  if (unit === "teaspoon" || unit === "teaspoons") return "tsp";
  if (unit === "piece" || unit === "pieces") return "pc";
  return unit;
}

function toBaseUnit(qty: number, unit: string) {
  const u = normalizeUnit(unit);
  if (u === "kg") return { qty: qty * 1000, unit: "g" };
  if (u === "l") return { qty: qty * 1000, unit: "ml" };
  return { qty, unit: u };
}

export function parseIngredientLine(line: string): ShoppingLine {
  const raw = (line || "").trim();
  const cleaned = raw
    .replace(/^[-•\s]+/, "")
    .replace(/\s+/g, " ")
    .replace(/\(.*?\)/g, "")
    .trim();

  // Patterns like: "200g chicken", "200 g chicken", "1.5 tbsp olive oil", "2 eggs"
  const m = cleaned.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)?\s+(.*)$/);

  if (m) {
    const qty = Number(m[1]);
    const unitRaw = (m[2] || "").trim();
    const nameRaw = (m[3] || "").trim();

    const unit = unitRaw ? normalizeUnit(unitRaw) : "pc";
    const name = nameRaw
      .replace(/^of\s+/i, "")
      .replace(/\s*,\s*$/, "")
      .trim();

    return { name, qty: Number.isFinite(qty) ? qty : 1, unit };
  }

  return { name: cleaned, qty: 1, unit: "" };
}

export function formatShoppingLine(l: ShoppingLine) {
  const qty = Math.round(l.qty * 10) / 10;
  if (!l.unit) return qty > 1 ? `${l.name} — ${qty}` : l.name;
  if (l.unit === "pc") return qty > 1 ? `${l.name} — ${qty}` : l.name;
  return `${qty} ${l.unit} ${l.name}`.trim();
}

export function buildShoppingListFromIngredients(ingredients: string[]): ShoppingLine[] {
  const map = new Map<string, ShoppingLine>();

  for (const line of ingredients || []) {
    const parsed = parseIngredientLine(String(line));
    if (!parsed?.name) continue;

    const name = parsed.name.trim();
    if (!name) continue;
    if (isExcludedPantryItem(name)) continue;

    let qty = parsed.qty;
    let unit = parsed.unit;

    const base = unit ? toBaseUnit(qty, unit) : { qty, unit: "" };
    qty = base.qty;
    unit = base.unit;

    const key = `${name.toLowerCase()}__${unit}`;
    const prev = map.get(key);
    if (prev) prev.qty += qty;
    else map.set(key, { name, qty, unit });
  }

  return Array.from(map.values())
    .filter((x) => x.name && x.qty > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Helper when you already have a plan object on the page
export function buildShoppingListForPlan(plan: { meals?: { ingredients?: string[] }[] } | null) {
  const all: string[] = [];
  for (const meal of plan?.meals || []) {
    for (const ing of meal?.ingredients || []) all.push(String(ing));
  }
  return buildShoppingListFromIngredients(all);
}