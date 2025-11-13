-- CreateTable
CREATE TABLE "CurrentMealPlan" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "plan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentMealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrentMealPlan_userId_key" ON "CurrentMealPlan"("userId");

-- AddForeignKey
ALTER TABLE "CurrentMealPlan" ADD CONSTRAINT "CurrentMealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
