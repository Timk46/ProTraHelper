import { CodeSubmissionResultDto, Judge0Dto } from '@DTOs/index';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';

import { ChatOpenAI } from "langchain/chat_models/openai";

const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require('langchain/prompts');

//const KImodel = 'gpt-4-0314';
//const KImodel = 'gpt-3.5-turbo';
const KImodel = 'gpt-4-1106-preview';

const chat = new ChatOpenAI({
  modelName: KImodel,
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
});

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen für Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung. ' +
    'Die Studenten lösen Programmieraufgaben und du gibst Ihnen kurzes hilfreiches Feedback. Dieses darf auf keinen Fall die Lösung verraten, sondern nur in die richtige Richtung lenken. ' + // entfernt: und passende Quellen aus der Vorlesung verlinken.
    'Sind 100 Punkte erreicht, sollst du lediglich zur korrekten Lösung gratulieren. '+
    'DU VERRÄST DU NIEMALS DIE LÖSUNG. ES IST DIR VERBOTEN, PROGRAMMCODE ZU FORMULIEREN! ' +
    'Dein kurzes hilfreichses Feedback ist maximal sechs Sätze auf drei Absätze lang oder kürzer. ',
  ),
  HumanMessagePromptTemplate.fromTemplate(
    '# Aufgabe die vom Studenten gelöst werden soll:\n{task}\n' +
    '# Die Programmiersprache ist \n{language}\n' +
    '# Lösung des Studenten:\n{code}\n' +
    '# Output des Compiler und Unit-Tests:\n {output}\n' +
    '{error}',
  ),
]);
@Injectable()
export class FeedbackNormalService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) { }

  /**
   * Get KI feedback based on the student's submitted code, task, language, compiler output, and submission ID.
   *
   * @param {string} task - The task description given to the student.
   * @param {string} code - The code submitted by the student.
   * @param {string} language - The programming language used by the student.
   * @param {CodeSubmissionResultDto} relatedCodeSubmissionResult - The result of the code execution and the ID of the last code submission (which is the submission associated with the feedback)
   * @param {Response} res - The response object to write the KI feedback to.
   * @returns {Promise<void>} - A promise that resolves when the KI feedback has been written to the response object.
   */
  async getKiFeedback(
    code: string,
    task: string,
    language: string,
    flavor: string,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
    res: Response
  ): Promise<void> {

    const formattedPrompt = await chatPrompt.formatPromptValue({
      task: task,
      language: language,
      code: code,
      output: relatedCodeSubmissionResult.resultjudge0.stdout + (relatedCodeSubmissionResult.resultjudge0.compile_output ? relatedCodeSubmissionResult.resultjudge0.compile_output : ''),
      error: relatedCodeSubmissionResult.resultjudge0.stderr ? 'Error message: ' + relatedCodeSubmissionResult.resultjudge0.stderr : '',
    });

    const openAiResponse = await chat.generatePrompt([formattedPrompt], undefined, [
      {
        ignoreAgent: true,
        ignoreChain: true,
        handleLLMNewToken(token: string) {
          res.write(token);
        },
      },
    ],
    );

    const sumbissionId = Number(this.cryptoService.decrypt(relatedCodeSubmissionResult.encryptedSubmissionId));
    await this.prisma.kIFeedback.create({
      data: {
        submission: {
          connect: {
            id: sumbissionId,
          },
        },
        text: openAiResponse.generations[0][0].text,
        model: KImodel,
        flavor: flavor,
      },
    });

    res.end();
  }
}
