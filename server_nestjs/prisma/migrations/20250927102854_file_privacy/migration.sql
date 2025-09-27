-- CreateEnum
CREATE TYPE "filePrivacy" AS ENUM ('PRIVATE', 'PUBLIC', 'RESTRICTED');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "privacy" "filePrivacy" NOT NULL DEFAULT 'PRIVATE';
