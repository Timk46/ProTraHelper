-- CreateTable
CREATE TABLE "QuestionCollection" (
    "id" SERIAL NOT NULL,
    "textHTML" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCollectionLink" (
    "id" SERIAL NOT NULL,
    "questionCollectionId" INTEGER NOT NULL,
    "linkedContentElementId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCollectionLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCollection_questionId_key" ON "QuestionCollection"("questionId");

-- AddForeignKey
ALTER TABLE "QuestionCollection" ADD CONSTRAINT "QuestionCollection_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCollectionLink" ADD CONSTRAINT "QuestionCollectionLink_questionCollectionId_fkey" FOREIGN KEY ("questionCollectionId") REFERENCES "QuestionCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCollectionLink" ADD CONSTRAINT "QuestionCollectionLink_linkedContentElementId_fkey" FOREIGN KEY ("linkedContentElementId") REFERENCES "ContentElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
