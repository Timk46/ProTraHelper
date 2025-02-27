/*
  Warnings:

  - A unique constraint covering the columns `[userAnswerId]` on the table `CodeGameAnswer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CodeGameAnswer_userAnswerId_key" ON "CodeGameAnswer"("userAnswerId");
