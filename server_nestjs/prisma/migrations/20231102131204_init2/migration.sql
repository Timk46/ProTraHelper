/*
  Warnings:

  - A unique constraint covering the columns `[authorId,messageId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Vote_authorId_messageId_key` ON `Vote`(`authorId`, `messageId`);
