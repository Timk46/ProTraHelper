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
import { Prisma, PrismaClient, TranscriptEmbedding } from '@prisma/client';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { IpgVectorContent } from './pgVectorResult.DTO';
import { EventLogService } from '@/EventLog/event-log.service';
import { TranscriptChunk } from '@DTOs/index';

const {ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate} = require('langchain/prompts');

const KImodel = 'gpt-4o-2024-08-06';

const finalRAGPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen für Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung. ' +
    'Die Studenten lösen Programmieraufgaben und du gibst Ihnen kurzes hilfreiches Feedback. Dieses darf auf keinen Fall die Lösung verraten, sondern nur in die richtige Richtung lenken und passende Quellen aus der Vorlesung verlinken. ' +
    'Sind 100 Punkte erreicht sollst du lediglich zur korrekten Lösung gratulieren. '+

    // NEU <- ist nicht im normalen Feedback
    'Du formatierst deine Antwort übersichtlich mit der Markdown-Syntax. '+
    'Gebbe immer wenn es passt Code-Beispiele (anderer Kontext als in der Aufgabe), wie die Syntax demonstrieren. ' +
    'Wenn das Problem bereits eindeutig in der Compiler-Ausgabe steht, dann verweise auf darauf und ergänze um Erkärungen. Das ist wichtig, damit der Student lernt, die Compiler-Ausgabe zu lesen und zu verstehen. ' +
    // Etwas länger als normales Feedback
    'Dein kurzes hilfreichses Feedback ist maximal acht Sätze auf vier Absätze lang oder kürzer. Es ist verboten, die Unit-Tests zu erwähnen!',
    'DU VERRÄST DU NIEMALS DIE LÖSUNG.  ' +

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

const db = new PrismaClient();
const vectorStore = PrismaVectorStore.withModel<TranscriptEmbedding>(db).create(
  new OpenAIEmbeddings(),
  {
    prisma: Prisma,
    tableName: 'TranscriptEmbedding',
    vectorColumnName: 'vector',
    columns: {
      id: PrismaVectorStore.IdColumn,
      content: PrismaVectorStore.ContentColumn,
    },
  },
);

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
  projectName: "GOALS_feedback_RAG",
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
    const tempsimilaritySearchResult = await vectorStore.similaritySearch(
      data.question,
      4,
    );
    const similaritySearchResult= this.transformToTranscriptChunks(JSON.stringify(tempsimilaritySearchResult));
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

    //console.log(res.additional_kwargs.tool_calls);
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
          explanations.push({
            Erklärung: explanation.TranscriptChunkContent,
            Quelle: explanation.metadata.markdownLink // we have access to all metadata
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
    this.saveFeedbackInDB(relatedCodeSubmissionResult, openAiResponse, flavor, ragFormattedPrompt);
    this.eventLogService.log(
      "info",
      "FeedbackRAGService/usedTool",
      userId,
      "Neues RAG-Feedback fuer Aufgabe " + questionId + " zugehörige CodeSubmission " + this.cryptoService.decrypt(relatedCodeSubmissionResult.encryptedCodeSubissionId),
      {Prompt: ragFormattedPrompt, OpenAIAntwort: openAiResponse.generations[0][0].text},
    );
    resStream.end();
  }

  private async saveFeedbackInDB(
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
    openAiResponse,
    flavor: string,
    ragFormattedPrompt: string
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
        prompt: JSON.stringify(ragFormattedPrompt),
        response: openAiResponse.generations[0][0].text,
        model: KImodel,
        flavor: flavor,
      },
    });
  }

    // Da der Prisma Vectorstore für pgVector keine Metadaten abfragen kann, sind diese alle als JSON-String als Text im Content und werden hier wieder zurückgeparsed.
    transformToTranscriptChunks(jsonString: string): TranscriptChunk[] {
      try {
        // Zunächst den String in ein JSON-Objekt umwandeln
        const parsedData = JSON.parse(jsonString);

        // Überprüfen, ob das geparste Objekt ein Array ist
        if (!Array.isArray(parsedData)) {
          throw new Error("Parsed data is not an array");
        }

        // Das Array von Objekten in das gewünschte Format mappen
        const transcriptChunks: TranscriptChunk[] = parsedData.map(item => {
          // Sicherstellen, dass pageContent existiert und ein JSON-String ist
          if (typeof item.pageContent !== 'string') {
            throw new Error("pageContent is missing or not a string");
          }

          // pageContent von String zu JSON umwandeln
          const pageContent = JSON.parse(item.pageContent);

          // Die Struktur validieren und anpassen
          if (typeof pageContent !== 'object' || typeof pageContent.TranscriptChunkContent !== 'string' || typeof pageContent.metadata !== 'object') {
            throw new Error("Invalid pageContent structure");
          }

          // Rückgabe des neu strukturierten Objekts
          return {
            TranscriptChunkContent: pageContent.TranscriptChunkContent,
            metadata: {
              filename: pageContent.metadata.filename,
              timestamp: pageContent.metadata.timestamp,
              markdownLink: pageContent.metadata.markdownLink,
              uuid: pageContent.metadata.uuid,
              lectureName: pageContent.metadata.lectureName,
            }
          };
        });

        return transcriptChunks;
      } catch (error) {
        console.error("Error mapping to TranscriptChunk array:", error);
        return [];
      }
    }
}
