-- AlterTable
ALTER TABLE "ConceptNode" ADD COLUMN     "rhinoFileId" INTEGER;

-- AddForeignKey
ALTER TABLE "ConceptNode" ADD CONSTRAINT "ConceptNode_rhinoFileId_fkey" FOREIGN KEY ("rhinoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
