-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "contentElementType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'CODE', 'PDF');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'STUDENT',
    "currentconceptNodeId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleConceptGoal" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "conceptNodeId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "ModuleConceptGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptGraph" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rootId" INTEGER,

    CONSTRAINT "ConceptGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptNode" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conceptGraphId" INTEGER,

    CONSTRAINT "ConceptNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptFamily" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,

    CONSTRAINT "ConceptFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptEdge" (
    "id" SERIAL NOT NULL,
    "prerequisiteId" INTEGER NOT NULL,
    "successorId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,

    CONSTRAINT "ConceptEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentNode" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ContentNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEdge" (
    "id" SERIAL NOT NULL,
    "prerequisiteId" INTEGER NOT NULL,
    "successorId" INTEGER NOT NULL,

    CONSTRAINT "ContentEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" SERIAL NOT NULL,
    "contentNodeId" INTEGER NOT NULL,
    "conceptNodeId" INTEGER NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" SERIAL NOT NULL,
    "contentNodeId" INTEGER NOT NULL,
    "conceptNodeId" INTEGER NOT NULL,
    "awards" INTEGER,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConcept" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conceptNodeId" INTEGER NOT NULL,
    "level" INTEGER,
    "expanded" BOOLEAN NOT NULL,

    CONSTRAINT "UserConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentElement" (
    "id" SERIAL NOT NULL,
    "type" "contentElementType" NOT NULL,
    "title" TEXT,
    "text" TEXT,
    "fileId" INTEGER,
    "questionId" INTEGER,

    CONSTRAINT "ContentElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "uniqueIdentifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" INTEGER,
    "mCAnswerId" INTEGER,
    "contentElementId" INTEGER,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentView" (
    "id" SERIAL NOT NULL,
    "contentNodeId" INTEGER NOT NULL,
    "contentElementId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ContentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "score" DOUBLE PRECISION,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'practise',
    "authorId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "originId" INTEGER,
    "contentElementId" INTEGER,
    "conceptNodeId" INTEGER,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionVersion" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" INTEGER NOT NULL,
    "successorId" INTEGER,
    "version" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCQuestion" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionVersionId" INTEGER,
    "questionId" INTEGER NOT NULL,
    "shuffleoptions" BOOLEAN NOT NULL DEFAULT true,
    "isSC" BOOLEAN NOT NULL,

    CONSTRAINT "MCQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCOption" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "MCOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCQuestionOption" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mcQuestionId" INTEGER NOT NULL,
    "mcOptionId" INTEGER NOT NULL,

    CONSTRAINT "MCQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMCAnswer" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "mcQuestionId" INTEGER NOT NULL,
    "isCorrectAnswer" BOOLEAN,

    CONSTRAINT "UserMCAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "userFreetextAnswer" TEXT,

    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMCOptionSelected" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "mcOptionId" INTEGER NOT NULL,

    CONSTRAINT "UserMCOptionSelected_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeTextQuestion" (
    "id" SERIAL NOT NULL,
    "textHTML" TEXT,
    "expectations" TEXT NOT NULL,
    "expectationsHTML" TEXT,
    "exampleSolution" TEXT,
    "exampleSolutionHTML" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "FreeTextQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingQuestion" (
    "id" SERIAL NOT NULL,
    "count_InputArgs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "textHTML" TEXT NOT NULL,
    "mainFileName" TEXT NOT NULL,
    "programmingLanguage" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "CodingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGeruest" (
    "id" SERIAL NOT NULL,
    "codingQuestionId" INTEGER NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT,

    CONSTRAINT "CodeGeruest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedTest" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "testFileName" TEXT,
    "language" TEXT,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "AutomatedTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testcase" (
    "id" SERIAL NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "automatedTestId" INTEGER NOT NULL,

    CONSTRAINT "Testcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSubmission" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compilerOutput" TEXT,
    "compilerError" TEXT,
    "compilerResponse" TEXT,
    "userId" INTEGER NOT NULL,
    "codingQuestionId" INTEGER NOT NULL,

    CONSTRAINT "CodeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSubmissionFile" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    "code" TEXT,
    "language" TEXT,
    "codeFileName" TEXT,
    "userId" INTEGER NOT NULL,
    "CodeSubmissionId" INTEGER NOT NULL,

    CONSTRAINT "CodeSubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KIFeedback" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ratingByStudent" INTEGER,
    "feedbackByStudent" TEXT,
    "submissionId" INTEGER NOT NULL,
    "flavor" TEXT NOT NULL DEFAULT 'normal',

    CONSTRAINT "KIFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymousUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "anonymousName" TEXT NOT NULL DEFAULT 'Anonymchen',

    CONSTRAINT "anonymousUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentNodeId" INTEGER,
    "conceptNodeId" INTEGER NOT NULL,
    "contentElementId" INTEGER,
    "authorId" INTEGER NOT NULL,
    "isSolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" INTEGER NOT NULL,
    "isInitiator" BOOLEAN NOT NULL DEFAULT false,
    "isSolution" BOOLEAN NOT NULL DEFAULT false,
    "discussionId" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "isUpvote" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "messageId" INTEGER NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatBotMessage" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "usedChunks" TEXT,
    "userId" INTEGER,

    CONSTRAINT "ChatBotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContentElementProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contentElementId" INTEGER NOT NULL,
    "markedAsDone" BOOLEAN NOT NULL DEFAULT false,
    "markedAsQuestion" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContentElementProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContentView" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contentNodeId" INTEGER NOT NULL,
    "lastOpened" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ModuleToSubject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ModuleToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "Module"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptGraph_rootId_key" ON "ConceptGraph"("rootId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentElement_fileId_key" ON "ContentElement"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentElement_questionId_key" ON "ContentElement"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "File_uniqueIdentifier_key" ON "File"("uniqueIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "CodingQuestion_questionId_key" ON "CodingQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Discussion_authorId_key" ON "Discussion"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_messageId_key" ON "Vote"("userId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "_ModuleToSubject_AB_unique" ON "_ModuleToSubject"("A", "B");

-- CreateIndex
CREATE INDEX "_ModuleToSubject_B_index" ON "_ModuleToSubject"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ModuleToUser_AB_unique" ON "_ModuleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ModuleToUser_B_index" ON "_ModuleToUser"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentconceptNodeId_fkey" FOREIGN KEY ("currentconceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleConceptGoal" ADD CONSTRAINT "ModuleConceptGoal_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleConceptGoal" ADD CONSTRAINT "ModuleConceptGoal_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptGraph" ADD CONSTRAINT "ConceptGraph_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptFamily" ADD CONSTRAINT "ConceptFamily_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptFamily" ADD CONSTRAINT "ConceptFamily_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEdge" ADD CONSTRAINT "ContentEdge_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEdge" ADD CONSTRAINT "ContentEdge_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConcept" ADD CONSTRAINT "UserConcept_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConcept" ADD CONSTRAINT "UserConcept_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentElement" ADD CONSTRAINT "ContentElement_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentElement" ADD CONSTRAINT "ContentElement_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_mCAnswerId_fkey" FOREIGN KEY ("mCAnswerId") REFERENCES "MCOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentView" ADD CONSTRAINT "ContentView_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentView" ADD CONSTRAINT "ContentView_contentElementId_fkey" FOREIGN KEY ("contentElementId") REFERENCES "ContentElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestion" ADD CONSTRAINT "MCQuestion_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "QuestionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestion" ADD CONSTRAINT "MCQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestionOption" ADD CONSTRAINT "MCQuestionOption_mcQuestionId_fkey" FOREIGN KEY ("mcQuestionId") REFERENCES "MCQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestionOption" ADD CONSTRAINT "MCQuestionOption_mcOptionId_fkey" FOREIGN KEY ("mcOptionId") REFERENCES "MCOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCAnswer" ADD CONSTRAINT "UserMCAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCAnswer" ADD CONSTRAINT "UserMCAnswer_mcQuestionId_fkey" FOREIGN KEY ("mcQuestionId") REFERENCES "MCQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCOptionSelected" ADD CONSTRAINT "UserMCOptionSelected_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCOptionSelected" ADD CONSTRAINT "UserMCOptionSelected_mcOptionId_fkey" FOREIGN KEY ("mcOptionId") REFERENCES "MCOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTextQuestion" ADD CONSTRAINT "FreeTextQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingQuestion" ADD CONSTRAINT "CodingQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGeruest" ADD CONSTRAINT "CodeGeruest_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedTest" ADD CONSTRAINT "AutomatedTest_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testcase" ADD CONSTRAINT "Testcase_automatedTestId_fkey" FOREIGN KEY ("automatedTestId") REFERENCES "AutomatedTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmissionFile" ADD CONSTRAINT "CodeSubmissionFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmissionFile" ADD CONSTRAINT "CodeSubmissionFile_CodeSubmissionId_fkey" FOREIGN KEY ("CodeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KIFeedback" ADD CONSTRAINT "KIFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymousUser" ADD CONSTRAINT "anonymousUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_contentElementId_fkey" FOREIGN KEY ("contentElementId") REFERENCES "ContentElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "anonymousUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "anonymousUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBotMessage" ADD CONSTRAINT "ChatBotMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentElementProgress" ADD CONSTRAINT "UserContentElementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentElementProgress" ADD CONSTRAINT "UserContentElementProgress_contentElementId_fkey" FOREIGN KEY ("contentElementId") REFERENCES "ContentElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentView" ADD CONSTRAINT "UserContentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentView" ADD CONSTRAINT "UserContentView_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleToSubject" ADD CONSTRAINT "_ModuleToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleToSubject" ADD CONSTRAINT "_ModuleToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleToUser" ADD CONSTRAINT "_ModuleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleToUser" ADD CONSTRAINT "_ModuleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
