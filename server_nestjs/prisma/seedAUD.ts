import { PrismaClient, contentElementType } from '@prisma/client';
import { seedAllEmbeddingsForVideo } from './seedEmbeddings';
import { WorkSheet, utils } from 'xlsx';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import { seedUser } from './seedUser';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const createEmbeddings = true; // set false to skip embedding creation and save costs!!!

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

async function createFile(
    name: string,
    uniqueIdentifier: string,
    path: string,
    type: string,
  ) {
    const file = await prisma.file.create({
      data: {
        name,
        uniqueIdentifier,
        path,
        type,
      },
    });
    if (createEmbeddings) {
       await seedAllEmbeddingsForVideo(file, 'AUD');  //TODO: implement seedAllEmbeddingsForVideo for AUD
    }
    return file;
  }

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

async function createFilesAUD() {
    console.log('Creating Files for AuD...');
    // createfile also creates embeddings for SRTs with the same name if the file is type VIDEO
    // Start of column elementId1
    createFile(
      'AUD001.pdf',
      '8c795d5c-9a55-4e54-ac02-55ae1ee6acc1',
      'AUD/AUD001.pdf',
      'PDF',
    );
    createFile(
      'AUD002.pdf',
      '15e2eed9-93eb-43a1-955e-2bb22f1cc38a',
      'AUD/AUD002.pdf',
      'PDF',
    );
    createFile(
      'AUD003.pdf',
      '36ad540c-7058-4cef-839d-e2bbd06e21e6',
      'AUD/AUD003.pdf',
      'PDF',
    );
    createFile(
      'AUD004.pdf',
      '839e99ae-b003-4a02-be3b-436800034464',
      'AUD/AUD004.pdf',
      'PDF',
    );
    createFile(
      'AUD005.pdf',
      'df5de1d1-bece-4cdb-a7d0-fd0366f7a88e',
      'AUD/AUD005.pdf',
      'PDF',
    );
    createFile(
      'AUD006.pdf',
      '3da67469-6fe5-4f1d-a534-ff80a28a4deb',
      'AUD/AUD006.pdf',
      'PDF',
    );
    createFile(
      'AUD007.pdf',
      'aa2cd7c7-8179-450e-b1a1-ba85d37ecdd7',
      'AUD/AUD007.pdf',
      'PDF',
    );
    createFile(
      'AUD008.pdf',
      '0a39655a-d4c2-41c8-85f6-5ec22da09717',
      'AUD/AUD008.pdf',
      'PDF',
    );
    createFile(
      'AUD009.pdf',
      '6445e117-b539-40f2-bb76-b1566a4e80b2',
      'AUD/AUD009.pdf',
      'PDF',
    );
    createFile(
      'AUD010.pdf',
      'd0d2c513-b488-4082-990d-f25379678d55',
      'AUD/AUD010.pdf',
      'PDF',
    );
    createFile(
      'AUD011.pdf',
      '37a6021d-073a-41e6-8aa9-1365b86d0e93',
      'AUD/AUD011.pdf',
      'PDF',
    );
    createFile(
      'AUD012.pdf',
      '50432612-a3c9-4b10-bd03-4c7c4d725d7d',
      'AUD/AUD012.pdf',
      'PDF',
    );
    createFile(
      'AUD013.pdf',
      'f2e6df6b-af4d-4aa7-85f1-87748159cdeb',
      'AUD/AUD013.pdf',
      'PDF',
    );
    createFile(
      'AUD014.pdf',
      'd33542dd-4129-4011-8fa8-0e08857eecb4',
      'AUD/AUD014.pdf',
      'PDF',
    );
    createFile(
      'AUD015.pdf',
      '86fc86c7-4b1e-45c8-a6e0-2311e6e2a900',
      'AUD/AUD015.pdf',
      'PDF',
    );
    createFile(
      'AUD016.pdf',
      '2335b0cd-e475-42fd-bc3f-354b224d2086',
      'AUD/AUD016.pdf',
      'PDF',
    );
    createFile(
      'AUD017.pdf',
      '43510ba5-0f55-41e1-b02b-19f472790950',
      'AUD/AUD017.pdf',
      'PDF',
    );
    createFile(
      'AUD018.pdf',
      'a8cbbfd3-d548-4825-b45b-59b1b2a5dcce',
      'AUD/AUD018.pdf',
      'PDF',
    );
    createFile(
      'AUD019.pdf',
      '9f04114e-9b1a-4917-97d2-a47b671bfeed',
      'AUD/AUD019.pdf',
      'PDF',
    );
    createFile(
      'AUD020.pdf',
      '252de8f8-4430-4304-bf97-df159843c3ea',
      'AUD/AUD020.pdf',
      'PDF',
    );
    createFile(
      'AUD021.pdf',
      '1b2dadf3-7b4e-469c-bc2a-a7fb0d8ff5e7',
      'AUD/AUD021.pdf',
      'PDF',
    );
    createFile(
      'AUD022.pdf',
      'fa802df8-f9c1-42f5-864c-b10eeb39c28c',
      'AUD/AUD022.pdf',
      'PDF',
    );
    createFile(
      'AUD023.pdf',
      '3cb2c23d-0157-4ab8-8cb6-5db933ffec32',
      'AUD/AUD023.pdf',
      'PDF',
    );
    createFile(
      'AUD024.pdf',
      'd3055756-b82e-41f7-9509-d773f81f0ec4',
      'AUD/AUD024.pdf',
      'PDF',
    );
    createFile(
      'AUD025.pdf',
      '0c04f0bc-4921-4322-b79e-d577ef6c65dd',
      'AUD/AUD025.pdf',
      'PDF',
    );
    createFile(
      'AUD026.pdf',
      'e47a6d82-1ae0-49f2-a6c5-8151d9695087',
      'AUD/AUD026.pdf',
      'PDF',
    );
    createFile(
      'AUD027.pdf',
      'd550745b-0ea5-422d-8822-c4bfb0b64ee4',
      'AUD/AUD027.pdf',
      'PDF',
    );
    createFile(
      'AUD028.pdf',
      'a34120ae-eb0b-4e71-9a4d-5fffe5b42939',
      'AUD/AUD028.pdf',
      'PDF',
    );
    createFile(
      'AUD029.pdf',
      'f425f69a-9d04-4b4c-8867-66f0ba9c98bf',
      'AUD/AUD029.pdf',
      'PDF',
    );
    createFile(
      'AUD030.pdf',
      'dc08f279-3a56-4d80-b707-e6899e69774e',
      'AUD/AUD030.pdf',
      'PDF',
    );
    createFile(
      'AUD031.pdf',
      'e1e31c74-25bc-4ffc-97ea-023e24ddc98f',
      'AUD/AUD031.pdf',
      'PDF',
    );
    createFile(
      'AUD032.pdf',
      '05cd6d64-48a1-4e92-858b-7b58af1ad47e',
      'AUD/AUD032.pdf',
      'PDF',
    );
    createFile(
      'AUD033.pdf',
      '290b7336-ac7e-445a-bf22-476d16ff6075',
      'AUD/AUD033.pdf',
      'PDF',
    );
    createFile(
      'AUD034.pdf',
      'cd6ce3b7-ac0c-4aec-92c6-634add32c56e',
      'AUD/AUD034.pdf',
      'PDF',
    );
    createFile(
      'AUD035.pdf',
      'eed97751-278d-4735-b9f5-b137ed7d26b2',
      'AUD/AUD035.pdf',
      'PDF',
    );
    createFile(
      'AUD036.pdf',
      'a6ae4ffa-4cce-4081-8eac-b821d1dd4b59',
      'AUD/AUD036.pdf',
      'PDF',
    );
    createFile(
      'AUD038.pdf',
      '0324e70b-a08c-4f37-8fda-2557eafdf1b1',
      'AUD/AUD038.pdf',
      'PDF',
    );
    createFile(
      'AUD039.pdf',
      'd0c03093-96f3-4811-86fb-40f7b3a3be5c',
      'AUD/AUD039.pdf',
      'PDF',
    );
    createFile(
      'AUD040.pdf',
      '1067715c-4100-4ed7-93fe-d73deadcc4c6',
      'AUD/AUD040.pdf',
      'PDF',
    );
    createFile(
      'AUD041.pdf',
      '3362e09d-d1e5-4518-83fd-90e7392ccfa8',
      'AUD/AUD041.pdf',
      'PDF',
    );
    createFile(
      'AUD042.pdf',
      'aa50e6b0-c23f-4302-a4fa-88968125633d',
      'AUD/AUD042.pdf',
      'PDF',
    );
    createFile(
      'AUD043.pdf',
      'bbdb26e7-c20e-43a5-b241-60d6baf9cd8d',
      'AUD/AUD043.pdf',
      'PDF',
    );
    createFile(
      'AUD044.pdf',
      '125eb817-887e-49b0-86d2-564968b0b454',
      'AUD/AUD044.pdf',
      'PDF',
    );
    createFile(
      'AUD045.pdf',
      '5ccbb8dd-bb83-48bd-9027-b29e0272b0b5',
      'AUD/AUD045.pdf',
      'PDF',
    );
    createFile(
      'AUD046.pdf',
      'd24434d0-e33b-4ba7-8828-e0bb230a0683',
      'AUD/AUD046.pdf',
      'PDF',
    );
    createFile(
      'AUD047.pdf',
      'bf7b4ec2-c4ef-4c3b-ab5b-cba5eb7f7045',
      'AUD/AUD047.pdf',
      'PDF',
    );
    createFile(
      'AUD048.pdf',
      'df299beb-5a6a-4536-9656-cdc2aa0be58e',
      'AUD/AUD048.pdf',
      'PDF',
    );
    createFile(
      'AUD049.pdf',
      '1f164985-9815-4d09-838d-ce14722b156a',
      'AUD/AUD049.pdf',
      'PDF',
    );
    createFile(
      'AUD050.pdf',
      '624fc121-aa8d-4f5e-bfc4-0c985aa1db34',
      'AUD/AUD050.pdf',
      'PDF',
    );
    createFile(
      'AUD051.pdf',
      '58eb8775-5671-4f78-8989-82a68b820529',
      'AUD/AUD051.pdf',
      'PDF',
    );
    createFile(
      'AUD052.pdf',
      '91ec31f2-6a55-4df7-9411-eaa059c982df',
      'AUD/AUD052.pdf',
      'PDF',
    );
    createFile(
      'AUD104.pdf',
      'c550d4ab-4f57-4498-b665-c76d2491ce8f',
      'AUD/AUD104.pdf',
      'PDF',
    );
    createFile(
      'AUD105.pdf',
      '7025c6df-969e-4800-8bf8-6d89559ea4fd',
      'AUD/AUD105.pdf',
      'PDF',
    );
    createFile(
      'AUD106.pdf',
      '6f1780b5-0816-42ab-afa5-7a4fb3cdbe32',
      'AUD/AUD106.pdf',
      'PDF',
    );
    createFile(
      'AUD107.pdf',
      '90653f95-07c4-499e-8137-48291b4a8252',
      'AUD/AUD107.pdf',
      'PDF',
    );
    createFile(
      'AUD109.pdf',
      'c9c5cc69-c494-45fe-bbbf-d352022e6410',
      'AUD/AUD109.pdf',
      'PDF',
    );
    createFile(
      'AUD110.pdf',
      '9b0cafa7-56a8-4ab2-83c0-260dc6de5d3b',
      'AUD/AUD110.pdf',
      'PDF',
    );
    createFile(
      'AUD111.pdf',
      '6033eeb9-3f76-47b2-bdbc-8dce061e5b2a',
      'AUD/AUD111.pdf',
      'PDF',
    );
    createFile(
      'AUD112.pdf',
      '1bde16d3-16c9-4bfa-b34f-1fd9b62bf9be',
      'AUD/AUD112.pdf',
      'PDF',
    );
    createFile(
      'AUD113.pdf',
      'd74512be-4c8e-4f5a-a028-85a5ea913d27',
      'AUD/AUD113.pdf',
      'PDF',
    );
    createFile(
      'AUD114.pdf',
      '3bff7e33-70cd-40e5-99f1-529659c5ce1e',
      'AUD/AUD114.pdf',
      'PDF',
    );
    createFile(
      'AUD115.pdf',
      '0097251f-7ab7-47b5-b208-149c46c750b9',
      'AUD/AUD115.pdf',
      'PDF',
    );
    createFile(
      'AUD116.pdf',
      '2e36ccfa-0804-4278-b793-55f28848a200',
      'AUD/AUD116.pdf',
      'PDF',
    );
    createFile(
      'AUD117.pdf',
      '28a26f84-99c8-45b8-9138-0bc50f46750f',
      'AUD/AUD117.pdf',
      'PDF',
    );
    createFile(
      'AUD118.pdf',
      '81ea71c2-15ab-4a75-b292-6b0fe71f7dc2',
      'AUD/AUD118.pdf',
      'PDF',
    );
    createFile(
      'AUD119.pdf',
      '7f8ea0f8-360d-4d4d-b7d1-5dc2af26d08d',
      'AUD/AUD119.pdf',
      'PDF',
    );
    createFile(
      'AUD120.pdf',
      '7d4b6174-32b2-45f9-8237-138848fc9a85',
      'AUD/AUD120.pdf',
      'PDF',
    );
    createFile(
      'AUD121.pdf',
      '771efae8-4715-4269-b11a-f9e94187f415',
      'AUD/AUD121.pdf',
      'PDF',
    );
    createFile(
      'AUD122.pdf',
      'ea2862d2-1be4-4e66-a529-d52d92bfb74c',
      'AUD/AUD122.pdf',
      'PDF',
    );
    createFile(
      'AUD122.pdf',
      '6890870c-f855-4a1e-8830-b20a64becaa4',
      'AUD/AUD122.pdf',
      'PDF',
    );
    createFile(
      'AUD123.pdf',
      'd5a1e707-aa2d-4c46-9638-ca7636ab9377',
      'AUD/AUD123.pdf',
      'PDF',
    );
    createFile(
      'AUD124.pdf',
      '4e0114e3-bbeb-42ae-9f4e-e851476d829c',
      'AUD/AUD124.pdf',
      'PDF',
    );
    createFile(
      'AUD125.pdf',
      'f95f6a40-b2fa-4e9a-84e7-b92a3c331a8a',
      'AUD/AUD125.pdf',
      'PDF',
    );
    createFile(
      'AUD126.pdf',
      '9ae29bbb-08df-4bf5-a1cb-1bbdffb3df6a',
      'AUD/AUD126.pdf',
      'PDF',
    );
    createFile(
      'AUD127.pdf',
      '5515148a-71db-498e-97b1-daff47dff97e',
      'AUD/AUD127.pdf',
      'PDF',
    );
    createFile(
      'AUD128.pdf',
      '4ffdd2c0-991b-494d-8200-6dd5ff21ed4d',
      'AUD/AUD128.pdf',
      'PDF',
    );
    createFile(
      'AUD129.pdf',
      '27da0183-2eb4-4ae9-b04d-fc32e8aaca6f',
      'AUD/AUD129.pdf',
      'PDF',
    );
    createFile(
      'AUD130.pdf',
      'b6fe578a-d237-4353-a3c2-6c4e031832a8',
      'AUD/AUD130.pdf',
      'PDF',
    );
    createFile(
      'AUD108.pdf',
      '052893b4-d244-42a3-a920-be3e59bbc91f',
      'AUD/AUD108.pdf',
      'PDF',
    );
    createFile(
      'AUD131.pdf',
      '02414ef0-4bc2-4823-a94c-3f71e7d57180',
      'AUD/AUD131.pdf',
      'PDF',
    );
    createFile(
      'AUD132.pdf',
      '0d39f7fb-cc90-483b-98cf-988a38d088ef',
      'AUD/AUD132.pdf',
      'PDF',
    );
    createFile(
      'AUD133.pdf',
      'a5a985a5-4eb1-4752-ad52-f67dcdcdf8d8',
      'AUD/AUD133.pdf',
      'PDF',
    );
    createFile(
      'AUD134.pdf',
      '257d6f5e-3adc-4a36-8fc5-489f41bba357',
      'AUD/AUD134.pdf',
      'PDF',
    );
    createFile(
      'AUD135.pdf',
      'f9f9b4de-a3f5-479d-87ff-64c667249c0b',
      'AUD/AUD135.pdf',
      'PDF',
    );
    createFile(
      'AUD136.pdf',
      'ef9299c7-3bfc-47ae-bc94-1397ccaf489c',
      'AUD/AUD136.pdf',
      'PDF',
    );
    createFile(
      'AUD137.pdf',
      'cc15fbb8-4aff-463a-9ed4-8c74e3827d9c',
      'AUD/AUD137.pdf',
      'PDF',
    );
    createFile(
      'AUD138.pdf',
      '472cdd72-a159-4253-b4a2-e24c92763f34',
      'AUD/AUD138.pdf',
      'PDF',
    );
    createFile(
      'AUD139.pdf',
      '38926c69-c4cd-4b3c-a34f-fbc0dbc1d1e9',
      'AUD/AUD139.pdf',
      'PDF',
    );
    createFile(
      'AUD140.pdf',
      'c5fe9708-a2a4-4686-a0cc-ec18d4411f59',
      'AUD/AUD140.pdf',
      'PDF',
    );
    createFile(
      'AUD054.pdf',
      '3fbd7b65-7051-4960-a7df-1397c0d5a39d',
      'AUD/AUD054.pdf',
      'PDF',
    );
    createFile(
      'AUD055.pdf',
      'bf0b5f8a-8e2e-4cb6-a309-6676014167a6',
      'AUD/AUD055.pdf',
      'PDF',
    );
    createFile(
      'AUD056.pdf',
      '354b72fb-e06d-4b6e-b38c-965c69b356b4',
      'AUD/AUD056.pdf',
      'PDF',
    );
    createFile(
      'AUD057.pdf',
      '95a27e37-b8b8-4efe-be4f-990145d2a05d',
      'AUD/AUD057.pdf',
      'PDF',
    );
    createFile(
      'AUD058.pdf',
      '50325c2f-b272-4881-be7b-4f9b27f0f3a2',
      'AUD/AUD058.pdf',
      'PDF',
    );
    createFile(
      'AUD059.pdf',
      'e93aab67-03b8-45d3-907b-19f95668f3a8',
      'AUD/AUD059.pdf',
      'PDF',
    );
    createFile(
      'AUD060.pdf',
      'acb90e83-3612-4caa-860e-55d0b0c8724b',
      'AUD/AUD060.pdf',
      'PDF',
    );
    createFile(
      'AUD061.pdf',
      'af1d7235-437a-4049-b9e3-149676100b9e',
      'AUD/AUD061.pdf',
      'PDF',
    );
    createFile(
      'AUD062.pdf',
      '3f485fcb-0951-46ba-9ef4-2bfee494c540',
      'AUD/AUD062.pdf',
      'PDF',
    );
    createFile(
      'AUD063.pdf',
      '8b7296a5-4e17-472d-ba69-6bcbac80c20a',
      'AUD/AUD063.pdf',
      'PDF',
    );
    createFile(
      'AUD064.pdf',
      '50c13e75-2c44-41ec-bdaf-a1c8c6eeca7a',
      'AUD/AUD064.pdf',
      'PDF',
    );
    createFile(
      'AUD065.pdf',
      'a24aff31-e543-41e0-8fab-e39df6013fa8',
      'AUD/AUD065.pdf',
      'PDF',
    );
    createFile(
      'AUD066.pdf',
      'a7bffa7b-82cd-46c7-a546-1505f792d532',
      'AUD/AUD066.pdf',
      'PDF',
    );
    createFile(
      'AUD067.pdf',
      'e6bf1a31-b4d8-4968-b7cb-f51d55a22408',
      'AUD/AUD067.pdf',
      'PDF',
    );
    createFile(
      'AUD068.pdf',
      '5df449de-81f3-480f-910f-09fb86d03816',
      'AUD/AUD068.pdf',
      'PDF',
    );
    createFile(
      'AUD069.pdf',
      'd0335df5-a3b3-4355-a687-24fabe5747a3',
      'AUD/AUD069.pdf',
      'PDF',
    );
    createFile(
      'AUD070.pdf',
      '1c874593-8555-467a-a936-a46cd4ca3f61',
      'AUD/AUD070.pdf',
      'PDF',
    );
    createFile(
      'AUD071.pdf',
      '002edb5f-daf2-4cfb-abfb-f15aa3910eee',
      'AUD/AUD071.pdf',
      'PDF',
    );
    createFile(
      'AUD075.pdf',
      '77b70435-d43e-41cd-b9a6-7b9cb48a3122',
      'AUD/AUD075.pdf',
      'PDF',
    );
    createFile(
      'AUD072.pdf',
      '72766d08-c2ce-46db-8a3d-a57ead017608',
      'AUD/AUD072.pdf',
      'PDF',
    );
    createFile(
      'AUD073.pdf',
      '48fb5f01-edff-40cd-9be4-97fb98e5076d',
      'AUD/AUD073.pdf',
      'PDF',
    );
    createFile(
      'AUD074.pdf',
      '1ec09063-02cd-4f83-9c3c-42fd603bdd86',
      'AUD/AUD074.pdf',
      'PDF',
    );
    createFile(
      'AUD076.pdf',
      'bb01abe4-5fda-4f48-90e5-adb68bbe1db9',
      'AUD/AUD076.pdf',
      'PDF',
    );
    createFile(
      'AUD077.pdf',
      '79c85457-877d-4a03-a00a-5ddc71f8cf28',
      'AUD/AUD077.pdf',
      'PDF',
    );
    createFile(
      'AUD078.pdf',
      'a867ff9b-cf10-47de-9cd3-0df5e74f08bc',
      'AUD/AUD078.pdf',
      'PDF',
    );
    createFile(
      'AUD079.pdf',
      '1910a869-da36-4236-8822-d1133d50e4b6',
      'AUD/AUD079.pdf',
      'PDF',
    );
    createFile(
      'AUD080.pdf',
      '1e699720-35f1-4e07-9a74-bdb76ef2bd1b',
      'AUD/AUD080.pdf',
      'PDF',
    );
    createFile(
      'AUD081.pdf',
      'bd0825d7-2734-4606-b7c8-02364d1bbd0d',
      'AUD/AUD081.pdf',
      'PDF',
    );
    createFile(
      'AUD082.pdf',
      '25c2bbb8-2b18-4b93-9a3e-577565745099',
      'AUD/AUD082.pdf',
      'PDF',
    );
    createFile(
      'AUD083.pdf',
      '7722a5d7-83eb-4bf0-82fc-0a9ace45069f',
      'AUD/AUD083.pdf',
      'PDF',
    );
    createFile(
      'AUD084.pdf',
      '50e2b214-97d2-4c05-8017-19f6a7ad35d3',
      'AUD/AUD084.pdf',
      'PDF',
    );
    createFile(
      'AUD085.pdf',
      '411c2196-2678-4435-9435-853996a08768',
      'AUD/AUD085.pdf',
      'PDF',
    );
    createFile(
      'AUD086.pdf',
      '31eb1997-8b32-4b08-b41e-6ef5449c5d32',
      'AUD/AUD086.pdf',
      'PDF',
    );
    createFile(
      'AUD087.pdf',
      'b4559b53-847e-403f-b2d5-80f3656da923',
      'AUD/AUD087.pdf',
      'PDF',
    );
    createFile(
      'AUD088.pdf',
      'b40f222d-c50d-4cb9-b778-67668fffac6e',
      'AUD/AUD088.pdf',
      'PDF',
    );
    createFile(
      'AUD089.pdf',
      'bd74b604-ac66-4d6c-abee-33e898b270a7',
      'AUD/AUD089.pdf',
      'PDF',
    );
    createFile(
      'AUD090.pdf',
      'ebc88923-1bdc-4e82-b39c-cbdec95a8798',
      'AUD/AUD090.pdf',
      'PDF',
    );
    createFile(
      'AUD091.pdf',
      '2883f961-8a4b-41a7-857b-4cc8b324c872',
      'AUD/AUD091.pdf',
      'PDF',
    );
    createFile(
      'AUD092.pdf',
      '2e66d789-d230-47b7-a556-ff3f14e2ce4d0',
      'AUD/AUD092.pdf',
      'PDF',
    );
    createFile(
      'AUD093.pdf',
      'afb352bf-5431-4a48-a72e-168d9d3a1e30',
      'AUD/AUD093.pdf',
      'PDF',
    );
    createFile(
      'AUD094.pdf',
      '3a09d7cf-fe03-4ae4-b3b0-1fbbba62901a',
      'AUD/AUD094.pdf',
      'PDF',
    );
    createFile(
      'AUD095.pdf',
      '25005314-6def-4906-bbb3-7d2351e00b1e',
      'AUD/AUD095.pdf',
      'PDF',
    );
    createFile(
      'AUD096.pdf',
      '2077a528-4dad-48ce-a7d2-9f8a2054a455',
      'AUD/AUD096.pdf',
      'PDF',
    );
    createFile(
      'AUD097.pdf',
      'aa79d0d8-36cd-4443-ad90-b951b9634cf7',
      'AUD/AUD097.pdf',
      'PDF',
    );
    createFile(
      'AUD098.pdf',
      '09b28892-e803-4d07-a84d-c0d90b7746fd',
      'AUD/AUD098.pdf',
      'PDF',
    );
    createFile(
      'AUD099.pdf',
      '7f53cf8c-d9fe-4f86-9f48-1a3e09f9aa59',
      'AUD/AUD099.pdf',
      'PDF',
    );
    createFile(
      'AUD100.pdf',
      '09a763e1-1de6-4efb-8a63-218d1982e36a',
      'AUD/AUD100.pdf',
      'PDF',
    );
    createFile(
      'AUD101.pdf',
      '7e2b7b8c-2269-418d-8fb9-b3ffdc8c45da',
      'AUD/AUD101.pdf',
      'PDF',
    );
    createFile(
      'AUD102.pdf',
      '742232eb-d298-4611-979c-ae29dee75afa',
      'AUD/AUD102.pdf',
      'PDF',
    );
    createFile(
      'AUD103.pdf',
      '495c6178-5680-4a26-8727-e23eb5cd9fd6',
      'AUD/AUD103.pdf',
      'PDF',
    );
    // End of column elementId1
    // Start of column elementId2
    createFile(
      'AUD037.pdf',
      '06862a6c-c20b-43f6-a30a-faf937c07397',
      'AUD/AUD037.pdf',
      'PDF',
    );
    createFile(
      'AUD053.pdf',
      'ab188992-b8d3-471c-b35c-bcff562d2a23',
      'AUD/AUD053.pdf',
      'PDF',
    );
    // End of column elementId2
    // Start of column elementId3
    createFile(
      'AUD_V_001.mp4',
      '68f237eb-940b-44b3-893d-fa25c42fb960',
      'AUD/AUD_V_001.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_002.mp4',
      '56302158-fcdf-4415-992f-aa1cf6eda4d4',
      'AUD/AUD_V_002.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_003.mp4',
      'b3ce49b8-006b-41d0-9787-5fc750d86728',
      'AUD/AUD_V_003.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_004.mp4',
      'db9ac09e-7307-4ae6-a7b8-dd4c03d85330',
      'AUD/AUD_V_004.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_005.mp4',
      'f23d1a5d-2d08-4cac-93c7-efebfc9a021d',
      'AUD/AUD_V_005.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_006.mp4',
      'ec726779-0e2a-4c4a-8179-da0aeefcdf51',
      'AUD/AUD_V_006.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_007.mp4',
      '7b015b01-5611-409a-8f48-d6d15b65f21b',
      'AUD/AUD_V_007.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_008.mp4',
      '5c4f350a-162e-4b42-894c-c437db09000c',
      'AUD/AUD_V_008.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_009.mp4',
      '4708693f-a030-47b8-bdfe-22f7deba6d87',
      'AUD/AUD_V_009.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_010.mp4',
      '860d6e39-eeae-4efd-924c-f6e9f1d941e6',
      'AUD/AUD_V_010.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_011.mp4',
      'fed68b70-41f4-418a-8675-6d256de0fe57',
      'AUD/AUD_V_011.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_012.mp4',
      'b59943dd-6973-41b1-8eeb-ace073441589',
      'AUD/AUD_V_012.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_013.mp4',
      'd963deb1-868f-4883-b6e0-baed1ca2ea82',
      'AUD/AUD_V_013.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_014.mp4',
      'bdfc7172-98e0-4dbf-a005-33e59fdc9125',
      'AUD/AUD_V_014.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_015.mp4',
      '4abdb902-c161-4d0e-a0b2-50af9725aa01',
      'AUD/AUD_V_015.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_016.mp4',
      '56348954-d65b-4e2d-a3a7-8c812fc59351',
      'AUD/AUD_V_016.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_017.mp4',
      'ab246674-e971-40f8-a0fa-220ae94f7493',
      'AUD/AUD_V_017.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_018.mp4',
      '9623b62f-3e76-40d1-aec0-25159cf407cc',
      'AUD/AUD_V_018.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_019.mp4',
      'eb885061-ec14-4685-b041-aca2bf2f8214',
      'AUD/AUD_V_019.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_020.mp4',
      'ee91bf11-00c5-47b4-aa82-ab576d8e9e1e',
      'AUD/AUD_V_020.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_021.mp4',
      '41a49887-6d7e-4ff0-8819-42c2e307ad4e',
      'AUD/AUD_V_021.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_022.mp4',
      'a2e9bb87-4b05-4285-987c-204afae49a31',
      'AUD/AUD_V_022.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_023.mp4',
      '32c639e7-03f2-465e-971d-a921e134d29b',
      'AUD/AUD_V_023.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_024.mp4',
      '73c6440c-121b-4780-abf1-01bdab88457d',
      'AUD/AUD_V_024.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_025.mp4',
      'ca95e2a9-7472-4e2c-b02d-1a9be9616f81',
      'AUD/AUD_V_025.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_026.mp4',
      'f4e155d7-b8e6-4e5e-9b8a-14ddb11e5777',
      'AUD/AUD_V_026.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_027.mp4',
      'e821c40a-4dc5-4b17-91e8-962adabd2810',
      'AUD/AUD_V_027.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_028.mp4',
      '06bfb1cc-fa70-4d96-bd0e-82858834e6f3',
      'AUD/AUD_V_028.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_029.mp4',
      '9bab84bc-d7d3-4240-8e9a-70a7cefa2c2a',
      'AUD/AUD_V_029.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_030.mp4',
      'c7de03fd-493d-43f1-a0f0-3c7987c701b7',
      'AUD/AUD_V_030.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_031.mp4',
      'b285b60c-7ac3-49d2-89c1-75276be39b4c',
      'AUD/AUD_V_031.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_032.mp4',
      '888cc0e6-b64c-48bc-9971-b727031b7543',
      'AUD/AUD_V_032.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_033.mp4',
      '47d45b9d-bd66-4d3a-a24a-4568ac206a68',
      'AUD/AUD_V_033.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_034.mp4',
      '6a8adde9-cdb8-46a8-8071-ac9c3420ebd1',
      'AUD/AUD_V_034.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_035.mp4',
      'eae141fc-661b-4b0d-931f-24bbd4b74381',
      'AUD/AUD_V_035.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_036.mp4',
      '1767abfa-133e-427a-9d96-3b2b94f0fd68',
      'AUD/AUD_V_036.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_038.mp4',
      'c935786a-1caf-48cb-9997-6b95933d14af',
      'AUD/AUD_V_038.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_039.mp4',
      'd3faef9a-651b-465e-8164-a63b747bf73e',
      'AUD/AUD_V_039.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_040.mp4',
      'a1927d3a-d374-46c9-8627-d70861fcd58f',
      'AUD/AUD_V_040.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_041.mp4',
      '81152875-9b8e-4389-86fb-03f2cc71c939',
      'AUD/AUD_V_041.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_042.mp4',
      'e7cfa6aa-42b4-4966-b2d8-3458a0251034',
      'AUD/AUD_V_042.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_043.mp4',
      '3b0f9ee3-a3ac-4792-bcee-105a8f040127',
      'AUD/AUD_V_043.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_044.mp4',
      'f8f828ae-1fda-4e04-93ef-3f62fb4c45c3',
      'AUD/AUD_V_044.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_045.mp4',
      'a23bb305-861b-41f6-9397-84badc1a0c57',
      'AUD/AUD_V_045.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_046.mp4',
      '47704071-bdc0-41da-bd90-5b640af582d6',
      'AUD/AUD_V_046.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_047.mp4',
      '4dd613f0-d565-4388-bb29-ff82622e1604',
      'AUD/AUD_V_047.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_048.mp4',
      '78663400-c528-4c93-9d9e-440257bb0f13',
      'AUD/AUD_V_048.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_049.mp4',
      'bc851f1e-ceec-45f9-b160-2ff491913cdb',
      'AUD/AUD_V_049.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_050.mp4',
      'd47c5de0-6b24-4da8-a03c-0242443d0a47',
      'AUD/AUD_V_050.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_051.mp4',
      'c2e37c6e-63b0-4da6-8d8a-29a6b87119d5',
      'AUD/AUD_V_051.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_052.mp4',
      '6d0307c5-f75f-4e09-b888-4e9e9adc4ec3',
      'AUD/AUD_V_052.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_054.mp4',
      'c25cbe21-014a-4387-8336-ebf4c5697e8b',
      'AUD/AUD_V_054.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_055.mp4',
      '6929c29c-f454-42b2-b3e7-1c1183e0abb9',
      'AUD/AUD_V_055.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_056.mp4',
      'b049f591-744b-4716-aed8-1f3c593cd0e1',
      'AUD/AUD_V_056.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_057.mp4',
      'dba2b419-677c-48c0-b497-7c5da00d43d8',
      'AUD/AUD_V_057.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_058.mp4',
      'c613e5c3-e948-4b46-abf4-87b85a7d6570',
      'AUD/AUD_V_058.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_059.mp4',
      '274dcfad-3f63-4a9b-b994-8cdb43a92aa1',
      'AUD/AUD_V_059.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_060.mp4',
      '2018adfb-e715-4f72-ab68-91ad49a8eb06',
      'AUD/AUD_V_060.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_061.mp4',
      '9fb25707-dde0-4c99-b7b9-62719628066a',
      'AUD/AUD_V_061.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_062.mp4',
      '5f49e2d4-dd24-49df-bb3e-be7ff9da097e',
      'AUD/AUD_V_062.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_063.mp4',
      '4932baa1-bfb8-49cb-a140-bc05d5572667',
      'AUD/AUD_V_063.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_064.mp4',
      '391b8387-2e09-4c28-b95a-b7c157fa623d',
      'AUD/AUD_V_064.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_065.mp4',
      '587eaed5-9ffb-4fb2-a168-5854e7d0b113',
      'AUD/AUD_V_065.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_104.mp4',
      '2c4bd0d7-9d10-4005-9914-3f525619aca6',
      'AUD/AUD_V_104.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_105.mp4',
      '6eab38e5-7cdd-44aa-b538-f48a1ac8a553',
      'AUD/AUD_V_105.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_106.mp4',
      'c5d1fb60-3a4d-4717-9718-fee7a7603485',
      'AUD/AUD_V_106.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_107.mp4',
      '96229c94-135b-433b-93f4-e0789c0b7608',
      'AUD/AUD_V_107.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_109.mp4',
      '326e0ec5-5437-4e54-a6ed-436b51225f09',
      'AUD/AUD_V_109.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_110.mp4',
      '683da0c8-ad21-4f96-b03e-846418adbc4e',
      'AUD/AUD_V_110.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_111.mp4',
      '7ba1f4a6-f590-4a2d-9200-55339ca4011c',
      'AUD/AUD_V_111.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_112.mp4',
      'f1a4cfc8-1428-4bac-9a82-98505313201c',
      'AUD/AUD_V_112.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_113.mp4',
      '752d7715-9c0d-4427-825d-b594d22d0493',
      'AUD/AUD_V_113.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_114.mp4',
      'fae80434-2330-4cdf-9c8a-80db4ff82162',
      'AUD/AUD_V_114.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_115.mp4',
      '81988bff-a822-416a-b5a1-deeff4c05054',
      'AUD/AUD_V_115.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_116.mp4',
      '9e0dfd63-c6b5-4b89-b4e3-d54c42a454e5',
      'AUD/AUD_V_116.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_117.mp4',
      '7633f122-694a-4450-9c02-b7cf9f056c7e',
      'AUD/AUD_V_117.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_118.mp4',
      'e419f295-b1fb-409d-a25f-ff97170c4c0b',
      'AUD/AUD_V_118.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_119.mp4',
      '97718b59-71e6-479a-8188-0e48085960fd',
      'AUD/AUD_V_119.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_120.mp4',
      '8b60c294-b280-4c79-9533-563e45befa48',
      'AUD/AUD_V_120.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_121.mp4',
      '35ed0662-5f1e-4807-8158-d2baaa197390',
      'AUD/AUD_V_121.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_122.mp4',
      'c0e72b2a-db8c-41cb-ad2a-3182f2fd1082',
      'AUD/AUD_V_122.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_123.mp4',
      '793a7552-9169-411e-9bb7-f86a29abf204',
      'AUD/AUD_V_123.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_124.mp4',
      '19647b2f-8945-4baa-be7d-fb3e2a0c3273',
      'AUD/AUD_V_124.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_125.mp4',
      '78b59fcd-cf70-4bb5-b81f-d038635b9a30',
      'AUD/AUD_V_125.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_126.mp4',
      '32dfea03-4b1b-474d-860f-0f24f1215ccb',
      'AUD/AUD_V_126.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_127.mp4',
      '1d2c5226-93df-41f6-abff-cf5ff594f249',
      'AUD/AUD_V_127.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_128.mp4',
      '030c8b6a-1c78-48b7-83b4-cfb620fe8cb6',
      'AUD/AUD_V_128.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_129.mp4',
      '89d5b20a-ff7d-47ad-b365-c6a143d211a3',
      'AUD/AUD_V_129.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_130.mp4',
      '26f7ee7b-11f2-45f3-97ea-8da68193de5d',
      'AUD/AUD_V_130.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_108.mp4',
      '37bec6be-eb2b-475d-9768-c81189611bdd',
      'AUD/AUD_V_108.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_131.mp4',
      '423d3275-8152-4f36-8273-adfef0d5ccf5',
      'AUD/AUD_V_131.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_132.mp4',
      '5e562013-9d22-415f-a30b-8adf2aa9e1de',
      'AUD/AUD_V_132.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_133.mp4',
      'c07aeba7-fc99-4dfb-bffa-b076405e4372',
      'AUD/AUD_V_133.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_134.mp4',
      'a4a7753a-764d-4564-8c62-636fc8018c33',
      'AUD/AUD_V_134.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_135.mp4',
      'e5df224f-71e7-40c2-af7c-357ba53ffda9',
      'AUD/AUD_V_135.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_136.mp4',
      'c673631c-d057-4f72-bba5-d93b82fd2814',
      'AUD/AUD_V_136.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_137.mp4',
      'cc151660-d46a-417a-ad52-623a83d25a2b',
      'AUD/AUD_V_137.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_138.mp4',
      'b95d95be-015f-493b-b4cf-1b6b73d5ce2f',
      'AUD/AUD_V_138.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_139.mp4',
      'e61f47be-e99b-494c-ba8d-f7bcce18b0fd',
      'AUD/AUD_V_139.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_140.mp4',
      '4967212d-4bc8-4a7a-ac48-4d1e2b5ee01a',
      'AUD/AUD_V_140.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_066.mp4',
      'be2e3fd3-9bf1-4922-8c30-5cc2bbe4edd4',
      'AUD/AUD_V_066.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_067.mp4',
      '1c0a7bc6-663c-4f6a-9585-b5510bfac66f',
      'AUD/AUD_V_067.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_068.mp4',
      '8be7b982-a8b2-4c86-9ed1-ddc36ec458a9',
      'AUD/AUD_V_068.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_069.mp4',
      '0b655fe6-9c88-46b8-ad71-501b670266e8',
      'AUD/AUD_V_069.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_070.mp4',
      '59df47c5-f2d5-4e59-a346-ba5faf117dbc',
      'AUD/AUD_V_070.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_071.mp4',
      '953376eb-3538-4c0a-89b7-68cf9cd1329c',
      'AUD/AUD_V_071.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_072.mp4',
      'd6dec2aa-2523-4aba-b537-1f6edac2a9d7',
      'AUD/AUD_V_072.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_073.mp4',
      '61903353-2d7c-450c-a1d9-4d37db41660d',
      'AUD/AUD_V_073.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_074.mp4',
      '0d22b0ba-1457-47d8-8f1c-f604e1b7ff7f',
      'AUD/AUD_V_074.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_075.mp4',
      '41891430-715b-4de0-8eaa-08e31ff8745e',
      'AUD/AUD_V_075.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_076.mp4',
      '2d2555ab-1d8f-4a57-a399-ac7c4cb09d1d',
      'AUD/AUD_V_076.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_077.mp4',
      '69e772a7-d844-4789-be9e-009063ffcb97',
      'AUD/AUD_V_077.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_078.mp4',
      '293bfb97-d353-4f60-adf0-0e31c0fe2fb1',
      'AUD/AUD_V_078.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_079.mp4',
      '55cc077b-753a-45e4-af1d-df0a84a17c74',
      'AUD/AUD_V_079.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_080.mp4',
      '69e67de4-e4b1-4489-869b-2b04bfac7f36',
      'AUD/AUD_V_080.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_081.mp4',
      '258d9439-b8cc-4092-90b5-1ac8123fa5fb',
      'AUD/AUD_V_081.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_082.mp4',
      '8b49c83f-1896-4af6-96a9-c2e2fa9d0f82',
      'AUD/AUD_V_082.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_083.mp4',
      '31ba60b8-4c9e-4357-b920-d371c00aa851',
      'AUD/AUD_V_083.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_084.mp4',
      'b1d72a2a-cc54-4a21-8fd5-862b9b320e36',
      'AUD/AUD_V_084.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_085.mp4',
      'b1cb8bb2-84d2-4c72-a5d4-4a7aa6dc662c',
      'AUD/AUD_V_085.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_086.mp4',
      'fbb787bc-16da-4628-89a8-a30ef72292e2',
      'AUD/AUD_V_086.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_087.mp4',
      '0e2a74a6-984c-47a8-8d8c-1bd4f052b658',
      'AUD/AUD_V_087.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_088.mp4',
      '56980493-caab-4fe3-914c-029911b4471a',
      'AUD/AUD_V_088.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_089.mp4',
      '2a0cfa7e-7bf4-4e49-b772-8a1c90941ce3',
      'AUD/AUD_V_089.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_090.mp4',
      'f529b3fc-deb1-4fab-8971-1f77f8bfe298',
      'AUD/AUD_V_090.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_091.mp4',
      '25c4a69e-8ca2-4430-b4a0-886c4fd13789',
      'AUD/AUD_V_091.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_092.mp4',
      '17aaebd0-548a-475f-82b2-1d2b1ff200bb',
      'AUD/AUD_V_092.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_093.mp4',
      '273baf19-7716-4b32-8436-a803247c576e',
      'AUD/AUD_V_093.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_094.mp4',
      '901a09c9-3c7c-42e3-bf0f-9c4f0777e000',
      'AUD/AUD_V_094.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_095.mp4',
      '95238d2f-8531-4277-bde2-a5fabe367ba1',
      'AUD/AUD_V_095.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_096.mp4',
      '0dea440e-a589-4ba3-ad75-bd435851c103',
      'AUD/AUD_V_096.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_097.mp4',
      '7b931633-c7b6-4312-ab61-9588c338eb73',
      'AUD/AUD_V_097.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_098.mp4',
      '179efc05-c404-4bed-9c06-912138c3961f',
      'AUD/AUD_V_098.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_099.mp4',
      '720b81e1-4d80-4aa4-b842-6e38b0983493',
      'AUD/AUD_V_099.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_100.mp4',
      '99c9aa3c-6096-4465-bb77-ada5b005ea92',
      'AUD/AUD_V_100.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_101.mp4',
      '9003f53e-0298-4b17-a50f-c3ab0b91fbd7',
      'AUD/AUD_V_101.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_102.mp4',
      'b8cd3257-c254-4b9f-9f95-b575a577bfe7',
      'AUD/AUD_V_102.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_103.mp4',
      'aacfe7c6-9259-414a-b148-1092570d34ca',
      'AUD/AUD_V_103.mp4',
      'VIDEO',
    );
    // End of column elementId3
    // Start of column elementId4
    createFile(
      'AUD_V_037.mp4',
      '8d03ca53-cd30-46b2-ac34-5ad1e396d9f2',
      'AUD/AUD_V_037.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_053.mp4',
      '6e7301df-c5a3-4d2d-9255-92250ad6976f',
      'AUD/AUD_V_053.mp4',
      'VIDEO',
    );

    // End of column elementId4
    }

export const seedAUD = async () => {
    console.log('Creating everything...');

    // Create Files
    createFilesAUD();

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
        modules: { connect: [{ id: moduleInformatik.id }] },
      },
    });

    // seed mor users for other usecases (evaluation etc.)
    await seedUser(moduleInformatik.id);

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

      fastCsv.parseStream(readableStream, options)
        .on('data', (data) => {
          // console.log(data);
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
