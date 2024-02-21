-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'practise';
