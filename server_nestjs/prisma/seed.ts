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
      id: 2,
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
      id: 3,
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
      id: 4,
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
        id: i + 500,
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
            if (+elementId == 0) {
              await prisma.userContentElementProgress.create({
                data: {
                  user: { connect: { id: studentUser.id } },
                  contentElement: { connect: { id: TempContentElement.id } },
                  markedAsDone: true,
                  updatedAt: new Date(),
                },
              });
            }
            //files from excelData
            await prisma.file.create({
              data: {
                //name: row[columnElementId[elementId]] + ' zu ' + filename, changed. need the get raw filename
                name: filename,
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

  console.log('Importing RN I Videos as files');

  await prisma.file.create({
    data: {
      name: '01-Organisation.mp4',
      uniqueIdentifier: '4b15d033-a8bd-4586-82dd-6f35e1e87ec7',
      path: 'RNI/01-Organisation.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-1-Einfuehrung.mp4',
      uniqueIdentifier: 'ddfe6040-9b88-4ac5-8f0a-90046d80cb17',
      path: 'RNI/1-1-Einfuehrung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-2-Strukturen.mp4',
      uniqueIdentifier: 'e576ba76-5136-483f-92f6-dd3ffe9df9c0',
      path: 'RNI/1-2-Strukturen.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-3-Vermittlung.mp4',
      uniqueIdentifier: '655d268e-1ae4-4153-b53e-80fc2177ced4',
      path: 'RNI/1-3-Vermittlung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '1-4-Anforderungen.mp4',
      uniqueIdentifier: 'd4cc64d6-59e5-431c-9b05-1c4cb8d9c255',
      path: 'RNI/1-4-Anforderungen.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-1-Sicherheitsanforderungen.mp4',
      uniqueIdentifier: 'df8df04e-6e35-41be-afa4-6dbaa1cc2565',
      path: 'RNI/10-1-Sicherheitsanforderungen.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-2-AngriffeInternet.mp4',
      uniqueIdentifier: 'c612bf5f-1ff2-4734-af05-08450d83b256',
      path: 'RNI/10-2-AngriffeInternet.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-3-Kryptographie.mp4',
      uniqueIdentifier: '76dc2c07-14fe-459e-9904-8cd3f958e400',
      path: 'RNI/10-3-Kryptographie.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-4-Sicherheitsmechanismen1.mp4',
      uniqueIdentifier: '35bc0e9e-d4b5-41be-876a-3aa97ba75f1b',
      path: 'RNI/10-4-Sicherheitsmechanismen1.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-4-Sicherheitsmechanismen2.mp4',
      uniqueIdentifier: 'c644172f-3aa8-4b8c-ba00-4572da9a6b14',
      path: 'RNI/10-4-Sicherheitsmechanismen2.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-5-Beispiele.mp4',
      uniqueIdentifier: 'cc478230-6a22-4354-a773-89605f45a7cc',
      path: 'RNI/10-5-Beispiele.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '10-6-Firewalls.mp4',
      uniqueIdentifier: '4a7869b1-7cfb-42cc-9305-84abafac740c',
      path: 'RNI/10-6-Firewalls.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '11-1-Probeklausur.mp4',
      uniqueIdentifier: '27c37247-50e7-40a6-9a1f-e7b122118cdb',
      path: 'RNI/11-1-Probeklausur.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-1-Einfuehrung.mp4',
      uniqueIdentifier: '5fdf6d8d-8641-42d8-9448-1455c32499c6',
      path: 'RNI/2-1-Einfuehrung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-2-Protokolle.mp4',
      uniqueIdentifier: '346874fc-7392-4300-94fc-b3cd2c8e9a56',
      path: 'RNI/2-2-Protokolle.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-3-OSIModell.mp4',
      uniqueIdentifier: 'dd36b284-4a28-4f03-ab4d-23c0dd0587b8',
      path: 'RNI/2-3-OSIModell.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '2-4_InternetModell.mp4',
      uniqueIdentifier: '99efa7c7-e32e-4673-a327-6f8404500981',
      path: 'RNI/2-4_InternetModell.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-1-Hardware.mp4',
      uniqueIdentifier: '46c82856-d93f-49fc-ab80-a3cbd4d9b508',
      path: 'RNI/3-1-Hardware.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-2-Modulation.mp4',
      uniqueIdentifier: 'fc254e51-8ca3-487f-b1ff-bd1fca5692f7',
      path: 'RNI/3-2-Modulation.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-3-Codierung.mp4',
      uniqueIdentifier: '40bdf18b-8e6b-4caa-bad3-e2f234ae5d6b',
      path: 'RNI/3-3-Codierung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-4-Framing.mp4',
      uniqueIdentifier: 'fa031498-3d8d-4b9b-8b01-cdf2503aea67',
      path: 'RNI/3-4-Framing.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-5-Fehlererkennung.mp4',
      uniqueIdentifier: '0ac3b7ae-9134-4485-aaaf-e97d1d09599a',
      path: 'RNI/3-5-Fehlererkennung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-6-Ethernet.mp4',
      uniqueIdentifier: 'd0186d23-18cc-4d01-bbbd-ad9d16b832e0',
      path: 'RNI/3-6-Ethernet.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '3-7-MAC.mp4',
      uniqueIdentifier: 'bac75908-48b1-4686-9e2c-038f0a0b26ef',
      path: 'RNI/3-7-MAC.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-1-Vermittlung.mp4',
      uniqueIdentifier: '0bdb47cf-3565-4982-bb8a-731806f6cc0a',
      path: 'RNI/4-1-Vermittlung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-2-Switches.mp4',
      uniqueIdentifier: '9c0e82f2-59da-4ec5-93e9-d772618e4669',
      path: 'RNI/4-2-Switches.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-3-SpanningTree.mp4',
      uniqueIdentifier: '5b5753ba-5e83-4106-b83c-ba934930b08f',
      path: 'RNI/4-3-SpanningTree.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '4-4-VLAN.mp4',
      uniqueIdentifier: 'e25ca2cc-9c5b-455b-a032-03f3b002c60e',
      path: 'RNI/4-4-VLAN.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-1-IPGrundlagen.mp4',
      uniqueIdentifier: '6e2acca6-788c-4883-a4d7-ac7e9b8cb4d3',
      path: 'RNI/5-1-IPGrundlagen.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-10-IPv6.mp4',
      uniqueIdentifier: 'c0c85cf5-5087-4f11-9098-7229a0ea999e',
      path: 'RNI/5-10-IPv6.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-2-IPAdressierung.mp4',
      uniqueIdentifier: '6321e4b3-41b7-49a1-9d8f-775385d9d6c0',
      path: 'RNI/5-2-IPAdressierung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-3-IPWeiterleitung.mp4',
      uniqueIdentifier: '5ddd84c2-bfe0-4457-8375-2914091e6494',
      path: 'RNI/5-3-IPWeiterleitung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-4-IPSubnetting.mp4',
      uniqueIdentifier: '012f7741-fe8c-4b86-938d-2da121df3641',
      path: 'RNI/5-4-IPSubnetting.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-5-IPHeader.mp4',
      uniqueIdentifier: '9097aa64-452a-43f6-870d-22446d4206a2',
      path: 'RNI/5-5-IPHeader.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-6-FragmentierungICMP.mp4',
      uniqueIdentifier: '09893709-9e7c-45c3-93de-8f13e55f7e1d',
      path: 'RNI/5-6-FragmentierungICMP.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-7-ARP.mp4',
      uniqueIdentifier: 'c3173208-30ff-4443-ab84-501411b7aba3',
      path: 'RNI/5-7-ARP.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '5-8-DHCP.mp4',
      uniqueIdentifier: '091a18c6-78b8-4fce-bf77-c2aa0cc83f9b',
      path: 'RNI/5-8-DHCP.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-1-Routing.mp4',
      uniqueIdentifier: 'c7f6e114-471b-4f86-9673-f38cd4a787ce',
      path: 'RNI/6-1-Routing.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-2-DistanceVector.mp4',
      uniqueIdentifier: '73729652-d618-411f-994a-e4927822767e',
      path: 'RNI/6-2-DistanceVector.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-3-LinkState.mp4',
      uniqueIdentifier: '76faac70-42aa-4657-9efa-0e0944020387',
      path: 'RNI/6-3-LinkState.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '6-4-BGP.mp4',
      uniqueIdentifier: '9809f209-9996-40b5-b167-fc6465010b53',
      path: 'RNI/6-4-BGP.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-1-EndeZuEnde.mp4',
      uniqueIdentifier: '7a3f8d6e-7298-4b69-a16f-8ea0e216970a',
      path: 'RNI/7-1-EndeZuEnde.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-2-UDP.mp4',
      uniqueIdentifier: '5cf70ec0-bcdf-4b1a-a3e2-fa1601819118',
      path: 'RNI/7-2-UDP.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-3-TCP.mp4',
      uniqueIdentifier: 'a6e7b411-69e7-4154-93b5-9a4892514210',
      path: 'RNI/7-3-TCP.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-4-TCPVerbindungsaufbau.mp4',
      uniqueIdentifier: '7d6e0ca6-74d4-46d5-9c3a-8a3a9fd943b2',
      path: 'RNI/7-4-TCPVerbindungsaufbau.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-5-StopAndWait.mp4',
      uniqueIdentifier: '4eccb8d8-92e2-4e5c-a7b5-b67c9a6d0616',
      path: 'RNI/7-5-StopAndWait.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-6-SlidingWindow.mp4',
      uniqueIdentifier: 'cf8adaf7-9d4c-4384-b8a4-4045f34fd302',
      path: 'RNI/7-6-SlidingWindow.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '7-7-TCPSicherung.mp4',
      uniqueIdentifier: '361b847d-8add-406e-860e-b634026aa2d9',
      path: 'RNI/7-7-TCPSicherung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '8-1-Datendarstellung.mp4',
      uniqueIdentifier: '27ddb422-81aa-4e34-9c52-2fbce00efda4',
      path: 'RNI/8-1-Datendarstellung.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '9-1-SMTPundHTTP.mp4',
      uniqueIdentifier: '601c72cf-8c8d-4af0-80b0-062fd506654d',
      path: 'RNI/9-1-SMTPundHTTP.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: '9-2-DNS.mp4',
      uniqueIdentifier: '97b280e3-51d2-4ee3-b37c-e6179b3de060',
      path: 'RNI/9-2-DNS.mp4',
      type: 'Video',
    },
  });
  await prisma.file.create({
    data: {
      name: 'RNimport.py',
      uniqueIdentifier: 'e08ba1ec-5241-40f0-ac29-e837fbc63c84',
      path: 'RNI/RNimport.py',
      type: 'Video',
    },
  });

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
      name: 'Primitiver Datentyp - Freitext',
      description:
        'Beschreibe in eigenen Worten, was ein primitiver Datentyp ist.',
      score: 1,
      type: 'FreeText',
      author: { connect: { id: adminUser.id } },
      text: 'Primitive Datentypen',
      conceptNode: { connect: { id: conceptNodeForMCQ.id } },
      isApproved: true,
    },
  });

  // connect it to itself
  await prisma.question.update({
    where: { id: questionFreeText.id },
    data: { origin: { connect: { id: questionFreeText.id } } },
  });

  const questionFreeTextVersion = await prisma.questionVersion.create({
    data: {
      question: { connect: { id: questionFreeText.id } },
      version: 1,
      isApproved: true,
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
