/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {PromptTemplate,} from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { formatDocumentsAsString } from "langchain/util/document";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { PoolConfig } from 'pg';
import { PGVectorStore} from 'langchain/vectorstores/pgvector';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from "langsmith";
import { LangChainTracer } from "langchain/callbacks";
import { el } from '@faker-js/faker';
interface Answer{
  answer?: string;
  correct?: boolean;
}
interface Title {
  question?: string;

}
const client = new Client({
  apiUrl: "https://api.smith.langchain.com",
  apiKey: "ls__f3c8aba313dd43aeb5f85c89487a7652"
});

const tracer = new LangChainTracer({
  projectName: "Tim ",
  client
});


// change to accessing sensitive data from .env(?)
const llmConfig = {
  modelName: 'gpt-4-1106-preview', // other options: 'gpt-4-0314', 'gpt-3.5-turbo'
  openAIApiKey: "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",
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
};
const regenerateLLmconfig = {
  modelName: 'gpt-4-1106-preview', // other options: 'gpt-4-0314', 'gpt-3.5-turbo'
  openAIApiKey: "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",
  temperature: 0.33, // higher Temperature favours the words with lower probability = more creative
  streaming: true
}
// change to accessing sensitive data from .env(?)
const pg_config_lectureTranscripts = {
  // we use the pg_vector plugin for postgres so we can connect all data later in
  postgresConnectionOptions: {
    type: 'postgres',
    host: 'vectordb.bshefl0.bs.informatik.uni-siegen.de', // only accessable from vpn
    port: 3306,
    user: 'root',
    password: 'qzx5vQG9WQ2b35eZUWujPUhVb8xRr', // ToDo: Move to .env
    database: 'vectordb',
  } as PoolConfig,
  tableName: 'langchain_pg_embedding', // all embeddings are stored in this table. Lectures are seperated by collections. Filter by collection ist not used here so we get embeddings from all.
  columns: { // the metadata columns which will be returned with the search result
    idColumnName: 'uuid',
    vectorColumnName: 'embedding',
    contentColumnName: 'document',
    metadataColumnName: 'cmetadata',
  },
};

const questionTitlePrompt = `Du bist ein Programmierexperte und hilfst mir nur dabei eine Fragestellung für eine Multiple Choice Aufgabe zu erstellen. Nutze dabei folgendes Konzept:
--------------
Konzept: {concept}. Dieses Konzept ist das Thema zu dem die Fragestellung vorgeschlagen werden sollen. Hier ist der spezielle Kontext des übergeordneten Themas:
--------------
Oberthema: {conceptText}. Und zusätzlich der Gesamte Kontext zu dem Thema:
--------------
Gesamtkontext: {completeContext}. Bitte lies dir alles an Kontexten genau durch, um eine passende Fragestellung zu generieren. Achte darauf, dass folgende Fragestellungen bereits vorgeschlagen wurden und du diese nicht widerholen sollst:
--------------
Bereits vorgeschlagene Fragen: {questions}.
--------------
Achte zusätzlich darauf, dass du keine Antwortmöglichkeiten mit in deine Antwort reinbringst, es soll nur die Fragestellung sein.
--------------
format instructions: {format_instructions}
`

const questionTitlePrompt2 = `Du bist ein Programmierexperte und hilfst mir nur dabei eine Fragestellung für eine Multiple Choice Aufgabe zu erstellen. Nutze dabei folgendes Konzept:
--------------
Konzept: {concept}. Dieses Konzept ist das Thema zu dem die Fragestellung vorgeschlagen werden sollen. Hier ist der spezielle Kontext des übergeordneten Themas:
--------------
Oberthema: {conceptText}. Bitte lies dir alles an Kontexten genau durch, um eine passende Fragestellung zu generieren. Achte darauf, dass folgende Fragestellungen bereits vorgeschlagen wurden und du diese nicht widerholen sollst:
--------------
Bereits vorgeschlagene Fragen: {questions}.
--------------
Achte zusätzlich darauf, dass du keine Antwortmöglichkeiten mit in deine Antwort reinbringst, es soll nur die Fragestellung sein.
--------------
format instructions: {format_instructions}
`

// needs to be altered because llm needs to know what kind of expert he needs to be etc. (example: suggests network related stuff when asking about interfaces in programming languages if not specified in question field in the frontend
const systemMsg = `Du bist ein Programmierexperte und hilfst dabei sich unterscheidende Antwortmöglichkeiten für eine Multiple Choice Aufgabe zu erstellen.
Liefere mir bitte genau eine Anzahl von: {options} sich unterscheidenden Antwortmöglichkeiten. Hier ist der spezielle Kontext des Konzepts, also des Oberthemas: {conceptText}
Beachte dabei folenden Gesamtkontext.
----------------
Gesamtkontext: {completeContext}
----------------
und schreibe jeweils dazu,  ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang. Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten.
----------------
Frage: {question}
----------------
format instructions: {format_instructions}
`

const systemMsg2 = `Du bist ein Programmierexperte und hilfst dabei sich unterscheidende Antwortmöglichkeiten für eine Multiple Choice Aufgabe zu erstellen.
Liefere mir bitte genau eine Anzahl von: {options} sich unterscheidenden Antwortmöglichkeiten.
Beachte dabei folenden Gesamtkontext: {completeContext}
----------------
und schreibe jeweils dazu,  ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang. Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten.
----------------
Frage: {question}
----------------
format instructions: {format_instructions}
`

// needs to be altered because llm needs to know what kind of expert he needs to be etc. (example: suggests network related stuff when asking about interfaces in programming languages if not specified in question field in the frontend
const regeneratePrompt = `Du bist ein Programmierexperte und hilfst dabei Antwortmöglichkeiten für eine Multiple Choice Aufgabe zu erstellen.
Beachte dabei den speziellen Kontext des Konzepts, also des Oberthemas: {conceptText}
----------------
und diesen Gesamtkontext: {completeContext}
--------------
und liefere mir bitte eine andere Antwortmöglichkeit für folgende
--------------
Antwortmöglichkeit: {option}.
--------------
Achte darauf, dass folgende Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst. Lies diese bereits verwendeten Antwortmöglichkeiten genau durch, um keine leicht umformulierten Antwortmöglichkeiten zu generieren:
--------------
Bereits vorgeschlagene Antwortmöglichkeiten: {options}.
--------------
Keine der zuvor beschriebenen Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden.
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten.
--------------
Frage: {question}
--------------
format instructions: {format_instructions}
`

const regeneratePrompt2 = `Du bist ein Programmierexperte und hilfst dabei Antwortmöglichkeiten für eine Multiple Choice Aufgabe zu erstellen.
Beachte dabei  diesen Gesamtkontext: {completeContext}
--------------
und liefere mir bitte eine andere Antwortmöglichkeit für folgende
--------------
Antwortmöglichkeit: {option}.
--------------
Achte darauf, dass folgende Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst. Lies diese bereits verwendeten Antwortmöglichkeiten genau durch, um keine leicht umformulierten Antwortmöglichkeiten zu generieren:
--------------
Bereits vorgeschlagene Antwortmöglichkeiten: {options}.
--------------
Keine der zuvor beschriebenen Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden.
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten.
--------------
Frage: {question}
--------------
format instructions: {format_instructions}
`

const questionAndAnswerPrompt = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten, eine Beschreibung und eine Punktzahl für eine Multiple Choice Aufgabe zu erstellen. Die Punktzahl soll dabei von 0 für besonders einfach bis 5 für besonders schwer reichen. Nutze dabei folgendes Konzept:
--------------
Konzept: {concept}. Dieses Konzept ist das Thema zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen werden sollen. Hier ist der spezielle Kontext des Konzepts, also des Oberthemas: {conceptText}
--------------
Beachte dabei folgenden Gesamtkontext: {completeContext}
--------------
und liefere mir basierend auf diesem Kontext eine konkrete Fragestellung für die Multiple Choice Aufgabe. Überelege dir zusätzlich bis zu {options} verschiedene Antwortmöglichkeiten auf diese Frage.
--------------
Achte darauf, dass folgende Fragen und Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst. Lies diese bereits verwendeten Fragen und Antwortmöglichkeiten genau durch, um keine leicht umformulierten Fragen oder Antwortmöglichkeiten zu generieren:
--------------
Bereits vorgeschlagene Fragen: {questions}.
und bereits vorgeschlagene Antwortmöglichkeiten: {otherOptions}.
--------------
Keine der zuvor beschriebenen Fragen oder Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden.
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten.
--------------
format instructions: {format_instructions}
`

const questionAndAnswerPrompt2 = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten für eine Multiple Choice Aufgabe zu folgendem Konzept erstellen.
--------------
Konzept: {concept}. Dieses Konzept ist das Thema zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen werden sollen.
--------------
Beachte dabei folgenden Kontext: {completeContext}
--------------
und liefere mir basierend auf diesem Kontext eine konkrete Fragestellung für die Multiple Choice Aufgabe. Überelege dir zusätzlich bis zu {options} verschiedene Antwortmöglichkeiten auf diese Frage.
--------------
Achte darauf, dass folgende Fragen und Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst.Lies diese bereits verwendeten Fragen und Antwortmöglichkeiten genau durch, um keine leicht umformulierten Fragen oder Antwortmöglichkeiten zu generieren:
--------------
Bereits vorgeschlagene Fragen: {questions}.
und bereits vorgeschlagene Antwortmöglichkeiten: {otherOptions}.
--------------
Keine der zuvor beschriebenen Fragen oder Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden.
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten.
--------------
format instructions: {format_instructions}
`
// not yet used
const reevaluationPrompt = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten für eine Multiple Choice Aufgabe zu bewerten und zu verbessern.
--------------
Folgendes Konzept ist das Thema zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen wurden: {concept}. Hier ist der spezielle Kontext des Konzepts, also des Oberthemas: {conceptText}
--------------
Der Kontext zu dieser Frage ergibt sich aus der Fragestellung und lautet: {completeContext}
--------------
Die Fragestellung lautet: {question}
--------------
Die Antwortmöglichkeiten lauten: {options}
--------------
Bewerte bitte die Fragestellung und die Antwortmöglichkeiten und schlage gegebenenfalls Verbesserungen vor.
Solltest du Verbesserungen vorschlagen, achte darauf, dass diese Verbesserungen sinnvoller sind als zuvor und nicht bereits vorgeschlagen wurden.
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten.
Gib zusätzlich eine Begründung dafür an, weshalb du die Frage und/oder Antwortmöglichkeiten verändert hast.
--------------
format instructions: {format_instructions}
`
// not yet used
const evaluationPrompt = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und die dazugehörigen Antwortmöglichkeiten für eine Multiple Choice Aufgabe zu bewerten. Du bekommst eine Frage und die dazugehörigen Antwortmöglichkeiten samt der Information, ob diese Antwortmöglichkeiten für die Frage als "wahr" oder "falsch" oder markiert wurden.
Du sollst nun bewerten, ob die Angabe "wahr" oder "falsch" für die jeweilige Antwortmöglichkeit korrekt ist.
--------------
Folgendes Konzept ist dabei das Oberthema:{concept}. Hier ist der spezielle Kontext des Konzepts, also des Oberthemas: {conceptText}
--------------
Der Kontext zu dieser Frage ergibt sich aus der Fragestellung und lautet: {completeContext}
--------------
Bewerte für folgende
Frage: {question}
die bestehenden Antwortmöglichkeiten: {answers}
--------------
Bewerte bitte die Antwortmöglichkeiten und begründe deine Bewertung.
Wenn eine als "wahr" markierte Antwortmöglichkeit deiner Meinung nach "falsch" ist, dann erkläre warum.
Wenn eine als "falsch" markierte Antwortmöglichkeit deiner Meinung nach "wahr" ist, dann erkläre ebenfalls warum.
format instructions: {format_instructions}
`
@Injectable()
export class McqCreationService {
  private pgVectorStore: Promise<PGVectorStore>;
  private folderPath: any;
  private llm = new ChatOpenAI(llmConfig);
  private regenLlm = new ChatOpenAI(regenerateLLmconfig);
  private chosenOptions : string[] = []
  private askedQuestions : string[] = []
  constructor() {
    this.pgVectorStore = this.intitPgVectorStore();
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'transcripts');
    console.log(`Folder path: ${this.folderPath}`);
  }

  private intitPgVectorStore() {
    return PGVectorStore.initialize(
      new OpenAIEmbeddings({openAIApiKey: process.env.OPEN_API_KEY}),
      pg_config_lectureTranscripts,
    );
  }

  /**
   *
   * @param concept
   * @returns if concept has Umlauts
   */
  private hasUmlauts(concept: string): boolean {
    return /[äöüÄÖÜß]/.test(concept);
  }

  /**
   *
   * @param concept
   * @returns formattedString without Umlauts
   */
  private replaceUmlauts(concept: string): string {
    return concept.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  }

  /**
   * this function manages to get all necessary text files as complete context for answering the question
   * @param concept
   * @returns document of the concept if it matches
   */
  private async getFileFromFolder(folderPath: string, searchStr: string): Promise<string[] | null> {

    if(this.hasUmlauts(searchStr)) {
      searchStr = this.replaceUmlauts(searchStr);
    }

    let searchWords: string[];
    const mainWords = ['python', 'java']; // Hauptwörter für die Suche
    const searchStrLower = searchStr.toLowerCase();

    // Überprüfen, ob der Suchstring 'Python' oder 'Java' enthält
    if (mainWords.some(word => searchStrLower.includes(word))) {
      const terms = searchStr.split(/[\s/]+/)
                          .map(word => word.trim().toLowerCase())
                          .filter(word => word !== 'mit');

      // Erzeugen von Suchbegriffen, die das Hauptwort und die anderen Begriffe kombinieren
      searchWords = terms.flatMap(term =>
        mainWords.includes(term) ? [] : mainWords.map(mainWord => mainWord + '_' + term)
      );
    } else {
      // Aufteilen des Suchstrings in einzelne Wörter
      searchWords = searchStr.split(/[\s/]+/)
                              .map(word => word.trim().toLowerCase())
                              .filter(word => word !== '');
    }

    console.log("Search words: ", searchWords)
    console.log("Folder path: ", folderPath)

    try {
      const files = fs.readdirSync(folderPath);
      const matchingFiles = files.filter(file => {
        const lowerCaseFileName = path.basename(file, '.txt').toLowerCase();
        // Prüfen, ob der Dateiname einen der Suchbegriffe enthält
        return searchWords.some(word => lowerCaseFileName.includes(word));
      });

      console.log("Matching files: ", matchingFiles)

      if (matchingFiles.length > 0) {
        // Inhalt aller übereinstimmenden Dateien zurückgeben
        return matchingFiles.map(file => {
          const filePath = path.join(this.folderPath, file);
          return fs.readFileSync(filePath, 'utf8');
        });
      } else {
        return null;
      }
    } catch (err) {
      console.log("Error stack: ", err.stack);
      return null;
    }
  }

  async getQuestionTitle(concept: string): Promise<Title> {
    const parser = StructuredOutputParser.fromZodSchema(z.object({
      question: z.string().describe("Question to the user without answering options"),
    }));
    const context = await (await this.pgVectorStore).similaritySearch(concept, 10);
    const completeContext = formatDocumentsAsString(context);
    const conceptContext = await this.getFileFromFolder(this.folderPath,concept);
    if(!(conceptContext === null)) {
      const response = await RunnableSequence.from([
      {
        concept: () => concept,
        completeContext: () => completeContext,
        questions: () => this.askedQuestions,
        conceptText:  () =>  conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(questionTitlePrompt),
      this.llm,
      parser,
      ]).invoke({callbacks: [tracer]})

      if(!this.askedQuestions.includes(response.question)){
        this.askedQuestions.push(response.question)
      }
      console.log(this.askedQuestions)

      return response;
    } else {
      const response2 = await RunnableSequence.from([
        {
          concept: () => concept,
          completeContext: () => completeContext,
          questions: () => this.askedQuestions,
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(questionTitlePrompt2),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]})

      if(!this.askedQuestions.includes(response2.question)){
        this.askedQuestions.push(response2.question)
      }
      console.log(this.askedQuestions)
      return response2;
    }
  }

  /**
   * @param question
   * @param option
   * @param otherOptions
   * @returns Answer to the user's question
   */
  async getAnswer(question: string, option: string, otherOptions: string, concept: string) :Promise<Answer> {
    console.log("otherOptions: ", otherOptions)
    console.log("this.chosenOptions: ", this.chosenOptions)
    const parser = StructuredOutputParser.fromZodSchema(
      z.object(
                {
                  answer: z.string().describe("Answer to the user's question. Dont enumerate"),
                  correct: z.boolean().describe("Indicates if the answer is correct (true/false)"),
                }));
    const context = await (await this.pgVectorStore).similaritySearch(question, 10);
    const completeContext = formatDocumentsAsString(context);
    const conceptContext = await this.getFileFromFolder(this.folderPath,concept);
    if(!(conceptContext === null)) {
      const response = await RunnableSequence.from([
      {
        option: () => option,
        options: () => this.chosenOptions,
        question: () => question,
        completeContext: () => completeContext,
        conceptText:  () =>  conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(regeneratePrompt),
      this.regenLlm,
      parser,
      ]).invoke({callbacks: [tracer]})


      console.log("option: ", option)
      if(!this.chosenOptions.includes(response.answer)){
        this.chosenOptions.push(response.answer)
      }
      return response;
    } else
    {
      const response2 = await RunnableSequence.from([
      {
        option: () => option,
        options: () => this.chosenOptions,
        question: () => question,
        completeContext: async () => completeContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(regeneratePrompt2),
      this.regenLlm,
      parser,
      ]).invoke({callbacks: [tracer]})
      console.log("option: ", option)
      console.log("response for single answer is: ", response2)
      if(!this.chosenOptions.includes(response2.answer)){
        this.chosenOptions.push(response2.answer)
      }
      return response2;
    }

  }

  /**
   * @param options
   * @param question
   * @returns all answers to the user's question
   */
  async getAnswers(options: number, question: string, concept: string) :Promise<Answer[]> {

    console.log("question: ", question)

    const parser = StructuredOutputParser.fromZodSchema(z.array(z.object({
      answer: z.string().describe("Answer to the user's question. Dont enumerate"),
      correct: z.boolean().describe("Indicates if the answer is correct (true/false)"),
    })));

    const context = await (await this.pgVectorStore).similaritySearch(question, 10);
    const completeContext = formatDocumentsAsString(context);
    const conceptContext = await this.getFileFromFolder(this.folderPath, concept);

    if(!(conceptContext === null))
    {
      console.log("result with concept context is fired")
      const contextResult = await RunnableSequence.from([
      {
        options: () => options.toString(),
        question: () => question,
        completeContext:  () => completeContext,
        conceptText:  () => conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(systemMsg),
      this.llm,
      parser,
    ]).invoke({callbacks: [tracer]});
    contextResult.forEach(result => {
        if(!this.chosenOptions.includes(result.answer)){
          this.chosenOptions.push(result.answer)
        }
      });
    return contextResult;
    } else
    {
      console.log("result without concept context is fired")
      const contextResult2 = await RunnableSequence.from([
        {
          options: () => options.toString(),
          question: () => question,
          completeContext: () => completeContext,
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(systemMsg2),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]});

      contextResult2.forEach(result => {
        if(!this.chosenOptions.includes(result.answer)){
          this.chosenOptions.push(result.answer)
        }
      });
      console.log("this.chosenOptions: ", this.chosenOptions)
      return contextResult2;
    }


  }

  /**
   * @param concept
   * @param options
   * @returns question and answers to the user's question
   */
  async getQuestionAndAnswers(concept: string, options: number) :Promise<{question: string, answer: Answer[], description: string, score: number}> {
    const Path = path.join(__dirname, '../../../shared/transkripte');
    console.log(`Folder path: ${Path}`);
    console.log("concept: ", concept)
    console.log("otherOptions: ", options)
    // parser for formatting the output in the desired way
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        question: z.string().describe("Question to the user"),
        answers: z.array(
          z.object({
            answer: z.string().describe("Answer to the user's question. Dont enumerate"),
            correct: z.boolean().describe("Indicates if the answer is correct (true/false)"),
          })
        ).optional().default([]),
        description: z.string().describe("Brief Description of the Question with regards to the Topic/Concept"),
        score: z.number().describe("Score for answering the Question right ranging from 0 for an easy Question to 5 for a hard question. Choose according to the difficulty of the question."),

      })
    )
    // context retrieval for the question
    const context = await (await this.pgVectorStore).similaritySearch(concept, 10);
    console.log("context: ", context)

    const completeContext = formatDocumentsAsString(context);
    console.log("completeContext: ", completeContext)

    const conceptText = await this.getFileFromFolder(this.folderPath,concept);
    console.log("conceptText: ", conceptText)

    if(!(conceptText === null)) {
      console.log("conceptlength:", conceptText.length)
      console.log("result with concept context is fired")

      const result = await RunnableSequence.from([
        {
          concept: () => concept,
          options: () => options ?? 6,
          completeContext: () => completeContext,
          conceptText: () => conceptText,
          questions: () => this.askedQuestions,
          otherOptions: () => this.chosenOptions,
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(questionAndAnswerPrompt),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]});

      console.log("result with concept: ", result)


      if(!this.askedQuestions.includes(result.question)){
        this.askedQuestions.push(result.question)
      }
      result.answers.forEach(result => {
        if(!this.chosenOptions.includes(result.answer)){
          this.chosenOptions.push(result.answer)
        }
      });
      console.log("this.chosenOptions: ", this.chosenOptions)
      console.log("this.askedQuestions: ", this.askedQuestions)

      return {
        question: result.question,
        answer: result.answers,
        description: result.description,
        score: result.score,
      };
    } else {
      console.log("result without concept is fired");
        const result2 = await RunnableSequence.from([
          {
            concept: () => concept,
            options: () => options,
            completeContext: () => completeContext,
            questions: () => this.askedQuestions,
            otherOptions: () => this.chosenOptions,
            format_instructions: () => parser.getFormatInstructions(),
          },
          PromptTemplate.fromTemplate(questionAndAnswerPrompt2),
          this.llm,
          parser,
        ]).invoke({callbacks: [tracer]});
        console.log("result without concept: ", result2)
        if(!this.askedQuestions.includes(result2.question)){
          this.askedQuestions.push(result2.question)
        }
        result2.answers.forEach(result => {
          if(!this.chosenOptions.includes(result.answer)){
            this.chosenOptions.push(result.answer)
          }
        });
        console.log("this.chosenOptions: ", this.chosenOptions)
        console.log("this.askedQuestions: ", this.askedQuestions)
        return {
          question: result2.question,
          answer: result2.answers,
          description: result2.description,
          score: result2.score,
        };
    }



  }

  //ToDo: creating a chain, which reevaluates the given question and its options and maybe returns changes afterwards
  async getReevaluatedQuestionAndAnswers(question: string, options: string, concept: string) :Promise<{question: string, answer: Answer[], reasoning: string}> {
    console.log("reevaluation fired")
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        question: z.string().describe("Question to the user"),
        answers: z.array(
          z.object({
            answer: z.string().describe("Answer to the user's question. No Enumerations"),
            correct: z.boolean().describe("Indicates if the answer is correct (true/false)"),
          })
        ).optional().default([]),
        reasoning: z.string().describe("Reasoning for the change of the question and/or answer"),
      })
    )

    const context = await (await this.pgVectorStore).similaritySearch(question, 10);
    const completeContext = formatDocumentsAsString(context);
    const contextText = await this.getFileFromFolder(this.folderPath,concept);
    console.log("context: ", context)
    const result = await RunnableSequence.from([
      {
        concept: () => concept,
        completeContext: () => completeContext,
        contextText: () => contextText,
        question: () => question,
        answers: () => options,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(reevaluationPrompt),
      this.llm,
      parser,
    ]).invoke({callbacks: [tracer]});
    console.log("result: ", result)
    if(!this.askedQuestions.includes(result.question)){
      this.askedQuestions.push(result.question)
    }
    result.answers.forEach(result => {
      if(!this.chosenOptions.includes(result.answer)){
        this.chosenOptions.push(result.answer)
      }
    });
    console.log("this.chosenOptions: ", this.chosenOptions)
    console.log("this.askedQuestions: ", this.askedQuestions)
    return {
      question: result.question,
      answer: result.answers,
      reasoning: result.reasoning,
    } ;
  }

  //ToDo: creating a chain, which evaluates the given question and its options and returns reasoning
  async getEvaluation(question: string, concept: string, answers: {answer: string, correct: boolean}[]) : Promise<{answer: Answer[], reasoning:string}> {
    console.log("evaluation fired")
    console.log("question: ", question)
    console.log("concept: ", concept)
    console.log("answers: ", answers)
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        evaluations: z.array(
          z.object({
            answer: z.string().describe("Evaluation of the Answer with regards to the original question."),
            correctness: z.boolean().describe("Evaluates if the answer really is correct for that question"),
          })
        ).optional().default([]),
        reasoning: z.string().describe("Reasoning for the evaluations of the answers"),
      })
    )
    const context = await (await this.pgVectorStore).similaritySearch(question, 10);
    const completeContext = formatDocumentsAsString(context);
    const contextText = await this.getFileFromFolder(this.folderPath,concept);
    const result = await RunnableSequence.from([
      {
        concept: () => concept,
        completeContext: () => completeContext,
        conceptText: () => contextText,
        question: () => question,
        answers: () => answers,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(evaluationPrompt),
      this.llm,
      parser,
    ]).invoke({callbacks: [tracer]});

    console.log("Evaluation result: ", result)
    return {
      answer: result.evaluations,
      reasoning: result.reasoning,
    } ;

  }
}
