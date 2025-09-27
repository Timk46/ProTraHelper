-- DropForeignKey
ALTER TABLE "evaluation_submissions" DROP CONSTRAINT "evaluation_submissions_pdfFileId_fkey";

-- AddForeignKey
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "FileUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
