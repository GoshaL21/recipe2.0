"use client";

import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, ChefHat, X } from 'lucide-react';
import Navbar from '../components/NavBar';

const MyRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }

        const data = await response.json();
        setRecipes(data);
      } catch (error) {
        console.error('Error fetching recipes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const RecipeCard = ({ recipe }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3
          className="text-xl font-semibold text-gray-800 hover:text-blue-600 cursor-pointer"
          onClick={() => setSelectedRecipe(recipe)}
        >
          {recipe.name}
        </h3>
        <span className="text-sm text-gray-500">{formatDate(recipe.createdAt)}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
          <div className="text-sm font-medium text-gray-700">{recipe.cookingTime}</div>
        </div>
        <div className="text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-gray-500" />
          <div className="text-sm font-medium text-gray-700">${recipe.cost.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <ChefHat className="w-5 h-5 mx-auto mb-1 text-gray-500" />
          <div className="text-sm font-medium text-gray-700">{recipe.nutrition.calories} cal</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Ingredients ({recipe.ingredients.length})</h4>
        <div className="text-sm text-gray-600">
          {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
            <span key={index}>
              {ingredient.name}
              {index < 2 && index < recipe.ingredients.length - 1 ? ', ' : ''}
            </span>
          ))}
          {recipe.ingredients.length > 3 && (
            <span className="text-blue-600"> +{recipe.ingredients.length - 3} more</span>
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

  const RecipeModal = ({ recipe, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{recipe.name}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">Created on {formatDate(recipe.createdAt)}</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
              <div className="text-sm font-medium">Cooking Time</div>
              <div className="text-lg font-bold text-gray-900">{recipe.cookingTime}</div>
            </div>
            <div className="text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-gray-500" />
              <div className="text-sm font-medium">Cost</div>
              <div className="text-lg font-bold text-gray-900">${recipe.cost.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Calories</div>
              <div className="text-lg font-bold text-gray-900">{recipe.nutrition.calories}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Protein</div>
              <div className="text-lg font-bold text-gray-900">{recipe.nutrition.protein}g</div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-800">Nutrition Information</h3>
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
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{ingredient.name}</span>
                    <span className="text-gray-600 text-sm">{ingredient.amount}</span>
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
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} saved
          </p>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes yet</h3>
            <p className="text-gray-500">Start by creating your first recipe!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {selectedRecipe && (
          <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
        )}
      </div>
    </div>
  );
};

export default MyRecipes;
