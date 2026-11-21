# Recipe App: intelligent personalized nutrition

A full-stack web application that turns the ingredients you already have into recipes,
plans a whole week of meals around your body data and diet, and answers nutrition
questions in a chat. It was built as my engineering diploma project at AGH University
of Krakow (_"Intelligent application for personalized nutrition: from recipe analysis
to diet recommendations"_).

## Features

- **Accounts and profile.** Sign up, log in, edit your profile (age, weight, height, activity level, diet), change e-mail or password, and delete the account.
- **Recipes from your ingredients.** Enter what you have at home, plus optional limits such as cooking time, diet or budget. The app returns several recipes with ingredients, steps, cooking time, estimated cost and nutrition (calories, protein, fat, carbohydrates).
- **Personal recipe collection.** Save, browse and delete recipes, or share them.
- **Weekly meal planner.** Generates a seven-day plan from your profile and daily calorie and macro targets, shows one day at a time, lets you regenerate a single day, and keeps your active plan.
- **Shopping list.** Builds a shopping list from the plan and exports it to PDF.
- **Nutrition chatbot.** Ask about meals and planning. Conversations are saved as sessions that you can reopen, rename or delete.

## Tech stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend  | Next.js API route handlers (Node.js)                        |
| Database | PostgreSQL with Prisma 6 (schema and migrations)            |
| AI       | OpenAI Chat Completions API with JSON-mode output           |
| Auth     | JWT (1 day expiry), passwords hashed with bcrypt            |
| Extras   | jsPDF for the shopping-list export                          |

## Getting started

You need Node.js 20 or newer, a PostgreSQL database, and an OpenAI API key with credit on the account.

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install

cp .env.example .env          # then fill in the values below
npx prisma migrate deploy     # creates the tables
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable         | Description                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`   | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/recipe_app`                                |
| `JWT_SECRET`     | Long random string for signing login tokens (required, there is no default). Generate one with `openssl rand -base64 32` |
| `OPENAI_API_KEY` | Used for recipes, the meal planner and the chat. Without credit on the OpenAI account these features return an error     |

### Quick local database

```bash
docker run -d --name recipe-db -e POSTGRES_PASSWORD=recipe -e POSTGRES_DB=recipe_app -p 5432:5432 postgres:16
# DATABASE_URL="postgresql://postgres:recipe@localhost:5432/recipe_app"
```

### Scripts

| Command                           | What it does                       |
| --------------------------------- | ---------------------------------- |
| `npm run dev`                     | Start the development server       |
| `npm run build` / `npm run start` | Production build and server        |
| `npx prisma studio`               | Browse the database in the browser |
| `npx prisma migrate deploy`       | Apply all migrations               |

## Project structure

```
app/
  api/
    login/  register/            Authentication
    recipes/                     AI recipe generation
    saveRecipe/                  Save a recipe for the user
    meal-planner/                AI weekly plan (+ /current for the active plan)
    chat/                        Chatbot (+ /sessions and /session for history)
    user/                        Profile, e-mail, password, account deletion
  components/                    Navbar, RecipeCard, IngredientList
  meal-planner/                  Planner page, shopping-list helpers, PDF export
  chat/  myrecipes/  account/  login/  signup/  share/   Pages
lib/jwt.ts                       Shared JWT secret helper
prisma/                          Schema and SQL migrations
```

## Data model

`User` owns many `Recipe`, `MealPlan`, `ChatSession` (each with many `ChatMessage`) and
`ChatHistory` rows, plus one `CurrentMealPlan`. Deleting a user also deletes all of their data.

## How the AI part works

The backend builds a prompt from the user's input and profile, calls the OpenAI API with
JSON output enforced, then validates and normalizes the response before it reaches the UI.
Pantry basics such as salt, oil and pepper are not asked from the user, and recipe cost is
estimated by price tiers because real prices differ by location.

## Known limitations

- AI-generated recipes and nutrition values are estimates and can contain mistakes. They are not medical or dietary advice.
- The recipe and meal-planner endpoints do not require login yet, so anyone who can reach the server can spend your OpenAI credit. Add authentication and rate limiting before deploying publicly.
- The login token is kept in `localStorage`, which is simple but exposed to XSS. An httpOnly cookie would be safer.
- There are no automated tests yet. The app was tested manually.

## Possible next steps

Automated tests (API routes with Vitest, end-to-end with Playwright), rate limiting, a shared Prisma client, and a configurable AI model or provider.
