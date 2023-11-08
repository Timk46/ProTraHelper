import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { ConsoleLogger } from '@nestjs/common';
import { Console } from 'console';
import * as XLSX from 'xlsx';
import { WorkSheet, utils } from 'xlsx';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface excel_Aufgabe {
  Id: number;
  Week: number;
  Titel: string;
  Task: string;
  Test: string;
  Task_html: string;
  codeName: string;
  countInputArgs: number;
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

  console.log('Creating everything...');

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
      id: 1,
      email: 'admin@examplei.com',
      firstname: 'Admin',
      lastname: 'User',
      password: 'admin123',
      globalRole: 'ADMIN',
      modules: { connect: [{ id: moduleInformatik.id }] },
    },
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
    // TODO: get the ids by column names
    const columnConceptId = 0;
    const columnConceptEdge = 1;
    const columnContentId = 2;
    const columnRequiresId = 3;
    const columnTrainsId = 4;
    const columnTopicId = [5, 6, 7];
    const columnLevelId = 8;
    const columnDescriptionId = 9;
    const columnElementId = [10, 11, 12, 13, 14];
    const columnTaskId = [15, 16];

    //conceptIds that start represent the beginning of a new rootConcept
    const rootConceptId = [1, 42];

    //in case the topic column for the Content is empty we need to save the last topic
    let lastTopic = 'No topic found!';

    const ParentId = Array<number>(columnTopicId.length + 1);
    // Iterate through the excelData and insert records into your Prisma database
    for (const { rowIndex, row } of excelData.map((row, rowIndex) => ({
      rowIndex,
      row,
    }))) {
      if (row[columnContentId] && !isNaN(+row[columnContentId])) {
        //import contentNodes from excelData
        // We need to iterate over the topic columns because they are divided into subtopics
        for (const topicId in columnTopicId) {
          if (row[columnTopicId[topicId]]) {
            lastTopic = row[columnTopicId[topicId]];
            break;
          }
        }
        //contentNodes from excelData
        await prisma.contentNode.create({
          data: {
            id: +row[columnContentId],
            name: 'ContentNode' + +row[columnContentId] + ' für ' + lastTopic,
            description: row[columnDescriptionId]
              ? row[columnDescriptionId].toString()
              : 'Keine Beschreibung für ContentNode ' + +row[columnContentId],
          },
        });
        //loop through all contentElement columns
        for (const elementId in columnElementId) {
          if (
            row[columnElementId[elementId]] &&
            row[columnElementId[elementId]].replace(/\s/g, '').length > 0
          ) {
            const cellAddress = XLSX.utils.encode_cell({
              r: rowIndex,
              c: columnElementId[elementId],
            });
            const hyperlink =
              worksheet[cellAddress] &&
              worksheet[cellAddress].l &&
              worksheet[cellAddress].l.Target;
            const filename = hyperlink
              ? getFilenameByLink(hyperlink)
              : 'Kein Dateiname gefunden!';
            //contentElements from excelData
            const TempContentElement = await prisma.contentElement.create({
              data: {
                type: row[columnElementId[elementId]],
                title:
                  'Titel für contentElement ' +
                  +row[columnContentId] +
                  '.' +
                  elementId,
                position: +elementId + 1,
                contentNode: {
                  connect: { id: +row[columnContentId] },
                },
              },
            });
            //files from excelData
            await prisma.file.create({
              data: {
                name: row[columnElementId[elementId]] + ' zu ' + filename,
                uniqueIdentifier: uuidv4(),
                path: 'OFP/' + filename, //TODO: replace with the actual path when running on the server
                type: row[columnElementId[elementId]],
                contentElement: { connect: { id: TempContentElement.id } },
              },
            });
          }
        }
      }
      //Concept
      if (row[columnConceptId] && !isNaN(+row[columnConceptId])) {
        // Save the last topic of each topic column
        // First element reserved for root ConceptNodes
        for (const topicId in columnTopicId) {
          if (row[columnTopicId[topicId]]) {
            //root concepts (like 'Funktionale Programmierung in Python') have a common parent node
            if (rootConceptId.includes(+row[columnConceptId])) {
              ParentId[0] = row[columnConceptId] + 1;
              //ConceptNode
              await prisma.conceptNode.create({
                data: {
                  id: +row[columnConceptId] + 1,
                  name: row[columnTopicId[topicId]],
                  description: row[columnDescriptionId]
                    ? row[columnDescriptionId].toString()
                    : 'Keine Beschreibung für ConceptNode ' +
                      +row[columnConceptId] +
                      1,
                },
              });
              //ConceptFamily
              await prisma.conceptFamily.create({
                data: {
                  childId: +row[columnConceptId] + 1,
                  parentId: conceptNode.id,
                },
              });
            } else {
              ParentId[+topicId + 1] = row[columnConceptId] + 1;
              //ConceptNode
              await prisma.conceptNode.create({
                data: {
                  id: +row[columnConceptId] + 1,
                  name: row[columnTopicId[topicId]],
                  description: row[columnDescriptionId]
                    ? row[columnDescriptionId].toString()
                    : 'Keine Beschreibung für ConceptNode ' +
                      +row[columnConceptId] +
                      1,
                },
              });
              await prisma.conceptFamily.create({
                data: {
                  childId: +row[columnConceptId] + 1,
                  parentId: +ParentId[+topicId],
                },
              });
              if (row[columnConceptEdge] && !isNaN(+row[columnConceptEdge])) {
                await prisma.conceptEdge.create({
                  data: {
                    prerequisiteId: +row[columnConceptEdge] + 1,
                    successorId: +row[columnConceptId] + 1,
                    parentId: +ParentId[+topicId],
                  },
                });
              }
            }
            //create moduleConceptGoals for each conceptNode
            await prisma.moduleConceptGoal.create({
              data: {
                moduleId: moduleInformatik.id,
                conceptNodeId: +row[columnConceptId] + 1,
                level: Math.floor(Math.random() * 7), // random number between 0 and 6
              },
            });
            if (row[columnTopicId[0]]) {
              //create userConcepts for each conceptNode
              await prisma.userConcept.create({
                data: {
                  user: { connect: { id: adminUser.id } },
                  concept: { connect: { id: +row[columnConceptId] + 1 } },
                  level: Math.floor(Math.random() * 7), // random number between 0 and 6
                  expanded: true,
                },
              });
              for (const user in createdUsers) {
                await prisma.userConcept.create({
                  data: {
                    user: { connect: { id: createdUsers[user].id } },
                    concept: { connect: { id: +row[columnConceptId] + 1 } },
                    level: Math.floor(Math.random() * 7), // random number between 0 and 6
                    expanded: true,
                  },
                });
              }
            } else {
              //create userConcepts for each conceptNode
              await prisma.userConcept.create({
                data: {
                  user: { connect: { id: adminUser.id } },
                  concept: { connect: { id: +row[columnConceptId] + 1 } },
                  level: Math.floor(Math.random() * 7), // random number between 0 and 6
                  expanded: false,
                },
              });
              for (const user in createdUsers) {
                await prisma.userConcept.create({
                  data: {
                    user: { connect: { id: createdUsers[user].id } },
                    concept: { connect: { id: +row[columnConceptId] + 1 } },
                    level: Math.floor(Math.random() * 7), // random number between 0 and 6
                    expanded: false,
                  },
                });
              }
            }
            break;
          }
        }
      }
      /*
      //End of Concepts
      
      //Training
      */
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
                awards: 1,
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
              awards: 1,
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
  const question = await prisma.question.create({
    data: {
      name: 'Question 1',
      description: 'Description for Question 1',
      score: 10,
      type: 'MC',
      author: { connect: { id: adminUser.id } },
    },
  });

  await prisma.feedback.create({
    data: {
      name: 'Feedback1',
      text: 'This is a feedback.',
      question: { connect: { id: question.id } },
    },
  });

  const mcQuestion = await prisma.mCQuestion.create({
    data: {
      isSC: false,
      question: { connect: { id: question.id } },
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
      author: { connect: { id: anonymousAdmin.id } },
      message: { connect: { id: exampleQuestion.id } },
    },
  });

  // Import Tasks for Excel
  console.log('Importing Tasks from Excel...');
  const filePathTasks = process.env.FILE_PATH + 'ofp_aufgaben.xlsx';
  const workbook = XLSX.readFile(filePathTasks);

  const taskSheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
  const tasks: excel_Aufgabe[] = utils.sheet_to_json(taskSheet);
  const codeSheet: WorkSheet = workbook.Sheets[workbook.SheetNames[1]];
  const codes: excel_Codegeruest[] = utils.sheet_to_json(codeSheet);

  for (const task of tasks) {
    const newTask = await prisma.question.create({
      data: {
        name: task.Titel,
        // week: task.Week,
        description: 'automated JACK import from Excel - tasks from SoSe 2023',
        score: 100, // this is the max score for all tasks currently (=100%)
        type: 'CodingQuestion_JACK',
        author: { connect: { id: adminUser.id } }, // connect to admin user
        codingQuestions: {
          create: {
            text: task.Task,
            textHTML: task.Task_html,
            mainFileName: task.codeName,
            count_InputArgs: task.countInputArgs,
            automatedTests: {
              create: [
                {
                  code: task.Test,
                  //testcase: { Not using this model for testcases yet. All in one code currently
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
  }

  console.log('Importing Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
