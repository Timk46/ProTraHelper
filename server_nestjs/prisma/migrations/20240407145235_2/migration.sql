/*
  Warnings:

  - You are about to drop the `Transcript` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Transcript";

-- CreateTable
CREATE TABLE "TranscriptEmbedding" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vector" vector,
    "fileId" INTEGER,

    CONSTRAINT "TranscriptEmbedding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TranscriptEmbedding" ADD CONSTRAINT "TranscriptEmbedding_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
