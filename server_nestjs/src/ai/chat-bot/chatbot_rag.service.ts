import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Response } from 'express';
import { LangChainTracer } from 'langchain/callbacks';
import { Client } from 'langsmith';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RagService } from '../services/rag.service';
import { TranscriptChunk } from '@Interfaces/index';

// IMPORTANT: THIS IS OUTDATED !!!
// THIS API ENDPOINT IS DISABLED AND THIS CODE NEEDS TO BE UPDATED WITH CURRENT LECTURE LINKER CODE !!!
const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require('langchain/prompts');

const KImodel = 'gpt-4-1106-preview';

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
  projectName: 'GOALS',
  client,
});

const finalRAGPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung und du kannst sehr gut erklären. Die Studenten sollen die Grundlagen für Python und Java lernen. Das Thema ist Objektorientierte und funktionale Programmierung. ' +
      // Erläuterungen zu dem Aufbau der Informationen aus RAG
      'Bei deinem Feedback beziehst du dich IMMER auf Erklärungen aus den Vorlesungsausschnitten und nennst die korrekte Quelle. Diese liegen im folgenden JSON-Array vor mir jeweils Paaren aus Erklärung und Quelle.' +
      'Du MUSST IMMER wenn du eine Erklärung verwendest, die zugehörige Quelle EXAKT und 100% KORREKT DIREKT DAHINTER angeben! Die Zeichen ^ und [] dürfen dabei NIEMALS vergessen werden!' +
      'Hier ein korrektes Beispiel dazu: ' +
      'Beispiel 1: Jede Zeile Code, die zur Funktion gehört, muss um eine Ebene eingerückt sein. Schau dir dazu noch einmal den Abschnitt zur Python Syntax in der Vorlesung an, um dich mit den Einrückungsregeln vertraut zu machen ^[[Python_Kontrollstrukturen_if_else_Code-Beispiel bei 00:02:12](/video?fileName=Python_Kontrollstrukturen_if_else_Code-Beispiel&timeStamp=00:02:12,000)] ' +
      'Beispiel 2: Denke auch daran, dass die Verkettung von Strings in Python mit dem `+` Operator erfolgt, wie im Vorlesungsausschnitt über Datentypen und Operationen in Python erklärt wird: ^[[Python_Datentypen_Umwandeln bei 00:02:31](/video?fileName=Python_Datentypen_Umwandeln&timeStamp=00:02:31,000)].',
  ),
  HumanMessagePromptTemplate.fromTemplate(
    '# Frage des Studenten:\n{question}\n' +
      '# Ausschnitt aus der Vorlesung:\n' +
      '{lectureSnippet}\n' +
      '# Wichtige Anweisung\n' +
      'Verweise immer auf die Erklärungen auf den Vorlesungsausschnitten exakt so wie beschrieben! Die Zeichen ^ und [] dürfen dabei NIEMALS vergessen werden!',
  ),
]);

@Injectable()
export class ChatBotRAGService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private ragService: RagService,
  ) {}

  async chatBotRagAnswer(question: string, resStream: Response): Promise<void> {

    const tempsimilaritySearchResult = await this.ragService.lectureSimilaritySearch(
      question,
      6,
    );

    const similaritySearchResult = this.transformSearchResult(
      tempsimilaritySearchResult,
    );
    console.log(JSON.stringify(similaritySearchResult));

    const ragFormattedPrompt = await finalRAGPrompt.formatPromptValue({
      question: question,
      lectureSnippet:  JSON.stringify(similaritySearchResult),
    });
    const openAiResponse = await chatStream.generatePrompt(
      [ragFormattedPrompt],
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
    console.log(openAiResponse);

    resStream.end();
  }

  transformSearchResult(jsonArray: TranscriptChunk[]): any[] {
    return jsonArray.map(item => ({
      Erklärung: item.TranscriptChunkContent,
      Quelle: item.metadata.markdownLink
    }));
  }
}
