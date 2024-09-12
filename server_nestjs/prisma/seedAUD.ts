import { PrismaClient, contentElementType } from '@prisma/client';
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
    //   await seedAllEmbeddingsForVideo(file, 'AUD');  //TODO: implement seedAllEmbeddingsForVideo for AUD
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
      'AUD001',
      '8c795d5c-9a55-4e54-ac02-55ae1ee6acc1',
      'AUD/AUD001.pdf',
      'PDF',
    );
    createFile(
      'AUD002',
      '15e2eed9-93eb-43a1-955e-2bb22f1cc38a',
      'AUD/AUD002.pdf',
      'PDF',
    );
    createFile(
      'AUD003',
      '36ad540c-7058-4cef-839d-e2bbd06e21e6',
      'AUD/AUD003.pdf',
      'PDF',
    );
    createFile(
      'AUD004',
      '839e99ae-b003-4a02-be3b-436800034464',
      'AUD/AUD004.pdf',
      'PDF',
    );
    createFile(
      'AUD005',
      'df5de1d1-bece-4cdb-a7d0-fd0366f7a88e',
      'AUD/AUD005.pdf',
      'PDF',
    );
    createFile(
      'AUD006',
      '3da67469-6fe5-4f1d-a534-ff80a28a4deb',
      'AUD/AUD006.pdf',
      'PDF',
    );
    createFile(
      'AUD007',
      'aa2cd7c7-8179-450e-b1a1-ba85d37ecdd7',
      'AUD/AUD007.pdf',
      'PDF',
    );
    createFile(
      'AUD008',
      '0a39655a-d4c2-41c8-85f6-5ec22da09717',
      'AUD/AUD008.pdf',
      'PDF',
    );
    createFile(
      'AUD009',
      '6445e117-b539-40f2-bb76-b1566a4e80b2',
      'AUD/AUD009.pdf',
      'PDF',
    );
    createFile(
      'AUD010',
      'd0d2c513-b488-4082-990d-f25379678d55',
      'AUD/AUD010.pdf',
      'PDF',
    );
    createFile(
      'AUD011',
      '37a6021d-073a-41e6-8aa9-1365b86d0e93',
      'AUD/AUD011.pdf',
      'PDF',
    );
    createFile(
      'AUD012',
      '50432612-a3c9-4b10-bd03-4c7c4d725d7d',
      'AUD/AUD012.pdf',
      'PDF',
    );
    createFile(
      'AUD013',
      'f2e6df6b-af4d-4aa7-85f1-87748159cdeb',
      'AUD/AUD013.pdf',
      'PDF',
    );
    createFile(
      'AUD014',
      'd33542dd-4129-4011-8fa8-0e08857eecb4',
      'AUD/AUD014.pdf',
      'PDF',
    );
    createFile(
      'AUD015',
      '86fc86c7-4b1e-45c8-a6e0-2311e6e2a900',
      'AUD/AUD015.pdf',
      'PDF',
    );
    createFile(
      'AUD016',
      '2335b0cd-e475-42fd-bc3f-354b224d2086',
      'AUD/AUD016.pdf',
      'PDF',
    );
    createFile(
      'AUD017',
      '43510ba5-0f55-41e1-b02b-19f472790950',
      'AUD/AUD017.pdf',
      'PDF',
    );
    createFile(
      'AUD018',
      'a8cbbfd3-d548-4825-b45b-59b1b2a5dcce',
      'AUD/AUD018.pdf',
      'PDF',
    );
    createFile(
      'AUD019',
      '9f04114e-9b1a-4917-97d2-a47b671bfeed',
      'AUD/AUD019.pdf',
      'PDF',
    );
    createFile(
      'AUD020',
      '252de8f8-4430-4304-bf97-df159843c3ea',
      'AUD/AUD020.pdf',
      'PDF',
    );
    createFile(
      'AUD021',
      '1b2dadf3-7b4e-469c-bc2a-a7fb0d8ff5e7',
      'AUD/AUD021.pdf',
      'PDF',
    );
    createFile(
      'AUD022',
      'fa802df8-f9c1-42f5-864c-b10eeb39c28c',
      'AUD/AUD022.pdf',
      'PDF',
    );
    createFile(
      'AUD023',
      '3cb2c23d-0157-4ab8-8cb6-5db933ffec32',
      'AUD/AUD023.pdf',
      'PDF',
    );
    createFile(
      'AUD024',
      'd3055756-b82e-41f7-9509-d773f81f0ec4',
      'AUD/AUD024.pdf',
      'PDF',
    );
    createFile(
      'AUD025',
      '0c04f0bc-4921-4322-b79e-d577ef6c65dd',
      'AUD/AUD025.pdf',
      'PDF',
    );
    createFile(
      'AUD026',
      'e47a6d82-1ae0-49f2-a6c5-8151d9695087',
      'AUD/AUD026.pdf',
      'PDF',
    );
    createFile(
      'AUD027',
      'd550745b-0ea5-422d-8822-c4bfb0b64ee4',
      'AUD/AUD027.pdf',
      'PDF',
    );
    createFile(
      'AUD028',
      'a34120ae-eb0b-4e71-9a4d-5fffe5b42939',
      'AUD/AUD028.pdf',
      'PDF',
    );
    createFile(
      'AUD029',
      'f425f69a-9d04-4b4c-8867-66f0ba9c98bf',
      'AUD/AUD029.pdf',
      'PDF',
    );
    createFile(
      'AUD030',
      'dc08f279-3a56-4d80-b707-e6899e69774e',
      'AUD/AUD030.pdf',
      'PDF',
    );
    createFile(
      'AUD031',
      'e1e31c74-25bc-4ffc-97ea-023e24ddc98f',
      'AUD/AUD031.pdf',
      'PDF',
    );
    createFile(
      'AUD032',
      '05cd6d64-48a1-4e92-858b-7b58af1ad47e',
      'AUD/AUD032.pdf',
      'PDF',
    );
    createFile(
      'AUD033',
      '290b7336-ac7e-445a-bf22-476d16ff6075',
      'AUD/AUD033.pdf',
      'PDF',
    );
    createFile(
      'AUD034',
      'cd6ce3b7-ac0c-4aec-92c6-634add32c56e',
      'AUD/AUD034.pdf',
      'PDF',
    );
    createFile(
      'AUD035',
      'eed97751-278d-4735-b9f5-b137ed7d26b2',
      'AUD/AUD035.pdf',
      'PDF',
    );
    createFile(
      'AUD036',
      'a6ae4ffa-4cce-4081-8eac-b821d1dd4b59',
      'AUD/AUD036.pdf',
      'PDF',
    );
    createFile(
      'AUD038',
      '0324e70b-a08c-4f37-8fda-2557eafdf1b1',
      'AUD/AUD038.pdf',
      'PDF',
    );
    createFile(
      'AUD039',
      'd0c03093-96f3-4811-86fb-40f7b3a3be5c',
      'AUD/AUD039.pdf',
      'PDF',
    );
    createFile(
      'AUD040',
      '1067715c-4100-4ed7-93fe-d73deadcc4c6',
      'AUD/AUD040.pdf',
      'PDF',
    );
    createFile(
      'AUD041',
      '3362e09d-d1e5-4518-83fd-90e7392ccfa8',
      'AUD/AUD041.pdf',
      'PDF',
    );
    createFile(
      'AUD042',
      'aa50e6b0-c23f-4302-a4fa-88968125633d',
      'AUD/AUD042.pdf',
      'PDF',
    );
    createFile(
      'AUD043',
      'bbdb26e7-c20e-43a5-b241-60d6baf9cd8d',
      'AUD/AUD043.pdf',
      'PDF',
    );
    createFile(
      'AUD044',
      '125eb817-887e-49b0-86d2-564968b0b454',
      'AUD/AUD044.pdf',
      'PDF',
    );
    createFile(
      'AUD045',
      '5ccbb8dd-bb83-48bd-9027-b29e0272b0b5',
      'AUD/AUD045.pdf',
      'PDF',
    );
    createFile(
      'AUD046',
      'd24434d0-e33b-4ba7-8828-e0bb230a0683',
      'AUD/AUD046.pdf',
      'PDF',
    );
    createFile(
      'AUD047',
      'bf7b4ec2-c4ef-4c3b-ab5b-cba5eb7f7045',
      'AUD/AUD047.pdf',
      'PDF',
    );
    createFile(
      'AUD048',
      'df299beb-5a6a-4536-9656-cdc2aa0be58e',
      'AUD/AUD048.pdf',
      'PDF',
    );
    createFile(
      'AUD049',
      '1f164985-9815-4d09-838d-ce14722b156a',
      'AUD/AUD049.pdf',
      'PDF',
    );
    createFile(
      'AUD050',
      '624fc121-aa8d-4f5e-bfc4-0c985aa1db34',
      'AUD/AUD050.pdf',
      'PDF',
    );
    createFile(
      'AUD051',
      '58eb8775-5671-4f78-8989-82a68b820529',
      'AUD/AUD051.pdf',
      'PDF',
    );
    createFile(
      'AUD052',
      '91ec31f2-6a55-4df7-9411-eaa059c982df',
      'AUD/AUD052.pdf',
      'PDF',
    );
    createFile(
      'AUD104',
      'c550d4ab-4f57-4498-b665-c76d2491ce8f',
      'AUD/AUD104.pdf',
      'PDF',
    );
    createFile(
      'AUD105',
      '7025c6df-969e-4800-8bf8-6d89559ea4fd',
      'AUD/AUD105.pdf',
      'PDF',
    );
    createFile(
      'AUD106',
      '6f1780b5-0816-42ab-afa5-7a4fb3cdbe32',
      'AUD/AUD106.pdf',
      'PDF',
    );
    createFile(
      'AUD107',
      '90653f95-07c4-499e-8137-48291b4a8252',
      'AUD/AUD107.pdf',
      'PDF',
    );
    createFile(
      'AUD109',
      'c9c5cc69-c494-45fe-bbbf-d352022e6410',
      'AUD/AUD109.pdf',
      'PDF',
    );
    createFile(
      'AUD110',
      '9b0cafa7-56a8-4ab2-83c0-260dc6de5d3b',
      'AUD/AUD110.pdf',
      'PDF',
    );
    createFile(
      'AUD111',
      '6033eeb9-3f76-47b2-bdbc-8dce061e5b2a',
      'AUD/AUD111.pdf',
      'PDF',
    );
    createFile(
      'AUD112',
      '1bde16d3-16c9-4bfa-b34f-1fd9b62bf9be',
      'AUD/AUD112.pdf',
      'PDF',
    );
    createFile(
      'AUD113',
      'd74512be-4c8e-4f5a-a028-85a5ea913d27',
      'AUD/AUD113.pdf',
      'PDF',
    );
    createFile(
      'AUD114',
      '3bff7e33-70cd-40e5-99f1-529659c5ce1e',
      'AUD/AUD114.pdf',
      'PDF',
    );
    createFile(
      'AUD115',
      '0097251f-7ab7-47b5-b208-149c46c750b9',
      'AUD/AUD115.pdf',
      'PDF',
    );
    createFile(
      'AUD116',
      '2e36ccfa-0804-4278-b793-55f28848a200',
      'AUD/AUD116.pdf',
      'PDF',
    );
    createFile(
      'AUD117',
      '28a26f84-99c8-45b8-9138-0bc50f46750f',
      'AUD/AUD117.pdf',
      'PDF',
    );
    createFile(
      'AUD118',
      '81ea71c2-15ab-4a75-b292-6b0fe71f7dc2',
      'AUD/AUD118.pdf',
      'PDF',
    );
    createFile(
      'AUD119',
      '7f8ea0f8-360d-4d4d-b7d1-5dc2af26d08d',
      'AUD/AUD119.pdf',
      'PDF',
    );
    createFile(
      'AUD120',
      '7d4b6174-32b2-45f9-8237-138848fc9a85',
      'AUD/AUD120.pdf',
      'PDF',
    );
    createFile(
      'AUD121',
      '771efae8-4715-4269-b11a-f9e94187f415',
      'AUD/AUD121.pdf',
      'PDF',
    );
    createFile(
      'AUD122',
      'ea2862d2-1be4-4e66-a529-d52d92bfb74c',
      'AUD/AUD122.pdf',
      'PDF',
    );
    createFile(
      'AUD122',
      '6890870c-f855-4a1e-8830-b20a64becaa4',
      'AUD/AUD122.pdf',
      'PDF',
    );
    createFile(
      'AUD123',
      'd5a1e707-aa2d-4c46-9638-ca7636ab9377',
      'AUD/AUD123.pdf',
      'PDF',
    );
    createFile(
      'AUD124',
      '4e0114e3-bbeb-42ae-9f4e-e851476d829c',
      'AUD/AUD124.pdf',
      'PDF',
    );
    createFile(
      'AUD125',
      'f95f6a40-b2fa-4e9a-84e7-b92a3c331a8a',
      'AUD/AUD125.pdf',
      'PDF',
    );
    createFile(
      'AUD126',
      '9ae29bbb-08df-4bf5-a1cb-1bbdffb3df6a',
      'AUD/AUD126.pdf',
      'PDF',
    );
    createFile(
      'AUD127',
      '5515148a-71db-498e-97b1-daff47dff97e',
      'AUD/AUD127.pdf',
      'PDF',
    );
    createFile(
      'AUD128',
      '4ffdd2c0-991b-494d-8200-6dd5ff21ed4d',
      'AUD/AUD128.pdf',
      'PDF',
    );
    createFile(
      'AUD129',
      '27da0183-2eb4-4ae9-b04d-fc32e8aaca6f',
      'AUD/AUD129.pdf',
      'PDF',
    );
    createFile(
      'AUD130',
      'b6fe578a-d237-4353-a3c2-6c4e031832a8',
      'AUD/AUD130.pdf',
      'PDF',
    );
    createFile(
      'AUD108',
      '052893b4-d244-42a3-a920-be3e59bbc91f',
      'AUD/AUD108.pdf',
      'PDF',
    );
    createFile(
      'AUD131',
      '02414ef0-4bc2-4823-a94c-3f71e7d57180',
      'AUD/AUD131.pdf',
      'PDF',
    );
    createFile(
      'AUD132',
      '0d39f7fb-cc90-483b-98cf-988a38d088ef',
      'AUD/AUD132.pdf',
      'PDF',
    );
    createFile(
      'AUD133',
      'a5a985a5-4eb1-4752-ad52-f67dcdcdf8d8',
      'AUD/AUD133.pdf',
      'PDF',
    );
    createFile(
      'AUD134',
      '257d6f5e-3adc-4a36-8fc5-489f41bba357',
      'AUD/AUD134.pdf',
      'PDF',
    );
    createFile(
      'AUD135',
      'f9f9b4de-a3f5-479d-87ff-64c667249c0b',
      'AUD/AUD135.pdf',
      'PDF',
    );
    createFile(
      'AUD136',
      'ef9299c7-3bfc-47ae-bc94-1397ccaf489c',
      'AUD/AUD136.pdf',
      'PDF',
    );
    createFile(
      'AUD137',
      'cc15fbb8-4aff-463a-9ed4-8c74e3827d9c',
      'AUD/AUD137.pdf',
      'PDF',
    );
    createFile(
      'AUD138',
      '472cdd72-a159-4253-b4a2-e24c92763f34',
      'AUD/AUD138.pdf',
      'PDF',
    );
    createFile(
      'AUD139',
      '38926c69-c4cd-4b3c-a34f-fbc0dbc1d1e9',
      'AUD/AUD139.pdf',
      'PDF',
    );
    createFile(
      'AUD140',
      'c5fe9708-a2a4-4686-a0cc-ec18d4411f59',
      'AUD/AUD140.pdf',
      'PDF',
    );
    createFile(
      'AUD054',
      '3fbd7b65-7051-4960-a7df-1397c0d5a39d',
      'AUD/AUD054.pdf',
      'PDF',
    );
    createFile(
      'AUD055',
      'bf0b5f8a-8e2e-4cb6-a309-6676014167a6',
      'AUD/AUD055.pdf',
      'PDF',
    );
    createFile(
      'AUD056',
      '354b72fb-e06d-4b6e-b38c-965c69b356b4',
      'AUD/AUD056.pdf',
      'PDF',
    );
    createFile(
      'AUD057',
      '95a27e37-b8b8-4efe-be4f-990145d2a05d',
      'AUD/AUD057.pdf',
      'PDF',
    );
    createFile(
      'AUD058',
      '50325c2f-b272-4881-be7b-4f9b27f0f3a2',
      'AUD/AUD058.pdf',
      'PDF',
    );
    createFile(
      'AUD059',
      'e93aab67-03b8-45d3-907b-19f95668f3a8',
      'AUD/AUD059.pdf',
      'PDF',
    );
    createFile(
      'AUD060',
      'acb90e83-3612-4caa-860e-55d0b0c8724b',
      'AUD/AUD060.pdf',
      'PDF',
    );
    createFile(
      'AUD061',
      'af1d7235-437a-4049-b9e3-149676100b9e',
      'AUD/AUD061.pdf',
      'PDF',
    );
    createFile(
      'AUD062',
      '3f485fcb-0951-46ba-9ef4-2bfee494c540',
      'AUD/AUD062.pdf',
      'PDF',
    );
    createFile(
      'AUD063',
      '8b7296a5-4e17-472d-ba69-6bcbac80c20a',
      'AUD/AUD063.pdf',
      'PDF',
    );
    createFile(
      'AUD064',
      '50c13e75-2c44-41ec-bdaf-a1c8c6eeca7a',
      'AUD/AUD064.pdf',
      'PDF',
    );
    createFile(
      'AUD065',
      'a24aff31-e543-41e0-8fab-e39df6013fa8',
      'AUD/AUD065.pdf',
      'PDF',
    );
    createFile(
      'AUD066',
      'a7bffa7b-82cd-46c7-a546-1505f792d532',
      'AUD/AUD066.pdf',
      'PDF',
    );
    createFile(
      'AUD067',
      'e6bf1a31-b4d8-4968-b7cb-f51d55a22408',
      'AUD/AUD067.pdf',
      'PDF',
    );
    createFile(
      'AUD068',
      '5df449de-81f3-480f-910f-09fb86d03816',
      'AUD/AUD068.pdf',
      'PDF',
    );
    createFile(
      'AUD069',
      'd0335df5-a3b3-4355-a687-24fabe5747a3',
      'AUD/AUD069.pdf',
      'PDF',
    );
    createFile(
      'AUD070',
      '1c874593-8555-467a-a936-a46cd4ca3f61',
      'AUD/AUD070.pdf',
      'PDF',
    );
    createFile(
      'AUD071',
      '002edb5f-daf2-4cfb-abfb-f15aa3910eee',
      'AUD/AUD071.pdf',
      'PDF',
    );
    createFile(
      'AUD075',
      '77b70435-d43e-41cd-b9a6-7b9cb48a3122',
      'AUD/AUD075.pdf',
      'PDF',
    );
    createFile(
      'AUD072',
      '72766d08-c2ce-46db-8a3d-a57ead017608',
      'AUD/AUD072.pdf',
      'PDF',
    );
    createFile(
      'AUD073',
      '48fb5f01-edff-40cd-9be4-97fb98e5076d',
      'AUD/AUD073.pdf',
      'PDF',
    );
    createFile(
      'AUD074',
      '1ec09063-02cd-4f83-9c3c-42fd603bdd86',
      'AUD/AUD074.pdf',
      'PDF',
    );
    createFile(
      'AUD076',
      'bb01abe4-5fda-4f48-90e5-adb68bbe1db9',
      'AUD/AUD076.pdf',
      'PDF',
    );
    createFile(
      'AUD077',
      '79c85457-877d-4a03-a00a-5ddc71f8cf28',
      'AUD/AUD077.pdf',
      'PDF',
    );
    createFile(
      'AUD078',
      'a867ff9b-cf10-47de-9cd3-0df5e74f08bc',
      'AUD/AUD078.pdf',
      'PDF',
    );
    createFile(
      'AUD079',
      '1910a869-da36-4236-8822-d1133d50e4b6',
      'AUD/AUD079.pdf',
      'PDF',
    );
    createFile(
      'AUD080',
      '1e699720-35f1-4e07-9a74-bdb76ef2bd1b',
      'AUD/AUD080.pdf',
      'PDF',
    );
    createFile(
      'AUD081',
      'bd0825d7-2734-4606-b7c8-02364d1bbd0d',
      'AUD/AUD081.pdf',
      'PDF',
    );
    createFile(
      'AUD082',
      '25c2bbb8-2b18-4b93-9a3e-577565745099',
      'AUD/AUD082.pdf',
      'PDF',
    );
    createFile(
      'AUD083',
      '7722a5d7-83eb-4bf0-82fc-0a9ace45069f',
      'AUD/AUD083.pdf',
      'PDF',
    );
    createFile(
      'AUD084',
      '50e2b214-97d2-4c05-8017-19f6a7ad35d3',
      'AUD/AUD084.pdf',
      'PDF',
    );
    createFile(
      'AUD085',
      '411c2196-2678-4435-9435-853996a08768',
      'AUD/AUD085.pdf',
      'PDF',
    );
    createFile(
      'AUD086',
      '31eb1997-8b32-4b08-b41e-6ef5449c5d32',
      'AUD/AUD086.pdf',
      'PDF',
    );
    createFile(
      'AUD087',
      'b4559b53-847e-403f-b2d5-80f3656da923',
      'AUD/AUD087.pdf',
      'PDF',
    );
    createFile(
      'AUD088',
      'b40f222d-c50d-4cb9-b778-67668fffac6e',
      'AUD/AUD088.pdf',
      'PDF',
    );
    createFile(
      'AUD089',
      'bd74b604-ac66-4d6c-abee-33e898b270a7',
      'AUD/AUD089.pdf',
      'PDF',
    );
    createFile(
      'AUD090',
      'ebc88923-1bdc-4e82-b39c-cbdec95a8798',
      'AUD/AUD090.pdf',
      'PDF',
    );
    createFile(
      'AUD091',
      '2883f961-8a4b-41a7-857b-4cc8b324c872',
      'AUD/AUD091.pdf',
      'PDF',
    );
    createFile(
      'AUD092',
      '2e66d789-d230-47b7-a556-ff3f14e2ce4d0',
      'AUD/AUD092.pdf',
      'PDF',
    );
    createFile(
      'AUD093',
      'afb352bf-5431-4a48-a72e-168d9d3a1e30',
      'AUD/AUD093.pdf',
      'PDF',
    );
    createFile(
      'AUD094',
      '3a09d7cf-fe03-4ae4-b3b0-1fbbba62901a',
      'AUD/AUD094.pdf',
      'PDF',
    );
    createFile(
      'AUD095',
      '25005314-6def-4906-bbb3-7d2351e00b1e',
      'AUD/AUD095.pdf',
      'PDF',
    );
    createFile(
      'AUD096',
      '2077a528-4dad-48ce-a7d2-9f8a2054a455',
      'AUD/AUD096.pdf',
      'PDF',
    );
    createFile(
      'AUD097',
      'aa79d0d8-36cd-4443-ad90-b951b9634cf7',
      'AUD/AUD097.pdf',
      'PDF',
    );
    createFile(
      'AUD098',
      '09b28892-e803-4d07-a84d-c0d90b7746fd',
      'AUD/AUD098.pdf',
      'PDF',
    );
    createFile(
      'AUD099',
      '7f53cf8c-d9fe-4f86-9f48-1a3e09f9aa59',
      'AUD/AUD099.pdf',
      'PDF',
    );
    createFile(
      'AUD100',
      '09a763e1-1de6-4efb-8a63-218d1982e36a',
      'AUD/AUD100.pdf',
      'PDF',
    );
    createFile(
      'AUD101',
      '7e2b7b8c-2269-418d-8fb9-b3ffdc8c45da',
      'AUD/AUD101.pdf',
      'PDF',
    );
    createFile(
      'AUD102',
      '742232eb-d298-4611-979c-ae29dee75afa',
      'AUD/AUD102.pdf',
      'PDF',
    );
    createFile(
      'AUD103',
      '495c6178-5680-4a26-8727-e23eb5cd9fd6',
      'AUD/AUD103.pdf',
      'PDF',
    );
    // End of column elementId1
    // Start of column elementId2
    createFile(
      'AUD037',
      '06862a6c-c20b-43f6-a30a-faf937c07397',
      'AUD/AUD037.pdf',
      'PDF',
    );
    createFile(
      'AUD053',
      'ab188992-b8d3-471c-b35c-bcff562d2a23',
      'AUD/AUD053.pdf',
      'PDF',
    );
    // End of column elementId2
    // Start of column elementId3
    createFile(
      'AUD_V_001',
      '68f237eb-940b-44b3-893d-fa25c42fb960',
      'AUD/AUD_V_001.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_002',
      '56302158-fcdf-4415-992f-aa1cf6eda4d4',
      'AUD/AUD_V_002.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_003',
      'b3ce49b8-006b-41d0-9787-5fc750d86728',
      'AUD/AUD_V_003.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_004',
      'db9ac09e-7307-4ae6-a7b8-dd4c03d85330',
      'AUD/AUD_V_004.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_005',
      'f23d1a5d-2d08-4cac-93c7-efebfc9a021d',
      'AUD/AUD_V_005.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_006',
      'ec726779-0e2a-4c4a-8179-da0aeefcdf51',
      'AUD/AUD_V_006.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_007',
      '7b015b01-5611-409a-8f48-d6d15b65f21b',
      'AUD/AUD_V_007.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_008',
      '5c4f350a-162e-4b42-894c-c437db09000c',
      'AUD/AUD_V_008.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_009',
      '4708693f-a030-47b8-bdfe-22f7deba6d87',
      'AUD/AUD_V_009.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_010',
      '860d6e39-eeae-4efd-924c-f6e9f1d941e6',
      'AUD/AUD_V_010.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_011',
      'fed68b70-41f4-418a-8675-6d256de0fe57',
      'AUD/AUD_V_011.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_012',
      'b59943dd-6973-41b1-8eeb-ace073441589',
      'AUD/AUD_V_012.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_013',
      'd963deb1-868f-4883-b6e0-baed1ca2ea82',
      'AUD/AUD_V_013.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_014',
      'bdfc7172-98e0-4dbf-a005-33e59fdc9125',
      'AUD/AUD_V_014.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_015',
      '4abdb902-c161-4d0e-a0b2-50af9725aa01',
      'AUD/AUD_V_015.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_016',
      '56348954-d65b-4e2d-a3a7-8c812fc59351',
      'AUD/AUD_V_016.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_017',
      'ab246674-e971-40f8-a0fa-220ae94f7493',
      'AUD/AUD_V_017.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_018',
      '9623b62f-3e76-40d1-aec0-25159cf407cc',
      'AUD/AUD_V_018.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_019',
      'eb885061-ec14-4685-b041-aca2bf2f8214',
      'AUD/AUD_V_019.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_020',
      'ee91bf11-00c5-47b4-aa82-ab576d8e9e1e',
      'AUD/AUD_V_020.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_021',
      '41a49887-6d7e-4ff0-8819-42c2e307ad4e',
      'AUD/AUD_V_021.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_022',
      'a2e9bb87-4b05-4285-987c-204afae49a31',
      'AUD/AUD_V_022.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_023',
      '32c639e7-03f2-465e-971d-a921e134d29b',
      'AUD/AUD_V_023.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_024',
      '73c6440c-121b-4780-abf1-01bdab88457d',
      'AUD/AUD_V_024.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_025',
      'ca95e2a9-7472-4e2c-b02d-1a9be9616f81',
      'AUD/AUD_V_025.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_026',
      'f4e155d7-b8e6-4e5e-9b8a-14ddb11e5777',
      'AUD/AUD_V_026.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_027',
      'e821c40a-4dc5-4b17-91e8-962adabd2810',
      'AUD/AUD_V_027.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_028',
      '06bfb1cc-fa70-4d96-bd0e-82858834e6f3',
      'AUD/AUD_V_028.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_029',
      '9bab84bc-d7d3-4240-8e9a-70a7cefa2c2a',
      'AUD/AUD_V_029.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_030',
      'c7de03fd-493d-43f1-a0f0-3c7987c701b7',
      'AUD/AUD_V_030.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_031',
      'b285b60c-7ac3-49d2-89c1-75276be39b4c',
      'AUD/AUD_V_031.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_032',
      '888cc0e6-b64c-48bc-9971-b727031b7543',
      'AUD/AUD_V_032.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_033',
      '47d45b9d-bd66-4d3a-a24a-4568ac206a68',
      'AUD/AUD_V_033.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_034',
      '6a8adde9-cdb8-46a8-8071-ac9c3420ebd1',
      'AUD/AUD_V_034.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_035',
      'eae141fc-661b-4b0d-931f-24bbd4b74381',
      'AUD/AUD_V_035.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_036',
      '1767abfa-133e-427a-9d96-3b2b94f0fd68',
      'AUD/AUD_V_036.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_038',
      'c935786a-1caf-48cb-9997-6b95933d14af',
      'AUD/AUD_V_038.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_039',
      'd3faef9a-651b-465e-8164-a63b747bf73e',
      'AUD/AUD_V_039.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_040',
      'a1927d3a-d374-46c9-8627-d70861fcd58f',
      'AUD/AUD_V_040.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_041',
      '81152875-9b8e-4389-86fb-03f2cc71c939',
      'AUD/AUD_V_041.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_042',
      'e7cfa6aa-42b4-4966-b2d8-3458a0251034',
      'AUD/AUD_V_042.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_043',
      '3b0f9ee3-a3ac-4792-bcee-105a8f040127',
      'AUD/AUD_V_043.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_044',
      'f8f828ae-1fda-4e04-93ef-3f62fb4c45c3',
      'AUD/AUD_V_044.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_045',
      'a23bb305-861b-41f6-9397-84badc1a0c57',
      'AUD/AUD_V_045.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_046',
      '47704071-bdc0-41da-bd90-5b640af582d6',
      'AUD/AUD_V_046.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_047',
      '4dd613f0-d565-4388-bb29-ff82622e1604',
      'AUD/AUD_V_047.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_048',
      '78663400-c528-4c93-9d9e-440257bb0f13',
      'AUD/AUD_V_048.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_049',
      'bc851f1e-ceec-45f9-b160-2ff491913cdb',
      'AUD/AUD_V_049.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_050',
      'd47c5de0-6b24-4da8-a03c-0242443d0a47',
      'AUD/AUD_V_050.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_051',
      'c2e37c6e-63b0-4da6-8d8a-29a6b87119d5',
      'AUD/AUD_V_051.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_052',
      '6d0307c5-f75f-4e09-b888-4e9e9adc4ec3',
      'AUD/AUD_V_052.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_054',
      'c25cbe21-014a-4387-8336-ebf4c5697e8b',
      'AUD/AUD_V_054.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_055',
      '6929c29c-f454-42b2-b3e7-1c1183e0abb9',
      'AUD/AUD_V_055.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_056',
      'b049f591-744b-4716-aed8-1f3c593cd0e1',
      'AUD/AUD_V_056.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_057',
      'dba2b419-677c-48c0-b497-7c5da00d43d8',
      'AUD/AUD_V_057.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_058',
      'c613e5c3-e948-4b46-abf4-87b85a7d6570',
      'AUD/AUD_V_058.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_059',
      '274dcfad-3f63-4a9b-b994-8cdb43a92aa1',
      'AUD/AUD_V_059.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_060',
      '2018adfb-e715-4f72-ab68-91ad49a8eb06',
      'AUD/AUD_V_060.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_061',
      '9fb25707-dde0-4c99-b7b9-62719628066a',
      'AUD/AUD_V_061.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_062',
      '5f49e2d4-dd24-49df-bb3e-be7ff9da097e',
      'AUD/AUD_V_062.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_063',
      '4932baa1-bfb8-49cb-a140-bc05d5572667',
      'AUD/AUD_V_063.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_064',
      '391b8387-2e09-4c28-b95a-b7c157fa623d',
      'AUD/AUD_V_064.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_065',
      '587eaed5-9ffb-4fb2-a168-5854e7d0b113',
      'AUD/AUD_V_065.mp4',
      'VIDEO',
    );
    // End of column elementId3
    // Start of column elementId4
    createFile(
      'AUD_V_037',
      '8d03ca53-cd30-46b2-ac34-5ad1e396d9f2',
      'AUD/AUD_V_037.mp4',
      'VIDEO',
    );
    createFile(
      'AUD_V_053',
      '6e7301df-c5a3-4d2d-9255-92250ad6976f',
      'AUD/AUD_V_053.mp4',
      'VIDEO',
    );
    // End of column elementId4
    // TODO: Video files after AUD_V_065 are missing
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