/*
  Warnings:

  - You are about to drop the column `fileId` on the `UserUploadAnswer` table. All the data in the column will be lost.
  - Added the required column `fileUploadId` to the `UserUploadAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserUploadAnswer" DROP CONSTRAINT "UserUploadAnswer_fileId_fkey";

-- AlterTable
ALTER TABLE "UserUploadAnswer" DROP COLUMN "fileId",
ADD COLUMN     "fileUploadId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "UserUploadAnswer" ADD CONSTRAINT "UserUploadAnswer_fileUploadId_fkey" FOREIGN KEY ("fileUploadId") REFERENCES "FileUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
