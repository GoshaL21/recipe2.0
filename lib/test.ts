// lib/test.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Creating test user ---");
  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      password: "123456",
      name: "Heorhii",
      surname: "Lutsiv",
      age: 25,
      weight: 70,
      height: 175,
      activityLevel: "medium",
      diet: "keto",
    },
  });
  console.log("Created user:", user);

  console.log("--- Creating test recipe ---");
  const recipe = await prisma.recipe.create({
    data: {
      name: "Sample Meal",
      userId: user.id,
      ingredients: { items: ["egg", "tomato", "cheese"] },
      instructions: "Cook eggs, add tomato and cheese.",
      cookingTime: "15 min",
      cost: 5.0,
      nutrition: { calories: 300, protein: 20, fat: 15, carbs: 10 },
    },
  });
  console.log("Created recipe:", recipe);

  console.log("--- Creating test meal plan ---");
  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: user.id,
      meals: { recipeIds: [recipe.id] },
    },
  });
  console.log("Created meal plan:", mealPlan);

  console.log("--- Creating test chat history ---");
  const chat = await prisma.chatHistory.create({
    data: {
      userId: user.id,
      message: "How many calories in this meal?",
      response: "This meal has 300 calories.",
    },
  });
  console.log("Created chat history:", chat);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
