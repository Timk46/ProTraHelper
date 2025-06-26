CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN', 'ARCHSTUDENT');

-- CreateEnum
CREATE TYPE "SubjectRole" AS ENUM ('STUDENT', 'TEACHERASSIST', 'TEACHER');

-- CreateEnum
CREATE TYPE "contentElementType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'CODE', 'PDF', 'QUESTION');

-- CreateEnum
CREATE TYPE "userConceptEventType" AS ENUM ('LEVEL_CHANGE', 'EXPANDED', 'COLLAPSED', 'SELECTED');

-- CreateEnum
CREATE TYPE "questionType" AS ENUM ('SC', 'MC', 'FreeText', 'Fillin', 'CodingQuestion', 'GraphQuestion', 'UMLQuestion');

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
    "hasAcceptedPrivacyPolicy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "UserSubject" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "subjectSpecificRole" TEXT NOT NULL,
    "registeredForSL" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSubject_pkey" PRIMARY KEY ("id")
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
    "transcript" TEXT,

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
    "position" INTEGER,

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
CREATE TABLE "UserConceptEvent" (
    "id" SERIAL NOT NULL,
    "userConceptId" INTEGER NOT NULL,
    "eventType" "userConceptEventType" NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConceptEvent_pkey" PRIMARY KEY ("id")
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
    "position" INTEGER,

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
    "textHTML" TEXT,
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
    "userGraphAnswer" JSONB,

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
CREATE TABLE "GraphQuestion" (
    "id" SERIAL NOT NULL,
    "textHTML" TEXT,
    "expectations" TEXT NOT NULL,
    "expectationsHTML" TEXT,
    "type" TEXT NOT NULL,
    "initialStructure" JSONB NOT NULL,
    "exampleSolution" JSONB NOT NULL,
    "stepsEnabled" BOOLEAN NOT NULL,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "GraphQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphAIFeedback" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt" TEXT,
    "response" TEXT NOT NULL,
    "ratingByStudent" INTEGER,
    "userAnswerId" INTEGER NOT NULL,

    CONSTRAINT "GraphAIFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingQuestion" (
    "id" SERIAL NOT NULL,
    "count_InputArgs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "textHTML" TEXT NOT NULL,
    "mainFileName" TEXT NOT NULL,
    "programmingLanguage" TEXT NOT NULL,
    "expectations" TEXT,
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
CREATE TABLE "ModelSolution" (
    "id" SERIAL NOT NULL,
    "codingQuestionId" INTEGER NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT,

    CONSTRAINT "ModelSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedTest" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "testFileName" TEXT,
    "language" TEXT,
    "testClassName" TEXT,
    "runMethod" TEXT,
    "inputArguments" TEXT,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "AutomatedTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSubmission" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compilerOutput" TEXT,
    "unitTestResults" TEXT,
    "userId" INTEGER NOT NULL,
    "codingQuestionId" INTEGER NOT NULL,
    "score" INTEGER,

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
CREATE TABLE "CodeGameQuestion" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "programmingLanguage" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "codeSolutionRestriction" BOOLEAN NOT NULL DEFAULT false,
    "fileNameToRestrict" TEXT,
    "methodNameToRestrict" TEXT,
    "frequencyOfMethodNameToRestrict" INTEGER,
    "gameFileName" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "gameCellRestrictions" TEXT,
    "theme" TEXT DEFAULT 'dino',

    CONSTRAINT "CodeGameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGameScaffold" (
    "id" SERIAL NOT NULL,
    "codeGameQuestionId" INTEGER NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT,
    "visible" BOOLEAN,
    "mainFile" BOOLEAN,

    CONSTRAINT "CodeGameScaffold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGameAnswer" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codeGameQuestionId" INTEGER NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "codeGameExecutionResult" TEXT NOT NULL,
    "codeSolutionRestriction" BOOLEAN NOT NULL,
    "frequencyOfMethodEvaluationResult" BOOLEAN NOT NULL,
    "frequencyOfMethodCallsResult" INTEGER NOT NULL,
    "reachedDestination" BOOLEAN NOT NULL,
    "allItemsCollected" BOOLEAN NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "collectedItems" INTEGER NOT NULL,
    "visitedCellsAreAllowed" BOOLEAN NOT NULL,
    "allWhiteListCellsVisited" BOOLEAN NOT NULL,
    "executionSuccess" BOOLEAN,
    "executionMessage" TEXT,

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

-- CreateTable
CREATE TABLE "ModuleSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER NOT NULL,

    CONSTRAINT "ModuleSetting_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "FillinQuestion" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "table" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "FillinQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blank" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "blankContent" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "isDistractor" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "fillinQuestionId" INTEGER NOT NULL,

    CONSTRAINT "Blank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KIFeedback" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT NOT NULL,
    "additionalData" TEXT,
    "ratingByStudent" INTEGER,
    "feedbackByStudent" TEXT,
    "submissionId" INTEGER NOT NULL,
    "flavor" TEXT NOT NULL DEFAULT 'normal',

    CONSTRAINT "KIFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedFeedback" (
    "id" TEXT NOT NULL,
    "spsContent" TEXT NOT NULL,
    "kmContent" TEXT NOT NULL,
    "kcContent" TEXT NOT NULL,
    "khContent" TEXT NOT NULL,
    "spsUsedAt" TIMESTAMP(3),
    "kmUsedAt" TIMESTAMP(3),
    "kcUsedAt" TIMESTAMP(3),
    "khUsedAt" TIMESTAMP(3),
    "finalPrompt" TEXT NOT NULL,
    "codeSubmissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genTaskData" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "topic" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "taskPrompt" TEXT,
    "task" TEXT NOT NULL,
    "expectationPrompt" TEXT,
    "expectation" TEXT NOT NULL,
    "solutionPrompt" TEXT,
    "solutionOne" TEXT NOT NULL,
    "solutionTwo" TEXT,
    "solutionThree" TEXT,
    "unitTestPrompt" TEXT,
    "unitTestOne" TEXT NOT NULL,
    "unitTestTwo" TEXT,
    "unitTestThree" TEXT,
    "errorIteration" INTEGER NOT NULL,
    "isErrorAtEnd" BOOLEAN NOT NULL,
    "errorOne" TEXT,
    "errorTwo" TEXT,
    "errorThree" TEXT,
    "juryOne" JSONB,
    "juryTwo" JSONB,
    "juryThree" JSONB,
    "codeFramework" TEXT NOT NULL,
    "runMethod" TEXT,
    "runMethodInput" TEXT,
    "allTaskData" JSONB,
    "judgeTask" JSONB,

    CONSTRAINT "genTaskData_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "ChatSession" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatBotMessage" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "ratingByStudent" INTEGER,
    "usedChunks" TEXT,
    "contextUrl" TEXT DEFAULT '',
    "userId" INTEGER,
    "sessionId" INTEGER,

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
CREATE TABLE "EventLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" INTEGER,
    "data" JSONB,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptEmbedding" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vector" vector,
    "fileId" INTEGER,

    CONSTRAINT "TranscriptEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readTimestamp" TIMESTAMP(3),
    "type" TEXT NOT NULL,
    "discussionId" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

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
    "questionId" INTEGER NOT NULL,
    "title" TEXT,
    "text" TEXT,
    "textHTML" TEXT,
    "editorData" JSONB,
    "startData" JSONB,
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

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fileId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadQuestion" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "textHTML" TEXT,
    "maxSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUploadAnswer" (
    "id" SERIAL NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "fileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUploadAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ModuleToSubject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_userId_deviceId_key" ON "RefreshToken"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "Module"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubject_userId_subjectId_key" ON "UserSubject"("userId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptGraph_rootId_key" ON "ConceptGraph"("rootId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentElement_fileId_key" ON "ContentElement"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentElement_questionId_key" ON "ContentElement"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "File_uniqueIdentifier_key" ON "File"("uniqueIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "GraphQuestion_questionId_key" ON "GraphQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingQuestion_questionId_key" ON "CodingQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeGameQuestion_questionId_key" ON "CodeGameQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeGameAnswer_userAnswerId_key" ON "CodeGameAnswer"("userAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSetting_moduleId_key_key" ON "ModuleSetting"("moduleId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleHighlightConcepts_moduleId_conceptNodeId_key" ON "ModuleHighlightConcepts"("moduleId", "conceptNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "FillinQuestion_questionId_key" ON "FillinQuestion"("questionId");

-- CreateIndex
CREATE INDEX "GeneratedFeedback_codeSubmissionId_idx" ON "GeneratedFeedback"("codeSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Discussion_authorId_key" ON "Discussion"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_messageId_key" ON "Vote"("userId", "messageId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_timestamp_idx" ON "Notification"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_discussionId_idx" ON "Notification"("discussionId");

-- CreateIndex
CREATE UNIQUE INDEX "UmlEditorModel_model_key" ON "UmlEditorModel"("model");

-- CreateIndex
CREATE UNIQUE INDEX "UmlEditorElement_element_key" ON "UmlEditorElement"("element");

-- CreateIndex
CREATE UNIQUE INDEX "UmlQuestion_questionId_key" ON "UmlQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserUmlQuestionAnswer_userAnswerId_key" ON "UserUmlQuestionAnswer"("userAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "FileUpload_userId_fileId_moduleId_key" ON "FileUpload"("userId", "fileId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "_ModuleToSubject_AB_unique" ON "_ModuleToSubject"("A", "B");

-- CreateIndex
CREATE INDEX "_ModuleToSubject_B_index" ON "_ModuleToSubject"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentconceptNodeId_fkey" FOREIGN KEY ("currentconceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleConceptGoal" ADD CONSTRAINT "ModuleConceptGoal_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleConceptGoal" ADD CONSTRAINT "ModuleConceptGoal_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubject" ADD CONSTRAINT "UserSubject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubject" ADD CONSTRAINT "UserSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptGraph" ADD CONSTRAINT "ConceptGraph_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptFamily" ADD CONSTRAINT "ConceptFamily_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptFamily" ADD CONSTRAINT "ConceptFamily_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEdge" ADD CONSTRAINT "ConceptEdge_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEdge" ADD CONSTRAINT "ContentEdge_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEdge" ADD CONSTRAINT "ContentEdge_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConcept" ADD CONSTRAINT "UserConcept_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConcept" ADD CONSTRAINT "UserConcept_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConceptEvent" ADD CONSTRAINT "UserConceptEvent_userConceptId_fkey" FOREIGN KEY ("userConceptId") REFERENCES "UserConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentElement" ADD CONSTRAINT "ContentElement_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentElement" ADD CONSTRAINT "ContentElement_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_mCAnswerId_fkey" FOREIGN KEY ("mCAnswerId") REFERENCES "MCOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentView" ADD CONSTRAINT "ContentView_contentElementId_fkey" FOREIGN KEY ("contentElementId") REFERENCES "ContentElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentView" ADD CONSTRAINT "ContentView_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestion" ADD CONSTRAINT "MCQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestion" ADD CONSTRAINT "MCQuestion_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "QuestionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestionOption" ADD CONSTRAINT "MCQuestionOption_mcOptionId_fkey" FOREIGN KEY ("mcOptionId") REFERENCES "MCOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestionOption" ADD CONSTRAINT "MCQuestionOption_mcQuestionId_fkey" FOREIGN KEY ("mcQuestionId") REFERENCES "MCQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCAnswer" ADD CONSTRAINT "UserMCAnswer_mcQuestionId_fkey" FOREIGN KEY ("mcQuestionId") REFERENCES "MCQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCAnswer" ADD CONSTRAINT "UserMCAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCOptionSelected" ADD CONSTRAINT "UserMCOptionSelected_mcOptionId_fkey" FOREIGN KEY ("mcOptionId") REFERENCES "MCOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMCOptionSelected" ADD CONSTRAINT "UserMCOptionSelected_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTextQuestion" ADD CONSTRAINT "FreeTextQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphQuestion" ADD CONSTRAINT "GraphQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphAIFeedback" ADD CONSTRAINT "GraphAIFeedback_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingQuestion" ADD CONSTRAINT "CodingQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGeruest" ADD CONSTRAINT "CodeGeruest_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelSolution" ADD CONSTRAINT "ModelSolution_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedTest" ADD CONSTRAINT "AutomatedTest_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmissionFile" ADD CONSTRAINT "CodeSubmissionFile_CodeSubmissionId_fkey" FOREIGN KEY ("CodeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmissionFile" ADD CONSTRAINT "CodeSubmissionFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameQuestion" ADD CONSTRAINT "CodeGameQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameScaffold" ADD CONSTRAINT "CodeGameScaffold_codeGameQuestionId_fkey" FOREIGN KEY ("codeGameQuestionId") REFERENCES "CodeGameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameAnswer" ADD CONSTRAINT "CodeGameAnswer_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameScaffoldAnswer" ADD CONSTRAINT "CodeGameScaffoldAnswer_codeGameAnswerId_fkey" FOREIGN KEY ("codeGameAnswerId") REFERENCES "CodeGameAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSetting" ADD CONSTRAINT "ModuleSetting_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSetting" ADD CONSTRAINT "ModuleSetting_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleHighlightConcepts" ADD CONSTRAINT "ModuleHighlightConcepts_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleHighlightConcepts" ADD CONSTRAINT "ModuleHighlightConcepts_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FillinQuestion" ADD CONSTRAINT "FillinQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blank" ADD CONSTRAINT "Blank_fillinQuestionId_fkey" FOREIGN KEY ("fillinQuestionId") REFERENCES "FillinQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KIFeedback" ADD CONSTRAINT "KIFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedFeedback" ADD CONSTRAINT "GeneratedFeedback_codeSubmissionId_fkey" FOREIGN KEY ("codeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymousUser" ADD CONSTRAINT "anonymousUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "anonymousUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_contentElementId_fkey" FOREIGN KEY ("contentElementId") REFERENCES "ContentElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "anonymousUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBotMessage" ADD CONSTRAINT "ChatBotMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBotMessage" ADD CONSTRAINT "ChatBotMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentElementProgress" ADD CONSTRAINT "UserContentElementProgress_contentElementId_fkey" FOREIGN KEY ("contentElementId") REFERENCES "ContentElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentElementProgress" ADD CONSTRAINT "UserContentElementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentView" ADD CONSTRAINT "UserContentView_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentView" ADD CONSTRAINT "UserContentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptEmbedding" ADD CONSTRAINT "TranscriptEmbedding_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlEditorElement" ADD CONSTRAINT "UmlEditorElement_editorModelId_fkey" FOREIGN KEY ("editorModelId") REFERENCES "UmlEditorModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlQuestion" ADD CONSTRAINT "UmlQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUmlQuestionAnswer" ADD CONSTRAINT "UserUmlQuestionAnswer_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadQuestion" ADD CONSTRAINT "UploadQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUploadAnswer" ADD CONSTRAINT "UserUploadAnswer_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUploadAnswer" ADD CONSTRAINT "UserUploadAnswer_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleToSubject" ADD CONSTRAINT "_ModuleToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleToSubject" ADD CONSTRAINT "_ModuleToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
