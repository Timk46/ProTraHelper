-- CreateTable
CREATE TABLE "ModuleHighlightConcepts" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "conceptNodeId" INTEGER NOT NULL,
    "alias" TEXT,
    "description" TEXT,
    "pictureData" TEXT,
    "position" INTEGER,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ModuleHighlightConcepts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleHighlightConcepts_moduleId_conceptNodeId_key" ON "ModuleHighlightConcepts"("moduleId", "conceptNodeId");

-- AddForeignKey
ALTER TABLE "ModuleHighlightConcepts" ADD CONSTRAINT "ModuleHighlightConcepts_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleHighlightConcepts" ADD CONSTRAINT "ModuleHighlightConcepts_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
