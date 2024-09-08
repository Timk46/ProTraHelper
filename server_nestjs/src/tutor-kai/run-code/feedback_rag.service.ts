import { CodeSubmissionResultDto } from '@DTOs/index';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';
import { LangChainTracer } from 'langchain/callbacks';
import { Client } from 'langsmith';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ToolMessage } from 'langchain/schema';
import { Prisma, PrismaClient, TranscriptEmbedding } from '@prisma/client';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { IpgVectorContent } from './pgVectorResult.DTO';
import { EventLogService } from '@/EventLog/event-log.service';
import { TranscriptChunk } from '@DTOs/index';

const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require('langchain/prompts');

const KImodel = 'gpt-4o-2024-08-06';

const individualFeedbackPromptLevel1: String =
  'Gib immer, wenn es passt, Code-Beispiele, die die Syntax demonstrieren. VERWENDE DAZU EINEN KOMPLETT ANDEREN KONTEXT ALS IN DER AUFGABE ODER DER LÖSUNG DES STUDENTEN! ES IST STRENG VERBOTEN, DIE LÖSUNG ZUR AUFGABE DIREKT ZU VERRATEN!' +
  'Wenn das Problem bereits eindeutig in der Compiler-Ausgabe steht, dann verweise darauf und ergänze Erklärungen. Das ist wichtig, damit die Studenten lernen, die Compiler-Ausgabe zu lesen und zu verstehen. ' +
  'Die Studenten lösen Programmieraufgaben, und du gibst ihnen kurzes, hilfreiches Feedback. Dieses darf auf keinen Fall die Lösung verraten, sondern nur in die richtige Richtung lenken und passende Quellen aus der Vorlesung verlinken. ' +
  'Sind 100 Punkte erreicht, sollst du lediglich zur korrekten Lösung gratulieren.' +
  'Verwende eine sehr einfache Sprache und erkläre die Konzepte ausführlich Schritt für Schritt. Gib viele Details und Beispiele, um das Verständnis zu fördern. Die Antwort muss so formuliert sein, sodass ein absoluter Programmieranfänger sie versteht.\n';

const individualFeedbackPromptLevel2: String =
  'Gib immer, wenn es passt, Code-Beispiele, die die Syntax demonstrieren. VERWENDE DAZU EINEN KOMPLETT ANDEREN KONTEXT ALS IN DER AUFGABE ODER DER LÖSUNG DES STUDENTEN!' +
  'Wenn das Problem bereits eindeutig in der Compiler-Ausgabe steht, dann verweise darauf und ergänze es mit Erklärungen. Das ist wichtig, damit der Student lernt, die Compiler-Ausgabe zu lesen und zu verstehen. ' +
  'Die Studenten lösen Programmieraufgaben, und du gibst ihnen kurzes, hilfreiches Feedback. Dieses darf auf keinen Fall die Lösung verraten, sondern nur in die richtige Richtung lenken und passende Quellen aus der Vorlesung verlinken. ' +
  'Sind 100 Punkte erreicht, sollst du lediglich zur korrekten Lösung gratulieren.';

const individualFeedbackPromptLevel3: String =
  'Stelle nur EINE EINZIGE sokratische Frage, um den Studenten zur eigenen Problemlösung zu führen. Reduziere die direkte Hilfestellung und fördere das eigenständige Denken. Deine Antwort besteht nur aus einer einzigen sokratischen Frage und aus Hinweisen auf Vorlesungsinhalte (maximal 2 Sätze).';

const finalRAGPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen von Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung.\n' +
      'Formatiere deine Antwort übersichtlich mit der Markdown-Syntax, sodass sie für die Studenten gut lesbar ist.\n' +
      '{individualFeedbackPrompt}' +
      // NEU <- ist nicht im normalen Feedback
      // Etwas länger als normales Feedback
      'Es ist verboten, die Unit-Tests zu erwähnen.',
    'DU VERRÄTST NIEMALS DIE LÖSUNG. ' +
      // Erläuterungen zu dem Aufbau der Informationen aus RAG
      'Bei deiner Antwort beziehst du dich auf Erklärungen aus den Vorlesungsausschnitten. Dabei zitierst du nur indirekt und baust diese in deine eigene Antwort ein. Dies Quellen liegen im folgenden JSON-Format vor:' +
      '{ "Vorlesungsausschnitte": [ { "Konzept": String, "Inhalt": [ { "Erklärung": String, "Quelle": String }, ... // Weitere Erklärungen mit zugehörigen Quellen] }, ... // Weitere Konzepte ] }' +
      'Du MUSST IMMER, wenn du eine Erklärung verwendest, die zugehörige Quelle EXAKT und 100% GENAU WIE IN DEN BEISPIELEN DIREKT DAHINTER AUSSCHLIEßLICH im Format $$Zahl$$ OHNE weitere "[" oder "Quelle".' +
      'Hier sind Beispiele zur korrekten Zitation. Gehe beim Zitieren genauso vor:\n ' +
      'Beispiel 1: Jede Zeile Code, die zur Funktion gehört, muss um eine Ebene eingerückt sein $$5$$.\n' +
      'Beispiel 2: Denke auch daran, dass die Verkettung von Strings in Python mit dem `+` Operator erfolgt, wie im Vorlesungsausschnitt über Datentypen und Operationen in Python erklärt wird $$2$$.\n' +
      'Beispiel 3: Diese Methoden sollten dann in den abgeleiteten Klassen `Pyramide` und `Kegel` implementiert werden $$1$$.\n',
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
      'Verweise immer auf die Erklärungen auf den Vorlesungsausschnitten AUSSCHLIEßLICH im Format $$Zahl$$.',
  ),
]);

const getConceptsPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist Lehrer für Studenten und Experte der Didaktik.' + // role
      'Basierend auf den Informationen zwischen BEGINCONTEXT und ENDCONTEXT, extrahierst du die zwei wichtigsten Informatik-Konzepte, die der Student noch verstehen muss, damit er die Aufgabe selbstständig lösen kann. ' +
      'Für jedes dieser Konzepte nutzt du das dir zur Verfügung stehende Tool, um weitere Informationen zu den Konzepten aus der Vorlesung zu erhalten.',
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
  streaming: true,
});

const client = new Client({
  apiUrl: 'https://api.smith.langchain.com',
  apiKey: process.env.LANGCHAIN_API_KEY,
});
const tracer = new LangChainTracer({
  projectName: 'GOALS_feedback_RAG',
  client,
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
    const similaritySearchResult = this.transformToTranscriptChunks(
      JSON.stringify(tempsimilaritySearchResult),
    );
    return JSON.stringify({ data, explanation: similaritySearchResult });
  }

  async getKiFeedback(
    questionId: number,
    flavor: string,
    feedbackLevel: string,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
    resStream: Response,
    userId: number,
  ): Promise<void> {
    const sumbissionId = Number(
      this.cryptoService.decrypt(
        relatedCodeSubmissionResult.encryptedCodeSubissionId,
      ),
    );
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        codingQuestion: {
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

    const individualFeedbackPrompt: String =
      feedbackLevel === 'Wenig Unterstützung'
        ? individualFeedbackPromptLevel3
        : feedbackLevel === 'Standard Unterstützung'
        ? individualFeedbackPromptLevel2
        : individualFeedbackPromptLevel1;

    const conceptsFormattedPrompt = await getConceptsPrompt.formatPromptValue({
      task: question.codingQuestion.text,
      language: question.codingQuestion.programmingLanguage,
      code: relatedCodeSubmission.code,
      output: relatedCodeSubmissionResult.CodeSubmissionResult.output
        ? relatedCodeSubmissionResult.CodeSubmissionResult.output
        : 'Es liegt kein Output vor.',
      unitTests: relatedCodeSubmission.codingQuestion.automatedTests[0].code
        ? relatedCodeSubmission.codingQuestion.automatedTests[0].code
        : 'Es liegen keine Unit-Tests vor.',
      unitTestsResults: relatedCodeSubmission.unitTestResults
        ? relatedCodeSubmission.unitTestResults
        : 'Es liegen keine Testergebnisse vor.',
    });
    // Ask initial question that requires multiple tool calls
    const res = await chat.invoke(conceptsFormattedPrompt, {
      callbacks: [tracer],
    });

    //console.log(res.additional_kwargs.tool_calls);
    this.eventLogService.log(
      'info',
      'FeedbackRAGService/usedTool',
      userId,
      'Neue Anfrage an Vektordatenbank fuer Aufgabe ' + questionId,
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
    let sourceCounter: number = 0;
    let sourceMapDict = {};

    for (const toolMessage of toolMessages) {
      if (typeof toolMessage.content === 'string') {
        let content: IpgVectorContent = JSON.parse(toolMessage.content); // Angenommen, content enthält das JSON-Format
        let explanations = [];
        for (var explanation of content.explanation) {
          sourceCounter++;
          explanations.push({
            Erklärung: explanation.TranscriptChunkContent,
            //Quelle: explanation.metadata.markdownLink, // we have access to all metadata
            Quelle: '$$' + sourceCounter.toString() + '$$', // we have access to all metadata
          });
          sourceMapDict[sourceCounter.toString()] =
            explanation.metadata.markdownLink;
        }
        concepts.push({
          Konzept: content.data.concept,
          Inhalte: explanations,
        });
      }
    }
    let conceptString: string = JSON.stringify({
      Vorlesungsausschnitte: concepts,
    });
    this.eventLogService.log(
      'info',
      'FeedbackRAGService/usedTool',
      userId,
      'Neue Antwort von Vektordatenbank fuer Aufgabe ' + questionId,
      conceptString,
    );

    const ragFormattedPrompt = await finalRAGPrompt.formatPromptValue({
      individualFeedbackPrompt: individualFeedbackPrompt,
      task: question.codingQuestion.text,
      language: question.codingQuestion.programmingLanguage,
      code: relatedCodeSubmission.code,
      output: relatedCodeSubmissionResult.CodeSubmissionResult.output
        ? relatedCodeSubmissionResult.CodeSubmissionResult.output
        : 'Es liegt kein Output vor.',
      unitTests: relatedCodeSubmission.codingQuestion.automatedTests[0].code
        ? relatedCodeSubmission.codingQuestion.automatedTests[0].code
        : 'Es liegen keine Unit-Tests vor.',
      unitTestsResults: relatedCodeSubmission.unitTestResults
        ? relatedCodeSubmission.unitTestResults
        : 'Es liegen keine Testergebnisse vor.',
      lectureSnippet: conceptString,
    });

    let ongoingBuffer = ''; // Buffer to capture potential reference across tokens

    let openAiAnswerWithMarkdownLinks = '';
    const openAiResponse = await chatStream.generatePrompt(
      [ragFormattedPrompt],
      undefined,
      [
        {
          ignoreAgent: true,
          ignoreChain: true,
          handleLLMNewToken(token: string) {
            // Handle each token of the response to replace references with actual markdown links
            for (let i = 0; i < token.length; i++) {
              const char = token[i];

              // Start buffering if we encounter the first $
              if (char === '$') {
                ongoingBuffer += char;
              } else if (ongoingBuffer) {
                ongoingBuffer += char;

                // Check if the buffer now contains a complete reference ending with "$$"
                if (ongoingBuffer.match(/\$\$\d+\$\$/)) {
                  const match = ongoingBuffer.match(/\$\$(\d+)\$\$/);

                  if (match) {
                    const sourceCounter = match[1];
                    const markdownLink = sourceMapDict[sourceCounter];
                    if (markdownLink) {
                      const replacedText = ongoingBuffer.replace(
                        `$$${sourceCounter}$$`,
                        markdownLink,
                      );
                      resStream.write(replacedText);
                      openAiAnswerWithMarkdownLinks += replacedText;
                    } else {
                      resStream.write(ongoingBuffer);
                      openAiAnswerWithMarkdownLinks += ongoingBuffer;
                    }
                  } else {
                    resStream.write(ongoingBuffer);
                    openAiAnswerWithMarkdownLinks += ongoingBuffer;
                  }

                  ongoingBuffer = ''; // Clear the buffer after processing
                }
              } else {
                // If not buffering, directly write the character to the response stream
                resStream.write(char);
                openAiAnswerWithMarkdownLinks += char;
              }
            }

            // Handle the case where ongoingBuffer contains the beginning of a reference
            if (ongoingBuffer && !ongoingBuffer.match(/\$\$\d+\$\$/)) {
              // Do not flush; wait for more tokens to complete the reference
            } else if (ongoingBuffer.match(/\$\$\d+\$\$/)) {
              // If buffer is complete but wasn't processed yet, process now
              const match = ongoingBuffer.match(/\$\$(\d+)\$\$/);
              if (match) {
                const sourceCounter = match[1];
                const markdownLink = sourceMapDict[sourceCounter];
                const replacedText = markdownLink
                  ? ongoingBuffer.replace(`$$${sourceCounter}$$`, markdownLink)
                  : ongoingBuffer;
                resStream.write(replacedText);
                openAiAnswerWithMarkdownLinks += replacedText;
              } else {
                resStream.write(ongoingBuffer);
                openAiAnswerWithMarkdownLinks += ongoingBuffer;
              }
              ongoingBuffer = ''; // Clear the buffer
            }
          },
        },
        tracer,
      ],
    );

    resStream.end();

    this.saveFeedbackInDB(
      relatedCodeSubmissionResult,
      openAiAnswerWithMarkdownLinks,
      flavor,
      feedbackLevel,
      ragFormattedPrompt,
    );
    this.eventLogService.log(
      'info',
      'FeedbackRAGService/usedTool',
      userId,
      'Neues RAG-Feedback fuer Aufgabe ' +
        questionId +
        ' zugehörige CodeSubmission ' +
        this.cryptoService.decrypt(
          relatedCodeSubmissionResult.encryptedCodeSubissionId,
        ),
      {
        Prompt: ragFormattedPrompt,
        OpenAIAntwort: openAiAnswerWithMarkdownLinks,
      },
    );
    resStream.end();
  }

  private async saveFeedbackInDB(
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
    openAiAnswerWithMarkdownLinks,
    flavor: string,
    feedbackLevel: string,
    ragFormattedPrompt: string,
  ) {
    const sumbissionId = Number(
      this.cryptoService.decrypt(
        relatedCodeSubmissionResult.encryptedCodeSubissionId,
      ),
    );
    await this.prisma.kIFeedback.create({
      data: {
        submission: {
          connect: {
            id: sumbissionId,
          },
        },
        prompt: JSON.stringify(ragFormattedPrompt),
        response: openAiAnswerWithMarkdownLinks,
        model: KImodel,
        flavor: flavor + ': ' + feedbackLevel,
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
        throw new Error('Parsed data is not an array');
      }

      // Das Array von Objekten in das gewünschte Format mappen
      const transcriptChunks: TranscriptChunk[] = parsedData.map((item) => {
        // Sicherstellen, dass pageContent existiert und ein JSON-String ist
        if (typeof item.pageContent !== 'string') {
          throw new Error('pageContent is missing or not a string');
        }

        // pageContent von String zu JSON umwandeln
        const pageContent = JSON.parse(item.pageContent);

        // Die Struktur validieren und anpassen
        if (
          typeof pageContent !== 'object' ||
          typeof pageContent.TranscriptChunkContent !== 'string' ||
          typeof pageContent.metadata !== 'object'
        ) {
          throw new Error('Invalid pageContent structure');
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
          },
        };
      });

      return transcriptChunks;
    } catch (error) {
      console.error('Error mapping to TranscriptChunk array:', error);
      return [];
    }
  }
}
