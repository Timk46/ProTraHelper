-- CreateEnum
CREATE TYPE "userConceptEventType" AS ENUM ('LEVEL_CHANGE', 'EXPANDED', 'COLLAPSED', 'SELECTED');

-- CreateTable
CREATE TABLE "UserConceptEvent" (
    "id" SERIAL NOT NULL,
    "userConceptId" INTEGER NOT NULL,
    "eventType" "userConceptEventType" NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConceptEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserConceptEvent" ADD CONSTRAINT "UserConceptEvent_userConceptId_fkey" FOREIGN KEY ("userConceptId") REFERENCES "UserConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
