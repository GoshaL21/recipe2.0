"use client";

import React, { useState } from "react";
import IngredientList from "./components/IngredientList";
import RecipeCard from "./components/RecipeCard";
import { useRouter } from "next/navigation";
import NavBar from "./components/NavBar";

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

export default function Home() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookingLevel, setCookingLevel] = useState<string>("intermediate");
  const [maxPrepTime, setMaxPrepTime] = useState<number>(60);
  const [maxBudget, setMaxBudget] = useState<number>(50);
  const [dietaryPreference, setDietaryPreference] = useState<string>("none");

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIngredient.trim()) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient("");
      setRecipes([]);
      setError(null);
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
    setRecipes([]);
    setError(null);
  };

  const router = useRouter();

  const handleFindRecipes = async () => {
    setIsLoading(true);
    setError(null);
    setRecipes([]);

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          cookingLevel,
          maxPrepTime,
          maxBudget,
          dietaryPreference,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
      }

      const data = await response.json();

      // Show warning if present
      if (data.warning) {
        setError(data.warning);
      } else {
        setError(null);
      }

      setRecipes(data.recipes || []);
    } catch (err) {
      setError("Failed to get recipe suggestions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-12">
      {/* Navigation Bar */}
      <NavBar />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Discover Delicious Recipes
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your ingredients into culinary masterpieces with our
            AI-powered recipe suggestions.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl mb-8">
            <form onSubmit={handleAddIngredient} className="mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  placeholder="Enter an ingredient (e.g., chicken, tomatoes, rice)..."
                  className="flex-1 p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center"
                >
                  <span>Add</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </form>

            <IngredientList
              ingredients={ingredients}
              onRemoveIngredient={handleRemoveIngredient}
            />

            <div className="mt-8 space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Recipe Preferences
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  <label
                    htmlFor="dietaryPreference"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Dietary Preference
                  </label>
                  <select
                    id="dietaryPreference"
                    value={dietaryPreference}
                    onChange={(e) => setDietaryPreference(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="none">None</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="gluten-free">Gluten-Free</option>
                    <option value="keto">Keto</option>
                    <option value="paleo">Paleo</option>
                  </select>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label
                    htmlFor="cookingLevel"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Cooking Level
                  </label>
                  <select
                    id="cookingLevel"
                    value={cookingLevel}
                    onChange={(e) => setCookingLevel(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="maxPrepTime"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Max Prep Time (min)
                  </label>
                  <input
                    type="number"
                    id="maxPrepTime"
                    value={maxPrepTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxPrepTime(
                        val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0)
                      );
                    }}
                    min="0"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="maxBudget"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Max Budget ($)
                  </label>
                  <input
                    type="number"
                    id="maxBudget"
                    value={maxBudget}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxBudget(
                        val === "" ? 0 : Math.max(0, parseFloat(val) || 0)
                      );
                    }}
                    min="0"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

              </div>
            </div>

            <button
              onClick={handleFindRecipes}
              disabled={isLoading || ingredients.length === 0}
              className={`mt-8 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200 w-full font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Finding Recipes...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 10a1 1 0 012 0v3a1 1 0 11-2 0v-3zm3-5a1 1 0 012 0v8a1 1 0 11-2 0V5z"
                      clipRule="evenodd"
                    />
                    <path d="M4 13a3 3 0 106 0H4z" />
                  </svg>
                  <span>Find Recipes</span>
                </>
              )}
            </button>

            {error && (
              <p className="mt-6 text-red-600 font-semibold text-center">
                {error}
              </p>
            )}
          </div>

          {/* Recipes List */}
          {recipes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {recipes.map((recipe, idx) => (
                <RecipeCard key={idx} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
