"use client";

import React from "react";

type Recipe = {
  name: string;
  ingredients: {
    provided: string[];
    additional: string[];
  };
  instructions: string;
  cookingTime: string;
  cost: number;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
};

function getRecipeFromQuery(): Recipe | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const data = params.get("data");
  if (!data) return null;
  try {
    return JSON.parse(decodeURIComponent(data));
  } catch {
    return null;
  }
}

export default function SharePage() {
  const [recipe, setRecipe] = React.useState<Recipe | null>(null);

  React.useEffect(() => {
    setRecipe(getRecipeFromQuery());
  }, []);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow text-gray-700">
          Invalid or missing recipe data.
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">{recipe.name}</h2>
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-700 mb-2">
            Ingredients:
          </h4>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">
                From your kitchen:
              </p>
              <ul className="list-disc list-inside text-gray-600">
                {recipe.ingredients.provided.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>
            {recipe.ingredients.additional.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">
                  Additional ingredients needed:
                </p>
                <ul className="list-disc list-inside text-gray-600">
                  {recipe.ingredients.additional.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-700 mb-2">
            Instructions:
          </h4>
          <p className="text-gray-600 whitespace-pre-line">
            {recipe.instructions}
          </p>
        </div>
        <div className="text-gray-500 text-sm mb-2">
          <span>Cooking time: {recipe.cookingTime}</span>
        </div>
        <div className="text-gray-700 text-sm mb-2">
          <span>Estimated cost: ${recipe.cost?.toFixed(2)}</span>
        </div>
        <div className="text-gray-700 text-xs">
          <span>
            Nutrition: {recipe.nutrition?.calories} kcal,{" "}
            {recipe.nutrition?.protein}g protein, {recipe.nutrition?.fat}g fat,{" "}
            {recipe.nutrition?.carbs}g carbs
          </span>
        </div>
      </div>
    </main>
  );
}
