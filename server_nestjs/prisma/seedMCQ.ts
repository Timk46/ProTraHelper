
import { PrismaClient, contentElementType } from '@prisma/client';
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

const mcQuestions : MCQuestion[] = [];

export const seedMCQ = async () => {
    console.log('reading mc questions from Excel');    
    const filePath = process.env.FILE_PATH + 'MCQuestions.xlsx';
    if(fs.existsSync(filePath)) {
        const workbook = XLSX.readFile(filePath);
        const worksheet: WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
        const question_data = utils.sheet_to_json(worksheet);
        console.log(mcQuestions);
        for (const mcq of question_data) {
            console.log(mcq);
            let approved = false;
            if(mcq['approved'] == '1') {
                approved = true;
            }
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
            mcQuestions.push(question);
            console.log(question);
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
    