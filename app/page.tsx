'use client';

import React, {useState} from 'react';
import IngredientList from './components/IngredientList';
import RecipeCard from './components/RecipeCard';

type Recipe = {
    name: string;
    ingredients: {
        provided: string[];
        additional: string[];
    };
    instructions: string;
    cookingTime: string;
}

export default function Home() {
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [newIngredient, setNewIngredient] = useState('');
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cookingLevel, setCookingLevel] = useState<string>('intermediate');
    const [maxPrepTime, setMaxPrepTime] = useState<number>(60);

    const handleAddIngredient = (e: React.FormEvent) => {
        e.preventDefault();
        if (newIngredient.trim()) {
            setIngredients([...ingredients, newIngredient.trim()]);
            setNewIngredient('');
            // Clear previous results when adding new ingredients
            setRecipes([]);
            setError(null);
        }
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
        // Clear previous results when removing ingredients
        setRecipes([]);
        setError(null);
    };

    const handleFindRecipes = async () => {
        setIsLoading(true);
        setError(null);
        setRecipes([]);

        try {
            const response = await fetch('/api/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ingredients,
                    cookingLevel,
                    maxPrepTime
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recipes');
            }

            const data = await response.json();
            setRecipes(data.recipes);
        } catch (err) {
            setError('Failed to get recipe suggestions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-12">
            <div className="max-w-4xl mx-auto p-8">
                <h1 className="text-5xl font-bold text-center mb-4 text-gray-800 tracking-tight">
                    Recipe Finder
                </h1>
                <p className="text-center text-gray-600 mb-8 text-lg">
                    Add your available ingredients and discover delicious recipes!
                </p>

                <div className="bg-white rounded-xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl mb-8">
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
                                className="bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                Add
                            </button>
                        </div>
                    </form>

                    <IngredientList
                        ingredients={ingredients}
                        onRemoveIngredient={handleRemoveIngredient}
                    />

                    <div className="mt-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="cookingLevel" className="block text-sm font-medium text-gray-700 mb-2">
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
                                <label htmlFor="maxPrepTime" className="block text-sm font-medium text-gray-700 mb-2">
                                    Maximum Preparation Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    id="maxPrepTime"
                                    value={maxPrepTime}
                                    onChange={(e) => setMaxPrepTime(Math.max(0, parseInt(e.target.value)))}
                                    min="0"
                                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleFindRecipes}
                        disabled={isLoading}
                        className={`mt-8 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-8 py-4 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200 w-full font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                                     fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Finding Recipes...</span>
                            </>
                        ) : (
                            <>
                                <span>Find Recipes</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20"
                                     fill="currentColor">
                                    <path fillRule="evenodd"
                                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                          clipRule="evenodd"/>
                                </svg>
                            </>
                        )}
                    </button>
                </div>

                {isLoading && <p>Loading recipes...</p>}
                {error && <p className="text-red-500">{error}</p>}

                {recipes.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-3xl font-bold mb-4 text-gray-800 tracking-tight">
                            Recipes
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {recipes.map((recipe, index) => (
                                <RecipeCard key={index} recipe={recipe}/>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
} 