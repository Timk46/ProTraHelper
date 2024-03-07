import { PrismaClient, contentElementType } from '@prisma/client';
import { faker, hy } from '@faker-js/faker';
import { ConsoleLogger } from '@nestjs/common';
import { Console } from 'console';
import * as XLSX from 'xlsx';
import { WorkSheet, utils } from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface excel_Aufgabe {
  Id: number;
  Titel: string;
  Task: string;
  Programming_Language: string;
  Test: string;
  Task_html: string;
  codeName: string;
  countInputArgs: number;
  ConceptNodeID: number;
}

interface excel_Codegeruest {
  id: number;
  taskId: number;
  fileName: string;
  code: string;
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
  createFilesRNI();

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
    const columnDescriptionId = 9;
    const columnElementId = [10, 11, 12, 13, 14];
    const columnContentNodeTitle = 15;
    const columnContentDescription = 16;

    //in case the topic column for the Content is empty we need to save the last topic
    let lastTopic = 'No topic found!';

    // Iterate through the excelData and insert records into your Prisma database
    for (const { rowIndex, row } of excelData.map((row, rowIndex) => ({
      rowIndex,
      row,
    }))) {
      let ParentId = 1;
      if (row[columnParentId] && !isNaN(+row[columnParentId])) {
        ParentId = row[columnParentId];
      }
      if (row[columnContentId] && !isNaN(+row[columnContentId])) {
        //import contentNodes from excelData

        // Save the last topic in case there are multiple contentNodes for the same topic
        if (row[columnTopicId]) {
          lastTopic = row[columnTopicId];
        }

        //contentNodes from excelData
        await prisma.contentNode.create({
          data: {
            id: +row[columnContentId],
            name: row[columnContentNodeTitle]
              ? row[columnContentNodeTitle].toString()
              : lastTopic,
            description: row[columnContentDescription]
              ? row[columnContentDescription].toString()
              : null,
          },
        });
        //loop through all contentElement columns
        for (const elementId in columnElementId) {
          if (
            row[columnElementId[elementId]] &&
            row[columnElementId[elementId]].replace(/\s/g, '').length > 0
          ) {
            //find corresponding file
            const file = await prisma.file.findUnique({
              where: { uniqueIdentifier: row[columnElementId[elementId]] },
            });

            //create ContentElements
            if (file) {
              const TempContentElement = await prisma.contentElement.create({
                data: {
                  type: contentElementType[file.type],
                  title: file.name,
                },
              });
              //connect file to contentElement
              await prisma.file.update({
                where: { uniqueIdentifier: row[columnElementId[elementId]] },
                data: {
                  contentElement: { connect: { id: TempContentElement.id } },
                },
              });
              //connect contentView
              await prisma.contentView.create({
                data: {
                  contentNode: {
                    connect: { id: +row[columnContentId] },
                  },
                  contentElement: {
                    connect: { id: TempContentElement.id },
                  },
                  position: +elementId + 1,
                },
              });
            } else {
              console.log(
                'File with uniqueIdentifier ' +
                  row[columnElementId[elementId]] +
                  ' not found!',
              );
            }
          }
        }
      }
      //Concept
      if (row[columnConceptId] && !isNaN(+row[columnConceptId])) {
        // Save the last topic of each topic column
        // First element reserved for root ConceptNodes

        if (row[columnTopicId]) {
          //ConceptNode
          await prisma.conceptNode.create({
            data: {
              id: +row[columnConceptId],
              name: row[columnTopicId],
              description: row[columnDescriptionId]
                ? row[columnDescriptionId].toString()
                : null,
            },
          });
          await prisma.conceptFamily.create({
            data: {
              childId: +row[columnConceptId],
              parentId: +ParentId,
            },
          });
          if (row[columnConceptEdge]) {
            //split the string in case of multiple entrees in the same cell
            if (row[columnConceptEdge].toString().includes(',')) {
              const edges = row[columnConceptEdge].split(',');
              for (const edge in edges) {
                await prisma.conceptEdge.create({
                  data: {
                    prerequisiteId: +edges[edge],
                    successorId: +row[columnConceptId],
                    parentId: +ParentId,
                  },
                });
              }
              //if there is only one entry in the cell make sure it is a number
            } else if (typeof row[columnConceptEdge] === 'number') {
              await prisma.conceptEdge.create({
                data: {
                  prerequisiteId: +row[columnConceptEdge],
                  successorId: +row[columnConceptId],
                  parentId: +ParentId,
                },
              });
            }
          }
          //create moduleConceptGoals for each conceptNode
          await prisma.moduleConceptGoal.create({
            data: {
              moduleId: moduleInformatik.id,
              conceptNodeId: +row[columnConceptId],
              level: +row[columnModuleGoalId], // random number between 0 and 6
            },
          });
        }
      }
      //End of Concepts

      // //Training
      if (
        row[columnTrainsId] &&
        row[columnContentId] &&
        !isNaN(+row[columnContentId])
      ) {
        //split the string in case of multiple entrees in the same cell
        if (row[columnTrainsId].toString().includes(',')) {
          const trains = row[columnTrainsId].split(',');
          for (const train in trains) {
            await prisma.training.create({
              data: {
                contentNode: {
                  connect: { id: +row[columnContentId] },
                },
                conceptNode: {
                  connect: { id: +trains[train] },
                },
                awards: +row[columnLevelId],
              },
            });
          }
          //if there is only one entry in the cell make sure it is a number
        } else if (typeof row[columnTrainsId] === 'number') {
          const trains = row[columnTrainsId];
          await prisma.training.create({
            data: {
              contentNode: {
                connect: { id: +row[columnContentId] },
              },
              conceptNode: {
                connect: { id: +trains },
              },
              awards: +row[columnLevelId],
            },
          });
        }
      }
      //Requirement
      if (
        row[columnRequiresId] &&
        row[columnContentId] &&
        !isNaN(+row[columnContentId])
      ) {
        //split the string in case of multiple entrees in the same cell
        if (row[columnRequiresId].toString().includes(',')) {
          const requirement = row[columnRequiresId].split(',');
          for (const requires in requirement) {
            console.log(row[columnRequiresId]);
            await prisma.requirement.create({
              data: {
                contentNode: {
                  connect: { id: +row[columnContentId] },
                },
                conceptNode: {
                  connect: { id: +requirement[requires] },
                },
              },
            });
          }
          //if there is only one entry in the cell make sure it is a number
        } else if (typeof row[columnRequiresId] === 'number') {
          const requirement = row[columnRequiresId];
          await prisma.requirement.create({
            data: {
              contentNode: {
                connect: { id: +row[columnContentId] },
              },
              conceptNode: {
                connect: { id: +requirement },
              },
            },
          });
        }
      }
    }

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

  // Question
  const conceptNodeForMCQ = await prisma.conceptNode.findUnique({
    where: { id: 8 },
  });

  const question = await prisma.question.create({
    data: {
      name: 'Primitiver Datentyp',
      description: 'The first MC-Question in HeFL',
      score: 2,
      type: 'MC',
      author: { connect: { id: adminUser.id } },
      text: 'Welcher der folgenden Datentypen in Java ist primitiv?',
      conceptNode: { connect: { id: conceptNodeForMCQ.id } },
      isApproved: true,
      version: 1,
    },
  });
  // connect it to itself
  await prisma.question.update({
    where: { id: question.id },
    data: { origin: { connect: { id: question.id } } },
  });

  /*
    const questionVersion = await prisma.questionVersion.create({
      data: {
          question: { connect: { id: question.id } },
          version: 1
      },
    });
    */

  const mcQuestion = await prisma.mCQuestion.create({
    data: {
      isSC: false,
      question: { connect: { id: question.id } },
    },
  });

  const mcOption1 = await prisma.mCOption.create({
    data: {
      text: 'String',
      is_correct: false,
    },
  });

  const mcOption2 = await prisma.mCOption.create({
    data: {
      text: 'int',
      is_correct: true,
    },
  });

  const mcOption3 = await prisma.mCOption.create({
    data: {
      text: 'double',
      is_correct: true,
    },
  });

  const mcOption4 = await prisma.mCOption.create({
    data: {
      text: 'ArrayList',
      is_correct: false,
    },
  });

  const mcQuestionOption1 = await prisma.mCQuestionOption.create({
    data: {
      question: { connect: { id: mcQuestion.id } },
      option: { connect: { id: mcOption1.id } },
    },
  });

  const mcQuestionOption2 = await prisma.mCQuestionOption.create({
    data: {
      question: { connect: { id: mcQuestion.id } },
      option: { connect: { id: mcOption2.id } },
    },
  });

  const mcQuestionOption3 = await prisma.mCQuestionOption.create({
    data: {
      question: { connect: { id: mcQuestion.id } },
      option: { connect: { id: mcOption3.id } },
    },
  });

  const mcQuestionOption4 = await prisma.mCQuestionOption.create({
    data: {
      question: { connect: { id: mcQuestion.id } },
      option: { connect: { id: mcOption4.id } },
    },
  });

  // Free Text Question
  const questionFreeText = await prisma.question.create({
    data: {
      name: 'Primitive Datentypen in Python',
      description: 'Beschreibung primitiver Datentyp',
      score: 5,
      type: 'FreeText',
      author: { connect: { id: adminUser.id } },
      text: 'Beschreibe in eigenen Worten, was ein primitiver Datentyp ist. Beschreibe dabei zu den folgenden Aspekten: Definition, Eigenschaften, Beispiele, Speicherung und Unterscheidung zu nicht-primitiven Datentypen.',
      conceptNode: { connect: { id: conceptNodeForMCQ.id } },
      isApproved: true,
      version: 1,
    },
  });
  // connect it to itself
  await prisma.question.update({
    where: { id: questionFreeText.id },
    data: { origin: { connect: { id: questionFreeText.id } } },
  });

  await prisma.freeTextQuestion.create({
    data: {
      expectations: `
          Folgende Punkte sollten beachtet werden, dabei wird für jeden korrekten Aspekt ein Punkt vergeben:
          1. Definition: Eine Erklärung, was ein primitiver Datentyp ist.
          2. Eigenschaften: Die grundlegenden Eigenschaften primitiver Datentypen, wie zum Beispiel Unveränderlichkeit und Einfachheit.
          3. Beispiele: Nennung einiger Beispiele für primitive Datentypen. Es reicht ein Beispiel, um den Punkt zu erhalten.
          4. Speicherung: Eine grobe Erklärung, wie primitive Datentypen im Speicher abgelegt werden. Es reicht ein oberflächlicher Einblick.
          5. Unterscheidung: Der grobe Unterschied zwischen primitiven und nicht-primitiven Datentypen. Es reicht eine implizite Erklärung.
          Es soll freundlich bewertet werden, da lediglich ein knappes Anreißen der Aspekte erwartet wird und keine detaillierte Analyse.
          Sollten Details in der Antwort fehlen, kann ein Punkt immernoch als richtig bewertet werden, wenn ein Teil richtig ist.
          `,
      exampleSolution: `
          Ein primitiver Datentyp ist ein grundlegender Datentyp, der in einer Programmiersprache zur Darstellung einfacher Werte verwendet wird.
          Diese Datentypen sind in der Regel direkt in die Sprache integriert und bieten eine grundlegende Möglichkeit, Daten zu speichern und zu manipulieren,
          ohne dass komplexe Strukturen oder Operationen erforderlich sind.
          Primitive Datentypen sind in der Regel unveränderlich, was bedeutet, dass ihre Werte nach der Erstellung nicht mehr geändert werden können.
          Sie repräsentieren einfache Werte und haben in der Regel keine eingebauten Methoden oder Funktionen zur Manipulation.
          Beispiele für primitive Datentypen: Integer (int), Float (float), Complex (complex), String (str), Boolean (bool)
          Primitive Datentypen werden in der Regel direkt im Speicher abgelegt und benötigen eine feste Menge an Speicherplatz, der je nach Typ variieren kann.
          Zum Beispiel benötigt ein Integer normalerweise 4 oder 8 Bytes, abhängig von der Plattform.
          Primitive Datentypen repräsentieren einfache Werte und haben keine eingebauten Methoden oder Funktionen zur Manipulation.
          Nicht-primitive Datentypen (auch als zusammengesetzte oder zusammengesetzte Datentypen bezeichnet) können komplexe Strukturen wie Listen, Tupel,
          Mengen und Wörterbücher darstellen und bieten eingebaute Methoden und Funktionen zur Manipulation dieser Datenstrukturen.
        `,
      question: { connect: { id: questionFreeText.id } },
    },
  });

  // connect it to itself
  await prisma.question.update({
    where: { id: questionFreeText.id },
    data: { origin: { connect: { id: questionFreeText.id } } },
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

  // Import Tasks for Excel
  console.log('Importing Tasks from Excel...');
  const filePathTasks =
    process.env.FILE_PATH + 'wise2324_OFP_workshop_aufgaben.xlsx';
  const workbook = XLSX.readFile(filePathTasks);

  const taskSheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
  const tasks: excel_Aufgabe[] = utils.sheet_to_json(taskSheet);
  const codeSheet: WorkSheet = workbook.Sheets[workbook.SheetNames[1]];
  const codes: excel_Codegeruest[] = utils.sheet_to_json(codeSheet);

  for (const task of tasks) {
    const conceptNode = await prisma.conceptNode.findFirst({
      where: {
        id: task.ConceptNodeID,
      },
    });

    const newTask = await prisma.question.create({
      data: {
        name: task.Titel,
        description:
          'automated Import from Excel - JACK Tasks from SoSe 2023 and LiveCodingTasks for Exampreperation WiSe2324',
        score: 100, // this is the max score for all tasks currently (=100%)
        type: 'CodingQuestion',
        author: { connect: { id: adminUser.id } },
        text: task.Task,
        conceptNode: { connect: { id: conceptNode.id } },
        isApproved: true,
        codingQuestions: {
          create: {
            text: task.Task,
            textHTML: task.Task_html,
            mainFileName: task.codeName,
            programmingLanguage: task.Programming_Language,
            count_InputArgs: task.countInputArgs,
            automatedTests: {
              create: [
                {
                  code: task.Test,
                  // Not using this model for testcases yet. All in one code currently
                  //testcase: {
                  //  create: {
                  //    input: task.Test,
                  //    output: "1",
                  //  },
                  //},
                },
              ],
            },
            codeGerueste: {
              // add all codegerueste with matching taskId
              create: codes
                .filter((code) => code.taskId === task.Id)
                .map((filteredCode) => ({
                  codeFileName: filteredCode.fileName,
                  code: filteredCode.code,
                })),
            },
          },
        },
      },
    });

    // connect it to itself
    await prisma.question.update({
      where: { id: newTask.id },
      data: { origin: { connect: { id: newTask.id } } },
    });
  }

  console.log('Importing Done!');
}

async function createFilesOFP() {
  console.log('Creating Files for OFP...');

  await prisma.file.create({
    data: {
      name: 'Python_Einfuehrung_Motivation.pdf',
      uniqueIdentifier: 'c7b42b44-2aa9-4041-9816-680af38d5f8f',
      path: 'OFP/Python_Einfuehrung_Motivation.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Einfuehrung_Installation.pdf',
      uniqueIdentifier: '6d66e5c1-3a03-4ad3-8c23-5c7fb7b90ea2',
      path: 'OFP/Python_Einfuehrung_Installation.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Einfuehrung_Motivation.mp4',
      uniqueIdentifier: '43150eb1-e82d-4a63-8073-45b6ae026171',
      path: 'OFP/Python_Einfuehrung_Motivation.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Einfuehrung_Variablen.pdf',
      uniqueIdentifier: '3903342b-bb39-4592-8b4d-364800f09ba7',
      path: 'OFP/Python_Einfuehrung_Variablen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Variablen.mp4',
      uniqueIdentifier: '00c25c46-8346-4d81-86a6-3dbc39e4a6e3',
      path: 'OFP/Python_Variablen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Einfuehrung_Anweisungen_Ausdruecke.pdf',
      uniqueIdentifier: '6de52e3c-8bf7-4f10-b4bc-11f633d3fd50',
      path: 'OFP/Python_Einfuehrung_Anweisungen_Ausdruecke.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Anweisungen_Ausdruecke.mp4',
      uniqueIdentifier: '9ce7cb4b-8dc6-49ad-990a-76d73bf31ef7',
      path: 'OFP/Python_Anweisungen_Ausdruecke.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Strings.pdf',
      uniqueIdentifier: 'ad1eb799-2e9e-4279-b396-2788a52a2c28',
      path: 'OFP/Python_Datentypen_Strings.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_String.mp4',
      uniqueIdentifier: '46d632d3-e5be-4872-86da-be692e81e424',
      path: 'OFP/Python_Datentypen_String.mp4',
      type: 'VIDEO',
    },
  });
  // for ContentNode Integer
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Zahlen.pdf',
      uniqueIdentifier: 'e6e07da5-6eb5-4e34-a7b0-944cbdb4d484',
      path: 'OFP/Python_Datentypen_Zahlen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Zahlen.mp4',
      uniqueIdentifier: '74feba64-e05e-4f58-83dd-fcaf65406b5d',
      path: 'OFP/Python_Datentypen_Zahlen.mp4',
      type: 'VIDEO',
    },
  });
  // for ContentNode Float
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Zahlen.pdf',
      uniqueIdentifier: '0da90d38-8a08-4714-bfdd-a99c86f1e982',
      path: 'OFP/Python_Datentypen_Zahlen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Zahlen.mp4',
      uniqueIdentifier: '02f37e4b-e28c-4eb0-ad16-9fd02d346f61',
      path: 'OFP/Python_Datentypen_Zahlen.mp4',
      type: 'VIDEO',
    },
  });
  // for ContentNode Complex
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Zahlen.pdf',
      uniqueIdentifier: 'b4d5191b-7b2c-4047-833e-c27417f4e345',
      path: 'OFP/Python_Datentypen_Zahlen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Zahlen.mp4',
      uniqueIdentifier: '47ace2db-fe3b-4dcd-ae92-d5d00a12843d',
      path: 'OFP/Python_Datentypen_Zahlen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Operationen.pdf',
      uniqueIdentifier: '03efcfad-eda1-4b7c-9ccf-d75f50fa3e5e',
      path: 'OFP/Python_Datentypen_Operationen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Operationen.mp4',
      uniqueIdentifier: '01600171-cee2-4c72-a432-8127c2788391',
      path: 'OFP/Python_Datentypen_Operationen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Boolean_None.pdf',
      uniqueIdentifier: '34e378fc-083d-4cf2-be91-49fd8832b619',
      path: 'OFP/Python_Datentypen_Boolean_None.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Boolean_None.mp4',
      uniqueIdentifier: 'ce6d2406-f733-473b-ad99-ff339462c919',
      path: 'OFP/Python_Datentypen_Boolean_None.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Boolean_None.pdf',
      uniqueIdentifier: '489bad95-fd32-46e7-952b-268c283cfe4a',
      path: 'OFP/Python_Datentypen_Boolean_None.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Boolean_None.mp4',
      uniqueIdentifier: 'e51df41b-baeb-4043-897a-a2103ecb4a02',
      path: 'OFP/Python_Datentypen_Boolean_None.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Umwandeln.pdf',
      uniqueIdentifier: 'fb6ac78c-acf4-42f1-8b65-ab55d1522566',
      path: 'OFP/Python_Datentypen_Umwandeln.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datentypen_Umwandeln.mp4',
      uniqueIdentifier: 'c2affb31-d442-463f-a1fa-0aef94c24bad',
      path: 'OFP/Python_Datentypen_Umwandeln.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen.mp4',
      uniqueIdentifier: '78d7c159-7c83-4443-8838-edf61d02f7a9',
      path: 'OFP/Python_Kontrollstrukturen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen_if_else_Code-Beispiel.mp4',
      uniqueIdentifier: '62265751-3ac6-4e84-af5f-1c8190b35a2b',
      path: 'OFP/Python_Kontrollstrukturen_if_else_Code-Beispiel.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen_if_else_while_Code-Beispiel.pdf',
      uniqueIdentifier: '7746f92a-3fc5-4566-8a04-6bab9bf3c34e',
      path: 'OFP/Python_Kontrollstrukturen_if_else_while_Code-Beispiel.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen_while_Code-Beispiel.mp4',
      uniqueIdentifier: '10197a89-4d56-4c27-8d0c-5b0398db9af8',
      path: 'OFP/Python_Kontrollstrukturen_while_Code-Beispiel.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen_if_else_while.py',
      uniqueIdentifier: 'e2709d08-70eb-4974-800e-d7a8ea834b0d',
      path: 'OFP/Python_Kontrollstrukturen_if_else_while.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen_for.pdf',
      uniqueIdentifier: 'a7a30f58-631e-4d64-9f61-c93bc59e65ea',
      path: 'OFP/Python_Kontrollstrukturen_for.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen_Schleifen_for.mp4',
      uniqueIdentifier: 'a33456d7-0175-4dd2-b6f9-599f3a9a1305',
      path: 'OFP/Python_Kontrollstrukturen_Schleifen_for.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Kontrollstrukturen_Schleifen_for.py',
      uniqueIdentifier: '1e1012c0-76bb-4bf9-8f7e-5a4b53f40e60',
      path: 'OFP/Python_Kontrollstrukturen_Schleifen_for.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datenstrukturen_Liste.mp4',
      uniqueIdentifier: 'c81c925d-9104-4807-9e11-2e5e5d1f6cc4',
      path: 'OFP/Python_Datenstrukturen_Liste.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datenstrukturen_Liste_CodeBeispiel.py',
      uniqueIdentifier: 'd2f03dde-b793-4d4a-8c3f-030dd01e11de',
      path: 'OFP/Python_Datenstrukturen_Liste_CodeBeispiel.py',
      type: 'CODE',
    },
  });
  // for ContentNode Tuple
  await prisma.file.create({
    data: {
      name: 'Python_Dictionaries_Tupel_CodeBeispiel.py',
      uniqueIdentifier: 'dc3a876f-2fba-4494-bf16-aa80914fdec2',
      path: 'OFP/Python_Dictionaries_Tupel_CodeBeispiel.py',
      type: 'CODE',
    },
  });
  // for ContentNode Dictionary
  await prisma.file.create({
    data: {
      name: 'Python_Dictionaries_Tupel_CodeBeispiel.py',
      uniqueIdentifier: '24bec9c7-6e78-4b46-ba4d-a1faa644620d',
      path: 'OFP/Python_Dictionaries_Tupel_CodeBeispiel.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen.pdf',
      uniqueIdentifier: '19aca104-2bd1-472b-9a5e-74f2dc5a6b1a',
      path: 'OFP/Python_Funktionen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen.mp4',
      uniqueIdentifier: '769f3f92-09cc-4eb4-9a5f-f6763f9d2f08',
      path: 'OFP/Python_Funktionen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_CodeBeispiele.py',
      uniqueIdentifier: '9c563338-623f-4c75-80b4-ad24c1e11fa0',
      path: 'OFP/Python_Funktionen_CodeBeispiele.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_CodeBeispiel_Goofspiel.zip',
      uniqueIdentifier: '54ac4b8c-91ab-477d-9342-e9b019c858ca',
      path: 'OFP/Python_Funktionen_CodeBeispiel_Goofspiel.zip',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_CodeBeispiel.mp4',
      uniqueIdentifier: '302d6f24-b92b-45b0-b845-f7d56a403464',
      path: 'OFP/Python_Funktionen_CodeBeispiel.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_Docstring.pdf',
      uniqueIdentifier: '916876d2-d005-485d-afd9-14a36d45a5b2',
      path: 'OFP/Python_Funktionen_Docstring.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_Docstring_Kommentare.mp4',
      uniqueIdentifier: '81e936ec-02c4-449f-96ec-e70edc85403a',
      path: 'OFP/Python_Funktionen_Docstring_Kommentare.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_Argumente.pdf',
      uniqueIdentifier: '0586d1bc-a676-4adb-8cdb-59a27c06b232',
      path: 'OFP/Python_Funktionen_Argumente.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_Argumente.mp4',
      uniqueIdentifier: '155bae80-afc1-4ff1-9cac-9db40cd01e66',
      path: 'OFP/Python_Funktionen_Argumente.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_als_Variablen.pdf',
      uniqueIdentifier: 'ef0c4946-e519-41fd-b9ea-9169c1ee0f67',
      path: 'OFP/Python_Funktionen_als_Variablen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_als_Variablen_a.mp4',
      uniqueIdentifier: '274ca37b-beee-4cd1-972b-c2d258b75258',
      path: 'OFP/Python_Funktionen_als_Variablen_a.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_als_Variablen_b.mp4',
      uniqueIdentifier: '8f5f8470-6f2f-4fd1-9b12-0914554cc301',
      path: 'OFP/Python_Funktionen_als_Variablen_b.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_als_Variablen_CodeBeispiel_Goofspiel.mp4',
      uniqueIdentifier: '65730c57-4e80-4cb7-ad2f-a058640eaa8f',
      path: 'OFP/Python_Funktionen_als_Variablen_CodeBeispiel_Goofspiel.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_in_ausgelagerten_Dateien.pdf',
      uniqueIdentifier: '5a8cf9ca-0145-4c82-901a-fcdbb26ac401',
      path: 'OFP/Python_Funktionen_in_ausgelagerten_Dateien.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_in_ausgelagerten_Dateien.mp4',
      uniqueIdentifier: 'b8d62fbc-2913-4319-99b2-08c5854aa054',
      path: 'OFP/Python_Funktionen_in_ausgelagerten_Dateien.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_hoeherer_Ordnung.pdf',
      uniqueIdentifier: '3817eef2-f212-41b2-9b22-70f0a934e291',
      path: 'OFP/Python_Funktionen_hoeherer_Ordnung.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Funktionen_hoeherer_Ordnung.mp4',
      uniqueIdentifier: '4265c9b9-3149-41cc-b16b-63aeb6963dcf',
      path: 'OFP/Python_Funktionen_hoeherer_Ordnung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Geltungsbereich_Lebensdauer_Variablen.pdf',
      uniqueIdentifier: '7185bc4d-a06f-4326-9d37-932f2920ae4f',
      path: 'OFP/Python_Geltungsbereich_Lebensdauer_Variablen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Geltungsbereich_Lebensdauer_Variablen.mp4',
      uniqueIdentifier: '1ff4220c-821e-4bc6-b916-87e85f363d51',
      path: 'OFP/Python_Geltungsbereich_Lebensdauer_Variablen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Mutable_Immutable.pdf',
      uniqueIdentifier: '38bcbb98-a103-488d-b627-e5808a8e6780',
      path: 'OFP/Python_Mutable_Immutable.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_mutable_immutable.mp4',
      uniqueIdentifier: 'b76fa07c-0c40-4b30-bd43-ccf768a7a09a',
      path: 'OFP/Python_mutable_immutable.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Rekursion.pdf',
      uniqueIdentifier: 'a854c7a7-b49f-42b3-bf79-b69ca27a9740',
      path: 'OFP/Python_Rekursion.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Rekursion.mp4',
      uniqueIdentifier: '07d327af-e56c-4b05-99d3-8e35aaba650b',
      path: 'OFP/Python_Rekursion.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Rekursion_CodeBeispiel_hackeBaum.py',
      uniqueIdentifier: 'fa6a028b-2f42-4d67-be18-c4c41f64cafd',
      path: 'OFP/Python_Rekursion_CodeBeispiel_hackeBaum.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Rekursion_CodeBeispiel.py',
      uniqueIdentifier: 'a92f962a-3402-4153-ad26-fbaa5c29bdcd',
      path: 'OFP/Python_Rekursion_CodeBeispiel.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Rekursion_CodeBeispiele.mp4',
      uniqueIdentifier: '5e8ff001-3c5d-4509-a897-2f8ae1a19ba2',
      path: 'OFP/Python_Rekursion_CodeBeispiele.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Rekursion_CodeBeispiele.py',
      uniqueIdentifier: 'd6f6f2a2-a096-4300-bd50-7a6d928537e7',
      path: 'OFP/Python_Rekursion_CodeBeispiele.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_CodeBeispiel_Funktional_Rekursion_Code_Goofspiel_Final.zip',
      uniqueIdentifier: '28633773-8edd-41f1-9d9b-5c60c195e40d',
      path: 'OFP/Python_CodeBeispiel_Funktional_Rekursion_Code_Goofspiel_Final.zip',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Rekursion_CodeBeispiel_Goofspiel.mp4',
      uniqueIdentifier: '4a4d2c7b-3593-4c8f-bd6b-a2bf03856e64',
      path: 'OFP/Python_Rekursion_CodeBeispiel_Goofspiel.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_FunktionaleProgrammierung_pureFunctions.pdf',
      uniqueIdentifier: '658c43ba-f341-44ec-acf7-ef3da6b292bf',
      path: 'OFP/Python_FunktionaleProgrammierung_pureFunctions.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_FunktionaleProgrammierung_pureFunctions.mp4',
      uniqueIdentifier: '5fbfe84d-7a96-4e6f-ab62-8472a5f7999a',
      path: 'OFP/Python_FunktionaleProgrammierung_pureFunctions.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_FunktionaleProgrammeierung_Beispiel_Goofspiel.pdf',
      uniqueIdentifier: 'f294a4fc-c912-40ab-9d2c-9e341d79ab3b',
      path: 'OFP/Python_FunktionaleProgrammeierung_Beispiel_Goofspiel.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_FunktionaleProgrammierung_CodeBeispiel_Goofspiel.mp4',
      uniqueIdentifier: '50cc4e39-6613-441c-bee2-60883a0ce4b7',
      path: 'OFP/Python_FunktionaleProgrammierung_CodeBeispiel_Goofspiel.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_FunktionaleProgrammierung_Currying.pdf',
      uniqueIdentifier: 'fdaf9cbc-2335-4b93-92d2-cae6c8e8c366',
      path: 'OFP/Python_FunktionaleProgrammierung_Currying.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Map.pdf',
      uniqueIdentifier: '4a3358bd-ed98-4e83-a6b7-1c59113b8c55',
      path: 'OFP/Python_Tools_Map.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Map.mp4',
      uniqueIdentifier: '914cbb7d-82b5-4ac0-9e58-be128f23495d',
      path: 'OFP/Python_Tools_Map.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datenstrukturen_Liste_CodeBeispiel.py',
      uniqueIdentifier: '9a618080-fbdd-45a1-b3e2-5cbc26f8d1e7',
      path: 'OFP/Python_Datenstrukturen_Liste_CodeBeispiel.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Filter.pdf',
      uniqueIdentifier: '1f5cc88f-56db-4eba-b911-362642ab6bd5',
      path: 'OFP/Python_Tools_Filter.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Filter_CodeBeispiele.py',
      uniqueIdentifier: '165cc4be-bb61-4d3a-9f63-e4c980456a5d',
      path: 'OFP/Python_Tools_Filter_CodeBeispiele.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Datenstrukturen_Liste_CodeBeispiel.py',
      uniqueIdentifier: 'f13d935f-4101-4bc6-aa13-a3e665aaa83c',
      path: 'OFP/Python_Datenstrukturen_Liste_CodeBeispiel.py',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Filter.mp4',
      uniqueIdentifier: '94c03466-3ce2-4a5e-a9b8-085c2ffca379',
      path: 'OFP/Python_Tools_Filter.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Reduce.pdf',
      uniqueIdentifier: 'a7ac76ff-1ac1-4de5-92ff-fd24a68619cb',
      path: 'OFP/Python_Tools_Reduce.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Reduce.mp4',
      uniqueIdentifier: '6bdadf55-b0b3-4d65-af42-a7cca8466c8d',
      path: 'OFP/Python_Tools_Reduce.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Python_Tools_Reduce_CodeBeispiele.py',
      uniqueIdentifier: '6bfb79f3-d017-47f4-86df-de628eb0cf81',
      path: 'OFP/Python_Tools_Reduce_CodeBeispiele.py',
      type: 'CODE',
    },
  });
  // Beginning of Java
  await prisma.file.create({
    data: {
      name: 'Java_ErstellenVonPrgrammen.pdf',
      uniqueIdentifier: 'cfd5773a-cf3c-4d9a-bc23-fd52af37798e',
      path: 'OFP/Java_ErstellenVonPrgrammen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_SyntaktischeGrundelemente.pdf',
      uniqueIdentifier: 'd84e6630-244f-46f3-9fa9-4c3e391677f4',
      path: 'OFP/Java_SyntaktischeGrundelemente.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen.pdf',
      uniqueIdentifier: 'ceee4725-8691-42ae-be01-c63164ede826',
      path: 'OFP/Java_Datentypen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_Integer.pdf',
      uniqueIdentifier: 'b44cb78c-a8ff-4a2d-b8fa-5c0d88629667',
      path: 'OFP/Java_Datentypen_Integer.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_Float.pdf',
      uniqueIdentifier: '5f03b842-f8c2-4f63-8bb9-83142d6f98b3',
      path: 'OFP/Java_Datentypen_Float.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_Char.pdf',
      uniqueIdentifier: '5b9ff9c4-8f45-4ce2-ae79-43fee72e6ecb',
      path: 'OFP/Java_Datentypen_Char.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_Boolean.pdf',
      uniqueIdentifier: 'ac5c805f-3619-4e90-99b5-3377c6d7458c',
      path: 'OFP/Java_Datentypen_Boolean.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_String.pdf',
      uniqueIdentifier: '7f4461ab-864c-4531-8656-4616b739f5fa',
      path: 'OFP/Java_Datentypen_String.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_String_CodeBeispiel.zip',
      uniqueIdentifier: '6168e707-a273-4cf4-9144-9f8ef201e775',
      path: 'OFP/Java_Datentypen_String_CodeBeispiel.zip',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_String_Operationen.pdf',
      uniqueIdentifier: '74940c23-af14-4330-a019-a3f51090d4a6',
      path: 'OFP/Java_Datentypen_String_Operationen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_String_Methoden.pdf',
      uniqueIdentifier: '2960e92b-b82d-443a-8b32-ed87447c76e1',
      path: 'OFP/Java_Datentypen_String_Methoden.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_Konstanten.pdf',
      uniqueIdentifier: 'f16f3f43-404e-44cb-b813-9de902878f39',
      path: 'OFP/Java_Datentypen_Konstanten.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_Konstanten.mp4',
      uniqueIdentifier: '23023ee4-4376-432e-ab0f-7cf29c0c6204',
      path: 'OFP/Java_Datentypen_Konstanten.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datentypen_Typkonversionen.pdf',
      uniqueIdentifier: 'acb1bed9-2c68-4456-b748-2c635f506b32',
      path: 'OFP/Java_Datentypen_Typkonversionen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Typkonversionen.mp4',
      uniqueIdentifier: '73b26d8e-22e0-4ebc-9bba-cd9e006296e5',
      path: 'OFP/Java_Typkonversionen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Variablen.pdf',
      uniqueIdentifier: '89685233-4c76-4311-8e85-140d638192b0',
      path: 'OFP/Java_Variablen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Variablen.mp4',
      uniqueIdentifier: '4a250618-eec3-4ec9-864a-0e07d2b553d5',
      path: 'OFP/Java_Variablen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Ausdruecke.pdf',
      uniqueIdentifier: 'b29462eb-fdfa-41c2-8098-7931d3201f7c',
      path: 'OFP/Java_Anweisungen_Ausdruecke.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anwesungen_Ausdruecke.mp4',
      uniqueIdentifier: '21c7cc0d-9687-4c34-96af-6d8d714eb54d',
      path: 'OFP/Java_Anwesungen_Ausdruecke.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Operatoren.pdf',
      uniqueIdentifier: 'e272fd46-2e10-4b71-ba54-2d9ce76e3369',
      path: 'OFP/Java_Anweisungen_Operatoren.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Operatoren.mp4',
      uniqueIdentifier: '440e4f75-5960-4f1c-b453-293c4f8e4484',
      path: 'OFP/Java_Anweisungen_Operatoren.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Zuweisungen.pdf',
      uniqueIdentifier: 'e2815f41-b1cd-48f5-bb46-1d7403c8f7ba',
      path: 'OFP/Java_Anweisungen_Zuweisungen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Zuweisung.mp4',
      uniqueIdentifier: '21f1a4c3-c92c-4e2d-9280-4d5d1d1adf47',
      path: 'OFP/Java_Anweisungen_Zuweisung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Block.pdf',
      uniqueIdentifier: '1a63423b-646f-40b3-927f-4c3bdd4dc01b',
      path: 'OFP/Java_Anweisungen_Block.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Block.mp4',
      uniqueIdentifier: '46d89583-f737-42ac-96ee-67dabd699552',
      path: 'OFP/Java_Anweisungen_Block.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Anweisungen_Programmierkonventionen.pdf',
      uniqueIdentifier: '21064003-7fec-42c1-bf24-3fb64408e567',
      path: 'OFP/Java_Anweisungen_Programmierkonventionen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_if_else.pdf',
      uniqueIdentifier: '9b507e1f-590f-4e4d-82d4-7e6343e64475',
      path: 'OFP/Java_Kontrollstrukturen_if_else.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstukturen_if_else.mp4',
      uniqueIdentifier: 'e9858a81-ce4b-4969-85fe-99556d38e819',
      path: 'OFP/Java_Kontrollstukturen_if_else.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_switch.pdf',
      uniqueIdentifier: '581dc905-7db5-4223-838b-264f0dcb4301',
      path: 'OFP/Java_Kontrollstrukturen_switch.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_switch.mp4',
      uniqueIdentifier: 'e9587ee2-72aa-46cd-8750-a8eec7fa185a',
      path: 'OFP/Java_Kontrollstrukturen_switch.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_Schleifen.pdf',
      uniqueIdentifier: '746c83ca-40a6-46ef-a6f5-8a229767ab50',
      path: 'OFP/Java_Kontrollstrukturen_Schleifen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_Schleifen.mp4',
      uniqueIdentifier: 'fdc7853c-2536-4ef2-b821-82f623b127fb',
      path: 'OFP/Java_Kontrollstrukturen_Schleifen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_while.pdf',
      uniqueIdentifier: '15d2c1fa-c6cf-4096-8ec7-c403ce84e552',
      path: 'OFP/Java_Kontrollstrukturen_while.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_while.mp4',
      uniqueIdentifier: '9eeabe03-4fd1-42bf-ace6-d1e607a5d3dc',
      path: 'OFP/Java_Kontrollstrukturen_while.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_for.pdf',
      uniqueIdentifier: 'acf82bde-ab5e-4f91-9613-3cb9e339abf0',
      path: 'OFP/Java_Kontrollstrukturen_for.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_Schleifen_for.mp4',
      uniqueIdentifier: '30fc0f03-396a-4aa7-aadc-e31f812a3b7d',
      path: 'OFP/Java_Kontrollstrukturen_Schleifen_for.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_for_Beispiel_BigX.mp4',
      uniqueIdentifier: '2fc1faa3-550a-4714-a93c-eabeacdae78f',
      path: 'OFP/Java_Kontrollstrukturen_for_Beispiel_BigX.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Kontrollstrukturen_for_Beispiel_Game.mp4',
      uniqueIdentifier: 'f6e07b01-b881-497c-b9fe-edf3ed625ca0',
      path: 'OFP/Java_Kontrollstrukturen_for_Beispiel_Game.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datenstrukturen_Array.pdf',
      uniqueIdentifier: '9f2444dc-c1c9-4daa-82b9-26b916f003ae',
      path: 'OFP/Java_Datenstrukturen_Array.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datenstrukturen_Array_mehrdimensional.pdf',
      uniqueIdentifier: 'bb1b43c5-9f89-42e1-a9d1-4e522837aba4',
      path: 'OFP/Java_Datenstrukturen_Array_mehrdimensional.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datenstrukturen_Datei.pdf',
      uniqueIdentifier: 'a900435c-ff38-4581-b0b5-ea7a8bb19f5b',
      path: 'OFP/Java_Datenstrukturen_Datei.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Datenstrukturen_Datei.mp4',
      uniqueIdentifier: '0fe0045b-e705-469a-b03c-f7518b289627',
      path: 'OFP/Java_Datenstrukturen_Datei.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Objekte_Objektorientierung_Einfuehrung.pdf',
      uniqueIdentifier: '8e4c8072-9711-4698-9a43-337207ddcd77',
      path: 'OFP/Java_Objekte_Objektorientierung_Einfuehrung.pdf',
      type: 'PDF',
    },
  });
  // Red marked PDF in Kompetenzraster ?
  // await prisma.file.create({
  //   data: {
  //     name: 'Kein Dateiname gefunden!',
  //     uniqueIdentifier: '61a28945-ca5a-4376-917d-bca54b607dd3',
  //     path: 'OFP/Kein Dateiname gefunden!',
  //     type: 'PDF',
  //   },
  // });
  await prisma.file.create({
    data: {
      name: 'Java_Objekte_Erzeugung.pdf',
      uniqueIdentifier: '8301ca1c-9896-4344-b47e-75b9352bc23e',
      path: 'OFP/Java_Objekte_Erzeugung.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Objekte_Lebensdauer_Loeschen.pdf',
      uniqueIdentifier: '3b6d1967-16f1-4b42-8e74-d854d40e6951',
      path: 'OFP/Java_Objekte_Lebensdauer_Loeschen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Objekte_Referenzen_Zugriff.pdf',
      uniqueIdentifier: '61d2b624-53b5-4879-8485-952c1d7dcb20',
      path: 'OFP/Java_Objekte_Referenzen_Zugriff.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Objekte_Arrays_von_Objekten.pdf',
      uniqueIdentifier: '455206d3-9539-4992-bf35-22de72eebeb7',
      path: 'OFP/Java_Objekte_Arrays_von_Objekten.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Objekte_Arrays_von_Objekten.mp4',
      uniqueIdentifier: '58f8c18d-9384-492a-a888-cb04cab44d6e',
      path: 'OFP/Java_Objekte_Arrays_von_Objekten.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Objekte_Referenzen_Arrays_CodeBeispiel_SnailGame.zip',
      uniqueIdentifier: '9f6ad498-221e-4dfc-bb43-d92e764c1512',
      path: 'OFP/Java_Objekte_Referenzen_Arrays_CodeBeispiel_SnailGame.zip',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Aufruf.pdf',
      uniqueIdentifier: '2d3d318f-4e05-4874-8e7f-d14921296fb2',
      path: 'OFP/Java_Methoden_Aufruf.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Aufruf.mp4',
      uniqueIdentifier: 'e48e4f32-cde6-4945-be3f-b120b1713a23',
      path: 'OFP/Java_Methoden_Aufruf.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Referenzen_Parameter.pdf',
      uniqueIdentifier: 'ab7afeb0-e17f-44e9-8be8-b17cbc8f94b9',
      path: 'OFP/Java_Methoden_Referenzen_Parameter.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Referenzen_Parameter.mp4',
      uniqueIdentifier: '79876b13-9a54-4588-8591-644510f129fc',
      path: 'OFP/Java_Methoden_Referenzen_Parameter.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Ueberladen.pdf',
      uniqueIdentifier: '36266628-c243-4351-9c54-72dbf08b903d',
      path: 'OFP/Java_Methoden_Ueberladen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Ueberladen.mp4',
      uniqueIdentifier: '35a82a7b-2154-47e1-b3d2-20b47898197a',
      path: 'OFP/Java_Methoden_Ueberladen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Rekursion.pdf',
      uniqueIdentifier: '7821b45e-3488-4818-930f-be6bde95f277',
      path: 'OFP/Java_Methoden_Rekursion.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Methoden_Rekursion.mp4',
      uniqueIdentifier: 'b2fab559-c5e9-417b-8340-a5b1be313da9',
      path: 'OFP/Java_Methoden_Rekursion.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML.pdf',
      uniqueIdentifier: '67eea819-ab11-42ab-8c06-3bb5ad6aab13',
      path: 'OFP/Java_UML.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML.mp4',
      uniqueIdentifier: '3371631e-d626-4bfd-83a3-e3a4b8a9c3ce',
      path: 'OFP/Java_UML.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Beispiel_Twitter.pdf',
      uniqueIdentifier: 'b681b280-c818-4970-a531-2aafcf5b49c8',
      path: 'OFP/Java_UML_Beispiel_Twitter.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Klassen.pdf',
      uniqueIdentifier: '8f589647-2d48-4438-b5cf-9d4988ba00f0',
      path: 'OFP/Java_UML_Klassen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Klassen.mp4',
      uniqueIdentifier: 'd4dddc1e-5025-44ce-86bd-6813eaf394c3',
      path: 'OFP/Java_UML_Klassen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Objekte.pdf',
      uniqueIdentifier: '7af88cb2-bab7-474c-a721-90b29cc868fa',
      path: 'OFP/Java_UML_Objekte.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Objekte.mp4',
      uniqueIdentifier: '23df0c13-c751-428f-86c9-6e615982aae8',
      path: 'OFP/Java_UML_Objekte.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Attribute.pdf',
      uniqueIdentifier: '6156a4db-89f9-4f8f-b510-37e12793acec',
      path: 'OFP/Java_UML_Attribute.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Attribute.mp4',
      uniqueIdentifier: '4c43045d-3129-4be2-afc6-e04409e0a98e',
      path: 'OFP/Java_UML_Attribute.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Operationen.pdf',
      uniqueIdentifier: '9ce7ca44-357a-4395-9c38-157fb9b2afb2',
      path: 'OFP/Java_UML_Operationen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Operationen.mp4',
      uniqueIdentifier: 'ef2671f7-8ed4-4b6f-ae89-8a3a7ba115df',
      path: 'OFP/Java_UML_Operationen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Assoziationen.pdf',
      uniqueIdentifier: '0e0fd849-4f1a-4485-9cdf-f79c487d50a9',
      path: 'OFP/Java_UML_Assoziationen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Assoziationen.mp4',
      uniqueIdentifier: '7d587b36-db9d-40ab-b5a9-c248dd71001f',
      path: 'OFP/Java_UML_Assoziationen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Assoziationen_Navigierbarkeit.pdf',
      uniqueIdentifier: '9f8bca8c-032a-4118-9eb4-96594f14fe3c',
      path: 'OFP/Java_UML_Assoziationen_Navigierbarkeit.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Assoziationen_Navigierbarkeit.mp4',
      uniqueIdentifier: 'ad65fa04-8848-499c-8654-55e3f68d1fbb',
      path: 'OFP/Java_UML_Assoziationen_Navigierbarkeit.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Sichtbarkeit.pdf',
      uniqueIdentifier: '98667aa3-81c3-472e-8eda-849c71e4e278',
      path: 'OFP/Java_UML_Sichtbarkeit.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Sichtbarkeit.mp4',
      uniqueIdentifier: '95017bb3-978d-4cdd-917a-ba8de3c73014',
      path: 'OFP/Java_UML_Sichtbarkeit.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Vererbung_Generalisierung.pdf',
      uniqueIdentifier: '15904bb0-804e-4ec1-b8f4-47b06070b23c',
      path: 'OFP/Java_UML_Vererbung_Generalisierung.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Vererbung_Generalisierung.mp4',
      uniqueIdentifier: '536e041b-9888-4a91-acfa-908959ba9471',
      path: 'OFP/Java_Vererbung_Generalisierung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Vererbung_Abstrakte_Klassen_Operationen.pdf',
      uniqueIdentifier: '464f6a24-ba4e-44b2-bcea-e066758e1b24',
      path: 'OFP/Java_UML_Vererbung_Abstrakte_Klassen_Operationen.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Vererbung_Abstrakte_Klassen_Operationen.mp4',
      uniqueIdentifier: '961e89af-cd16-4ede-ac9b-e16d8ddf9679',
      path: 'OFP/Java_UML_Vererbung_Abstrakte_Klassen_Operationen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Interfaces.pdf',
      uniqueIdentifier: '46fd92aa-34de-4782-bf0c-3e5e4279c427',
      path: 'OFP/Java_UML_Interfaces.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Interfaces.mp4',
      uniqueIdentifier: '3f8ffed4-abd2-4c50-9c79-9788810b1ef3',
      path: 'OFP/Java_UML_Interfaces.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip',
      uniqueIdentifier: '36acc1c6-a4ec-41f1-9868-f597862a0c1a',
      path: 'OFP/Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Vererbung.pdf',
      uniqueIdentifier: '6aeac450-f0f5-4235-b7df-cafcc9ae555f',
      path: 'OFP/Java_UML_Vererbung.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Vererbung.mp4',
      uniqueIdentifier: '4762eccf-5763-48d2-ab0f-21884328780c',
      path: 'OFP/Java_UML_Vererbung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip',
      uniqueIdentifier: 'ff59f2a4-660f-4f14-9f13-ce969939461a',
      path: 'OFP/Java_Vererbung_Interfaces_CodeBeispiel_SnailGamev2.zip',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Polymorphie.pdf',
      uniqueIdentifier: '518e1e49-1530-450d-9935-11e1b558532a',
      path: 'OFP/Java_UML_Polymorphie.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Polymorphie.mp4',
      uniqueIdentifier: 'de0b421b-5139-4136-baac-0b787b4753f3',
      path: 'OFP/Java_UML_Polymorphie.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Object_Klasse.pdf',
      uniqueIdentifier: 'eaaf62a0-6720-469c-91c0-52b9e68bbbe6',
      path: 'OFP/Java_UML_Object_Klasse.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_UML_Object_Klasse.mp4',
      uniqueIdentifier: 'a4d090b7-221c-4932-a309-ffab11522825',
      path: 'OFP/Java_UML_Object_Klasse.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Ausnahmebehandlung_Exceptions.pdf',
      uniqueIdentifier: '92fec94f-be2b-4558-bf29-b623ed45131a',
      path: 'OFP/Java_Ausnahmebehandlung_Exceptions.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Ausnahmebehandlung_Exceptions.mp4',
      uniqueIdentifier: '570d6e9a-69cc-4479-abda-431dc9e17355',
      path: 'OFP/Java_Ausnahmebehandlung_Exceptions.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Ausnahmebehandlung_Werfen_Behandeln.pdf',
      uniqueIdentifier: 'f22f543e-2cbc-48aa-a268-549bbcdf8e34',
      path: 'OFP/Java_Ausnahmebehandlung_Werfen_Behandeln.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Ausnahmebehandlung_Werfen_Behandeln.mp4',
      uniqueIdentifier: 'c5228462-fbf2-477a-965b-31a18ecef87d',
      path: 'OFP/Java_Ausnahmebehandlung_Werfen_Behandeln.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Ausnahmebehandlung_Werfen_Behandeln_Beispiel.mp4',
      uniqueIdentifier: '21699b3f-2e32-45e2-a0a5-f671a0f98694',
      path: 'OFP/Java_Ausnahmebehandlung_Werfen_Behandeln_Beispiel.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Exceptionhandling_CodeBeispiel_WordleClass.zip',
      uniqueIdentifier: '0c24b88b-ea6b-49f5-b6e2-a2ba29305814',
      path: 'OFP/Java_Exceptionhandling_CodeBeispiel_WordleClass.zip',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Dateien_Streams.pdf',
      uniqueIdentifier: '28d36645-53cb-48fe-93cc-2dc2b3876c8a',
      path: 'OFP/Java_Dateien_Streams.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Dateien_Streams.mp4',
      uniqueIdentifier: 'ff472184-baa6-4bd0-92ed-2ca9e91215f9',
      path: 'OFP/Java_Dateien_Streams.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Dateien_Serialisierung.pdf',
      uniqueIdentifier: '1e770da7-7997-4b68-870b-b217491e3b49',
      path: 'OFP/Java_Dateien_Serialisierung.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Dateien_Serialisierung.mp4',
      uniqueIdentifier: 'e870474f-0b0d-4268-b517-a861b8f795a6',
      path: 'OFP/Java_Dateien_Serialisierung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java',
      uniqueIdentifier: '922d59cb-9209-4533-a6a7-80f0b501a2f0',
      path: 'OFP/Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Dateien_Formatierte_IO.pdf',
      uniqueIdentifier: '85929eed-e41b-4ad3-8824-fe50066cefdf',
      path: 'OFP/Java_Dateien_Formatierte_IO.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Formatierte_IO.mp4',
      uniqueIdentifier: '755c961e-2b0f-46a7-bcf0-eae69016c103',
      path: 'OFP/Java_Formatierte_IO.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java',
      uniqueIdentifier: 'fab0567f-4eac-4351-a5b1-ea323b1549be',
      path: 'OFP/Java_Dateien_Serialisierung_IO_CodeBeispiel_Student.java',
      type: 'CODE',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Threads.pdf',
      uniqueIdentifier: '1b9afa84-fae6-4682-b16a-8bdb3def80d3',
      path: 'OFP/Java_Threads.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Sockets.pdf',
      uniqueIdentifier: 'cd49aafd-4a0a-4670-b4d7-83ba456fcfd3',
      path: 'OFP/Java_Sockets.pdf',
      type: 'PDF',
    },
  });
  await prisma.file.create({
    data: {
      name: 'Java_Sockets_Server_Sockets.pdf',
      uniqueIdentifier: 'fe681e57-e984-4ef6-9bbc-0c6ddc6fc85e',
      path: 'OFP/Java_Sockets_Server_Sockets.pdf',
      type: 'PDF',
    },
  });
}

async function createFilesRNI() {
  console.log('Importing RN I Videos as files');

  await prisma.file.create({
    data: {
      name: '01-Organisation.mp4',
      uniqueIdentifier: '4b15d033-a8bd-4586-82dd-6f35e1e87ec7',
      path: 'RNI/01-Organisation.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-1-Einfuehrung.mp4',
      uniqueIdentifier: 'ddfe6040-9b88-4ac5-8f0a-90046d80cb17',
      path: 'RNI/1-1-Einfuehrung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-2-Strukturen.mp4',
      uniqueIdentifier: 'e576ba76-5136-483f-92f6-dd3ffe9df9c0',
      path: 'RNI/1-2-Strukturen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-3-Vermittlung.mp4',
      uniqueIdentifier: '655d268e-1ae4-4153-b53e-80fc2177ced4',
      path: 'RNI/1-3-Vermittlung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-4-Anforderungen.mp4',
      uniqueIdentifier: 'd4cc64d6-59e5-431c-9b05-1c4cb8d9c255',
      path: 'RNI/1-4-Anforderungen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-1-Sicherheitsanforderungen.mp4',
      uniqueIdentifier: 'df8df04e-6e35-41be-afa4-6dbaa1cc2565',
      path: 'RNI/10-1-Sicherheitsanforderungen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-2-AngriffeInternet.mp4',
      uniqueIdentifier: 'c612bf5f-1ff2-4734-af05-08450d83b256',
      path: 'RNI/10-2-AngriffeInternet.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-3-Kryptographie.mp4',
      uniqueIdentifier: '76dc2c07-14fe-459e-9904-8cd3f958e400',
      path: 'RNI/10-3-Kryptographie.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-4-Sicherheitsmechanismen1.mp4',
      uniqueIdentifier: '35bc0e9e-d4b5-41be-876a-3aa97ba75f1b',
      path: 'RNI/10-4-Sicherheitsmechanismen1.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-4-Sicherheitsmechanismen2.mp4',
      uniqueIdentifier: 'c644172f-3aa8-4b8c-ba00-4572da9a6b14',
      path: 'RNI/10-4-Sicherheitsmechanismen2.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-5-Beispiele.mp4',
      uniqueIdentifier: 'cc478230-6a22-4354-a773-89605f45a7cc',
      path: 'RNI/10-5-Beispiele.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-6-Firewalls.mp4',
      uniqueIdentifier: '4a7869b1-7cfb-42cc-9305-84abafac740c',
      path: 'RNI/10-6-Firewalls.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '11-1-Probeklausur.mp4',
      uniqueIdentifier: '27c37247-50e7-40a6-9a1f-e7b122118cdb',
      path: 'RNI/11-1-Probeklausur.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-1-Einfuehrung.mp4',
      uniqueIdentifier: '5fdf6d8d-8641-42d8-9448-1455c32499c6',
      path: 'RNI/2-1-Einfuehrung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-2-Protokolle.mp4',
      uniqueIdentifier: '346874fc-7392-4300-94fc-b3cd2c8e9a56',
      path: 'RNI/2-2-Protokolle.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-3-OSIModell.mp4',
      uniqueIdentifier: 'dd36b284-4a28-4f03-ab4d-23c0dd0587b8',
      path: 'RNI/2-3-OSIModell.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-4_InternetModell.mp4',
      uniqueIdentifier: '99efa7c7-e32e-4673-a327-6f8404500981',
      path: 'RNI/2-4_InternetModell.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-1-Hardware.mp4',
      uniqueIdentifier: '46c82856-d93f-49fc-ab80-a3cbd4d9b508',
      path: 'RNI/3-1-Hardware.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-2-Modulation.mp4',
      uniqueIdentifier: 'fc254e51-8ca3-487f-b1ff-bd1fca5692f7',
      path: 'RNI/3-2-Modulation.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-3-Codierung.mp4',
      uniqueIdentifier: '40bdf18b-8e6b-4caa-bad3-e2f234ae5d6b',
      path: 'RNI/3-3-Codierung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-4-Framing.mp4',
      uniqueIdentifier: 'fa031498-3d8d-4b9b-8b01-cdf2503aea67',
      path: 'RNI/3-4-Framing.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-5-Fehlererkennung.mp4',
      uniqueIdentifier: '0ac3b7ae-9134-4485-aaaf-e97d1d09599a',
      path: 'RNI/3-5-Fehlererkennung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-6-Ethernet.mp4',
      uniqueIdentifier: 'd0186d23-18cc-4d01-bbbd-ad9d16b832e0',
      path: 'RNI/3-6-Ethernet.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-7-MAC.mp4',
      uniqueIdentifier: 'bac75908-48b1-4686-9e2c-038f0a0b26ef',
      path: 'RNI/3-7-MAC.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-1-Vermittlung.mp4',
      uniqueIdentifier: '0bdb47cf-3565-4982-bb8a-731806f6cc0a',
      path: 'RNI/4-1-Vermittlung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-2-Switches.mp4',
      uniqueIdentifier: '9c0e82f2-59da-4ec5-93e9-d772618e4669',
      path: 'RNI/4-2-Switches.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-3-SpanningTree.mp4',
      uniqueIdentifier: '5b5753ba-5e83-4106-b83c-ba934930b08f',
      path: 'RNI/4-3-SpanningTree.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-4-VLAN.mp4',
      uniqueIdentifier: 'e25ca2cc-9c5b-455b-a032-03f3b002c60e',
      path: 'RNI/4-4-VLAN.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-1-IPGrundlagen.mp4',
      uniqueIdentifier: '6e2acca6-788c-4883-a4d7-ac7e9b8cb4d3',
      path: 'RNI/5-1-IPGrundlagen.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-10-IPv6.mp4',
      uniqueIdentifier: 'c0c85cf5-5087-4f11-9098-7229a0ea999e',
      path: 'RNI/5-10-IPv6.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-2-IPAdressierung.mp4',
      uniqueIdentifier: '6321e4b3-41b7-49a1-9d8f-775385d9d6c0',
      path: 'RNI/5-2-IPAdressierung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-3-IPWeiterleitung.mp4',
      uniqueIdentifier: '5ddd84c2-bfe0-4457-8375-2914091e6494',
      path: 'RNI/5-3-IPWeiterleitung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-4-IPSubnetting.mp4',
      uniqueIdentifier: '012f7741-fe8c-4b86-938d-2da121df3641',
      path: 'RNI/5-4-IPSubnetting.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-5-IPHeader.mp4',
      uniqueIdentifier: '9097aa64-452a-43f6-870d-22446d4206a2',
      path: 'RNI/5-5-IPHeader.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-6-FragmentierungICMP.mp4',
      uniqueIdentifier: '09893709-9e7c-45c3-93de-8f13e55f7e1d',
      path: 'RNI/5-6-FragmentierungICMP.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-7-ARP.mp4',
      uniqueIdentifier: 'c3173208-30ff-4443-ab84-501411b7aba3',
      path: 'RNI/5-7-ARP.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-8-DHCP.mp4',
      uniqueIdentifier: '091a18c6-78b8-4fce-bf77-c2aa0cc83f9b',
      path: 'RNI/5-8-DHCP.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-1-Routing.mp4',
      uniqueIdentifier: 'c7f6e114-471b-4f86-9673-f38cd4a787ce',
      path: 'RNI/6-1-Routing.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-2-DistanceVector.mp4',
      uniqueIdentifier: '73729652-d618-411f-994a-e4927822767e',
      path: 'RNI/6-2-DistanceVector.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-3-LinkState.mp4',
      uniqueIdentifier: '76faac70-42aa-4657-9efa-0e0944020387',
      path: 'RNI/6-3-LinkState.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-4-BGP.mp4',
      uniqueIdentifier: '9809f209-9996-40b5-b167-fc6465010b53',
      path: 'RNI/6-4-BGP.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-1-EndeZuEnde.mp4',
      uniqueIdentifier: '7a3f8d6e-7298-4b69-a16f-8ea0e216970a',
      path: 'RNI/7-1-EndeZuEnde.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-2-UDP.mp4',
      uniqueIdentifier: '5cf70ec0-bcdf-4b1a-a3e2-fa1601819118',
      path: 'RNI/7-2-UDP.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-3-TCP.mp4',
      uniqueIdentifier: 'a6e7b411-69e7-4154-93b5-9a4892514210',
      path: 'RNI/7-3-TCP.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-4-TCPVerbindungsaufbau.mp4',
      uniqueIdentifier: '7d6e0ca6-74d4-46d5-9c3a-8a3a9fd943b2',
      path: 'RNI/7-4-TCPVerbindungsaufbau.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-5-StopAndWait.mp4',
      uniqueIdentifier: '4eccb8d8-92e2-4e5c-a7b5-b67c9a6d0616',
      path: 'RNI/7-5-StopAndWait.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-6-SlidingWindow.mp4',
      uniqueIdentifier: 'cf8adaf7-9d4c-4384-b8a4-4045f34fd302',
      path: 'RNI/7-6-SlidingWindow.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-7-TCPSicherung.mp4',
      uniqueIdentifier: '361b847d-8add-406e-860e-b634026aa2d9',
      path: 'RNI/7-7-TCPSicherung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '8-1-Datendarstellung.mp4',
      uniqueIdentifier: '27ddb422-81aa-4e34-9c52-2fbce00efda4',
      path: 'RNI/8-1-Datendarstellung.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '9-1-SMTPundHTTP.mp4',
      uniqueIdentifier: '601c72cf-8c8d-4af0-80b0-062fd506654d',
      path: 'RNI/9-1-SMTPundHTTP.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: '9-2-DNS.mp4',
      uniqueIdentifier: '97b280e3-51d2-4ee3-b37c-e6179b3de060',
      path: 'RNI/9-2-DNS.mp4',
      type: 'VIDEO',
    },
  });
  await prisma.file.create({
    data: {
      name: 'RNimport.py',
      uniqueIdentifier: 'e08ba1ec-5241-40f0-ac29-e837fbc63c84',
      path: 'RNI/RNimport.py',
      type: 'VIDEO',
    },
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
