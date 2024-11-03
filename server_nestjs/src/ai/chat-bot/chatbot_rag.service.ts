import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Response } from 'express';
import { RagService } from '../services/rag.service';
import { TranscriptChunk } from '@Interfaces/index';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatOpenAI } from "@langchain/openai";
import { ChatBotMessage } from '@Prisma/client';

const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require('langchain/prompts');

const KImodel = 'gpt-4o-2024-08-06';

const llm = new ChatOpenAI({
  modelName: KImodel,
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  streaming: true,
});

// Title generation prompt
const titleGenerationPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Generiere einen kurzen, prägnanten Titel (maximal 30 Zeichen) für diese Chat-Konversation. ' +
    'Der Titel soll das Hauptthema der Unterhaltung widerspiegeln.'
  ),
  HumanMessagePromptTemplate.fromTemplate(
    'Frage: {question}\nAntwort: {answer}'
  ),
]);

const finalRAGPromptAUD = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Das Thema ist Algorithmen und Datenstrukturen. ' +
      // Erläuterungen zu dem Aufbau der Informationen aus RAG
      '# Schritt 1: Erklärung basierend auf der Vorlesung \n' +
      'Bei deiner Antwort beziehst du dich auf relevante Erklärungen aus den Vorlesungsausschnitten und nennst die korrekte Quelle. Du verwendest Markdown-Syntax, um die Antwort übersichtlich zu formatieren.' +
      'Du MUSST IMMER, wenn du eine Erklärung verwendest, die zugehörige Quelle EXAKT und 100% GENAU SO WIE IN DEN BEISPIELEN DIREKT DAHINTER AUSSCHLIEßLICH im Format $$Zahl$$ OHNE weitere "[" oder "Quelle".' +
      'Hier sind Beispiele zur korrekten Zitation. Gehe beim Zitieren genauso vor:\n ' +
      'Beispiel 1: Jede Zeile Code, die zur Funktion gehört, muss um eine Ebene eingerückt sein $$5$$.\n' +
      'Beispiel 2: Denke auch daran, dass die Verkettung von Strings in Python mit dem `+` Operator erfolgt, wie im Vorlesungsausschnitt über Datentypen und Operationen in Python erklärt wird $$2$$.\n' +
      'Beispiel 3: Diese Methoden sollten dann in den abgeleiteten Klassen `Pyramide` und `Kegel` implementiert werden $$1$$.\n' +
      '\n # Hinweis: Zitiere die Erklärungen nicht wortwörtlich, sondern baue sie inhaltlich in deine Antwort ein.' +
      'Falls es zu der Frage oder deiner bisherigen Antwort ein passendes, kurzes Code-Beispiel (z.B. Programmcode C++) gibt, dann füge dieses mit Erklärungen in einfacher Sprache hinzu.',
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

const finalRAGPromptOFP = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Das Thema ist Objektorientierte und funktionale Programmierung. ' +
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
      '2. Wenn die Frage keinen Bezug zur Informatik oder Algorithmen und Datenstrukturen hat, antworte: "Das ist eine interessante Frage, aber leider nicht Teil des Vorlesungsstoffs."',
  ),
]);

const dialogPromptAUD = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Das Thema ist Algorithmen und Datenstrukturen. ' +
      'Du gibst kurze und hilfreiche Antworten auf die Rückfragen der Studenten in einfacher Sprache. Berücksichtige dabei den bisherigen Chatverlauf.' +
      '# Wichtige Anweisungen\n' +
      '1. Wenn die Frage keinen Bezug zur Informatik oder Algorithmen und Datenstrukturen hat, antworte: "Das ist eine interessante Frage, aber leider nicht Teil des Vorlesungsstoffs."',
  ),
  HumanMessagePromptTemplate.fromTemplate(
    '# Chatverlauf\n' +
      '{chatHistory}\n' +
      '# Frage des Studenten:\n' +
      '{question}\n',
  ),
]);

const dialogPromptOFP = ChatPromptTemplate.fromPromptMessages([
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
   * Creates a new chat session and generates a title based on the first message
   * @param question The first question in the session
   * @param answer The first answer in the session
   * @param userId The ID of the user
   * @returns The created session
   */
  private async createChatSession(question: string, answer: string, userId: number) {
    try {
      // Generate title using GPT-4
      const titlePrompt = await titleGenerationPrompt.formatPromptValue({
        question: question,
        answer: answer
      });

      const titleResponse = await llm.generatePrompt([titlePrompt]);
      const sessionTitle = titleResponse.generations[0][0].text.trim();

      // Create new session
      const session = await this.prisma.chatSession.create({
        data: {
          title: sessionTitle,
          userId: userId
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  /**
   * Retrieves all chat sessions for a user
   * @param userId The ID of the user
   * @returns Array of chat sessions with their messages
   */
  async getChatSessions(userId: number) {
    return await this.prisma.chatSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Handles the first RAG-based chatbot response generation.
   * Only the first question is answered using RAG, the rest are answered using the dialog prompt.
   * @param question The student's question.
   * @param userid The ID of the user asking the question.
   * @param dialogSessionId The ID of the current dialog session.
   * @param sessionId Optional ID of an existing chat session
   * @returns The ID of the created message.
   */
  async chatBotRagAnswer(
    question: string,
    userid: number,
    dialogSessionId: string,
    sessionId?: number,
  ): Promise<ChatBotMessage> {
    // Perform similarity search using RAG service
    const tempsimilaritySearchResult =
      await this.ragService.lectureSimilaritySearch(question, 4);
    const similaritySearchResult = this.transformSearchResult(
      tempsimilaritySearchResult,
    );
    let answer = '';

    let sourceCounter: number = 0;
    let sourceMapDict = {};

    for (const item of similaritySearchResult) {
      sourceCounter++;
      sourceMapDict[sourceCounter.toString()] = item.Quelle;
      item.Quelle = '$$' + sourceCounter.toString() + '$$';
    }

    // Format the prompt for the RAG model
    const ragFormattedPrompt = await finalRAGPromptAUD.formatPromptValue({
      question: question,
      lectureSnippet: JSON.stringify(similaritySearchResult),
    });

    let ongoingBuffer = ''; // Buffer to capture potential reference across tokens

    let openAiAnswerWithMarkdownLinks = '';
    const openAiResponse = await llm.generatePrompt(
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
                      answer += replacedText;
                      openAiAnswerWithMarkdownLinks += replacedText;
                    } else {
                      answer += ongoingBuffer;
                      openAiAnswerWithMarkdownLinks += ongoingBuffer;
                    }
                  } else {
                    answer += ongoingBuffer;
                    openAiAnswerWithMarkdownLinks += ongoingBuffer;
                  }

                  ongoingBuffer = ''; // Clear the buffer after processing
                }
              } else {
                // If not buffering, directly write the character to the response stream
                answer += char;
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
                const markdownLink = "(Quelle: " +
                  sourceMapDict[sourceCounter]
                    .replace(/^\^\[/, '') // TEMP FIX TO REPLACE FOOTNOTE LINK WITH NORMAL MARKDOWN LINK
                    .replace(/\]$/, '') +
                  ")";
                const replacedText = markdownLink
                  ? ongoingBuffer.replace(`$$${sourceCounter}$$`, markdownLink)
                  : ongoingBuffer;
                answer += replacedText;
                openAiAnswerWithMarkdownLinks += replacedText;
              } else {
                answer += ongoingBuffer;
                openAiAnswerWithMarkdownLinks += ongoingBuffer;
              }
              ongoingBuffer = ''; // Clear the buffer
            }
          },
        },
      ],
    );

    let session;
    if (!sessionId) {
      // Create new session for first message
      session = await this.createChatSession(question, openAiAnswerWithMarkdownLinks, userid);
    }

    // Save the chatbot's response with session
    const message = await this.saveChatBotMessage(
      question,
      openAiAnswerWithMarkdownLinks,
      similaritySearchResult,
      userid,
      dialogSessionId,
      session?.id || sessionId,
    );

    return message;
  }

  /**
   * Handles the dialog-based chatbot response generation.
   * @param context The context of the ongoing conversation.
   * @param question The student's question.
   * @param userid The ID of the user asking the question.
   * @param dialogSessionId The ID of the current dialog session.
   * @param sessionId The ID of the chat session
   * @returns The ID of the created message.
   */
  async chatBotRagAnswerDialog(
    context,
    question: string,
    userid: number,
    dialogSessionId: string,
    sessionId: number,
  ): Promise<ChatBotMessage> {
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
    const DialogPrompt = await dialogPromptAUD.formatPromptValue({
      chatHistory: chatHistory,
      question: question,
    });

    // Generate response using the dialog model
    const openAiResponse = await llm.generatePrompt(
      [DialogPrompt],
      undefined,
      [
        {
          ignoreAgent: true,
          ignoreChain: true,
          handleLLMNewToken(token: string) {
            //resStream.write(token);
          },
        },
      ],
    );

    // Save the chatbot's response with session
    const message = await this.saveChatBotMessage(
      question,
      openAiResponse.generations[0][0].text,
      null,
      userid,
      dialogSessionId,
      sessionId,
    );
    return message;
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
   * @param sessionId Optional ID of the chat session
   * @returns The ID of the created message.
   */
  private async saveChatBotMessage(
    question: string,
    openAIResponse: any,
    usedChunks: any,
    userid: number,
    dialogSessionId: string,
    sessionId?: number,
  ): Promise<ChatBotMessage> {
    try {
      const createdMessage = await this.prisma.chatBotMessage.create({
        data: {
          question: question,
          answer: openAIResponse,
          usedChunks: dialogSessionId,
          isBot: false,
          userId: userid,
          ratingByStudent: null,
          sessionId: sessionId,
        },
      });
      return createdMessage;
    } catch (error) {
      console.error('Error saving chatbot message:', error);
      throw error;
    }
  }

  /**
   * Saves or updates the rating for a specific chatbot message.
   * @param messageId The ID of the message to be rated.
   * @param rating The rating given by the user (1, 2, or 3).
   * @param userId The ID of the user providing the rating.
   */
  async saveOrUpdateRating(messageId: number, rating: number, userId: number): Promise<void> {
    try {
      await this.prisma.chatBotMessage.update({
        where: { id: messageId },
        data: { ratingByStudent: rating },
      });
    } catch (error) {
      console.error('Error saving or updating rating:', error);
      throw error;
    }
  }
}
