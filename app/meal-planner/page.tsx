"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

type Meal = {
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
};

type PlanResponse = {
  targetCalories: number;
  proteinTarget: number;
  fatTarget: number;
  carbTarget: number;
  meals: Meal[];
};

const activityOptions = [
  { value: "sedentary", label: "Sedentary (little/no exercise)" },
  { value: "light", label: "Light (1–3 days/week)" },
  { value: "moderate", label: "Moderate (3–5 days/week)" },
  { value: "active", label: "Active (6–7 days/week)" },
  { value: "very_active", label: "Very Active (physical job/2x training)" },
];

const dietOptions = [
  { value: "none", label: "None" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "keto", label: "Keto" },
];

const goalOptions = [
  { value: "lose", label: "Lose Weight" },
  { value: "maintain", label: "Maintain / Keep Form" },
  { value: "gain", label: "Gain Muscle" },
  { value: "eat_healthy", label: "Just Eat Healthy" },
  { value: "recomp", label: "Body Recomposition" },
];

export default function MealPlannerPage() {
  const [age, setAge] = useState<number>(25);
  const [weight, setWeight] = useState<number>(70); // kg
  const [height, setHeight] = useState<number>(175); // cm
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activity, setActivity] = useState<string>("moderate");
  const [diet, setDiet] = useState<string>("none");
  const [goal, setGoal] = useState<string>("maintain");

  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [currentDay, setCurrentDay] = useState<number>(1);
  const [plansByDay, setPlansByDay] = useState<Record<number, PlanResponse>>(
    {},
  );
  const [isCurrentPlan, setIsCurrentPlan] = useState(false);

  // Prefill from /api/user if logged in
  useEffect(() => {
    (async () => {
      try {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("token");
        if (!token) return; // guest user

        const res = await fetch("/api/user", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            const u = data.user;
            if (u.age) setAge(Number(u.age));
            if (u.weight) setWeight(Number(u.weight));
            if (u.height) setHeight(Number(u.height));
            if (u.activityLevel) setActivity(String(u.activityLevel));
            if (u.diet) setDiet(String(u.diet));
            // gender is still chosen manually
          }
        }
      } catch {
        // ignore (guest user or fetch error)
      }
    })();
  }, []);

  // Load current saved meal plan for this user (if any)
  useEffect(() => {
    (async () => {
      try {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("/api/meal-planner/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data?.currentPlan) {
          const savedPlan = data.currentPlan as PlanResponse;
          setPlan(savedPlan);
          setIsCurrentPlan(true);
          setPlansByDay((prev) => ({
            ...prev,
            1: savedPlan,
          }));
          setCurrentDay(1);
        }
      } catch {
        // ignore errors; user can still generate a new plan
      }
    })();
  }, []);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 3000);
  };

  const validateInputs = () => {
    if (age < 10 || age > 120) {
      setError("Age must be between 10 and 120.");
      return false;
    }
    if (weight < 20 || weight > 300) {
      setError("Weight must be between 20 and 300 kg.");
      return false;
    }
    setError(null);
    return true;
  };
  const fetchPlanForDay = async (day: number, force = false) => {
    if (!force && plansByDay[day]) {
      // Use cached plan for this day
      setPlan(plansByDay[day]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meal-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          weight,
          height,
          gender,
          activity,
          diet,
          goal,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to generate plan");
      }
      const data = (await res.json()) as PlanResponse;

      setPlansByDay((prev) => ({
        ...prev,
        [day]: data,
      }));
      setPlan(data);
      setIsCurrentPlan(false);
    } catch (e: any) {
      setError(e?.message || "Failed to generate plan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialGenerate = () => {
    if (!validateInputs()) return;
    setCurrentDay(1);
    setIsCurrentPlan(false);
    fetchPlanForDay(1, true);
  };

  const handleRegenerate = () => {
    if (!validateInputs()) return;
    setIsCurrentPlan(false);
    fetchPlanForDay(currentDay, true);
  };

  const handleChangeDay = (nextDay: number) => {
    if (nextDay < 1 || nextDay > 7) return;
    if (!validateInputs()) return;
    setCurrentDay(nextDay);
    setIsCurrentPlan(false);
    fetchPlanForDay(nextDay, false);
  };

  const handleSaveMeal = async (meal: Meal) => {
    try {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("You need to be logged in to save recipes.", "error");
        return;
      }

      const res = await fetch("/api/saveRecipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: meal.name,
          ingredients: {
            provided: meal.ingredients,
            additional: [],
          },
          instructions: meal.instructions.join("\n"),
          cookingTime: meal.cookingTime,
          cost: meal.cost,
          nutrition: meal.nutrition,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data && (data.error || data.message)) || "Failed to save recipe.";
        showToast(msg, "error");
        return;
      }

      showToast("Meal saved to My Recipes.", "success");
    } catch (e) {
      showToast("Failed to save recipe.", "error");
    }
  };

  const handleShareMeal = async (meal: Meal) => {
    try {
      if (typeof window === "undefined") return;

      const recipeForShare = {
        name: meal.name,
        ingredients: {
          provided: meal.ingredients,
          additional: [],
        },
        instructions: meal.instructions.join("\n"),
        cookingTime: meal.cookingTime,
        cost: meal.cost,
        nutrition: meal.nutrition,
      };

      const url = `${window.location.origin}/share?data=${encodeURIComponent(
        JSON.stringify(recipeForShare),
      )}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        showToast("Share link copied to clipboard.", "success");
      } else {
        // Fallback: show the URL in a prompt
        window.prompt("Copy this share link:", url);
      }
    } catch {
      showToast("Failed to create share link.", "error");
    }
  };

  const handleSetAsCurrent = async () => {
    try {
      if (typeof window === "undefined" || !plan) return;

      const token = localStorage.getItem("token");
      if (!token) {
        showToast(
          "You need to be logged in to save current meal plan.",
          "error",
        );
        return;
      }

      const res = await fetch("/api/meal-planner/current", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(plan),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save current meal plan.");
      }

      setIsCurrentPlan(true);
      showToast("Current meal plan saved.", "success");
    } catch (e: any) {
      setError(e?.message || "Failed to save current meal plan.");
      showToast("Failed to save current meal plan.", "error");
    }
  };

  const handleDeleteCurrent = async () => {
    try {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      if (!token) {
        showToast("You need to be logged in to delete current meal plan.", "error");
        return;
      }

      const res = await fetch("/api/meal-planner/current", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to delete current meal plan.");
      }

      // Clear UI state
      setPlan(null);
      setPlansByDay({});
      setCurrentDay(1);
      setIsCurrentPlan(false);
      showToast("Current meal plan deleted.", "success");
    } catch (e: any) {
      setError(e?.message || "Failed to delete current meal plan.");
      showToast("Failed to delete current meal plan.", "error");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-12">
      <Navbar />
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Meal Planner</h1>
        <p className="text-gray-600 mb-8">
          Confirm your profile and goal. We’ll generate a 3-meal day plan with
          ingredients, instructions, and nutrition—consistent with your recipe
          maker.
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Age (years)
              </label>
              <input
                type="number"
                className="w-full p-3 border-2 rounded-lg"
                value={age}
                min={10}
                max={120}
                onChange={(e) => setAge(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                className="w-full p-3 border-2 rounded-lg"
                value={weight}
                min={20}
                max={300}
                onChange={(e) => setWeight(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Height (cm)
              </label>
              <input
                type="number"
                className="w-full p-3 border-2 rounded-lg"
                value={height}
                min={100}
                max={240}
                onChange={(e) => setHeight(Number(e.target.value || 0))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                className="w-full p-3 border-2 rounded-lg"
                value={gender}
                onChange={(e) => setGender(e.target.value as "male" | "female")}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Activity Level
              </label>
              <select
                className="w-full p-3 border-2 rounded-lg"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                {activityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Diet Preference
              </label>
              <select
                className="w-full p-3 border-2 rounded-lg"
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
              >
                {dietOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Goal</label>
            <select
              className="w-full p-3 border-2 rounded-lg"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              {goalOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleInitialGenerate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-600 transition"
          >
            {isLoading ? "Generating..." : "Generate Meal Plan"}
          </button>

          {error && <p className="text-red-600 font-semibold">{error}</p>}
        </div>

        {plan && (
          <div className="mt-10">
            {/* Day navigation + regenerate button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleChangeDay(currentDay - 1)}
                  disabled={currentDay === 1 || isLoading}
                  className="px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50"
                >
                  ← Previous day
                </button>
                <span className="text-sm text-gray-600">
                  Day {currentDay} of 7
                </span>
                <button
                  onClick={() => handleChangeDay(currentDay + 1)}
                  disabled={currentDay === 7 || isLoading}
                  className="px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50"
                >
                  Next day →
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg border border-purple-400 text-purple-700 font-medium hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Regenerating..." : "Regenerate meals"}
                </button>
                {isCurrentPlan ? (
                  <button
                    onClick={handleDeleteCurrent}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg border border-red-500 text-red-700 font-medium hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Delete current plan
                  </button>
                ) : (
                  <button
                    onClick={handleSetAsCurrent}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg border border-green-500 text-green-700 font-medium hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Set as current meal plan
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="text-2xl font-bold mb-3">Daily Targets</h2>
              <p className="text-gray-700">
                Calories:{" "}
                <strong>{Math.round(plan.targetCalories)} kcal</strong> •
                Protein: <strong>{Math.round(plan.proteinTarget)} g</strong> •
                Fat: <strong>{Math.round(plan.fatTarget)} g</strong> • Carbs:{" "}
                <strong>{Math.round(plan.carbTarget)} g</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plan.meals.map((m, i) => (
                <div key={i} className="bg-white rounded-2xl shadow p-6">
                  <h3 className="text-xl font-bold mb-2">{m.name}</h3>

                  <div className="mb-3">
                    <p className="font-semibold">Ingredients needed:</p>
                    <ul className="list-disc ml-5 text-sm text-gray-700 mt-1">
                      {m.ingredients && m.ingredients.length ? (
                        m.ingredients.map((x, idx) => <li key={idx}>{x}</li>)
                      ) : (
                        <li>—</li>
                      )}
                    </ul>
                  </div>

                  <ol className="list-decimal ml-5 text-sm text-gray-700 mb-3">
                    {m.instructions && m.instructions.length ? (
                      m.instructions.map((step, idx) => (
                        <li key={idx} className="mb-1">
                          {step}
                        </li>
                      ))
                    ) : (
                      <li>No instructions provided.</li>
                    )}
                  </ol>

                  <div className="text-sm text-gray-700">
                    <p>
                      <span className="font-semibold">Cooking time:</span>{" "}
                      {m.cookingTime}
                    </p>
                    <p>
                      <span className="font-semibold">Estimated cost:</span> $
                      {m.cost.toFixed(2)}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold">Nutrition:</span>{" "}
                      {Math.round(m.nutrition.calories)} kcal,{" "}
                      {Math.round(m.nutrition.protein)}g protein,{" "}
                      {Math.round(m.nutrition.fat)}g fat,{" "}
                      {Math.round(m.nutrition.carbs)}g carbs
                    </p>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleSaveMeal(m)}
                      className="flex-1 px-3 py-2 rounded-lg border border-purple-500 text-purple-700 text-sm font-medium hover:bg-purple-50"
                      disabled={isLoading}
                    >
                      Save to My Recipes
                    </button>
                    <button
                      onClick={() => handleShareMeal(m)}
                      className="flex-1 px-3 py-2 rounded-lg border border-blue-500 text-blue-600 text-sm font-medium hover:bg-blue-50"
                    >
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
