'use client';

import React, { useState } from 'react';

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

type RecipeCardProps = {
    recipe: Recipe;
};

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
    const [showToast, setShowToast] = useState(false);

    const handleShare = () => {
        const url = `${window.location.origin}/share?data=${encodeURIComponent(JSON.stringify(recipe))}`;
        navigator.clipboard.writeText(url);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 relative flex flex-col h-full">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">{recipe.name}</h3>

            <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-700 mb-2">Ingredients:</h4>
                <div className="space-y-2">
                    <div>
                        <p className="text-sm font-medium text-purple-600 mb-1">From your kitchen:</p>
                        <ul className="list-disc list-inside text-gray-600">
                            {recipe.ingredients.provided.map((ingredient, index) => (
                                <li key={index}>{ingredient}</li>
                            ))}
                        </ul>
                    </div>
                    {recipe.ingredients.additional.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Additional ingredients needed:</p>
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
                <h4 className="text-lg font-medium text-gray-700 mb-2">Instructions:</h4>
                <p className="text-gray-600 whitespace-pre-line">{recipe.instructions}</p>
            </div>

            <div className="text-gray-500 text-sm mb-2">
                <span>Cooking time: {recipe.cookingTime}</span>
            </div>
            <div className="text-gray-700 text-sm mb-2">
                <span>Estimated cost: ${recipe.cost?.toFixed(2)}</span>
            </div>
            <div className="text-gray-700 text-xs mb-4">
                <span>
                    Nutrition: {recipe.nutrition?.calories} kcal, {recipe.nutrition?.protein}g protein, {recipe.nutrition?.fat}g fat, {recipe.nutrition?.carbs}g carbs
                </span>
            </div>

            <div className="mt-auto flex items-center justify-end gap-2">
                <button
                    onClick={handleShare}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                    Share
                </button>
                {showToast && (
                    <div className="bg-green-500 text-white px-3 py-1 rounded shadow text-sm z-10 ml-2">
                        Link copied!
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeCard;