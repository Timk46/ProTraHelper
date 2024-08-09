import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Response } from 'express';
import { LangChainTracer } from 'langchain/callbacks';
import { Client } from 'langsmith';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RagService } from '../services/rag.service';
import { TranscriptChunk } from '@Interfaces/index';
import { PrismaService } from '../../prisma/prisma.service';

const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require('langchain/prompts');

const KImodel = 'gpt-4o-2024-08-06';

const chatStream = new ChatOpenAI({
  modelName: KImodel,
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  streaming: true,
});

const client = new Client({
  apiUrl: 'https://api.smith.langchain.com',
  apiKey: process.env.LANGCHAIN_API_KEY,
});
const tracer = new LangChainTracer({
  projectName: 'GOALS_chatbot',
  client,
});

const finalRAGPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen für Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung. ' +
      // Erläuterungen zu dem Aufbau der Informationen aus RAG
      '# Schritt 1: Erklärung basierend auf der Vorlesung \n' +
      'Bei deiner Antwort beziehst du dich auf relevante Erklärungen aus den Vorlesungsausschnitten und nennst die korrekte Quelle. Du verwendest Markdown-Syntax, um die Antwort übersichtlich zu formatieren.' +
      'Du MUSST IMMER, wenn du eine Erklärung verwendest, die zugehörige Quelle EXAKT und 100% GENAU SO WIE IN DEN BEISPIELEN DIREKT DAHINTER AUSSCHLIEßLICH im Format $$Zahl$$ OHNE weitere "[" oder "Quelle".' +
      'Hier sind Beispiele zur korrekten Zitation. Gehe beim Zitieren genauso vor:\n ' +
      'Beispiel 1: Jede Zeile Code, die zur Funktion gehört, muss um eine Ebene eingerückt sein $$5$$.\n' +
      'Beispiel 2: Denke auch daran, dass die Verkettung von Strings in Python mit dem `+` Operator erfolgt, wie im Vorlesungsausschnitt über Datentypen und Operationen in Python erklärt wird $$2$$.\n' +
      'Beispiel 3: Diese Methoden sollten dann in den abgeleiteten Klassen `Pyramide` und `Kegel` implementiert werden $$1$$.\n' +
      '\n # Hinweis: Zitiere die Erklärungen nicht wortwörtlich, sondern baue sie inhaltlich in deine Antwort ein.' +
      '# Schritt 2: Beispiel \n' +
      'Falls es zu der Frage oder deiner bisherigen Antwort ein passendes, kurzes Code-Beispiel (z.B. Programmcode Python) gibt, dann füge dieses übersichtlich mit Erklärungen in einfacher Sprache hinzu.',
  ),
  HumanMessagePromptTemplate.fromTemplate(
    '# Frage des Studenten\n{question}\n' +
      '# Ausschnitt aus der Vorlesung:\n' +
      '{lectureSnippet}\n' +
      '# Wichtige Anweisungen\n' +
      '1. Verweise immer auf die Erklärungen aus den Vorlesungsausschnitten AUSSCHLIEßLICH im Format $$Zahl$$.\n' +
      '2. Wenn die Frage keinen Bezug zur Informatik oder Objektorientierte und funktionale Programmierung hat, antworte: "Das ist eine interessante Frage, aber leider nicht Teil des Vorlesungsstoffs."',
  ),
]);

// Wird für alle Nachrichten im Chatverlauf verwendet (RAG nur für die erste Frage)
const dialogPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen für Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung. ' +
      'Du gibst kurze und hilfreiche Antworten auf die Rückfragen der Studenten in einfacher Sprache. Berücksichtige dabei den bisherigen Chatverlauf.' +
      '# Wichtige Anweisungen\n' +
      '1. Wenn die Frage keinen Bezug zur Informatik oder Objektorientierte und funktionale Programmierung hat, antworte: "Das ist eine interessante Frage, aber leider nicht Teil des Vorlesungsstoffs."',
  ),
  HumanMessagePromptTemplate.fromTemplate(
    '# Chatverlauf\n' +
      '{chatHistory}\n' +
      '# Frage des Studenten:\n' +
      '{question}\n',
  ),
]);
@Injectable()
export class ChatBotRAGService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private ragService: RagService,
    private prisma: PrismaService,
  ) {}

  /**
   * Handles the first RAG-based chatbot response generation.
   * Only the first question is answered using RAG, the rest are answered using the dialog prompt.
   * @param question The student's question.
   * @param resStream The response stream to send the chatbot's reply.
   * @param userid The ID of the user asking the question.
   * @param dialogSessionId The ID of the current dialog session.
   */
  async chatBotRagAnswer(
    question: string,
    resStream: Response,
    userid: number,
    dialogSessionId: string,
  ): Promise<void> {
    // Perform similarity search using RAG service
    const tempsimilaritySearchResult =
      await this.ragService.lectureSimilaritySearch(question, 4);
    const similaritySearchResult = this.transformSearchResult(
      tempsimilaritySearchResult,
    );

    let sourceCounter: number = 0;
    let sourceMapDict = {};

    for (const item of similaritySearchResult) {
      sourceCounter++;
      sourceMapDict[sourceCounter.toString()] = item.Quelle;
      item.Quelle = '$$' + sourceCounter.toString() + '$$';
    }

    // Format the prompt for the RAG model
    const ragFormattedPrompt = await finalRAGPrompt.formatPromptValue({
      question: question,
      lectureSnippet: JSON.stringify(similaritySearchResult),
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

    // Save the chatbot's response
    await this.saveChatBotMessage(
      question,
      openAiAnswerWithMarkdownLinks,
      similaritySearchResult,
      userid,
      dialogSessionId,
    );
    resStream.end();
  }

  /**
   * Handles the dialog-based chatbot response generation.
   * @param context The context of the ongoing conversation.
   * @param question The student's question.
   * @param resStream The response stream to send the chatbot's reply.
   * @param userid The ID of the user asking the question.
   * @param dialogSessionId The ID of the current dialog session.
   */
  async chatBotRagAnswerDialog(
    context,
    question: string,
    resStream: Response,
    userid: number,
    dialogSessionId: string,
  ): Promise<void> {
    const chatHistory: string = context
      .slice(0, -2)
      .map(
        (msg) =>
          `## ${msg.role === 'user' ? 'HumanMessage' : 'AIMessage'}\n${
            msg.content
          }`,
      )
      .join('\n');

    // Format the dialog prompt
    const DialogPrompt = await dialogPrompt.formatPromptValue({
      chatHistory: chatHistory,
      question: question,
    });

    // Generate response using the dialog model
    const openAiResponse = await chatStream.generatePrompt(
      [DialogPrompt],
      undefined,
      [
        {
          ignoreAgent: true,
          ignoreChain: true,
          handleLLMNewToken(token: string) {
            resStream.write(token);
          },
        },
        tracer,
      ],
    );

    // Save the chatbot's response
    await this.saveChatBotMessage(
      question,
      openAiResponse.generations[0][0].text,
      null,
      userid,
      dialogSessionId,
    );
    resStream.end();
  }

  /**
   * Transforms the search result into a formatted structure.
   * @param jsonArray The array of transcript chunks.
   * @returns The transformed search result.
   */
  transformSearchResult(jsonArray: TranscriptChunk[]): any[] {
    return jsonArray.map((item) => ({
      Erklärung: item.TranscriptChunkContent,
      Quelle: item.metadata.markdownLink,
    }));
  }

  /**
   * Saves the chatbot message to the database.
   * @param question The question asked by the user.
   * @param response The response generated by the chatbot.
   * @param usedChunks The used chunks from the RAG model.
   * @param userid The ID of the user.
   * @param dialogSessionId The ID of the dialog session.
   */
  private async saveChatBotMessage(
    question: string,
    openAIResponse: any,
    usedChunks: any,
    userid: number,
    dialogSessionId: string,
  ) {
    try {
      await this.prisma.chatBotMessage.create({
        data: {
          question: question,
          answer: openAIResponse,
          usedChunks: dialogSessionId, // using usedChunks field in db for the session ID so we dont need to migrate the db
          isBot: false, // This field might be unnecessary as all messages include both question and answer
          userId: userid,
        },
      });
    } catch (error) {
      console.error('Error saving chatbot message:', error);
    }
  }
}
