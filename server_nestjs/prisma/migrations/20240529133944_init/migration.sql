-- CreateTable
CREATE TABLE "UmlEditorModel" (
    "id" SERIAL NOT NULL,
    "model" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "UmlEditorModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmlEditorElement" (
    "id" SERIAL NOT NULL,
    "element" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "editorModelId" INTEGER NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "UmlEditorElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmlQuestion" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "editorData" JSONB,
    "dataImage" TEXT,
    "taskSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UmlQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUmlQuestionAnswer" (
    "id" SERIAL NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "attemptData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUmlQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UmlEditorModel_model_key" ON "UmlEditorModel"("model");

-- CreateIndex
CREATE UNIQUE INDEX "UmlEditorElement_element_key" ON "UmlEditorElement"("element");

-- AddForeignKey
ALTER TABLE "UmlEditorElement" ADD CONSTRAINT "UmlEditorElement_editorModelId_fkey" FOREIGN KEY ("editorModelId") REFERENCES "UmlEditorModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUmlQuestionAnswer" ADD CONSTRAINT "UserUmlQuestionAnswer_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
