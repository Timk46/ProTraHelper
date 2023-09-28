/*
  Warnings:

  - A unique constraint covering the columns `[authorId]` on the table `Discussion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Discussion_authorId_key` ON `Discussion`(`authorId`);
