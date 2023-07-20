import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const roles = await prisma.role.createMany({
    data: ['Admin', 'Editor', 'Viewer'].map((name, i) => ({ name })),
  });

  // Modules
  const modules = await prisma.modul.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `Module${i}`,
      description: `Description for Module${i}`,
    })),
  });

  // Subjects
  const subjects = await prisma.subject.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `Subject${i}`,
      description: `Description for Subject${i}`,
    })),
  });

  // ConceptNodes
  const conceptNodes = await prisma.conceptNode.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `ConceptNode${i}`,
      description: `Description for ConceptNode${i}`,
    })),
  });

  // ConceptFamilies
  const conceptFamilies = await prisma.conceptFamily.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      childId: i + 1,
      parentId: i + 2 > 10 ? 1 : i + 2, // Assuming there's a loop in the concept hierarchy
    })),
  });

  // ConceptEdges
  const conceptEdges = await prisma.conceptEdge.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      prerequisiteId: i + 1,
      successorId: i + 2 > 10 ? 1 : i + 2, // Assuming there's a loop in the concept hierarchy
    })),
  });

  // ContentNodes
  const contentNodes = await prisma.contentNode.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `ContentNode${i}`,
      description: `Description for ContentNode${i}`,
    })),
  });

  // ContentEdges
  const contentEdges = await prisma.contentEdge.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      prerequisiteId: i + 1,
      successorId: i + 2 > 10 ? 1 : i + 2, // Assuming there's a loop in the content hierarchy
    })),
  });

  // Requirements
  const requirements = await prisma.requirement.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      contentNodeId: i + 1,
      conceptNodeId: i + 1,
    })),
  });

  // Trainings
  const trainings = await prisma.training.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      contentNodeId: i + 1,
      conceptNodeId: i + 1,
      awards: i % 2 === 0,
    })),
  });

  // ConceptUser
  const conceptUsers = await prisma.conceptUser.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      userId: i + 1,
      conceptNodeId: i + 1,
      level: i + 1,
      expanded: i % 2 === 0,
    })),
  });

  // File
  const files = await prisma.file.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `File${i}`,
      questionId: i + 1,
      mCAnswerId: i + 1,
    })),
  });

  // Feedback
  const feedbacks = await prisma.feedback.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `Feedback${i}`,
      text: `This is feedback ${i}`,
      questionId: i + 1,
    })),
  });

  // Question
  const questions = await prisma.question.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `Question${i}`,
      description: `Description for Question${i}`,
      score: i + 1,
      type: `Type${i}`,
      authorId: i + 1,
      contentNodeId: i + 1,
    })),
  });

  // MCQuestion
  const mcQuestions = await prisma.mCQuestion.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      questionId: i + 1,
      isSC: i % 2 === 0,
    })),
  });

  // MCAnswer
  const mcAnswers = await prisma.mCAnswer.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      text: `MCAnswer${i}`,
      is_correct: i % 2 === 0,
      questionId: i + 1,
    })),
  });

  // CodingQuestion
  const codingQuestions = await prisma.codingQuestion.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      count_InputArgs: i + 1,
      questionId: i + 1,
    })),
  });

  // CodeGeruest
  const codeGerueste = await prisma.codeGeruest.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      text: `CodeGeruest${i}`,
      codingQuestionId: i + 1,
      codeFileName: `CodeGeruestFile${i}`,
      code: `Code for Geruest${i}`,
      language: `Language${i}`,
    })),
  });

  // AutomatedTest
  const automatedTests = await prisma.automatedTest.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      code: `Code for AutomatedTest${i}`,
      testFileName: `TestFile${i}`,
      language: `Language${i}`,
      questionId: i + 1,
    })),
  });

  // Testcase
  const testcases = await prisma.testcase.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      input: `Testcase input ${i}`,
      expectedOutput: `Expected output for Testcase ${i}`,
      automatedTestId: i + 1,
    })),
  });

  // SubmissionCode
  const submissionCodes = await prisma.submissionCode.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      code: `SubmissionCode${i}`,
      compilerOutput: `Compiler output for SubmissionCode${i}`,
      compilerError: `Compiler error for SubmissionCode${i}`,
      compilerResponse: `Compiler response for SubmissionCode${i}`,
      userId: i + 1,
    })),
  });

  // SubmissionSingleCodeFile
  const submissionSingleCodeFiles =
    await prisma.submissionSingleCodeFile.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        code: `SubmissionSingleCodeFile${i}`,
        language: `Language${i}`,
        codeFileName: `SubmissionSingleCodeFile${i}`,
        userId: i + 1,
        submissionCodeId: i + 1,
      })),
    });

  // KIFeedback
  const kiFeedbacks = await prisma.kIFeedback.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      model: `Model${i}`,
      text: `KIFeedback${i}`,
      ratedByStudent: i,
      submissionId: i + 1,
    })),
  });

  // Discussion
  const discussions = await prisma.discussion.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      title: `Discussion${i}`,
      contentNodeId: i + 1,
      authorId: i + 1,
    })),
  });

  // Message
  const messages = await prisma.message.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      text: `Message${i}`,
      authorId: i + 1,
      discussionId: i + 1,
    })),
  });
  // Users
  const users = await prisma.user.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      email: `user${i}@test.com`,
      firstname: `User${i}`,
      lastname: `Last${i}`,
      password: `password${i}`,
      currentconceptNodeId: i + 1,
    })),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
