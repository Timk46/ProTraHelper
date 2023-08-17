import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Role
    const adminRole = await prisma.role.create({ data: { name: "Admin" } });
    const userRole = await prisma.role.create({ data: { name: "User" } });

    // Modul
    const module1 = await prisma.modul.create({
        data: {
            name: "Module 1",
            description: "Description for Module 1"
        }
    });

    // Subject
    const subject1 = await prisma.subject.create({
        data: {
            name: "Subject 1",
            description: "Description for Subject 1",
            modules: { connect: { id: module1.id } }
        }
    });

    // ConceptNode
    const conceptNode = await prisma.conceptNode.create({
        data: {
            name: "Concept Node 1",
            description: "Description for Concept Node 1"
        }
    });

    // User
    const adminUser = await prisma.user.create({
        data: {
            email: "admin@example.com",
            firstname: "Admin",
            lastname: "User",
            password: "admin123",
            roles: { connect: { id: adminRole.id } },
            currentConcept: { connect: { id: conceptNode.id } },
            modules: { connect: { id: module1.id } }
        }
    });

    // ConceptGraph
    const conceptGraph = await prisma.conceptGraph.create({
        data: {
            name: "Concept Graph 1",
            ancestor: { connect: { id: conceptNode.id } }
        }
    });

    // ConceptFamily
    await prisma.conceptFamily.create({
        data: {
            child: { connect: { id: conceptNode.id } },
            parent: { connect: { id: conceptNode.id } }
        }
    });

    // ConceptEdge
    await prisma.conceptEdge.create({
        data: {
            prerequisite: { connect: { id: conceptNode.id } },
            successor: { connect: { id: conceptNode.id } },
            parent: { connect: { id: conceptNode.id } }
        }
    });

    // ContentNode
    const contentNode = await prisma.contentNode.create({
        data: {
            name: "Content Node 1",
            description: "Description for Content Node 1"
        }
    });

    // ContentEdge
    await prisma.contentEdge.create({
        data: {
            prerequisite: { connect: { id: contentNode.id } },
            successor: { connect: { id: contentNode.id } }
        }
    });

    // Requirement and Training
    await prisma.requirement.create({
        data: {
            contentNode: { connect: { id: contentNode.id } },
            conceptNode: { connect: { id: conceptNode.id } }
        }
    });

    await prisma.training.create({
        data: {
            contentNode: { connect: { id: contentNode.id } },
            conceptNode: { connect: { id: conceptNode.id } },
            awards: 1
        }
    });

    // UserConcept
    await prisma.userConcept.create({
        data: {
            user: { connect: { id: adminUser.id } },
            concept: { connect: { id: conceptNode.id } },
            level: 1,
            expanded: true
        }
    });

    // Question
    const question = await prisma.question.create({
        data: {
            name: "Question 1",
            description: "Description for Question 1",
            score: 10,
            type: "MC",
            author: { connect: { id: adminUser.id } },
            contentNode: { connect: { id: contentNode.id } }
        }
    });

    // File, Feedback, MCQuestion, MCAnswer, CodingQuestion, CodeGeruest, AutomatedTest, Testcase
    // Due to the length of the schema and to avoid redundancy, I will create only one entity per model here:
    await prisma.file.create({
        data: {
            name: "File1",
            path: "/path/to/file",
            question: { connect: { id: question.id } }
        }
    });

    await prisma.feedback.create({
        data: {
            name: "Feedback1",
            text: "This is a feedback.",
            question: { connect: { id: question.id } }
        }
    });

    const mcQuestion = await prisma.mCQuestion.create({
        data: {
            isSC: false,
            question: { connect: { id: question.id } }
        }
    });

    await prisma.mCAnswer.create({
        data: {
            text: "Answer1",
            is_correct: true,
            question: { connect: { id: mcQuestion.id } }
        }
    });

    const codingQuestion = await prisma.codingQuestion.create({
        data: {
            count_InputArgs: 2,
            question: { connect: { id: question.id } }
        }
    });

    await prisma.codeGeruest.create({
        data: {
            text: "Code Geruest",
            codingQuestion: { connect: { id: codingQuestion.id } },
            codeFileName: "codeFile1.txt",
            code: "Sample code",
            language: "JavaScript"
        }
    });

    const automatedTest = await prisma.automatedTest.create({
        data: {
            code: "Test Code",
            testFileName: "testFile1.txt",
            language: "JavaScript",
            codingQuestion: { connect: { id: codingQuestion.id } }
        }
    });

    await prisma.testcase.create({
        data: {
            input: "Test Input",
            expectedOutput: "Expected Output",
            automatedTest: { connect: { id: automatedTest.id } }
        }
    });

    // SubmissionCode, SubmissionSingleCodeFile, KIFeedback
    const submissionCode = await prisma.submissionCode.create({
        data: {
            code: "User Submission Code",
            compilerOutput: "Output",
            compilerError: "No errors",
            compilerResponse: "Success",
            user: { connect: { id: adminUser.id } }
        }
    });

    await prisma.submissionSingleCodeFile.create({
        data: {
            code: "Single Code File",
            language: "JavaScript",
            codeFileName: "singleCodeFile1.txt",
            user: { connect: { id: adminUser.id } },
            SubmissionCode: { connect: { id: submissionCode.id } }
        }
    });

    await prisma.kIFeedback.create({
        data: {
            model: "KI Model",
            text: "KI Feedback",
            ratedByStudent: 5,
            submission: { connect: { id: submissionCode.id } }
        }
    });

    // Discussion, Message
    const discussion = await prisma.discussion.create({
        data: {
            title: "Discussion Topic",
            contentNode: { connect: { id: contentNode.id } },
            author: { connect: { id: adminUser.id } }
        }
    });

    await prisma.message.create({
        data: {
            text: "Message Text",
            author: { connect: { id: adminUser.id } },
            Discussion: { connect: { id: discussion.id } }
        }
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
