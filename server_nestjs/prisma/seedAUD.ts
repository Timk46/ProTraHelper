import { PrismaClient, contentElementType } from '@prisma/client';

import { WorkSheet, utils } from 'xlsx';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import { seedUser } from './seedUser';
import { seedFiles } from './seedFiles';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const createEmbeddings = true; // set false to skip embedding creation and save costs!!!

// columns from the AuD sheet
interface columns_AUD {
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


/**
 * Create all relevant database entries for AuD
 * @param audData - data from the AuD sheet
 * @param moduleInformatik - module object
 */
async function createAUDConcepts(audData: columns_AUD[], moduleInformatik: any) {
    //------------------------------------------
      //Start of creating from audData
      //ConceptNode
      console.log('Creating Concepts for AuD...');
      for (const data of audData.filter((data) => data.conceptId)) {
        if(data.conceptId == 1) {
          console.log('data: ', data);
        }
      }
      await prisma.conceptNode.createMany({
        data: audData
          .filter((data) => data.conceptId)
          .map((data) => ({
            id: data.conceptId,
            name: data.topic,
            description: data.description ? data.description : 'No description found!',
          })),
      });

      //ConceptFamily
      await prisma.conceptFamily.createMany({
        data: audData
          .filter((data) => data.conceptId)
          .map((data) => ({
            childId: data.conceptId,
            parentId: data.parentId ? data.parentId : 1,
          })),
      });
      //ConceptEdge
      for (const data of audData) {
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
        data: audData
          .filter((data) => data.conceptId && data.moduleGoalId)
          .map((data) => ({
            moduleId: moduleInformatik.id,
            conceptNodeId: data.conceptId,
            level: data.moduleGoalId,
          })),
      });
      //ContentNode
      await prisma.contentNode.createMany({
        data: audData
          .filter((data) => data.contentId)
          .map((data) => ({
            id: data.contentId,
            name: data.contentNodeTitle,
            description: data.description,
          })),
      });
      //ContentElement
      for (const data of audData) {
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
      for (const data of audData) {
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
      for (const data of audData) {
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

      //End of creating from audData
      //------------------------------------------
}


export const seedAUD = async () => {
    console.log('Creating everything...');

    // Create Files
    seedFiles();

    const moduleInformatik = await prisma.module.create({
      data: {
        id: 1,
        name: 'Bachelor Informatik',
        description: 'Beschreibung für den Studiengang Informatik.',
      },
    });

    const subjectAUD = await prisma.subject.create({
      data: {
        id: 1,
        name: 'Algorithmen und Datenstrukturen',
        description: 'Beschreibung für die Veranstaltung AuD.',
        modules: { connect: { id: moduleInformatik.id } },
      },
    });

    // Admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'admiuiojeASNFIUOASDHBNFIOAn@admiSUIODFHIOAASDn.de',
        firstname: 'Admin',
        lastname: 'User',
        password: await bcrypt.hash('sjdfAios4357843#!ddfGs3', 10), // changed on production
        globalRole: 'ADMIN',
      },
    });

    await prisma.userSubject.create({
      data: {
        userId: adminUser.id,
        subjectId: subjectAUD.id,
        subjectSpecificRole: 'STUDENT',
        registeredForSL: false,
      },
    });


    // seed mor users for other usecases (evaluation etc.)
    await seedUser(subjectAUD.id, moduleInformatik.id);

    // root node //TODO: other id than 1
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
        name: 'Concept Graph AuD',
        root: { connect: { id: conceptNode.id } },
      },
    });

    console.log('Importing Concepts from CSV...');

    const audData = [];

    // read data from csv file
    // each row represents a concept node and/or a content node
    const filename = 'Kompetenzraster_AUD.csv';
    const filePath = process.env.FILE_PATH + filename;
    if (fs.existsSync(filePath)) {

      //in case the topic column for the Content is empty we need to save the last topic
      let lastTopic = 'No topic found!';

      const fs = require('fs');
      const fastCsv = require('fast-csv');

      const options = {
        delimiter: ',',
        headers: [
          'conceptId',            // should start with 2
          'conceptEdge',          // list of successor conceptIds
          'contentId',
          'requiresId',           // list of conceptIds that are required to understand this content (currently not used)
          'trainsId',             // list of conceptIds that are trained by this content node (used for listing all content nodes of a concept node)
          'topic',                // topic of the concept and/or content node
          'parentId',             // conceptId of the parent concept node
          'moduleGoalId',         // maximal level achievable for this concept node
          'level',                // level of the content node
          'elementId1',           // uuid of the corresponding files
          'elementId2',
          'elementId3',
          'elementId4',
          'elementId5',
          'contentNodeTitle',     // title of the content node (if empty the topic is used)
          'description',          // description of the concept and/or content node
        ],
        skipRows: 1,
        trim: true,
      };

      const readableStream = fs.createReadStream(filePath);

      fastCsv.parseStream(readableStream, options)
        .on('data', (data) => {
          // in case a concept includes multiple content nodes the same topic is used for all content nodes of the concept
          if(data.topic != null) {
            lastTopic = data.topic;
          }
          audData.push({
            conceptId: data.conceptId ? +data.conceptId : null,
            conceptEdge: data.conceptEdge ? data.conceptEdge.toString().split(/[,.]/).map(Number) : null,
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
          await createAUDConcepts(audData, moduleInformatik);
          console.log('Importing Concepts Done!');
        });



    } else {
      console.log(
        'To import ContentNodes please save' + filename + 'in the files folder!',
      );
    }

    console.log('Creating rest from Seed.ts...');

    // update user to have a current concept node
    await prisma.user.updateMany({
      data: {
        currentconceptNodeId: conceptNode.id,
      },
    });
}


async function main() {

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
