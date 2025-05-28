'use client';

import React from 'react';

type Recipe = {
    name: string;
    ingredients: {
        provided: string[];
        additional: string[];
    };
    instructions: string;
    cookingTime: string;
}

type RecipeCardProps = {
    recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({recipe}) => {
    return (
        <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
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

            <div className="text-gray-500 text-sm">
                <span>Cooking time: {recipe.cookingTime}</span>
            </div>
        </div>
    );
};

export default RecipeCard; 