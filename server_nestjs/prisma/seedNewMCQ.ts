/* eslint-disable prettier/prettier */
import { contentElementType, PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import { McqGenerationDTO, questionType } from '@DTOs/question.dto';

const prisma = new PrismaClient();
interface Option {
    text: string;
    correct: boolean;
}
interface MCQuestion {

    score: number;
    type: string; //MC
    author: number; //init = 1
    text: string;
    options: Option[];
    concept: number;
    isApproved: boolean;
    version: number; //init = 1

}
export const seedMCQnew = async () => {
  // Excel-Datei einlesen
  const filepath = process.env.FILE_PATH + 'MCQs.xlsx';
  const workbook = xlsx.readFile(filepath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: McqGenerationDTO[] = xlsx.utils.sheet_to_json(sheet);
  const questions: MCQuestion[] = [];
  // Daten transformieren
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  // Daten in die Datenbank einfügen
  for (const mcq of data) {
    const options = letters
        .filter(letter => mcq[`Antwort ${letter}`] !== undefined)
        .map(letter => ({
            text: mcq[`Antwort ${letter}`],
            correct: mcq[`Korrekt markiert ${letter}`]
        }));
    let approved = true; //for testing only!
    if(mcq['Approved'] == '1') {
        approved = true;
    } else {
        approved = false;
    }
    const correctOptionsCount = options.filter(option => option.correct === 1).length;
    const type = correctOptionsCount > 1 ? 'MC' : 'SC';
    let score = 0;
    if(type === 'MC') {
        score = options.length/2;
    } else {
        score = 1;
    }
    const question: MCQuestion = {
        score: score,
        type: type,
        author: 1,
        text: mcq['Frage'],
        concept: mcq['ConceptNodeId'],
        isApproved: Boolean(approved),
        options: options,
        version: 1,
    };
    questions.push(question);
  }
for(const mcq of questions) {
      //create the question
      //console.log('create mc question...');
      const createdQuestion = await prisma.question.create({
          data: {
              score: mcq.score,
              type: mcq.type as questionType,
              author: { connect: { id: mcq.author } },
              text: mcq.text,
              conceptNode: { connect: { id: mcq.concept } },
              isApproved: false,
              version: 1,
          },
      });
      // connect it to itself
      await prisma.question.update({
          where: { id: createdQuestion.id },
          data: {
              origin: { connect: { id: createdQuestion.id } },
              name: 'Multiple-Choice Frage ' + createdQuestion.id,
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
                 }
            });
            if(training) {
                const contentNode = await prisma.contentNode.findFirst({
                    where: { id: training.contentNodeId }
                });
                //ermittle die höchste Position in der content view und setze die Position des neuen content elements auf +1
                const contentViews = await prisma.contentView.findMany({
                    where: { contentNodeId: contentNode.id }
                });
                let maxPosition = 0;
                for (const contentView of contentViews) {
                    if(contentView.position > maxPosition) {
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
            else {
                //erzeuge eine neue content node mit dem award level und verbinde sie mit dem content element
                /*const contentNode = await prisma.contentNode.create({
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
                });*/
            }

            //create the mc question
            let isSC = true;
            if(mcq.type == 'MC') {
                isSC = false;
            }
            const mcQuestion = await prisma.mCQuestion.create({
                data: {
                    isSC: isSC,
                    question: { connect: { id: createdQuestion.id } },
                },
            });

            //create the options
            for (const option of mcq.options) {
                const mcOption = await prisma.mCOption.create({
                    data: {
                        text: option.text,
                        is_correct: Boolean(option.correct),
                    },
                });
                await prisma.mCQuestionOption.create({
                    data: {
                        question: { connect: { id: mcQuestion.id } },
                        option: { connect: { id: mcOption.id } },
                    },
                });
            }
    }
  }
async function main() {

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

