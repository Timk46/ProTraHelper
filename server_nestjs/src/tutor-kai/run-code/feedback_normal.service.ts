import { CodeSubmissionResultDto } from '@DTOs/index';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';
import { EventLogService } from '@/EventLog/event-log.service';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Client } from "langsmith";
import { LangChainTracer } from "langchain/callbacks";

const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require('langchain/prompts');

//const KImodel = 'gpt-4-0314';
//const KImodel = 'gpt-3.5-turbo';
const KImodel = 'gpt-4o-2024-08-06';

const chat = new ChatOpenAI({
  modelName: KImodel,
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
});

const individualFeedbackPromptLevel1: String =
'Die Studenten lösen Programmieraufgaben, und du gibst ihnen kurzes, hilfreiches Feedback. Dieses darf auf keinen Fall die Lösung verraten, sondern nur in die richtige Richtung lenken. ' +
'Sind 100 Punkte erreicht, sollst du lediglich zur korrekten Lösung gratulieren.'+
'Verwende eine sehr einfache Sprache und erkläre die Konzepte ausführlich Schritt für Schritt. Gib viele Details und Beispiele, um das Verständnis zu fördern. Die Antwort muss so formuliert sein, sodass ein absoluter Programmieranfänger sie versteht.\n'

const individualFeedbackPromptLevel2: String =
'Die Studenten lösen Programmieraufgaben, und du gibst ihnen kurzes, hilfreiches Feedback. Dieses darf auf keinen Fall die Lösung verraten, sondern nur in die richtige Richtung lenken. ' +
'Sind 100 Punkte erreicht, sollst du lediglich zur korrekten Lösung gratulieren.'

const individualFeedbackPromptLevel3: String =
'Deine Antwort besteht nur aus EINER EINZIGEN sokratischen Frage, um den Studenten zur eigenen Problemlösung zu führen. Reduziere die direkte Hilfestellung und fördere das eigenständige Denken.'


const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen von Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung.\n' +
    '{individualFeedbackPrompt}' +

    'Dein kurzes, hilfreiches Feedback besteht aus maximal sechs Sätzen, aufgeteilt auf höchstens drei Absätze. Es ist verboten, die Unit-Tests zu erwähnen!' +
    'DU VERRÄTST NIEMALS DIE LÖSUNG.'
  ),
  HumanMessagePromptTemplate.fromTemplate(
    '# Aufgabe die vom Studenten gelöst werden soll:\n{task}\n' +
    '# Die Programmiersprache ist: {language}\n' +
    '# Lösung des Studenten:\n{code}\n' +
    '# Output des Compiler und Unit-Tests:\n {output}\n' +
    '# Unit Tests und deren Ergebnisse:\n ' +
      'Die Unit Tests und deren Ergebnisse liegen als JSON vor. Sie dienen nur zur internen Verwendung.\n ' +
      '## Unit TestCases \n {unitTests}\n' +
      '## Ergebnis der Unit-Tests \n {unitTestsResults}\n'
  ),
]);

const client = new Client({
  apiUrl: "https://api.smith.langchain.com",
  apiKey: process.env.LANGCHAIN_API_KEY
});
const tracer = new LangChainTracer({
  projectName: "GOALS_feedback_normal",
  client
});

@Injectable()
export class FeedbackNormalService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private eventLogService: EventLogService
  ) { }


  /**
   * Gets feedback from the AI.
   *
   * @param {string} questionId- the task description to evaluate code on
   * @param {string} flavor - the flavor of feedback to get
   * @param {CodeSubmissionResultDto} relatedCodeSubmissionResult - CodeSubmissionResultDto: the result of the executed code (containing stdout, stderr, compile_output) and the previous submission ID (for updating the matching tuple in the database)
   * @param {Response} res - the response object to write the KI feedback to
   * @returns {Promise<void>} - a promise that resolves when the KI feedback has been written to the response object
   */
  async getKiFeedback(
    questionId: number,
    flavor: string,
    feedbackLevel: string,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
    res: Response,
    userId: number,
  ): Promise<void> {

    const sumbissionId = Number(this.cryptoService.decrypt(relatedCodeSubmissionResult.encryptedCodeSubissionId));
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        codingQuestions: {
          include: {
            codeGerueste: true,
            automatedTests: true,
          },
        },
      },
    });

    const relatedCodeSubmission = await this.prisma.codeSubmission.findUnique({
      where: { id: sumbissionId },
      include: {
        codingQuestion: {
          include: {
            codeGerueste: true,
            automatedTests: true,
          },
        },
      },
    });

    const individualFeedbackPrompt: String = feedbackLevel === 'Wenig Unterstützung' ? individualFeedbackPromptLevel3 : feedbackLevel === 'Standard Unterstützung' ? individualFeedbackPromptLevel2 : individualFeedbackPromptLevel1;


    const formattedPrompt = await chatPrompt.formatPromptValue({
      individualFeedbackPrompt: individualFeedbackPrompt,
      task: question.codingQuestions.text,
      language: question.codingQuestions.programmingLanguage,
      code: relatedCodeSubmission.code,
      output: relatedCodeSubmissionResult.CodeSubmissionResult.output ? relatedCodeSubmissionResult.CodeSubmissionResult.output : "Es liegt kein Output vor.",
      unitTests: relatedCodeSubmission.codingQuestion.automatedTests[0].code ? relatedCodeSubmission.codingQuestion.automatedTests[0].code : "Es liegen keine Unit-Tests vor.",
      unitTestsResults: relatedCodeSubmission.unitTestResults? relatedCodeSubmission.unitTestResults : "Es liegen keine Testergebnisse vor.",
    });

    const openAiResponse = await chat.generatePrompt([formattedPrompt], undefined, [
      {
        ignoreAgent: true,
        ignoreChain: true,
        handleLLMNewToken(token: string) {
          res.write(token);
        },
      },
      tracer
    ],
    );
    this.eventLogService.log(
      "info",
      "FeedbackRAGService/usedTool",
      userId,
      "Neues RAG-Feedback fuer Aufgabe " + questionId + " zugehörige CodeSubmission " + this.cryptoService.decrypt(relatedCodeSubmissionResult.encryptedCodeSubissionId),
      {Prompt: formattedPrompt, OpenAIAntwort: openAiResponse.generations[0][0].text},
    );

    await this.prisma.kIFeedback.create({
      data: {
        submission: {
          connect: {
            id: sumbissionId,
          },
        },
        prompt: JSON.stringify(formattedPrompt),
        response: openAiResponse.generations[0][0].text,
        model: KImodel,
        flavor: flavor + ": " + feedbackLevel,
      },
    });

    res.end();
  }

}
