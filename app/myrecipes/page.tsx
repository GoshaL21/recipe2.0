"use client";

import React, { useState, useEffect } from "react";
import { Clock, DollarSign, ChefHat, X } from "lucide-react";
import Navbar from "../components/Navbar";
// Simple Toast component
const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ${
      type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
    }`}
  >
    <div className="flex items-center gap-3">
      <span>{message}</span>
      <button onClick={onClose} className="opacity-80 hover:opacity-100">
        ✕
      </button>
    </div>
  </div>
);

// Decode JWT userId without external libs
const getUserIdFromToken = (): number | null => {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    const uid = payload?.userId;
    return typeof uid === "number" ? uid : null;
  } catch {
    return null;
  }
};

// Helper to get JWT auth headers
const getAuthHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Confirmation Modal component
const ConfirmModal = ({ open, title, description, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className="p-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const MyRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Redirect to login if not authenticated and set user id
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setCurrentUserId(getUserIdFromToken());
  }, []);

  const handleShare = async (recipe) => {
    try {
      const base = window.location.origin;
      const data = encodeURIComponent(
        JSON.stringify({
          name: recipe.name,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          cookingTime: recipe.cookingTime,
          cost: recipe.cost,
          nutrition: recipe.nutrition,
        }),
      );
      const url = `${base}/share?data=${data}`;
      await navigator.clipboard.writeText(url);
      setToast({ message: "Share link copied to clipboard", type: "success" });
    } catch (e) {
      console.error("Share failed", e);
      setToast({ message: "Could not copy share link", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    setConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    const id = confirm.id;
    if (!id) return;
    try {
      let res = await fetch(`/api/user/recipes?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
      });
      // Fallback to legacy route if the user-scoped route isn't available
      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/recipes?id=${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
        });
      }
      if (!res.ok) {
        let msg = "Failed to delete";
        try {
          msg = (await res.json())?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      setToast({ message: "Recipe deleted", type: "success" });
    } catch (e) {
      console.error("Delete failed", e);
      setToast({
        message: e?.message || "Failed to delete the recipe",
        type: "error",
      });
    } finally {
      setConfirm({ open: false, id: null });
    }
  };

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        let response = await fetch("/api/user/recipes", {
          method: "GET",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
        });
        if (response.status === 404 || response.status === 405) {
          // Fallback to legacy all-recipes route
          response = await fetch("/api/recipes", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            credentials: "include",
          });
        }
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to fetch recipes");
        }
        const data = await response.json();
        const uid = currentUserId ?? getUserIdFromToken();
        const mine =
          Array.isArray(data) && uid != null
            ? data.filter((r) => r.userId === uid)
            : Array.isArray(data)
              ? data
              : [];
        setRecipes(mine);
      } catch (error) {
        console.error("Error fetching recipes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [currentUserId]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to normalize ingredients to an array of objects with a 'name' property
  const getIngredientList = (ingredients) => {
    if (Array.isArray(ingredients)) {
      // If already array of objects (with name property)
      if (
        ingredients.length > 0 &&
        typeof ingredients[0] === "object" &&
        "name" in ingredients[0]
      ) {
        return ingredients;
      }
      // If array of strings
      return ingredients.map((name) => ({ name }));
    } else if (
      ingredients &&
      (ingredients.provided || ingredients.additional)
    ) {
      // Flatten provided and additional arrays (from AI format)
      return [
        ...(ingredients.provided?.map((name) => ({ name })) || []),
        ...(ingredients.additional?.map((name) => ({ name })) || []),
      ];
    }
    return [];
  };

  const RecipeCard = ({ recipe }) => {
    const ingredientList = getIngredientList(recipe.ingredients);
    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start mb-4">
          <h3
            className="text-xl font-semibold text-gray-800 hover:text-blue-600 cursor-pointer"
            onClick={() => setSelectedRecipe(recipe)}
          >
            {recipe.name}
          </h3>
          <span className="text-sm text-gray-500">
            {formatDate(recipe.createdAt)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
            <div className="text-sm font-medium text-gray-700">
              {recipe.cookingTime}
            </div>
          </div>
          <div className="text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-gray-500" />
            <div className="text-sm font-medium text-gray-700">
              ${recipe.cost.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <ChefHat className="w-5 h-5 mx-auto mb-1 text-gray-500" />
            <div className="text-sm font-medium text-gray-700">
              {recipe.nutrition.calories} cal
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-3">
          <button
            onClick={() => handleShare(recipe)}
            className="flex-1 border border-blue-600 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Share
          </button>
          <button
            onClick={() => handleDelete(recipe.id)}
            className="flex-1 border border-red-600 text-red-600 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Ingredients ({ingredientList.length})
          </h4>
          <div className="text-sm text-gray-600">
            {ingredientList.slice(0, 3).map((ingredient, index) => (
              <span key={index}>
                {ingredient.name}
                {index < 2 && index < ingredientList.length - 1 ? ", " : ""}
              </span>
            ))}
            {ingredientList.length > 3 && (
              <span className="text-blue-600">
                {" "}
                +{ingredientList.length - 3} more
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setSelectedRecipe(recipe)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Full Recipe
        </button>
      </div>
    );
  };

  const RecipeModal = ({ recipe, onClose }) => {
    const ingredientList = getIngredientList(recipe.ingredients);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {recipe.name}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Created on {formatDate(recipe.createdAt)}
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                <div className="text-sm font-medium">Cooking Time</div>
                <div className="text-lg font-bold text-gray-900">
                  {recipe.cookingTime}
                </div>
              </div>
              <div className="text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                <div className="text-sm font-medium">Cost</div>
                <div className="text-lg font-bold text-gray-900">
                  ${recipe.cost.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Calories</div>
                <div className="text-lg font-bold text-gray-900">
                  {recipe.nutrition.calories}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Protein</div>
                <div className="text-lg font-bold text-gray-900">
                  {recipe.nutrition.protein}g
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-green-800">
                Nutrition Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-green-600">Calories:</span>
                  <div className="font-medium">{recipe.nutrition.calories}</div>
                </div>
                <div>
                  <span className="text-sm text-green-600">Protein:</span>
                  <div className="font-medium">{recipe.nutrition.protein}g</div>
                </div>
                <div>
                  <span className="text-sm text-green-600">Fat:</span>
                  <div className="font-medium">{recipe.nutrition.fat}g</div>
                </div>
                <div>
                  <span className="text-sm text-green-600">Carbs:</span>
                  <div className="font-medium">{recipe.nutrition.carbs}g</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
                <ul className="space-y-3">
                  {ingredientList.map((ingredient, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <span className="font-medium">{ingredient.name}</span>
                      <span className="text-gray-600 text-sm">
                        {ingredient.amount || ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Instructions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {recipe.instructions}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your recipes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Navbar />

        <div className="mb-8">
          <h1 className="text-3xl mt-5 font-bold text-gray-900">My Recipes</h1>
          <p className="text-gray-600 mt-2">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} saved
          </p>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No recipes yet
            </h3>
            <p className="text-gray-500">
              Start by creating your first recipe!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {selectedRecipe && (
          <RecipeModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
          />
        )}

        <ConfirmModal
          open={confirm.open}
          title="Delete this recipe?"
          description="This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setConfirm({ open: false, id: null })}
        />
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default MyRecipes;
