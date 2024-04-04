import { PrismaClient, contentElementType } from '@prisma/client';
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

export const seedCodeQuestions = async (user_id: number) => {
    await importProgrammingTasksFromExcel('programming-tasks/programmieraufgaben_JACK_SOSE23_WORKSHOP_WISE2324.xlsx', 'Automatisch Import aus Excel: JACK Aufgaben aus SoSe 23 + Workshopsaufgaben aus WiSe 23/24', user_id);
    await importProgrammingTasksFromExcel('programming-tasks/programmieraufgaben_bechtel.xlsx', 'Automatisch Import aus Excel: Aufgaben aus dem TutorKai-Einsatz in Schulen von Herrn Bechtel WiSe 23/24', user_id);
    await importProgrammingTasksFromExcel('programming-tasks/programmieraufgaben_linden.xlsx', 'Automatisch Import aus Excel: ufgaben aus dem TutorKai-Einsatz in Schulen von Frau Linden WiSe 23/244', user_id);
}

async function importProgrammingTasksFromExcel(filename: string, description: string, adminUserId: number = 1) {
    const filePathTasks = process.env.FILE_PATH + 'programming-tasks/' + filename;
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
                description: description,
                score: 100, // this is the max score for all tasks currently (=100%)
                type: 'CodingQuestion',
                author: { connect: { id: adminUserId } },
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
                                    language: task.Programming_Language
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

        //create content element and connect it to the question
        const contentElement = await prisma.contentElement.create({
            data: {
                type: contentElementType.QUESTION,
                question: { connect: { id: newTask.id } },
                title: newTask.name,
            },
        });

        //connect the content element to the the concept node by setting the training
        const training = await prisma.training.findFirst({
            where: {
                conceptNodeId: newTask.conceptNodeId,
                awards: newTask.level,
            }
        });
        if (training) {
            const contentNode = await prisma.contentNode.findFirst({
                where: { id: training.contentNodeId }
            });
            //ermittle die höchste Position in der content view und setze die Position des neuen content elements auf +1
            const contentViews = await prisma.contentView.findMany({
                where: { contentNodeId: contentNode.id }
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
        /* /* Not working yet, because of constraint violation
        else {
            //erzeuge eine neue content node mit dem award level und verbinde sie mit dem content element
            const contentNode = await prisma.contentNode.create({
                data: {
                    name: 'Training ' + newTask.level,
                },
            });
            await prisma.training.create({
                data: {
                    conceptNode: { connect: { id: newTask.conceptNodeId } },
                    contentNode: { connect: { id: contentNode.id } },
                    awards: newTask.level,
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
