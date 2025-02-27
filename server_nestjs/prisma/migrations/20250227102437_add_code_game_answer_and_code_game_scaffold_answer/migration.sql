-- CreateTable
CREATE TABLE "CodeGameAnswer" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codeGameQuestionId" INTEGER NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "compilerOutput" TEXT NOT NULL,

    CONSTRAINT "CodeGameAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGameScaffoldAnswer" (
    "id" SERIAL NOT NULL,
    "language" TEXT NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeGameAnswerId" INTEGER NOT NULL,

    CONSTRAINT "CodeGameScaffoldAnswer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CodeGameAnswer" ADD CONSTRAINT "CodeGameAnswer_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameScaffoldAnswer" ADD CONSTRAINT "CodeGameScaffoldAnswer_codeGameAnswerId_fkey" FOREIGN KEY ("codeGameAnswerId") REFERENCES "CodeGameAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
