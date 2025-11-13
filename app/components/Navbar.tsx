"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    router.push("/");
  };

  if (isLoading) {
    // Render a placeholder to avoid flicker
    return (
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/")}
                className="text-xl font-bold text-purple-600"
                aria-label="Go to home"
              >
                RecipeFinder
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-8 bg-gray-200 rounded-md animate-pulse"></div>
              <div className="w-20 h-8 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Changed from span to button for clickable logo */}
            <button
              onClick={() => router.push("/")}
              className="text-xl font-bold text-purple-600"
              aria-label="Go to home"
            >
              RecipeFinder
            </button>
          </div>
          <div className="flex items-center space-x-4">
            {token ? (
              <>
                <button
                  onClick={() => router.push("/meal-planner")}
                  className="px-4 py-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors duration-200 font-medium"
                >
                  Meal Planner
                </button>
                <button
                  onClick={() => router.push("/myrecipes")}
                  className="px-4 py-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors duration-200 font-medium"
                >
                  My Recipes
                </button>
                <button
                  onClick={() => router.push("/account")}
                  className="px-4 py-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors duration-200 font-medium"
                >
                  My Account
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 font-medium shadow-sm"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors duration-200 font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={() => router.push("/signup")}
                  className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200 font-medium shadow-sm"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
