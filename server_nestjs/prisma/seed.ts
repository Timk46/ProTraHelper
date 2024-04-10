import { PrismaClient, contentElementType } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { seedMCQ } from './seedMCQ';
import { seedCodeQuestions } from './seedCodeQuestions';
import { seedFreetext } from './seedFreetext';
import { seedAllEmbeddingsForVideo } from './seedEmbeddings';
import { seedMCQnew } from './seedNewMCQ';

const createEmbeddings = false; // set false to skip embedding creation and save costs!!!

const prisma = new PrismaClient();
interface excel_OFP {
  conceptId: number | null;
  conceptEdge: number[] | null;
  contentId: number | null;
  requiresId: number[] | null;
  trainsId: number[] | null;
  topic: string | null;
  parentId: number | null;
  moduleGoalId: number | null;
  level: number | null;
  conceptDescription: string | null;
  elementId1: string | null;
  elementId2: string | null;
  elementId3: string | null;
  elementId4: string | null;
  elementId5: string | null;
  contentNodeTitle: string | null;
  description: string | null;
}

function getFilenameByLink(hyperlink: string): string {
  const filename = hyperlink.split('/').pop();
  return filename;
}

async function main() {
  // npx prisma migrate reset ist jetzt in seed integriert. Deshalb müssen wir das hier nicht mehr manuell machen.
  /*
  // delete everything
  console.log('Deleting everything...');
  await prisma.kIFeedback.deleteMany();
  await prisma.codeSubmissionFile.deleteMany();
  await prisma.testcase.deleteMany();
  await prisma.automatedTest.deleteMany();
  await prisma.codeGeruest.deleteMany();
  await prisma.userMCAnswer.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.file.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.message.deleteMany();
  await prisma.discussion.deleteMany();
  await prisma.anonymousUser.deleteMany();
  await prisma.codeSubmission.deleteMany();
  await prisma.codingQuestion.deleteMany();
  await prisma.mCQuestionOption.deleteMany();
  await prisma.mCQuestion.deleteMany();
  await prisma.questionVersion.deleteMany();
  await prisma.question.deleteMany();
  await prisma.mCQuestion.deleteMany();
  await prisma.training.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.contentEdge.deleteMany();
  await prisma.userContentElementProgress.deleteMany();
  await prisma.userContentView.deleteMany();
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
  */

  console.log('Creating everything...');

  // Create Files
  createFilesOFP();


  const moduleInformatik = await prisma.module.create({
    data: {
      id: 1,
      name: 'Bachelor Informatik',
      description: 'Beschreibung für den Studiengang Informatik.',
    },
  });

  const subjectOFP = await prisma.subject.create({
    data: {
      id: 1,
      name: 'Objektorientierte und funktionale Programmierung',
      description: 'Beschreibung für die Veranstaltung OPF.',
      modules: { connect: { id: moduleInformatik.id } },
    },
  });

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@admin.de',
      firstname: 'Admin',
      lastname: 'User',
      password: '$2b$10$Bn9kqoUAJXE2SAXyqK5LbOk2t2QqDuJ4WKBA.aLjlxuJepwRxRf5C', // plain = admin
      globalRole: 'ADMIN',
      modules: { connect: [{ id: moduleInformatik.id }] },
    },
  });

  // Teacher
  const teacherUser = await prisma.user.create({
    data: {
      email: 'lehrer@lehrer.de',
      firstname: 'Lehrer',
      lastname: 'User',
      password: '$2b$10$NnM.nnNJ0T0XD1BkqVbGCedYwEQgWQHiz0ao0H6AkSYFX9Kqq9UrO', // plain = lehrer
      globalRole: 'TEACHER',
      modules: { connect: [{ id: moduleInformatik.id }] },
    },
  });

  // Student
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@student.de',
      firstname: 'Student',
      lastname: 'User',
      password: '$2b$10$VPheWSunU2/ntaC/s5wBkO5ZjYN8ogxqtdAJis5n3Bvgmm99Fkxxm', // plain = student
      globalRole: 'STUDENT',
      modules: { connect: [{ id: moduleInformatik.id }] },
    },
  });

  // Sven
  const svenUser = await prisma.user.create({
    data: {
      email: 'sven@student.de',
      firstname: 'Sven',
      lastname: 'Jacobs',
      password: '$2b$10$VPheWSunU2/ntaC/s5wBkO5ZjYN8ogxqtdAJis5n3Bvgmm99Fkxxm', // plain = student
      globalRole: 'STUDENT',
      modules: { connect: [{ id: moduleInformatik.id }] },
    },
  });

  // More users
  const numberOfUsers = 10;
  const createdUsers = [];

  for (let i = 0; i < numberOfUsers; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
        password: faker.internet.password(), //passwords wont work because they are not hashed like they should. To Login with Users use hardcoded ones (see above)
        globalRole: 'STUDENT',
        modules: {
          connect: [{ id: moduleInformatik.id }],
        },
      },
    });
    createdUsers.push(user);
  }

  // root node
  const conceptNode = await prisma.conceptNode.create({
    data: {
      id: 1,
      name: 'root',
      description: 'root description',
    },
  });

  await prisma.userConcept.create({
    data: {
      user: { connect: { id: adminUser.id } },
      concept: { connect: { id: conceptNode.id } },
      // level: Math.floor(Math.random() * 7), // random number between 0 and 6
      level: 10,
      expanded: true,
    },
  });
  for (const user in createdUsers) {
    await prisma.userConcept.create({
      data: {
        user: { connect: { id: createdUsers[user].id } },
        concept: { connect: { id: conceptNode.id } },
        // level: Math.floor(Math.random() * 7), // random number between 0 and 6
        level: 10,
        expanded: true,
      },
    });
  }
  //create moduleConceptGoals for root
  await prisma.moduleConceptGoal.create({
    data: {
      moduleId: moduleInformatik.id,
      conceptNodeId: conceptNode.id,
      // level: Math.floor(Math.random() * 7), // random number between 0 and 6
      level: 10,
    },
  });

  // ConceptGraph
  const conceptGraph = await prisma.conceptGraph.create({
    data: {
      name: 'Concept Graph 1',
      root: { connect: { id: conceptNode.id } },
    },
  });

  // TODO: Put this in a separate function
  console.log('Importing Concepts from Excel...');

  const ofpData: excel_OFP[] = [];

  const filePath = process.env.FILE_PATH + 'Kompetenzraster.xlsx';
  if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets['OFP_Import'];
    const excelData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    });

    // Extract column names from the first row (header)
    const columnNames = excelData[0];
    // Divide columns and save their indexes
    // TODO: get the ids by column names ?
    const columnConceptId = 0;
    const columnConceptEdge = 1;
    const columnContentId = 2;
    const columnRequiresId = 3;
    const columnTrainsId = 4;
    const columnTopicId = 5;
    const columnParentId = 6;
    const columnModuleGoalId = 7;
    const columnLevelId = 8;
    const columnElementId = [9, 10, 11, 12, 13];
    const columnContentNodeTitle = 14;
    const columnDescription = 15;

    //in case the topic column for the Content is empty we need to save the last topic
    let lastTopic = 'No topic found!';

    // Iterate through the excelData and insert records into your Prisma database
    for (const { rowIndex, row } of excelData.map((row, rowIndex) => ({
      rowIndex,
      row,
    }))) {
      // Save the last topic in case there are multiple contentNodes for the same topic
      if (row[columnTopicId]) {
        lastTopic = row[columnTopicId];
      }

      if (rowIndex > 0) {
        ofpData.push({
          conceptId: row[columnConceptId],
          conceptEdge: row[columnConceptEdge]
            ? row[columnConceptEdge].toString().split(/[,.]/).map(Number)
            : null,
          contentId: row[columnContentId],
          requiresId: row[columnRequiresId]
            ? row[columnRequiresId].toString().split(/[,.]/).map(Number)
            : null,
          trainsId: row[columnTrainsId]
            ? row[columnTrainsId].toString().split(/[,.]/).map(Number)
            : null,
          topic: lastTopic,
          parentId: row[columnParentId] ? row[columnParentId] : 1,
          moduleGoalId: row[columnModuleGoalId],
          level: row[columnLevelId],
          conceptDescription: row[columnDescription],
          elementId1: row[columnElementId[0]],
          elementId2: row[columnElementId[1]],
          elementId3: row[columnElementId[2]],
          elementId4: row[columnElementId[3]],
          elementId5: row[columnElementId[4]],
          contentNodeTitle: row[columnContentNodeTitle]
            ? row[columnContentNodeTitle]
            : lastTopic,
          description: row[columnDescription],
        });
      }
    } //end of for loop for excelData

    //------------------------------------------
    //Start of creating from ofpData
    //ConceptNode
    await prisma.conceptNode.createMany({
      data: ofpData
        .filter((data) => data.conceptId)
        .map((data) => ({
          id: data.conceptId,
          name: data.topic,
          description: data.conceptDescription,
        })),
    });
    //ConceptFamily
    await prisma.conceptFamily.createMany({
      data: ofpData
        .filter((data) => data.conceptId)
        .map((data) => ({
          childId: data.conceptId,
          parentId: data.parentId ? data.parentId : 1,
        })),
    });
    //ConceptEdge
    for (const data of ofpData) {
      if (data.conceptEdge) {
        for (const edge of data.conceptEdge) {
          await prisma.conceptEdge.create({
            data: {
              prerequisiteId: edge,
              successorId: data.conceptId,
              parentId: data.parentId ? data.parentId : 1,
            },
          });
        }
      }
    }
    //ModuleConceptGoal
    await prisma.moduleConceptGoal.createMany({
      data: ofpData
        .filter((data) => data.conceptId && data.moduleGoalId)
        .map((data) => ({
          moduleId: moduleInformatik.id,
          conceptNodeId: data.conceptId,
          level: data.moduleGoalId,
        })),
    });
    //ContentNode
    await prisma.contentNode.createMany({
      data: ofpData
        .filter((data) => data.contentId)
        .map((data) => ({
          id: data.contentId,
          name: data.contentNodeTitle,
          description: data.description,
        })),
    });
    //ContentElement
    for (const data of ofpData) {
      const elementList = [
        data.elementId1,
        data.elementId2,
        data.elementId3,
        data.elementId4,
        data.elementId5,
      ];
      for (const elemId in elementList) {
        // console.log('data', elemId.valueOf);
        if (elementList[+elemId] && data.contentId) {
          const file = await prisma.file.findUnique({
            where: { uniqueIdentifier: elementList[+elemId] },
          });
          if (file) {
            const TempContentElement = await prisma.contentElement.create({
              data: {
                type: contentElementType[file.type],
                title: file.name,
              },
            });
            await prisma.file.update({
              where: { uniqueIdentifier: file.uniqueIdentifier },
              data: {
                contentElement: { connect: { id: TempContentElement.id } },
              },
            });
            await prisma.contentView.create({
              data: {
                contentNode: {
                  connect: { id: data.contentId },
                },
                contentElement: {
                  connect: { id: TempContentElement.id },
                },
                position: +elemId,
              },
            });
          }
        }
      }
    }
    //Training
    for (const data of ofpData) {
      if (data.trainsId && data.contentId) {
        for (const train of data.trainsId) {
          await prisma.training.create({
            data: {
              contentNode: {
                connect: { id: data.contentId },
              },
              conceptNode: {
                connect: { id: +train },
              },
              awards: data.level,
            },
          });
        }
      }
    }
    //Requirement
    for (const data of ofpData) {
      if (data.requiresId && data.contentId) {
        for (const requires of data.requiresId) {
          await prisma.requirement.create({
            data: {
              contentNode: {
                connect: { id: data.contentId },
              },
              conceptNode: {
                connect: { id: +requires },
              },
            },
          });
        }
      }
    }

    //End of creating from ofpData
    //------------------------------------------

    console.log('Importing Concepts Done!');
  } else {
    console.log(
      'To import ContentNodes please save "Kompetenzraster.xlsx" in the storage folder!',
    );
  }

  console.log('Creating rest from Seed.ts...');

  // update user to have a current concept node
  await prisma.user.updateMany({
    data: {
      currentconceptNodeId: conceptNode.id,
    },
  });

  // Discussion, Message --------------------------------------------------------------
  const anonymousAdmin = await prisma.anonymousUser.create({
    data: {
      user: { connect: { id: adminUser.id } },
      anonymousName: 'Anonymous 4dm1n',
    },
  });

  const exampleDiscussion = await prisma.discussion.create({
    data: {
      title: 'Ist ein dictionary in Python mutable?',
      conceptNode: { connect: { id: 14 } },
      author: { connect: { id: anonymousAdmin.id } },
      isSolved: true,
    },
  });

  // the question
  const exampleQuestion = await prisma.message.create({
    data: {
      text: 'Als ich kürzlich an meinem Python-Projekt gearbeitet habe, stieß ich auf eine interessante Herausforderung. Ich verwendete ein Dictionary, um Daten zu speichern, und bemerkte, dass sich die Werte nach der Zuweisung scheinbar veränderten. Das brachte mich ins Grübeln - ist ein Dictionary in Python wirklich veränderbar? Könnte das der Grund für mein Problem sein? Könntet ihr mir bitte erklären, wie die Mutabilität von Dictionaries in Python funktioniert und ob es eine Möglichkeit gibt, sie vor ungewollten Änderungen zu schützen?',
      author: { connect: { id: anonymousAdmin.id } },
      isInitiator: true,
      discussion: { connect: { id: exampleDiscussion.id } },
    },
  });

  // an answer
  await prisma.message.create({
    data: {
      text: 'Nagut, ich antworte einfach mal auf mich selbst: Ja, ein dictionary ist mutable. Aber ich würde mir empfehlen, nochmal in der Dokumentation nachzulesen, da steht alles drin.',
      author: { connect: { id: anonymousAdmin.id } },
      discussion: { connect: { id: exampleDiscussion.id } },
      isSolution: true,
    },
  });

  // an upvote
  await prisma.vote.create({
    data: {
      user: { connect: { id: adminUser.id } },
      message: { connect: { id: exampleQuestion.id } },
    },
  });

  console.log('Importing Tasks from Excel...');
  await seedCodeQuestions(adminUser.id);
  await seedMCQ(adminUser.id);
  await seedMCQnew();
  await seedFreetext(adminUser.id);
  console.log('Importing Done!');
}

async function createFilesOFP() {
  console.log('Creating Files for OFP...');
  // createfile also creates embeddings for SRTs with the same name if the file is type VIDEO
  createFile('Python_Einfuehrung_Motivation.pdf','c7b42b44-2aa9-4041-9816-680af38d5f8f','OFP/Python_Einfuehrung_Motivation.pdf','PDF');
  createFile('Python_Einfuehrung_Installation.pdf','6d66e5c1-3a03-4ad3-8c23-5c7fb7b90ea2','OFP/Python_Einfuehrung_Installation.pdf','PDF');
  createFile('Python_Einfuehrung_Motivation.mp4','43150eb1-e82d-4a63-8073-45b6ae026171','OFP/Python_Einfuehrung_Motivation.mp4','VIDEO');
  createFile('Python_Einfuehrung_Variablen.pdf','3903342b-bb39-4592-8b4d-364800f09ba7','OFP/Python_Einfuehrung_Variablen.pdf','PDF');
  createFile('Python_Variablen.mp4','00c25c46-8346-4d81-86a6-3dbc39e4a6e3','OFP/Python_Variablen.mp4','VIDEO');
  createFile('Python_Einfuehrung_Anweisungen_Ausdruecke.pdf','6de52e3c-8bf7-4f10-b4bc-11f633d3fd50','OFP/Python_Einfuehrung_Anweisungen_Ausdruecke.pdf','PDF');
  createFile('Python_Anweisungen_Ausdruecke.mp4','9ce7cb4b-8dc6-49ad-990a-76d73bf31ef7','OFP/Python_Anweisungen_Ausdruecke.mp4','VIDEO');
  createFile('Python_Datentypen_Strings.pdf','ad1eb799-2e9e-4279-b396-2788a52a2c28','OFP/Python_Datentypen_Strings.pdf','PDF');
  createFile('Python_Datentypen_String.mp4','46d632d3-e5be-4872-86da-be692e81e424','OFP/Python_Datentypen_String.mp4','VIDEO');
   // for ContentNode Integer
  createFile('Python_Datentypen_Zahlen.pdf','e6e07da5-6eb5-4e34-a7b0-944cbdb4d484','OFP/Python_Datentypen_Zahlen.pdf','PDF');
  createFile('Python_Datentypen_Zahlen.mp4','74feba64-e05e-4f58-83dd-fcaf65406b5d','OFP/Python_Datentypen_Zahlen.mp4','VIDEO');
   // for ContentNode Float
  createFile('Python_Datentypen_Zahlen.pdf','0da90d38-8a08-4714-bfdd-a99c86f1e982','OFP/Python_Datentypen_Zahlen.pdf','PDF');
  createFile('Python_Datentypen_Zahlen.mp4','02f37e4b-e28c-4eb0-ad16-9fd02d346f61','OFP/Python_Datentypen_Zahlen.mp4','VIDEO');
   // for ContentNode Complex
  createFile('Python_Datentypen_Zahlen.pdf','b4d5191b-7b2c-4047-833e-c27417f4e345','OFP/Python_Datentypen_Zahlen.pdf','PDF');
  createFile('Python_Datentypen_Zahlen.mp4','47ace2db-fe3b-4dcd-ae92-d5d00a12843d','OFP/Python_Datentypen_Zahlen.mp4','VIDEO');
  createFile('Python_Datentypen_Operationen.pdf','03efcfad-eda1-4b7c-9ccf-d75f50fa3e5e','OFP/Python_Datentypen_Operationen.pdf','PDF');
  createFile('Python_Datentypen_Operationen.mp4','01600171-cee2-4c72-a432-8127c2788391','OFP/Python_Datentypen_Operationen.mp4','VIDEO');
  createFile('Python_Datentypen_Boolean_None.pdf','34e378fc-083d-4cf2-be91-49fd8832b619','OFP/Python_Datentypen_Boolean_None.pdf','PDF');
  createFile('Python_Datentypen_Boolean_None.mp4','ce6d2406-f733-473b-ad99-ff339462c919','OFP/Python_Datentypen_Boolean_None.mp4','VIDEO');
  createFile('Python_Datentypen_Boolean_None.pdf','489bad95-fd32-46e7-952b-268c283cfe4a','OFP/Python_Datentypen_Boolean_None.pdf','PDF');
  createFile('Python_Datentypen_Boolean_None.mp4','e51df41b-baeb-4043-897a-a2103ecb4a02','OFP/Python_Datentypen_Boolean_None.mp4','VIDEO');
  createFile('Python_Datentypen_Umwandeln.pdf','fb6ac78c-acf4-42f1-8b65-ab55d1522566','OFP/Python_Datentypen_Umwandeln.pdf','PDF');
  createFile('Python_Datentypen_Umwandeln.mp4','c2affb31-d442-463f-a1fa-0aef94c24bad','OFP/Python_Datentypen_Umwandeln.mp4','VIDEO');
  createFile('Python_Kontrollstrukturen.mp4','78d7c159-7c83-4443-8838-edf61d02f7a9','OFP/Python_Kontrollstrukturen.mp4','VIDEO');
  createFile('Python_Kontrollstrukturen_if_else_Code-Beispiel.mp4','62265751-3ac6-4e84-af5f-1c8190b35a2b','OFP/Python_Kontrollstrukturen_if_else_Code-Beispiel.mp4','VIDEO');
  createFile('Python_Kontrollstrukturen_if_else_while_Code-Beispiel.pdf','7746f92a-3fc5-4566-8a04-6bab9bf3c34e','OFP/Python_Kontrollstrukturen_if_else_while_Code-Beispiel.pdf','PDF');
  createFile('Python_Kontrollstrukturen_while_Code-Beispiel.mp4','10197a89-4d56-4c27-8d0c-5b0398db9af8','OFP/Python_Kontrollstrukturen_while_Code-Beispiel.mp4','VIDEO');
  createFile('Python_Kontrollstrukturen_if_else_while.py','e2709d08-70eb-4974-800e-d7a8ea834b0d','OFP/Python_Kontrollstrukturen_if_else_while.py','CODE');
  createFile('Python_Kontrollstrukturen_for.pdf','a7a30f58-631e-4d64-9f61-c93bc59e65ea','OFP/Python_Kontrollstrukturen_for.pdf','PDF');
  createFile('Python_Kontrollstrukturen_Schleifen_for.mp4','a33456d7-0175-4dd2-b6f9-599f3a9a1305','OFP/Python_Kontrollstrukturen_Schleifen_for.mp4','VIDEO');
  createFile('Python_Kontrollstrukturen_Schleifen_for.py','1e1012c0-76bb-4bf9-8f7e-5a4b53f40e60','OFP/Python_Kontrollstrukturen_Schleifen_for.py','CODE');
  createFile('Python_Datenstrukturen_Liste.mp4','c81c925d-9104-4807-9e11-2e5e5d1f6cc4','OFP/Python_Datenstrukturen_Liste.mp4','VIDEO');
  createFile('Python_Datenstrukturen_Liste_CodeBeispiel.py','d2f03dde-b793-4d4a-8c3f-030dd01e11de','OFP/Python_Datenstrukturen_Liste_CodeBeispiel.py','CODE');
   // for ContentNode Tuple
  createFile('Python_Dictionaries_Tupel_CodeBeispiel.py','dc3a876f-2fba-4494-bf16-aa80914fdec2','OFP/Python_Dictionaries_Tupel_CodeBeispiel.py','CODE');
   // for ContentNode Dictionary
  createFile('Python_Dictionaries_Tupel_CodeBeispiel.py','24bec9c7-6e78-4b46-ba4d-a1faa644620d','OFP/Python_Dictionaries_Tupel_CodeBeispiel.py','CODE');
  createFile('Python_Funktionen.pdf','19aca104-2bd1-472b-9a5e-74f2dc5a6b1a','OFP/Python_Funktionen.pdf','PDF');
  createFile('Python_Funktionen.mp4','769f3f92-09cc-4eb4-9a5f-f6763f9d2f08','OFP/Python_Funktionen.mp4','VIDEO');
  createFile('Python_Funktionen_CodeBeispiele.py','9c563338-623f-4c75-80b4-ad24c1e11fa0','OFP/Python_Funktionen_CodeBeispiele.py','CODE');
  createFile('Python_Funktionen_CodeBeispiel_Goofspiel.zip','54ac4b8c-91ab-477d-9342-e9b019c858ca','OFP/Python_Funktionen_CodeBeispiel_Goofspiel.zip','CODE');
  createFile('Python_Funktionen_CodeBeispiel.mp4','302d6f24-b92b-45b0-b845-f7d56a403464','OFP/Python_Funktionen_CodeBeispiel.mp4','VIDEO');
  createFile('Python_Funktionen_Docstring.pdf','916876d2-d005-485d-afd9-14a36d45a5b2','OFP/Python_Funktionen_Docstring.pdf','PDF');
  createFile('Python_Funktionen_Docstring_Kommentare.mp4','81e936ec-02c4-449f-96ec-e70edc85403a','OFP/Python_Funktionen_Docstring_Kommentare.mp4','VIDEO');
  createFile('Python_Funktionen_Argumente.pdf','0586d1bc-a676-4adb-8cdb-59a27c06b232','OFP/Python_Funktionen_Argumente.pdf','PDF');
  createFile('Python_Funktionen_Argumente.mp4','155bae80-afc1-4ff1-9cac-9db40cd01e66','OFP/Python_Funktionen_Argumente.mp4','VIDEO');
  createFile('Python_Funktionen_als_Variablen.pdf','ef0c4946-e519-41fd-b9ea-9169c1ee0f67','OFP/Python_Funktionen_als_Variablen.pdf','PDF');
  createFile('Python_Funktionen_als_Variablen_a.mp4','274ca37b-beee-4cd1-972b-c2d258b75258','OFP/Python_Funktionen_als_Variablen_a.mp4','VIDEO');
  createFile('Python_Funktionen_als_Variablen_b.mp4','8f5f8470-6f2f-4fd1-9b12-0914554cc301','OFP/Python_Funktionen_als_Variablen_b.mp4','VIDEO');
  createFile('Python_Funktionen_als_Variablen_CodeBeispiel_Goofspiel.mp4','65730c57-4e80-4cb7-ad2f-a058640eaa8f','OFP/Python_Funktionen_als_Variablen_CodeBeispiel_Goofspiel.mp4','VIDEO');
  createFile('Python_Funktionen_in_ausgelagerten_Dateien.pdf','5a8cf9ca-0145-4c82-901a-fcdbb26ac401','OFP/Python_Funktionen_in_ausgelagerten_Dateien.pdf','PDF');
  createFile('Python_Funktionen_in_ausgelagerten_Dateien.mp4','b8d62fbc-2913-4319-99b2-08c5854aa054','OFP/Python_Funktionen_in_ausgelagerten_Dateien.mp4','VIDEO');
  createFile('Python_Funktionen_hoeherer_Ordnung.pdf','3817eef2-f212-41b2-9b22-70f0a934e291','OFP/Python_Funktionen_hoeherer_Ordnung.pdf','PDF');
  createFile('Python_Funktionen_hoeherer_Ordnung.mp4','4265c9b9-3149-41cc-b16b-63aeb6963dcf','OFP/Python_Funktionen_hoeherer_Ordnung.mp4','VIDEO');
  createFile('Python_Geltungsbereich_Lebensdauer_Variablen.pdf','7185bc4d-a06f-4326-9d37-932f2920ae4f','OFP/Python_Geltungsbereich_Lebensdauer_Variablen.pdf','PDF');
  createFile('Python_Geltungsbereich_Lebensdauer_Variablen.mp4','1ff4220c-821e-4bc6-b916-87e85f363d51','OFP/Python_Geltungsbereich_Lebensdauer_Variablen.mp4','VIDEO');
  createFile('Python_Mutable_Immutable.pdf','38bcbb98-a103-488d-b627-e5808a8e6780','OFP/Python_Mutable_Immutable.pdf','PDF');
  createFile('Python_mutable_immutable.mp4','b76fa07c-0c40-4b30-bd43-ccf768a7a09a','OFP/Python_mutable_immutable.mp4','VIDEO');
  createFile('Python_Rekursion.pdf','a854c7a7-b49f-42b3-bf79-b69ca27a9740','OFP/Python_Rekursion.pdf','PDF');
  createFile('Python_Rekursion.mp4','07d327af-e56c-4b05-99d3-8e35aaba650b','OFP/Python_Rekursion.mp4','VIDEO');
  createFile('Python_Rekursion_CodeBeispiel_hackeBaum.py','fa6a028b-2f42-4d67-be18-c4c41f64cafd','OFP/Python_Rekursion_CodeBeispiel_hackeBaum.py','CODE');
  createFile('Python_Rekursion_CodeBeispiel.py','a92f962a-3402-4153-ad26-fbaa5c29bdcd','OFP/Python_Rekursion_CodeBeispiel.py','CODE');
  createFile('Python_Rekursion_CodeBeispiele.mp4','5e8ff001-3c5d-4509-a897-2f8ae1a19ba2','OFP/Python_Rekursion_CodeBeispiele.mp4','VIDEO');
  createFile('Python_Rekursion_CodeBeispiele.py','d6f6f2a2-a096-4300-bd50-7a6d928537e7','OFP/Python_Rekursion_CodeBeispiele.py','CODE');
  createFile('Python_CodeBeispiel_Funktional_Rekursion_Code_Goofspiel_Final.zip','28633773-8edd-41f1-9d9b-5c60c195e40d','OFP/Python_CodeBeispiel_Funktional_Rekursion_Code_Goofspiel_Final.zip','CODE');
  createFile('Python_Rekursion_CodeBeispiel_Goofspiel.mp4','4a4d2c7b-3593-4c8f-bd6b-a2bf03856e64','OFP/Python_Rekursion_CodeBeispiel_Goofspiel.mp4','VIDEO');
  createFile('Python_FunktionaleProgrammierung_pureFunctions.pdf','658c43ba-f341-44ec-acf7-ef3da6b292bf','OFP/Python_FunktionaleProgrammierung_pureFunctions.pdf','PDF');
  createFile('Python_FunktionaleProgrammierung_pureFunctions.mp4','5fbfe84d-7a96-4e6f-ab62-8472a5f7999a','OFP/Python_FunktionaleProgrammierung_pureFunctions.mp4','VIDEO');
  createFile('Python_FunktionaleProgrammeierung_Beispiel_Goofspiel.pdf','f294a4fc-c912-40ab-9d2c-9e341d79ab3b','OFP/Python_FunktionaleProgrammeierung_Beispiel_Goofspiel.pdf','PDF');
  createFile('Python_FunktionaleProgrammierung_CodeBeispiel_Goofspiel.mp4','50cc4e39-6613-441c-bee2-60883a0ce4b7','OFP/Python_FunktionaleProgrammierung_CodeBeispiel_Goofspiel.mp4','VIDEO');
  createFile('Python_FunktionaleProgrammierung_Currying.pdf','fdaf9cbc-2335-4b93-92d2-cae6c8e8c366','OFP/Python_FunktionaleProgrammierung_Currying.pdf','PDF');
  createFile('Python_Tools_Map.pdf','4a3358bd-ed98-4e83-a6b7-1c59113b8c55','OFP/Python_Tools_Map.pdf','PDF');
  createFile('Python_Tools_Map.mp4','914cbb7d-82b5-4ac0-9e58-be128f23495d','OFP/Python_Tools_Map.mp4','VIDEO');
  createFile('Python_Datenstrukturen_Liste_CodeBeispiel.py','9a618080-fbdd-45a1-b3e2-5cbc26f8d1e7','OFP/Python_Datenstrukturen_Liste_CodeBeispiel.py','CODE');
  createFile('Python_Tools_Filter.pdf','1f5cc88f-56db-4eba-b911-362642ab6bd5','OFP/Python_Tools_Filter.pdf','PDF');
  createFile('Python_Tools_Filter_CodeBeispiele.py','165cc4be-bb61-4d3a-9f63-e4c980456a5d','OFP/Python_Tools_Filter_CodeBeispiele.py','CODE');
  createFile('Python_Datenstrukturen_Liste_CodeBeispiel.py','f13d935f-4101-4bc6-aa13-a3e665aaa83c','OFP/Python_Datenstrukturen_Liste_CodeBeispiel.py','CODE');
  createFile('Python_Tools_Filter.mp4','94c03466-3ce2-4a5e-a9b8-085c2ffca379','OFP/Python_Tools_Filter.mp4','VIDEO');
  createFile('Python_Tools_Reduce.pdf','a7ac76ff-1ac1-4de5-92ff-fd24a68619cb','OFP/Python_Tools_Reduce.pdf','PDF');
  createFile('Python_Tools_Reduce.mp4','6bdadf55-b0b3-4d65-af42-a7cca8466c8d','OFP/Python_Tools_Reduce.mp4','VIDEO');
  createFile('Python_Tools_Reduce_CodeBeispiele.py','6bfb79f3-d017-47f4-86df-de628eb0cf81','OFP/Python_Tools_Reduce_CodeBeispiele.py','CODE');
   // Beginning of Java
  createFile('Java_ErstellenVonPrgrammen.pdf','cfd5773a-cf3c-4d9a-bc23-fd52af37798e','OFP/Java_ErstellenVonPrgrammen.pdf','PDF');
  createFile('Java_SyntaktischeGrundelemente.pdf','d84e6630-244f-46f3-9fa9-4c3e391677f4','OFP/Java_SyntaktischeGrundelemente.pdf','PDF');
  createFile('Java_Datentypen.pdf','ceee4725-8691-42ae-be01-c63164ede826','OFP/Java_Datentypen.pdf','PDF');
  createFile('Java_Datentypen_Integer.pdf','b44cb78c-a8ff-4a2d-b8fa-5c0d88629667','OFP/Java_Datentypen_Integer.pdf','PDF');
  createFile('Java_Datentypen_Float.pdf','5f03b842-f8c2-4f63-8bb9-83142d6f98b3','OFP/Java_Datentypen_Float.pdf','PDF');
  createFile('Java_Datentypen_Char.pdf','5b9ff9c4-8f45-4ce2-ae79-43fee72e6ecb','OFP/Java_Datentypen_Char.pdf','PDF');
  createFile('Java_Datentypen_Boolean.pdf','ac5c805f-3619-4e90-99b5-3377c6d7458c','OFP/Java_Datentypen_Boolean.pdf','PDF');
  createFile('Java_Datentypen_String.pdf','7f4461ab-864c-4531-8656-4616b739f5fa','OFP/Java_Datentypen_String.pdf','PDF');
  createFile('Java_Datentypen_String_CodeBeispiel.zip','6168e707-a273-4cf4-9144-9f8ef201e775','OFP/Java_Datentypen_String_CodeBeispiel.zip','CODE');
  createFile('Java_Datentypen_String_Operationen.pdf','74940c23-af14-4330-a019-a3f51090d4a6','OFP/Java_Datentypen_String_Operationen.pdf','PDF');
  createFile('Java_Datentypen_String_Methoden.pdf','2960e92b-b82d-443a-8b32-ed87447c76e1','OFP/Java_Datentypen_String_Methoden.pdf','PDF');
  createFile('Java_Datentypen_Konstanten.pdf','f16f3f43-404e-44cb-b813-9de902878f39','OFP/Java_Datentypen_Konstanten.pdf','PDF');
  createFile('Java_Datentypen_Konstanten.mp4','23023ee4-4376-432e-ab0f-7cf29c0c6204','OFP/Java_Datentypen_Konstanten.mp4','VIDEO');
  createFile('Java_Datentypen_Typkonversionen.pdf','acb1bed9-2c68-4456-b748-2c635f506b32','OFP/Java_Datentypen_Typkonversionen.pdf','PDF');
  createFile('Java_Typkonversionen.mp4','73b26d8e-22e0-4ebc-9bba-cd9e006296e5','OFP/Java_Typkonversionen.mp4','VIDEO');
  createFile('Java_Variablen.pdf','89685233-4c76-4311-8e85-140d638192b0','OFP/Java_Variablen.pdf','PDF');
  createFile('Java_Variablen.mp4','4a250618-eec3-4ec9-864a-0e07d2b553d5','OFP/Java_Variablen.mp4','VIDEO');
  createFile('Java_Anweisungen_Ausdruecke.pdf','b29462eb-fdfa-41c2-8098-7931d3201f7c','OFP/Java_Anweisungen_Ausdruecke.pdf','PDF');
  createFile('Java_Anwesungen_Ausdruecke.mp4','21c7cc0d-9687-4c34-96af-6d8d714eb54d','OFP/Java_Anwesungen_Ausdruecke.mp4','VIDEO');
  createFile('Java_Anweisungen_Operatoren.pdf','e272fd46-2e10-4b71-ba54-2d9ce76e3369','OFP/Java_Anweisungen_Operatoren.pdf','PDF');
  createFile('Java_Anweisungen_Operatoren.mp4','440e4f75-5960-4f1c-b453-293c4f8e4484','OFP/Java_Anweisungen_Operatoren.mp4','VIDEO');
  createFile('Java_Anweisungen_Zuweisungen.pdf','e2815f41-b1cd-48f5-bb46-1d7403c8f7ba','OFP/Java_Anweisungen_Zuweisungen.pdf','PDF');
  createFile('Java_Anweisungen_Zuweisung.mp4','21f1a4c3-c92c-4e2d-9280-4d5d1d1adf47','OFP/Java_Anweisungen_Zuweisung.mp4','VIDEO');
  createFile('Java_Anweisungen_Block.pdf','1a63423b-646f-40b3-927f-4c3bdd4dc01b','OFP/Java_Anweisungen_Block.pdf','PDF');
  createFile('Java_Anweisungen_Block.mp4','46d89583-f737-42ac-96ee-67dabd699552','OFP/Java_Anweisungen_Block.mp4','VIDEO');
  createFile('Java_Anweisungen_Programmierkonventionen.pdf','21064003-7fec-42c1-bf24-3fb64408e567','OFP/Java_Anweisungen_Programmierkonventionen.pdf','PDF');
  createFile('Java_Kontrollstrukturen_if_else.pdf','9b507e1f-590f-4e4d-82d4-7e6343e64475','OFP/Java_Kontrollstrukturen_if_else.pdf','PDF');
  createFile('Java_Kontrollstukturen_if_else.mp4','e9858a81-ce4b-4969-85fe-99556d38e819','OFP/Java_Kontrollstukturen_if_else.mp4','VIDEO');
  createFile('Java_Kontrollstrukturen_switch.pdf','581dc905-7db5-4223-838b-264f0dcb4301','OFP/Java_Kontrollstrukturen_switch.pdf','PDF');
  createFile('Java_Kontrollstrukturen_switch.mp4','e9587ee2-72aa-46cd-8750-a8eec7fa185a','OFP/Java_Kontrollstrukturen_switch.mp4','VIDEO');
  createFile('Java_Kontrollstrukturen_Schleifen.pdf','746c83ca-40a6-46ef-a6f5-8a229767ab50','OFP/Java_Kontrollstrukturen_Schleifen.pdf','PDF');
  createFile('Java_Kontrollstrukturen_Schleifen.mp4','fdc7853c-2536-4ef2-b821-82f623b127fb','OFP/Java_Kontrollstrukturen_Schleifen.mp4','VIDEO');
  createFile('Java_Kontrollstrukturen_while.pdf','15d2c1fa-c6cf-4096-8ec7-c403ce84e552','OFP/Java_Kontrollstrukturen_while.pdf','PDF');
  createFile('Java_Kontrollstrukturen_while.mp4','9eeabe03-4fd1-42bf-ace6-d1e607a5d3dc','OFP/Java_Kontrollstrukturen_while.mp4','VIDEO');
  createFile('Java_Kontrollstrukturen_for.pdf','acf82bde-ab5e-4f91-9613-3cb9e339abf0','OFP/Java_Kontrollstrukturen_for.pdf','PDF');
  createFile('Java_Kontrollstrukturen_Schleifen_for.mp4','30fc0f03-396a-4aa7-aadc-e31f812a3b7d','OFP/Java_Kontrollstrukturen_Schleifen_for.mp4','VIDEO');
  createFile('Java_Kontrollstrukturen_for_Beispiel_BigX.mp4','2fc1faa3-550a-4714-a93c-eabeacdae78f','OFP/Java_Kontrollstrukturen_for_Beispiel_BigX.mp4','VIDEO');
  createFile('Java_Kontrollstrukturen_for_Beispiel_Game.mp4','f6e07b01-b881-497c-b9fe-edf3ed625ca0','OFP/Java_Kontrollstrukturen_for_Beispiel_Game.mp4','VIDEO');
  createFile('Java_Datenstrukturen_Array.pdf','9f2444dc-c1c9-4daa-82b9-26b916f003ae','OFP/Java_Datenstrukturen_Array.pdf','PDF');
  createFile('Java_Datenstrukturen_Array_mehrdimensional.pdf','bb1b43c5-9f89-42e1-a9d1-4e522837aba4','OFP/Java_Datenstrukturen_Array_mehrdimensional.pdf','PDF');
  createFile('Java_Datenstrukturen_Datei.pdf','a900435c-ff38-4581-b0b5-ea7a8bb19f5b','OFP/Java_Datenstrukturen_Datei.pdf','PDF');
  createFile('Java_Datenstrukturen_Datei.mp4','0fe0045b-e705-469a-b03c-f7518b289627','OFP/Java_Datenstrukturen_Datei.mp4','VIDEO');
  createFile('Java_Objekte_Objektorientierung_Einfuehrung.pdf','8e4c8072-9711-4698-9a43-337207ddcd77','OFP/Java_Objekte_Objektorientierung_Einfuehrung.pdf','PDF');
   // Red marked PDF in Kompetenzraster ?
   // await prisma.file.create({
   //   data: {
   //     name: 'Kein Dateiname gefunden!',
   //     uniqueIdentifier: '61a28945-ca5a-4376-917d-bca54b607dd3',
   //     path: 'OFP/Kein Dateiname gefunden!',
   //     type: 'PDF',
   //   },
   // });
  createFile('Java_Objekte_Erzeugung.pdf','8301ca1c-9896-4344-b47e-75b9352bc23e','OFP/Java_Objekte_Erzeugung.pdf','PDF');
  createFile('Java_Objekte_Lebensdauer_Loeschen.pdf','3b6d1967-16f1-4b42-8e74-d854d40e6951','OFP/Java_Objekte_Lebensdauer_Loeschen.pdf','PDF');
  createFile('Java_Objekte_Referenzen_Zugriff.pdf','61d2b624-53b5-4879-8485-952c1d7dcb20','OFP/Java_Objekte_Referenzen_Zugriff.pdf','PDF');
  createFile('Java_Objekte_Arrays_von_Objekten.pdf','455206d3-9539-4992-bf35-22de72eebeb7','OFP/Java_Objekte_Arrays_von_Objekten.pdf','PDF');
  createFile('Java_Objekte_Arrays_von_Objekten.mp4','58f8c18d-9384-492a-a888-cb04cab44d6e','OFP/Java_Objekte_Arrays_von_Objekten.mp4','VIDEO');
  createFile('Java_Objekte_Referenzen_Arrays_CodeBeispiel_SnailGame.zip','9f6ad498-221e-4dfc-bb43-d92e764c1512','OFP/Java_Objekte_Referenzen_Arrays_CodeBeispiel_SnailGame.zip','CODE');
  createFile('Java_Methoden_Aufruf.pdf','2d3d318f-4e05-4874-8e7f-d14921296fb2','OFP/Java_Methoden_Aufruf.pdf','PDF');
  createFile('Java_Methoden_Aufruf.mp4','e48e4f32-cde6-4945-be3f-b120b1713a23','OFP/Java_Methoden_Aufruf.mp4','VIDEO');
  createFile('Java_Methoden_Referenzen_Parameter.pdf','ab7afeb0-e17f-44e9-8be8-b17cbc8f94b9','OFP/Java_Methoden_Referenzen_Parameter.pdf','PDF');
  createFile('Java_Methoden_Referenzen_Parameter.mp4','79876b13-9a54-4588-8591-644510f129fc','OFP/Java_Methoden_Referenzen_Parameter.mp4','VIDEO');
  createFile('Java_Methoden_Ueberladen.pdf','36266628-c243-4351-9c54-72dbf08b903d','OFP/Java_Methoden_Ueberladen.pdf','PDF');
  createFile('Java_Methoden_Ueberladen.mp4','35a82a7b-2154-47e1-b3d2-20b47898197a','OFP/Java_Methoden_Ueberladen.mp4','VIDEO');
  createFile('Java_Methoden_Rekursion.pdf','7821b45e-3488-4818-930f-be6bde95f277','OFP/Java_Methoden_Rekursion.pdf','PDF');
  createFile('Java_Methoden_Rekursion.mp4','b2fab559-c5e9-417b-8340-a5b1be313da9','OFP/Java_Methoden_Rekursion.mp4','VIDEO');
  createFile('Java_UML.pdf','67eea819-ab11-42ab-8c06-3bb5ad6aab13','OFP/Java_UML.pdf','PDF');
  createFile('Java_UML.mp4','3371631e-d626-4bfd-83a3-e3a4b8a9c3ce','OFP/Java_UML.mp4','VIDEO');
  createFile('Java_UML_Beispiel_Twitter.pdf','b681b280-c818-4970-a531-2aafcf5b49c8','OFP/Java_UML_Beispiel_Twitter.pdf','PDF');
  createFile('Java_UML_Klassen.pdf','8f589647-2d48-4438-b5cf-9d4988ba00f0','OFP/Java_UML_Klassen.pdf','PDF');
  createFile('Java_UML_Klassen.mp4','d4dddc1e-5025-44ce-86bd-6813eaf394c3','OFP/Java_UML_Klassen.mp4','VIDEO');
  createFile('Java_UML_Objekte.pdf','7af88cb2-bab7-474c-a721-90b29cc868fa','OFP/Java_UML_Objekte.pdf','PDF');
  createFile('Java_UML_Objekte.mp4','23df0c13-c751-428f-86c9-6e615982aae8','OFP/Java_UML_Objekte.mp4','VIDEO');
  createFile('Java_UML_Attribute.pdf','6156a4db-89f9-4f8f-b510-37e12793acec','OFP/Java_UML_Attribute.pdf','PDF');
  createFile('Java_UML_Attribute.mp4','4c43045d-3129-4be2-afc6-e04409e0a98e','OFP/Java_UML_Attribute.mp4','VIDEO');
  createFile('Java_UML_Operationen.pdf','9ce7ca44-357a-4395-9c38-157fb9b2afb2','OFP/Java_UML_Operationen.pdf','PDF');
  createFile('Java_UML_Operationen.mp4','ef2671f7-8ed4-4b6f-ae89-8a3a7ba115df','OFP/Java_UML_Operationen.mp4','VIDEO');
  createFile('Java_UML_Assoziationen.pdf','0e0fd849-4f1a-4485-9cdf-f79c487d50a9','OFP/Java_UML_Assoziationen.pdf','PDF');
  createFile('Java_UML_Assoziationen.mp4','7d587b36-db9d-40ab-b5a9-c248dd71001f','OFP/Java_UML_Assoziationen.mp4','VIDEO');
  createFile('Java_UML_Assoziationen_Navigierbarkeit.pdf','9f8bca8c-032a-4118-9eb4-96594f14fe3c','OFP/Java_UML_Assoziationen_Navigierbarkeit.pdf','PDF');
  createFile('Java_UML_Assoziationen_Navigierbarkeit.mp4','ad65fa04-8848-499c-8654-55e3f68d1fbb','OFP/Java_UML_Assoziationen_Navigierbarkeit.mp4','VIDEO');
  createFile('Java_UML_Sichtbarkeit.pdf','98667aa3-81c3-472e-8eda-849c71e4e278','OFP/Java_UML_Sichtbarkeit.pdf','PDF');
  createFile('Java_UML_Sichtbarkeit.mp4','95017bb3-978d-4cdd-917a-ba8de3c73014','OFP/Java_UML_Sichtbarkeit.mp4','VIDEO');
  createFile('Java_UML_Vererbung_Generalisierung.pdf','15904bb0-804e-4ec1-b8f4-47b06070b23c','OFP/Java_UML_Vererbung_Generalisierung.pdf','PDF');
  createFile('Java_Vererbung_Generalisierung.mp4','536e041b-9888-4a91-acfa-908959ba9471','OFP/Java_Vererbung_Generalisierung.mp4','VIDEO');
  createFile('Java_UML_Vererbung_Abstrakte_Klassen_Operationen.pdf','464f6a24-ba4e-44b2-bcea-e066758e1b24','OFP/Java_UML_Vererbung_Abstrakte_Klassen_Operationen.pdf','PDF');
  createFile('Java_UML_Vererbung_Abstrakte_Klassen_Operationen.mp4','961e89af-cd16-4ede-ac9b-e16d8ddf9679','OFP/Java_UML_Vererbung_Abstrakte_Klassen_Operationen.mp4','VIDEO');
  createFile('Java_UML_Interfaces.pdf','46fd92aa-34de-4782-bf0c-3e5e4279c427','OFP/Java_UML_Interfaces.pdf','PDF');
  createFile('Java_UML_Interfaces.mp4','3f8ffed4-abd2-4c50-9c79-9788810b1ef3','OFP/Java_UML_Interfaces.mp4','VIDEO');
  createFile('Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip','36acc1c6-a4ec-41f1-9868-f597862a0c1a','OFP/Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip','CODE');
  createFile('Java_UML_Vererbung.pdf','6aeac450-f0f5-4235-b7df-cafcc9ae555f','OFP/Java_UML_Vererbung.pdf','PDF');
  createFile('Java_UML_Vererbung.mp4','4762eccf-5763-48d2-ab0f-21884328780c','OFP/Java_UML_Vererbung.mp4','VIDEO');
  createFile('Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip','ff59f2a4-660f-4f14-9f13-ce969939461a','OFP/Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip','CODE');
  createFile('Java_UML_Polymorphie.pdf','518e1e49-1530-450d-9935-11e1b558532a','OFP/Java_UML_Polymorphie.pdf','PDF');
  createFile('Java_UML_Polymorphie.mp4','de0b421b-5139-4136-baac-0b787b4753f3','OFP/Java_UML_Polymorphie.mp4','VIDEO');
  createFile('Java_UML_Object_Klasse.pdf','eaaf62a0-6720-469c-91c0-52b9e68bbbe6','OFP/Java_UML_Object_Klasse.pdf','PDF');
  createFile('Java_UML_Object_Klasse.mp4','a4d090b7-221c-4932-a309-ffab11522825','OFP/Java_UML_Object_Klasse.mp4','VIDEO');
  createFile('Java_Ausnahmebehandlung_Exceptions.pdf','92fec94f-be2b-4558-bf29-b623ed45131a','OFP/Java_Ausnahmebehandlung_Exceptions.pdf','PDF');
  createFile('Java_Ausnahmebehandlung_Exceptions.mp4','570d6e9a-69cc-4479-abda-431dc9e17355','OFP/Java_Ausnahmebehandlung_Exceptions.mp4','VIDEO');
  createFile('Java_Ausnahmebehandlung_Werfen_Behandeln.pdf','f22f543e-2cbc-48aa-a268-549bbcdf8e34','OFP/Java_Ausnahmebehandlung_Werfen_Behandeln.pdf','PDF');
  createFile('Java_Ausnahmebehandlung_Werfen_Behandeln.mp4','c5228462-fbf2-477a-965b-31a18ecef87d','OFP/Java_Ausnahmebehandlung_Werfen_Behandeln.mp4','VIDEO');
  createFile('Java_Ausnahmebehandlung_Werfen_Behandeln_Beispiel.mp4','21699b3f-2e32-45e2-a0a5-f671a0f98694','OFP/Java_Ausnahmebehandlung_Werfen_Behandeln_Beispiel.mp4','VIDEO');
  createFile('Java_Exceptionhandling_CodeBeispiel_WordleClass.zip','0c24b88b-ea6b-49f5-b6e2-a2ba29305814','OFP/Java_Exceptionhandling_CodeBeispiel_WordleClass.zip','CODE');
  createFile('Java_Dateien_Streams.pdf','28d36645-53cb-48fe-93cc-2dc2b3876c8a','OFP/Java_Dateien_Streams.pdf','PDF');
  createFile('Java_Dateien_Streams.mp4','ff472184-baa6-4bd0-92ed-2ca9e91215f9','OFP/Java_Dateien_Streams.mp4','VIDEO');
  createFile('Java_Dateien_Serialisierung.pdf','1e770da7-7997-4b68-870b-b217491e3b49','OFP/Java_Dateien_Serialisierung.pdf','PDF');
  createFile('Java_Dateien_Serialisierung.mp4','e870474f-0b0d-4268-b517-a861b8f795a6','OFP/Java_Dateien_Serialisierung.mp4','VIDEO');
  createFile('Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java','922d59cb-9209-4533-a6a7-80f0b501a2f0','OFP/Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java','CODE');
  createFile('Java_Dateien_Formatierte_IO.pdf','85929eed-e41b-4ad3-8824-fe50066cefdf','OFP/Java_Dateien_Formatierte_IO.pdf','PDF');
  createFile('Java_Formatierte_IO.mp4','755c961e-2b0f-46a7-bcf0-eae69016c103','OFP/Java_Formatierte_IO.mp4','VIDEO');
  createFile('Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java','fab0567f-4eac-4351-a5b1-ea323b1549be','OFP/Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java','CODE');
  createFile('Java_Threads.pdf','1b9afa84-fae6-4682-b16a-8bdb3def80d3','OFP/Java_Threads.pdf','PDF');
  createFile('Java_Sockets.pdf','cd49aafd-4a0a-4670-b4d7-83ba456fcfd3','OFP/Java_Sockets.pdf','PDF');
  createFile('Java_Sockets_Server_Sockets.pdf','fe681e57-e984-4ef6-9bbc-0c6ddc6fc85e','OFP/Java_Sockets_Server_Sockets.pdf','PDF');
 }



async function createFile(name: string, uniqueIdentifier: string, path: string, type: string) {
  const file = await prisma.file.create({
    data: {
      name,
      uniqueIdentifier,
      path,
      type,
    },
  });
  if (createEmbeddings) {
    await seedAllEmbeddingsForVideo(file, "OFP");
  }
  return file;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
