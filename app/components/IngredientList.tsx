"use client";

import React from "react";

type IngredientListProps = {
  ingredients: string[];
  onRemoveIngredientAction: (index: number) => void;
};

export default function IngredientList({
  ingredients,
  onRemoveIngredientAction,
}: IngredientListProps) {
  if (ingredients.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-gray-500 mb-2">No ingredients added yet</div>
        <div className="text-sm text-gray-400">
          Start by adding some ingredients above!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Your Ingredients:
      </h2>
      <div className="max-h-48 overflow-y-auto pr-2">
        <ul className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <li
              key={index}
              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all duration-200 group"
            >
              <span className="text-gray-700 font-medium">{ingredient}</span>
              <button
                onClick={() => onRemoveIngredientAction(index)}
                className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-2 rounded-full hover:bg-red-50 group-hover:text-red-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
