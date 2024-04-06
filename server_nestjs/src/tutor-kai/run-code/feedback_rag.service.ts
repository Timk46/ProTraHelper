import { CodeSubmissionResultDto} from '@DTOs/index';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';

import { LangChainTracer } from "langchain/callbacks";
import { Client } from "langsmith";

import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ToolMessage } from 'langchain/schema';

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PGVectorStore } from 'langchain/vectorstores/pgvector';
import { PoolConfig } from 'pg';
import { IpgVectorContent } from './pgVectorResult.DTO';
import { EventLogService } from '@/EventLog/event-log.service';

const pg_config = {
  postgresConnectionOptions: {
    type: 'postgres',
    host: 'vectordb.bshefl0.bs.informatik.uni-siegen.de',
    port: 3306,
    user: 'root',
    password: 'qzx5vQG9WQ2b35eZUWujPUhVb8xRr',
    database: 'vectordb',
  } as PoolConfig,
  tableName: 'langchain_pg_embedding',
  columns: {
    idColumnName: 'uuid',
    vectorColumnName: 'embedding',
    contentColumnName: 'document',
    metadataColumnName: 'cmetadata',
  },
};

const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require('langchain/prompts');

//const KImodel = 'gpt-4-0314';
//const KImodel = 'gpt-3.5-turbo';
const KImodel = 'gpt-4-1106-preview';

const chatStream = new ChatOpenAI({
  modelName: KImodel,
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
});

const client = new Client({
  apiUrl: "https://api.smith.langchain.com",
  apiKey: process.env.LANGCHAIN_API_KEY
});
const tracer = new LangChainTracer({
  projectName: "Tutor-Kai",
  client
});

const chat = new ChatOpenAI({
  modelName: KImodel,
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true,
}).bind({
  tools: [
    {
      type: 'function',
      function: {
        name: 'getProgrammingConcepts',
        description:
          'Ruft Informationen aus dem Vorlesungstranskript zu einem Programmierkonzept ab.',
        parameters: {
          type: 'object',
          properties: {
            concept: {
              type: 'string',
              description: 'Das Programmierkonzept wie z.B. Rekursion',
            },
            question: {
              type: 'string',
              description:
                'Die einzelne sehr einfache Frage auf deutsch, welche basierend auf dem Vorlesungstranskript beantwortet werden soll. Zum Beispiel: Wie funktioniert Rekursion? Oder: Was ist Rekursion?',
            },
          },
          required: ['concept'],
        },
      },
    },
  ],
  tool_choice: 'auto',
});
const finalRAGPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen für Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung. ' +
    'Die Studenten lösen Programmieraufgaben und du gibst Ihnen kurzes hilfreiches Feedback. Dieses darf auf keinen Fall die Lösung verraten, sondern nur in die richtige Richtung lenken und passende Quellen aus der Vorlesung verlinken. ' +
    'Sind 100 Punkte erreicht sollst du lediglich zur korrekten Lösung gratulieren. '+
    'DU VERRÄST DU NIEMALS DIE LÖSUNG. ES IST DIR VERBOTEN, PROGRAMMCODE ZU FORMULIEREN! ' +
    'Dein kurzes hilfreichses Feedback ist maximal sechs Sätze auf drei Absätze lang oder kürzer.  Es ist verboten, die Unit-Tests zu erwähnen!',

    // Erläuterungen zu dem Aufbau der Informationen aus RAG
    'Bei deinem Feedback beziehst du dich IMMER auf Erklärungen aus den Vorlesungsausschnitten und nennst die korrekte Quelle. Diese liegen im folgenden JSON-Format vor:' +
    '{ "Vorlesungsausschnitte": [ { "Konzept": String, "Inhalt": [ { "Erklärung": String, "Quelle": String }, ... // Weitere Erklärungen mit zugehörigen Quellen] }, ... // Weitere Konzepte ] }' +
    'Du MUSST IMMER wenn du eine Erklärung verwendest, die zugehörige Quelle EXAKT und 100% KORREKT DIREKT DAHINTER angeben! Die Zeichen ^ und [] dürfen dabei NIEMALS vergessen werden!' +
    'Hier ein korrektes Beispiel dazu: ' +
    'Beispiel 1: Jede Zeile Code, die zur Funktion gehört, muss um eine Ebene eingerückt sein. Schau dir dazu noch einmal den Abschnitt zur Python Syntax in der Vorlesung an, um dich mit den Einrückungsregeln vertraut zu machen ^[[Python_Kontrollstrukturen_if_else_Code-Beispiel bei 00:02:12](/video?fileName=Python_Kontrollstrukturen_if_else_Code-Beispiel&timeStamp=00:02:12,000)] ' +
    'Beispiel 2: Denke auch daran, dass die Verkettung von Strings in Python mit dem `+` Operator erfolgt, wie im Vorlesungsausschnitt über Datentypen und Operationen in Python erklärt wird: ^[[Python_Datentypen_Umwandeln bei 00:02:31](/video?fileName=Python_Datentypen_Umwandeln&timeStamp=00:02:31,000)].'
  ),
  HumanMessagePromptTemplate.fromTemplate(
    '# Aufgabe die vom Studenten gelöst werden soll:\n{task}\n' +
    '# Die Programmiersprache ist: {language}\n' +
    '# Lösung des Studenten:\n{code}\n' +
    '# Output des Compiler und Unit-Tests:\n {output}\n' +
    '# Unit Tests und deren Ergebnisse:\n ' +
      'Die Unit Tests und deren Ergebnisse liegen als JSON vor. Sie dienen nur zur internen Verwendung.\n ' +
      '## Unit TestCases \n {unitTests}\n' +
      '## Ergebnis der Unit-Tests \n {unitTestsResults}\n' +
    '# Ausschnitt aus der Vorlesung:\n' +
      '{lectureSnippet}\n' +
    '# Wichtige Anweisung\n' +
      'Verweise immer auf die Erklärungen auf den Vorlesungsausschnitten exakt so wie beschrieben! Die Zeichen ^ und [] dürfen dabei NIEMALS vergessen werden!'
  ),
]);

const getConceptsPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist Lehrer für Stunden und Experte der Didaktik.' + // role
      'Basierd auf den Informationzwischen zwischen BEGINCONTEXT und ENDCONTEXT, extrahierst du die wichtigsten zwei Informatik-Konzepte, welche der Student noch verstehen muss, damit er die Aufgabe selbstständig lösen kann. ' +
      'Für jedes dieser Konzept nutzt du das dir zur Verfügung stehende Tool, um weitere Informationen zu den Konzepten aus der Vorlesung zu erhalten.',
  ),
  HumanMessagePromptTemplate.fromTemplate(
    'BEGINCONTEXT' +
      '# Aufgabe die vom Studenten gelöst werden soll:\n{task}\n' +
      '# Die Programmiersprache ist: {language}\n' +
      '# Lösung des Studenten:\n{code}\n' +
      '# Output des Compiler und Unit-Tests:\n {output}\n' +
      '# Unit Tests und deren Ergebnisse:\n ' +
        'Die Unit Tests und deren Ergebnisse liegen als JSON vor. Sie dienen nur zur internen Verwendung.\n ' +
        '## Unit TestCases \n {unitTests}\n' +
        '## Ergebnis der Unit-Tests \n {unitTestsResults}\n' +
    'ENDCONTEXT',
  ),
]);

@Injectable()
export class FeedbackRAGService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private eventLogService: EventLogService,
  ) {}

  // Mocked out function, could be a database/API call in production
  async getProgrammingConcepts(data: any): Promise<string> {
    const pgvectorStore = await PGVectorStore.initialize(
      new OpenAIEmbeddings(),
      pg_config,
    );
    const similaritySearchResult = await pgvectorStore.similaritySearch(
      data.question,
      4,
    );
    return JSON.stringify({ data, explanation: similaritySearchResult });
  }

  async getKiFeedback(
    questionId: number,
    flavor: string,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
    resStream: Response,
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

    const conceptsFormattedPrompt = await getConceptsPrompt.formatPromptValue({
      task: question.codingQuestions.text,
      language: question.codingQuestions.programmingLanguage,
      code: relatedCodeSubmission.code,
      output: relatedCodeSubmissionResult.CodeSubmissionResult.output ? relatedCodeSubmissionResult.CodeSubmissionResult.output : "Es liegt kein Output vor.",
      unitTests: relatedCodeSubmission.codingQuestion.automatedTests[0].code ? relatedCodeSubmission.codingQuestion.automatedTests[0].code : "Es liegen keine Unit-Tests vor.",
      unitTestsResults: relatedCodeSubmission.unitTestResults? relatedCodeSubmission.unitTestResults : "Es liegen keine Testergebnisse vor.",
    });
    // Ask initial question that requires multiple tool calls
    const res = await chat.invoke(conceptsFormattedPrompt, { callbacks: [tracer] });

    console.log(res.additional_kwargs.tool_calls);
    this.eventLogService.log(
      "info",
      "FeedbackRAGService/usedTool",
      userId,
      "Neue Anfrage an Vektordatenbank fuer Aufgabe " + questionId,
      res.additional_kwargs.tool_calls,
    );

    const toolMessages = await Promise.all(
      res.additional_kwargs.tool_calls?.map(async (toolCall) => {
        const toolCallResult = await this.getProgrammingConcepts(
          JSON.parse(toolCall.function.arguments),
        );
        return new ToolMessage({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: toolCallResult,
        });
      }) ?? [],
    );

    let concepts = []; // Ein Array zum Speichern aller Konzepte

    for (const toolMessage of toolMessages) {
      if (typeof toolMessage.content === 'string') {
        let content: IpgVectorContent = JSON.parse(toolMessage.content);// Angenommen, content enthält das JSON-Format
        let explanations = [];
        for (var explanation of content.explanation) {
          const source = explanation.metadata.source.replace("STARTSOURCE ", "").replace(" ENDSOURCE", "")
          explanations.push({
            Erklärung: explanation.pageContent,
            Quelle: source
          });
        }
        concepts.push({
          Konzept: content.data.concept,
          Inhalte: explanations
        });

      }
    }
    let conceptString: string  = JSON.stringify({ Vorlesungsausschnitte: concepts });
    this.eventLogService.log(
      "info",
      "FeedbackRAGService/usedTool",
      userId,
      "Neue Antwort von Vektordatenbank fuer Aufgabe " + questionId,
      conceptString,
    );


    const ragFormattedPrompt = await finalRAGPrompt.formatPromptValue({
      task: question.codingQuestions.text,
      language: question.codingQuestions.programmingLanguage,
      code: relatedCodeSubmission.code,
      output: relatedCodeSubmissionResult.CodeSubmissionResult.output ? relatedCodeSubmissionResult.CodeSubmissionResult.output : "Es liegt kein Output vor.",
      unitTests: relatedCodeSubmission.codingQuestion.automatedTests[0].code ? relatedCodeSubmission.codingQuestion.automatedTests[0].code : "Es liegen keine Unit-Tests vor.",
      unitTestsResults: relatedCodeSubmission.unitTestResults? relatedCodeSubmission.unitTestResults : "Es liegen keine Testergebnisse vor.",
      lectureSnippet: conceptString,
    });

    const openAiResponse = await chatStream.generatePrompt([ragFormattedPrompt], undefined, [
      {
        ignoreAgent: true,
        ignoreChain: true,
        handleLLMNewToken(token: string) {
          resStream.write(token);
        },
      },
      tracer
    ],
    );
    this.saveFeedbackInDB(relatedCodeSubmissionResult, openAiResponse, flavor);
    this.eventLogService.log(
      "info",
      "FeedbackRAGService/usedTool",
      userId,
      "Neues RAG-Feedback fuer Aufgabe " + questionId + " zugehörige CodeSubmission " + this.cryptoService.decrypt(relatedCodeSubmissionResult.encryptedCodeSubissionId),
      {Prompt: ragFormattedPrompt, OpenAIAntwort: openAiResponse.generations[0][0].text},
    );
    resStream.end();
  }


  /*
  getExplanationStrings(content: IpgVectorContent): string {
    var result: string  = "";
    for (var explanation of content.explanation) {
      result += ' BEGINEXPLANATION: ' + explanation.pageContent + explanation.metadata.source + ' ENDEXPLANATION ';
    }
    return result;
  }
  */

  private async saveFeedbackInDB(
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
    openAiResponse,
    flavor: string,
  ) {
    const sumbissionId = Number(
      this.cryptoService.decrypt(relatedCodeSubmissionResult.encryptedCodeSubissionId),
    );
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
  }
}
