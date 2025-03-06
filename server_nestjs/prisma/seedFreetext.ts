import { PrismaClient, contentElementType } from '@prisma/client';
import { questionType } from '@DTOs/question.dto';
import * as XLSX from 'xlsx';
import { WorkSheet, utils } from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface FreetextQuestion {
  score: number;
  type: string; //Freetext
  author: number; //init = 1
  text: string;
  concept: number;
  isApproved: boolean;
  version: number; //init = 1
  expectations: string;
  exampleSolution: string;
  level: number;
  name: string;
}

export const seedFreetext = async (user_id: number) => {
  const freetextQuestions: FreetextQuestion[] = [];

  console.log('reading freetext questions from Excel...');
  const filePath = process.env.FILE_PATH + 'freetext_questions.xlsx';
  if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const worksheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
    const question_data = utils.sheet_to_json(worksheet);
    for (const freeTextQuestion of question_data) {
      const question: FreetextQuestion = {
        score: freeTextQuestion['Punkte'],
        type: 'FreeText',
        author: user_id,
        text: freeTextQuestion['Aufgabentext'],
        concept: freeTextQuestion['conceptNode'],
        isApproved: true,
        version: 1,
        expectations: freeTextQuestion['expectations'],
        exampleSolution: freeTextQuestion['exampleSolution'],
        level: freeTextQuestion['Level'],
        name: freeTextQuestion['Name'],
      };

      freetextQuestions.push(question);
    }

    //Create all mc questions
    console.log('creating freetext questions...');
    for (const data of freetextQuestions) {
      const createdQuestion = await prisma.question.create({
        data: {
          score: data.score,
          type: data.type as questionType,
          author: { connect: { id: data.author } },
          text: data.text,
          conceptNode: { connect: { id: data.concept } },
          isApproved: data.isApproved,
          version: data.version,
          level: data.level,
        },
      });

      // connect it to itself
      await prisma.question.update({
        where: { id: createdQuestion.id },
        data: {
          origin: { connect: { id: createdQuestion.id } },
          name: data.name,
        },
      });

      //create content element and connect it to the question
      const contentElement = await prisma.contentElement.create({
        data: {
          type: contentElementType.QUESTION,
          question: { connect: { id: createdQuestion.id } },
          title: createdQuestion.name,
        },
      });

      //connect the content element to the the concept node by setting the training
      const training = await prisma.training.findFirst({
        where: {
          conceptNodeId: createdQuestion.conceptNodeId,
          awards: createdQuestion.level,
        },
      });
      if (training) {
        const contentNode = await prisma.contentNode.findFirst({
          where: { id: training.contentNodeId },
        });
        //ermittle die höchste Position in der content view und setze die Position des neuen content elements auf +1
        const contentViews = await prisma.contentView.findMany({
          where: { contentNodeId: contentNode.id },
        });
        let maxPosition = 0;
        for (const contentView of contentViews) {
          if (contentView.position > maxPosition) {
            maxPosition = contentView.position;
          }
        }
        await prisma.contentView.create({
          data: {
            contentNode: { connect: { id: contentNode.id } },
            contentElement: { connect: { id: contentElement.id } },
            position: maxPosition + 1,
          },
        });
      }
      /* Not working yet, because of constraint violation
            else {
                //erzeuge eine neue content node mit dem award level und verbinde sie mit dem content element
                const contentNode = await prisma.contentNode.create({
                    data: {
                        name: 'Training ' + createdQuestion.level,
                    },
                });
                await prisma.training.create({
                    data: {
                        conceptNode: { connect: { id: createdQuestion.conceptNodeId } },
                        contentNode: { connect: { id: contentNode.id } },
                        awards: createdQuestion.level,
                    },
                });
                await prisma.contentView.create({
                    data: {
                        contentNode: { connect: { id: contentNode.id } },
                        contentElement: { connect: { id: contentElement.id } },
                        position: 1,
                    },
                });
            }
            */

      //create the freetext question
      const mcQuestion = await prisma.freeTextQuestion.create({
        data: {
          expectations: data.expectations,
          question: { connect: { id: createdQuestion.id } },
          exampleSolution: data.exampleSolution,
        },
      });
    }
  }
};

async function main() {}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
