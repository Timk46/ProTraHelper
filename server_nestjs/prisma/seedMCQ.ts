
import { PrismaClient, contentElementType } from '@prisma/client';
import { questionType } from '@DTOs/question.dto'
import * as XLSX from 'xlsx';
import { WorkSheet, utils } from 'xlsx';
import * as fs from 'fs';

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

export const seedMCQ = async (user_id: number) => {
    const mcQuestions : MCQuestion[] = [];

    console.log('reading mc questions from Excel...');
    const filePath = process.env.FILE_PATH + 'MCQuestions.xlsx';
    if(fs.existsSync(filePath)) {
        const workbook = XLSX.readFile(filePath);
        const worksheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
        const question_data = utils.sheet_to_json(worksheet);
        //console.log(mcQuestions);
        for (const mcq of question_data) {
            //console.log(mcq);
            let approved = true; //for testing only!
            if(mcq['approved'] == '1') {
                approved = true;
            }

            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            const options = letters
                .filter(letter => mcq[`Antwort ${letter}`] !== undefined)
                .map(letter => ({
                    text: mcq[`Antwort ${letter}`],
                    correct: mcq[`Korrekt markiert ${letter}`]
                }));

            const question: MCQuestion = {
                score: mcq['score'],
                type: 'MC',
                author: user_id,
                text: mcq['text'],
                concept: mcq['concept'],
                isApproved: approved,
                options: options,
                version: 1,
            };

            /*
            const question: MCQuestion = {
                score: mcq['score'],
                type: 'MC',
                author: 1,
                text: mcq['text'],
                concept: mcq['concept'],
                isApproved: approved,
                options: [
                    {text: mcq['Antwort A'], correct: mcq['Korrekt markiert A']},
                    {text: mcq['Antwort B'], correct: mcq['Korrekt markiert B']},
                    {text: mcq['Antwort C'], correct: mcq['Korrekt markiert C']},
                    {text: mcq['Antwort D'], correct: mcq['Korrekt markiert D']},
                    {text: mcq['Antwort E'], correct: mcq['Korrekt markiert E']},
                    {text: mcq['Antwort F'], correct: mcq['Korrekt markiert F']},
                ],
                version: 1,
            }
            */
            mcQuestions.push(question);
            //console.log(question);
        }

        //Create all mc questions
        console.log('creating mc questions...');
        for (const data of mcQuestions) {
            //create the question
            //console.log('create mc question...');
            const createdQuestion = await prisma.question.create({
                data: {
                    score: data.score,
                    type: data.type as questionType,
                    author: { connect: { id: data.author } },
                    text: data.text,
                    conceptNode: { connect: { id: data.concept } },
                    isApproved: data.isApproved,
                    version: data.version,
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

            //create the mc question
            let isSC = true;
            if(data.type == 'MC') {
                isSC = false;
            }
            const mcQuestion = await prisma.mCQuestion.create({
                data: {
                    isSC: isSC,
                    question: { connect: { id: createdQuestion.id } },
                },
            });

            //create the options
            for (const option of data.options) {
                let isCorrect = false;
                if(option.correct) {
                    isCorrect = true;
                }
                const mcOption = await prisma.mCOption.create({
                    data: {
                        text: option.text,
                        is_correct: isCorrect,
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
