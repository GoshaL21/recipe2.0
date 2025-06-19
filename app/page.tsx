'use client';

import React, {useState} from 'react';
import IngredientList from './components/IngredientList';
import RecipeCard from './components/RecipeCard';
import { useRouter } from 'next/navigation';

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

// Basic list of common food ingredients
const COMMON_INGREDIENTS = [
    "egg", "cheese", "milk", "chicken", "beef", "rice", "tomato", "onion", "garlic", "potato", "carrot",
    "pepper", "salt", "oil", "butter", "flour", "sugar", "bread", "pasta", "beans", "lettuce", "spinach",
    "fish", "apple", "banana", "lemon", "lime", "yogurt", "cream", "mushroom", "corn", "peas", "broccoli",
    "cucumber", "zucchini", "avocado", "bacon", "ham", "turkey", "shrimp", "salmon", "tuna",
    "cabbage", "celery", "chili", "ginger", "cilantro", "basil", "oregano", "parsley", "thyme", "rosemary",
    "cinnamon", "nutmeg", "paprika", "cumin", "coriander", "mustard", "soy sauce", "vinegar", "honey", "ketchup",
    "mayonnaise", "peanut butter", "jam", "chocolate", "nuts", "almonds", "walnuts", "cashews", "oats", "quinoa",
    "barley", "lentils", "coconut", "raisins", "vanilla", "maple syrup", "cream cheese", "mozzarella", "parmesan"
];

function isValidIngredient(ingredient: string) {
    return COMMON_INGREDIENTS.some(food =>
        ingredient.toLowerCase().includes(food)
    );
}

export default function Home() {
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [newIngredient, setNewIngredient] = useState('');
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cookingLevel, setCookingLevel] = useState<string>('intermediate');
    const [maxPrepTime, setMaxPrepTime] = useState<number>(60);
    const [maxBudget, setMaxBudget] = useState<number>(50);

    const handleAddIngredient = (e: React.FormEvent) => {
        e.preventDefault();
        if (newIngredient.trim()) {
            setIngredients([...ingredients, newIngredient.trim()]);
            setNewIngredient('');
            setRecipes([]);
            setError(null);
        }
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
        setRecipes([]);
        setError(null);
    }

    const router = useRouter();

    const handleFindRecipes = async () => {
        setIsLoading(true);
        setError(null);
        setRecipes([]);

        // Validate all ingredients
        const invalids = ingredients.filter(i => !isValidIngredient(i));
        if (invalids.length > 0) {
            setIsLoading(false);
            setError(`Invalid ingredient(s): ${invalids.join(", ")}. Please enter only real food ingredients.`);
            return;
        }

        try {
            const response = await fetch('/api/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ingredients,
                    cookingLevel,
                    maxPrepTime,
                    maxBudget
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
            {/* Navigation Bar */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold text-purple-600">RecipeFinder</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/login')}
                                className="px-4 py-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors duration-200 font-medium"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => router.push('/signup')}
                                className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200 font-medium shadow-sm"
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                        Discover Delicious Recipes
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Transform your ingredients into culinary masterpieces with our AI-powered recipe suggestions.
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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </form>

                        <IngredientList
                            ingredients={ingredients}
                            onRemoveIngredient={handleRemoveIngredient}
                        />

                        <div className="mt-8 space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800">Recipe Preferences</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                        Max Prep Time (min)
                                    </label>
                                    <input
                                        type="number"
                                        id="maxPrepTime"
                                        value={Number.isNaN(maxPrepTime) ? '' : maxPrepTime}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setMaxPrepTime(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                                        }}
                                        min=""
                                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="maxBudget" className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Budget ($)
                                    </label>
                                    <input
                                        type="number"
                                        id="maxBudget"
                                        value={Number.isNaN(maxBudget) ? '' : maxBudget}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setMaxBudget(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20"
                                         fill="currentColor">
                                        <path fillRule="evenodd"
                                              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                              clipRule="evenodd"/>
                                    </svg>
                                    <span>Find Recipes</span>
                                </>
                            )}
                        </button>
                    </div>

                    {isLoading && (
                        <div className="text-center py-8">
                            <p className="text-gray-600">Searching our database for perfect recipes...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {recipes.length > 0 && (
                    <div className="max-w-7xl mx-auto mt-12">
                        <h2 className="text-3xl font-bold mb-8 text-gray-800 tracking-tight text-center">
                            Recommended Recipes
                        </h2>
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {recipes
                                .filter(recipe => recipe.cost <= maxBudget)
                                .map((recipe, index) => (
                                    <RecipeCard key={index} recipe={recipe}/>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} RecipeFinder. All rights reserved.
                    </p>
                </div>
            </footer>
        </main>
    );
}