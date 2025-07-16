/*
  Warnings:

  - You are about to drop the `UploadQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserUploadAnswer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UploadQuestion" DROP CONSTRAINT "UploadQuestion_questionId_fkey";

-- DropForeignKey
ALTER TABLE "UserUploadAnswer" DROP CONSTRAINT "UserUploadAnswer_fileId_fkey";

-- DropForeignKey
ALTER TABLE "UserUploadAnswer" DROP CONSTRAINT "UserUploadAnswer_userAnswerId_fkey";

-- DropTable
DROP TABLE "UploadQuestion";

-- DropTable
DROP TABLE "UserUploadAnswer";
