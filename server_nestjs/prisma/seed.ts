import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { ConsoleLogger } from '@nestjs/common';
import { Console } from 'console';

const prisma = new PrismaClient();

async function main() {
    // delete everything
    console.log("Deleting everything...");
    await prisma.kIFeedback.deleteMany();
    await prisma.submissionSingleCodeFile.deleteMany();
    await prisma.testcase.deleteMany();
    await prisma.automatedTest.deleteMany();
    await prisma.codeGeruest.deleteMany();
    await prisma.mCAnswer.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.file.deleteMany();
    await prisma.message.deleteMany();
    await prisma.discussion.deleteMany();
    await prisma.submissionCode.deleteMany();
    await prisma.codingQuestion.deleteMany();
    await prisma.mCQuestion.deleteMany();
    await prisma.question.deleteMany();
    await prisma.training.deleteMany();
    await prisma.requirement.deleteMany();
    await prisma.contentEdge.deleteMany();
    await prisma.contentNode.deleteMany();
    await prisma.conceptEdge.deleteMany();
    await prisma.conceptFamily.deleteMany();
    await prisma.userConcept.deleteMany();
    await prisma.moduleConceptGoal.deleteMany();
    await prisma.module.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.conceptNode.deleteMany();
    await prisma.conceptGraph.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    console.log("Creating everything...");


    // Role
    const adminRole = await prisma.role.create({ data: { name: "Admin" } });
    const userRole = await prisma.role.create({ data: { name: "User" } });

    // Modules
    const module1 = await prisma.module.create({
        data: {
            id: 1,
            name: "Module 1",
            description: "Description for Module 1"
        }
    });

    const module2 = await prisma.module.create({
        data: {
            id: 2,
            name: "Module 2",
            description: "Description for Module 2"
        }
    });

    // Subject
    const subject1 = await prisma.subject.create({
        data: {
            id: 1,
            name: "Subject 1",
            description: "Description for Subject 1",
            modules: { connect: { id: module1.id } }
        }
    });

    // root node
    const conceptNode = await prisma.conceptNode.create({
        data: {
            id: 1,
            name: "root",
            description: "root description"
        }
    });

    // ConceptGraph
    const conceptGraph = await prisma.conceptGraph.create({
        data: {
            name: "Concept Graph 1",
            root: { connect: { id: conceptNode.id } }
        }
    });

    const conceptNodeData = [
        { id: 2, name: "Programmiergrundlagen", description: "Description for Programmiergrundlagen", parentId: 1 },
        { id: 3, name: "Variablen", description: "Description for Variablen", parentId: 2 },
        { id: 4, name: "Datentypen", description: "Description for Datentypen", parentId: 2 },
        { id: 5, name: "Kontrollelemente", description: "Description for Kontrollelemente", parentId: 2 },
        { id: 6, name: "booleans", description: "Description for booleans", parentId: 4 },
        { id: 7, name: "numbers", description: "Description for numbers", parentId: 4 },
        { id: 8, name: "strings", description: "Description for strings", parentId: 4 },
        { id: 9, name: "if", description: "Description for if", parentId: 5 },
        { id: 10, name: "else", description: "Description for if-else", parentId: 5 },
        { id: 11, name: "Wiederholungen", description: "Description for boolean operations", parentId: 2 },
        { id: 12, name: "while", description: "Description for while", parentId: 11 },
        { id: 13, name: "for", description: "Description for for", parentId: 11 },
        { id: 14, name: "arrays", description: "Description for arrays", parentId: 4 },
        { id: 15, name: "boolean operations", description: "Description for boolean operations", parentId: 4 },
        { id: 16, name: "functions", description: "Description", parentId: 2 },
        { id: 17, name: "string operations", description: "Description for string operations", parentId: 4 },
        { id: 18, name: "number operations", description: "Description for number operations", parentId: 4 },
    ];

    const conceptEdgeData = [
        { id: 1, prerequisiteId: 3, successorId: 4, parentId: 2 },
        { id: 2, prerequisiteId: 4, successorId: 5, parentId: 2 },
        { id: 3, prerequisiteId: 6, successorId: 15, parentId: 4 },
        { id: 4, prerequisiteId: 7, successorId: 18, parentId: 4 },
        { id: 5, prerequisiteId: 8, successorId: 17, parentId: 4 },
        { id: 6, prerequisiteId: 5, successorId: 11, parentId: 2 },
    ];


    // create concept nodes
    await prisma.conceptNode.createMany({
        data: conceptNodeData.map(node => ({
            id: node.id,
            name: node.name,
            description: node.description,
        }))
    });

    // ConceptFamily
    await prisma.conceptFamily.createMany({
        data: conceptNodeData.map(node => ({
            childId: node.id,
            parentId: node.parentId
        }))
    });


    // ConceptEdge
    await prisma.conceptEdge.createMany({
        data: conceptEdgeData.map(edge => ({
            id: edge.id,
            prerequisiteId: edge.prerequisiteId,
            successorId: edge.successorId,
            parentId: edge.parentId
        }))
    });

    // concept goals for modules
    const getRandomGoalsForModule = (moduleId) => {
        return conceptNodeData.map(concept => {
            const goal = Math.floor(Math.random() * 7); // random number between 0 and 6
            return goal !== 0 ? {
                moduleId: moduleId,
                conceptNodeId: concept.id,
                level: goal
            } : null;
        }).filter(goal => goal !== null);  // Filters out the null values (which represent a goal of 0).
    };

    const goalsForModule1 = getRandomGoalsForModule(module1.id);
    const goalsForModule2 = getRandomGoalsForModule(module2.id);

    await prisma.moduleConceptGoal.createMany({
        data: [...goalsForModule1, ...goalsForModule2]
    });

    console.log("Concepts created.")


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


    // Admin
    const adminUser = await prisma.user.create({
        data: {
            email: "admin@examplei.com",
            firstname: "Admin",
            lastname: "User",
            password: "admin123",
            roles: { connect: { id: adminRole.id } },
            currentConcept: { connect: { id: conceptNode.id } },
            modules: { connect: [{ id: module1.id }, { id: module2.id }]  }
        }
    });

    // More users
    const numberOfUsers = 10;
    const createdUsers = [];

    for (let i = 0; i < numberOfUsers; i++) {
        const user = await prisma.user.create({
            data: {
                id: i + 2,
                email: faker.internet.email(),
                firstname: faker.person.firstName(),
                lastname: faker.person.lastName(),
                password: faker.internet.password(),
                modules: { connect: [{ id: module1.id }, { id: module2.id }] },
                currentconceptNodeId: Math.floor(Math.random() * (conceptNodeData.length)) + 2
            }
        });
        createdUsers.push(user);
    }

    console.log("Users created.");

    // UserConcept
    const generateUserConceptForUser = (userId) => {
        return conceptNodeData.map(concept => {
            const level = Math.floor(Math.random() * 6) + 1;
            if (level === 0) return null;
            return {
                userId: userId,
                conceptNodeId: concept.id,
                level: level,
                expanded: true
            };
        }).filter(Boolean);  // filter out any null entries
    };

    // Assuming you have the IDs of the created users in a list named userIds
    const allUserConceptData = createdUsers.flatMap(user => generateUserConceptForUser(user.id));

    await prisma.userConcept.createMany({
        data: allUserConceptData
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
            name: "Organisation & Übungsbetrieb",
            path: "0.pdf", //just a test pdf (0.pdf) in the storage folder
            type: "pdf",
            question: { connect: { id: question.id } }
        }
    });

    await prisma.file.create({
        data: {
            name: "Testvideo",
            path: "11.mp4", //just a test pdf (0.pdf) in the storage folder
            type: "mp4",
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
