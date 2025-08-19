/* eslint-disable prettier/prettier */
import { PrismaClient, contentElementType } from '@prisma/client';
import * as fs from 'fs';
import { seedAllEmbeddingsForVideo } from './seedEmbeddings';
import { seedUser } from './seedUser';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const createEmbeddings = false; // set false to skip embedding creation and save costs!!!

interface columns_OFP {
  conceptId: number | null;
  conceptEdge: number[] | null;
  contentId: number | null;
  requiresId: number[] | null;
  trainsId: number[] | null;
  topic: string | null;
  parentId: number | null;
  moduleGoalId: number | null;
  level: number | null;
  elementId1: string | null;
  elementId2: string | null;
  elementId3: string | null;
  elementId4: string | null;
  elementId5: string | null;
  contentNodeTitle: string | null;
  description: string | null;
}

async function createTraKoConcepts(traKoData: columns_OFP[], moduleArchitektur: any) {
  //------------------------------------------
  //Start of creating from traKoData
  //ConceptNode - Starting from ID 1000 to avoid conflicts!
  await prisma.conceptNode.createMany({
    data: traKoData
      .filter(data => data.conceptId)
      .map(data => ({
        id: data.conceptId + 1000, // Add 1000 to avoid conflicts
        name: data.topic,
        description: data.description,
      })),
  });

  //ConceptFamily - Adjust IDs
  await prisma.conceptFamily.createMany({
    data: traKoData
      .filter(data => data.conceptId)
      .map(data => ({
        childId: data.conceptId + 1000,
        parentId: data.parentId ? (data.parentId === 1 ? 1 : data.parentId + 1000) : 1,
      })),
  });
  
  //ConceptEdge - Adjust IDs
  for (const data of traKoData) {
    if (data.conceptEdge) {
      for (const edge of data.conceptEdge) {
        await prisma.conceptEdge.create({
          data: {
            prerequisiteId: edge === 1 ? 1 : edge + 1000,
            successorId: data.conceptId + 1000,
            parentId: data.parentId ? (data.parentId === 1 ? 1 : data.parentId + 1000) : 1,
          },
        });
      }
    }
  }
  
  //ModuleConceptGoal - Adjust IDs
  await prisma.moduleConceptGoal.createMany({
    data: traKoData
      .filter(data => data.conceptId && data.moduleGoalId)
      .map(data => ({
        moduleId: moduleArchitektur.id,
        conceptNodeId: data.conceptId + 1000,
        level: data.moduleGoalId,
      })),
  });
  
  //ContentNode - Starting from ID 10000 to avoid conflicts!
  await prisma.contentNode.createMany({
    data: traKoData
      .filter(data => data.contentId)
      .map(data => ({
        id: data.contentId + 10000, // Add 10000 to avoid conflicts
        name: data.contentNodeTitle,
        description: data.description,
      })),
  });
  
  //ContentElement
  for (const data of traKoData) {
    const elementList = [
      data.elementId1,
      data.elementId2,
      data.elementId3,
      data.elementId4,
      data.elementId5,
    ];
    for (const elemId in elementList) {
      if (elementList[+elemId] && data.contentId) {
        const file = await prisma.file.findUnique({
          where: { uniqueIdentifier: elementList[+elemId] },
        });
        if (file && file.type !== 'CODE') {
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
                connect: { id: data.contentId + 10000 },
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
  
  //Training - Adjust IDs
  for (const data of traKoData) {
    if (data.trainsId && data.contentId) {
      for (const train of data.trainsId) {
        await prisma.training.create({
          data: {
            contentNode: {
              connect: { id: data.contentId + 10000 },
            },
            conceptNode: {
              connect: { id: train === 1 ? 1 : train + 1000 },
            },
            awards: data.level,
          },
        });
      }
    }
  }
  
  //Requirement - Adjust IDs
  for (const data of traKoData) {
    if (data.requiresId && data.contentId) {
      for (const requires of data.requiresId) {
        await prisma.requirement.create({
          data: {
            contentNode: {
              connect: { id: data.contentId + 10000 },
            },
            conceptNode: {
              connect: { id: requires === 1 ? 1 : requires + 1000 },
            },
          },
        });
      }
    }
  }

  //End of creating from traKoData
  //------------------------------------------
}

// Create TraKo specific files
async function createFilesTraKo() {
  console.log('Creating files for TraKo...');
  
  // Add TraKo specific files here
  // Example:
  // await createFile(
  //   'TraKo_Introduction.pdf',
  //   'unique-id-trako-001',
  //   'TraKo/TraKo_Introduction.pdf',
  //   'PDF',
  // );
  
  console.log('Done creating TraKo files.');
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
    await seedAllEmbeddingsForVideo(file, 'TraKo');
  }
  return file;
}

export const seedTraKoFixed = async () => {
  console.log('Creating TraKo data...');

  // Check if OFP module exists
  const existingModules = await prisma.module.findMany();
  const existingSubjects = await prisma.subject.findMany();
  
  // Create Module with next available ID
  const nextModuleId = Math.max(...existingModules.map(m => m.id), 0) + 1;
  const moduleArchitektur = await prisma.module.create({
    data: {
      id: nextModuleId,
      name: 'Bachelor Architektur',
      description: 'Beschreibung für den Studiengang Architektur.',
    },
  });

  // Create Subject with next available ID
  const nextSubjectId = Math.max(...existingSubjects.map(s => s.id), 0) + 1;
  const subjectTraKo = await prisma.subject.create({
    data: {
      id: nextSubjectId,
      name: 'Tragkonstruktion 3',
      description: 'Beschreibung für die Veranstaltung Tragkonstruktion 3.',
      modules: { connect: { id: moduleArchitektur.id } },
    },
  });

  // Check if admin user exists
  let adminUser = await prisma.user.findUnique({
    where: { email: 'admin@test.de' }
  });

  if (!adminUser) {
    // Create admin if not exists
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.de',
        firstname: 'Admin',
        lastname: 'User',
        password: await bcrypt.hash('QGkd!s#4na4f', 10),
        globalRole: 'ADMIN',
      },
    });
  }

  // Create UserSubject relation for TraKo
  const existingUserSubject = await prisma.userSubject.findUnique({
    where: {
      userId_subjectId: {
        userId: adminUser.id,
        subjectId: subjectTraKo.id,
      }
    }
  });

  if (!existingUserSubject) {
    await prisma.userSubject.create({
      data: {
        userId: adminUser.id,
        subjectId: subjectTraKo.id,
        subjectSpecificRole: 'TEACHER',
        registeredForSL: true,
      },
    });
  }

  // Use existing root node instead of creating new one
  let conceptNode = await prisma.conceptNode.findUnique({
    where: { id: 1 }
  });

  if (!conceptNode) {
    // Only create if doesn't exist
    conceptNode = await prisma.conceptNode.create({
      data: {
        id: 1,
        name: 'root',
        description: 'root description',
      },
    });
  }

  // Check if UserConcept exists
  const existingUserConcept = await prisma.userConcept.findFirst({
    where: {
      userId: adminUser.id,
      conceptNodeId: conceptNode.id,
    }
  });

  if (!existingUserConcept) {
    await prisma.userConcept.create({
      data: {
        user: { connect: { id: adminUser.id } },
        concept: { connect: { id: conceptNode.id } },
        level: 10,
        expanded: true,
      },
    });
  }

  // Create moduleConceptGoal for root if not exists
  const existingModuleGoal = await prisma.moduleConceptGoal.findFirst({
    where: {
      moduleId: moduleArchitektur.id,
      conceptNodeId: conceptNode.id,
    }
  });

  if (!existingModuleGoal) {
    await prisma.moduleConceptGoal.create({
      data: {
        moduleId: moduleArchitektur.id,
        conceptNodeId: conceptNode.id,
        level: 10,
      },
    });
  }

  // Check if ConceptGraph exists
  let conceptGraph = await prisma.conceptGraph.findFirst({
    where: { rootId: conceptNode.id }
  });

  if (!conceptGraph) {
    conceptGraph = await prisma.conceptGraph.create({
      data: {
        name: 'Concept Graph 1',
        root: { connect: { id: conceptNode.id } },
      },
    });
  }

  // Create TraKo specific files
  await createFilesTraKo();

  // Import Concepts from CSV
  console.log('Importing TraKo Concepts from CSV...');

  const traKoData = [];
  const filePath = process.env.FILE_PATH + 'Kompetenzraster_TraKo.csv';
  
  if (fs.existsSync(filePath)) {
    let lastTopic = 'No topic found!';

    const fs = require('fs');
    const fastCsv = require('fast-csv');

    const options = {
      delimiter: ',',
      headers: [
        'conceptId',
        'conceptEdge',
        'contentId',
        'requiresId',
        'trainsId',
        'topic',
        'parentId',
        'moduleGoalId',
        'level',
        'elementId1',
        'elementId2',
        'elementId3',
        'elementId4',
        'elementId5',
        'contentNodeTitle',
        'description',
      ],
      skipRows: 1,
      trim: true,
    };

    const readableStream = fs.createReadStream(filePath);

    fastCsv
      .parseStream(readableStream, options)
      .on('data', data => {
        if (data.topic != null) {
          lastTopic = data.topic;
        }
        traKoData.push({
          conceptId: data.conceptId ? +data.conceptId : null,
          conceptEdge: data.conceptEdge
            ? data.conceptEdge.toString().split(/[,.]/).map(Number)
            : null,
          contentId: data.contentId ? +data.contentId : null,
          requiresId: data.requiresId ? data.requiresId.toString().split(/[,.]/).map(Number) : null,
          trainsId: data.trainsId ? data.trainsId.toString().split(/[,.]/).map(Number) : null,
          topic: lastTopic,
          parentId: data.parentId ? +data.parentId : null,
          moduleGoalId: data.moduleGoalId ? +data.moduleGoalId : null,
          level: data.level ? +data.level : null,
          elementId1: data.elementId1 ? data.elementId1 : null,
          elementId2: data.elementId2 ? data.elementId2 : null,
          elementId3: data.elementId3 ? data.elementId3 : null,
          elementId4: data.elementId4 ? data.elementId4 : null,
          elementId5: data.elementId5 ? data.elementId5 : null,
          contentNodeTitle: data.contentNodeTitle ? data.contentNodeTitle : lastTopic,
          description: data.description ? data.description : null,
        });
      })
      .on('end', async () => {
        await createTraKoConcepts(traKoData, moduleArchitektur);
        console.log('Importing TraKo Concepts Done: ' + traKoData.length + ' Concepts imported!');
      });
  } else {
    console.log('To import ContentNodes please save "Kompetenzraster_TraKo.csv" in the storage folder!');
  }

  console.log('TraKo seeding completed!');
};