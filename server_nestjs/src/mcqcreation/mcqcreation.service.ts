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
import { McqGenerationDTO } from '@Interfaces/question.dto';
import { env } from 'process';
import { JsonLoaderService } from './jsonloader.service';
interface Answer{
  answer?: string;
  isCorrect?: boolean;
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
  openAIApiKey: env.OPEN_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
};

const regenerateLLmconfig = {
  modelName: 'gpt-4-1106-preview', // other options: 'gpt-4-0314', 'gpt-3.5-turbo'
  openAIApiKey: env.OPEN_API_KEY,
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
Gesamtkontext: {completeContext}.
--------------
Bitte lies dir den gesamten Kontext genau durch, um eine passende Fragestellung zu generieren. Achte darauf, dass folgende Fragestellungen bereits vorgeschlagen wurden und du diese nicht widerholen sollst:
--------------
Bereits vorgeschlagene Fragen: {questions}.
--------------
Achte zusätzlich darauf, dass du keine Antwortmöglichkeiten mit in deine Antwort reinbringst, es soll nur die Fragestellung sein. Antworte auf jeden Fall auf deutsch.
--------------
format instructions: {format_instructions}
`

const questionTitlePrompt2 = `Du bist ein Programmierexperte und hilfst mir nur dabei eine Fragestellung für eine Multiple Choice Aufgabe zu erstellen. Nutze dabei folgendes Konzept:
--------------
Konzept: {concept}. Dieses Konzept ist das Thema zu dem die Fragestellung vorgeschlagen werden sollen. Hier ist der spezielle Kontext des übergeordneten Themas:
--------------
Oberthema: {conceptText}
--------------
Bitte lies dir den gesamten Kontext genau durch, um eine passende Fragestellung zu generieren. Achte darauf, dass folgende Fragestellungen bereits vorgeschlagen wurden und du diese nicht widerholen sollst:
--------------
Bereits vorgeschlagene Fragen: {questions}
--------------
Achte zusätzlich darauf, dass du keine Antwortmöglichkeiten mit in deine Antwort reinbringst, es soll nur die Fragestellung sein. Antworte auf jeden Fall auf deutsch.
--------------
format instructions: {format_instructions}
`

// needs to be altered because llm needs to know what kind of expert he needs to be etc. (example: suggests network related stuff when asking about interfaces in programming languages if not specified in question field in the frontend
const systemMsg = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten, eine Beschreibung und eine Punktzahl für eine Multiple Choice Aufgabe zu erstellen. Die Punktzahl soll dabei von 0 für besonders einfach bis 5 für besonders schwer reichen. Nutze dabei folgendes Konzept:
----------------
Konzept: {concept}
---------------
Liefere mir bitte genau eine Anzahl von: {options} sich unterscheidenden Antwortmöglichkeiten. Hier ist der spezielle Kontext des Konzepts, also des Oberthemas:
----------------
Oberthema: {conceptText}
----------------
Beachte dabei bitte folgenden Gesamtkontext des Oberthemas:
----------------
Gesamtkontext: {completeContext}
----------------
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten. Bitte schreibe die Antwortmöglichkeit auf jeden Fall auf deutsch. Dies ist die Frage zu der du die Antwortmöglichkeiten vorschlagen sollst:
----------------
Frage: {question}
----------------
format instructions: {format_instructions}
`

const systemMsg2 = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten, eine Beschreibung und eine Punktzahl für eine Multiple Choice Aufgabe zu erstellen. Die Punktzahl soll dabei von 0 für besonders einfach bis 5 für besonders schwer reichen. Nutze dabei folgendes Konzept:
----------------
Konzept: {concept}
---------------
Liefere mir bitte genau eine Anzahl von: {options} sich unterscheidenden Antwortmöglichkeiten. Beachte dabei bitte folgenden Gesamtkontext des Oberthemas:
----------------
Gesamtkontext: {completeContext}
----------------
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten. Bitte schreibe die Antwortmöglichkeit auf jeden Fall auf deutsch. Dies ist die Frage zu der du die Antwortmöglichkeiten vorschlagen sollst:
----------------
Frage: {question}
----------------
format instructions: {format_instructions}
`
// needs to be altered because llm needs to know what kind of expert he needs to be etc. (example: suggests network related stuff when asking about interfaces in programming languages if not specified in question field in the frontend
const regeneratePrompt = `Du bist ein Programmierexperte und hilfst mir dabei eine neue Antwortmöglichkeit für eine bestehende Multiple Choice Aufgabenstellung zu erstellen. Nutze dabei folgendes Konzept:
----------------
Konzept: {concept}
----------------
Beachte dabei den speziellen Kontext des Konzepts, also des Oberthemas: {conceptText}
----------------
und diesen Gesamtkontext: {completeContext}
----------------
und liefere mir bitte eine andere Antwortmöglichkeit für folgende bereits von dir vorgeschlagene Antwortmöglichkeit:
----------------
bereits vorgeschlagene Antwortmöglichkeit: {option}.
----------------
Achte darauf, dass folgende Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst. Lies diese bereits verwendeten Antwortmöglichkeiten genau durch, um keine leicht umformulierten Antwortmöglichkeiten zu generieren:
----------------
Bereits vorgeschlagene Antwortmöglichkeiten: {options}.
----------------
Keine der zuvor beschriebenen Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden. Die Antwortmöglichkeit soll eine Antwort auf die Frage sein, die du bereits vorgeschlagen hast:
----------------
Frage: {question}
----------------
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten. Bitte schreibe die Antwortmöglichkeit auf jeden Fall auf deutsch.
----------------
format instructions: {format_instructions}
`

const regeneratePrompt2 = `Du bist ein Programmierexperte und hilfst mir dabei eine neue Antwortmöglichkeit für eine bestehende Multiple Choice Aufgabenstellung zu erstellen. Nutze dabei folgendes Konzept:
----------------
Konzept: {concept}
----------------
Beachte dabei folgenden Gesamtkontext: {completeContext}
----------------
und liefere mir bitte eine andere Antwortmöglichkeit für folgende bereits von dir vorgeschlagene Antwortmöglichkeit:
----------------
bereits vorgeschlagene Antwortmöglichkeit: {option}.
----------------
Achte darauf, dass folgende Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst. Lies diese bereits verwendeten Antwortmöglichkeiten genau durch, um keine leicht umformulierten Antwortmöglichkeiten zu generieren:
----------------
Bereits vorgeschlagene Antwortmöglichkeiten: {options}.
----------------
Die Antwortmöglichkeit soll eine Antwort auf die Frage sein, die du bereits vorgeschlagen hast:
----------------
Frage: {question}
----------------
Keine der zuvor beschriebenen Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden.
Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten. Bitte schreibe die Antwortmöglichkeit auf jeden Fall auf deutsch.
----------------
format instructions: {format_instructions}
`

const questionAndAnswerPrompt = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten, eine Beschreibung und eine Punktzahl für eine Multiple Choice Aufgabe zu erstellen. Die Punktzahl soll dabei von 0 für besonders einfach bis 5 für besonders schwer reichen. Nutze dabei folgendes Konzept:
--------------
Konzept: {concept}
--------------
Dieses Konzept ist das Thema zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen werden sollen. Beachte dabei folgenden Gesamtkontext:
--------------
Gesamtkontext: {completeContext}
--------------
und liefere mir basierend auf diesem Kontext eine konkrete Fragestellung für die Multiple Choice Aufgabe. Überelege dir zusätzlich bis zu {options} verschiedene Antwortmöglichkeiten auf diese Frage.
--------------
Achte darauf, dass folgende Fragen und Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst. Nimm dir nun erstmal etwas Zeit und lies diese bereits verwendeten Fragen und Antwortmöglichkeiten genau durch. Anschließend denke genau nach, du darfst auf keinen Fall nur leicht umformulierten Fragen oder Antwortmöglichkeiten zu generieren. Wenn die Frage einen ähnlichen Kern wie eine bereits vorgeschlagene Frage hat, dann denke dir eine neue aus und wenn die Fragen bisher zu einfach waren, dann generiere schwerere:
--------------
Bereits vorgeschlagene Fragen: {questions}.
--------------
Keine der zuvor beschriebenen Fragen oder Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden, also denke hier erneut kurz nach und generiere zur not neue. Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten. Bitte antworte auf jeden Fall auf deutsch. Beachte dass die Beschreibung, die du generierst nichts über die Lösung der Fragestellung verraten soll, sondern viel mejr das Thema der Fragestellung beschreiben und in einen Kontext setzen soll.
--------------
format instructions: {format_instructions}
`

const questionAndAnswerPrompt2 = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten, eine Beschreibung und eine Punktzahl für eine Multiple Choice Aufgabe zu erstellen. Die Punktzahl soll dabei von 0 für besonders einfach bis 5 für besonders schwer reichen. Nutze dabei folgendes Konzept:
--------------
Konzept: {concept}
--------------
Dieses Konzept ist das Thema zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen werden sollen. Beachte dabei folgenden Gesamtkontext:
--------------
Gesamtkontext: {completeContext}
--------------
und liefere mir basierend auf diesem Kontext eine konkrete Fragestellung für die Multiple Choice Aufgabe. Überelege dir zusätzlich bis zu {options} verschiedene Antwortmöglichkeiten auf diese Frage.
--------------
Achte darauf, dass folgende Fragen und Antwortmöglichkeiten schon bestehen und du diese nicht erneut vorschlagen darfst. Nimm dir nun erstmal etwas Zeit und lies diese bereits verwendeten Fragen und Antwortmöglichkeiten genau durch. Anschließend denke genau nach, du darfst auf keinen Fall nur leicht umformulierten Fragen oder Antwortmöglichkeiten zu generieren. Wenn die Frage einen ähnlichen Kern wie eine bereits vorgeschlagene Frage hat, dann denke dir eine neue aus und wenn die Fragen bisher zu einfach waren, dann generiere schwerere:
--------------
Bereits vorgeschlagene Fragen: {questions}.
--------------
Keine der zuvor beschriebenen Fragen oder Antwortmöglichkeiten sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden, also denke hier erneut kurz nach und generiere zur not neue. Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten. Bitte antworte auf jeden Fall auf deutsch. Beachte dass die Beschreibung, die du generierst nichts über die Lösung der Fragestellung verraten soll, sondern viel mejr das Thema der Fragestellung beschreiben und in einen Kontext setzen soll.
--------------
format instructions: {format_instructions}
`
// not used yet
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
// not used yet
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
  private folderPath: string;
  private llm = new ChatOpenAI(llmConfig);
  private regenLlm = new ChatOpenAI(regenerateLLmconfig);
  private otherOptions : { [question: string]: string[] } = {};
  private askedQuestions: { [concept: string]: McqGenerationDTO[] } = {};
  constructor(private jsonLoaderService : JsonLoaderService) {
    this.pgVectorStore = this.initPgVectorStore();
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'transcripts');

  }

  private addQuestionAndOptions(concept: string, question: string, options: string[]) {
    if (!(concept in this.askedQuestions)) {
      this.askedQuestions[concept] = [];
    }

    const questionExists = this.askedQuestions[concept].some(mcq => mcq.question === question);

    if (!questionExists) {
      const mcqOptions = options.map(option => ({ answer: option, isCorrect: false }));
      this.askedQuestions[concept].push({ question: question, options: mcqOptions });
    }

  }

  private addQuestion(concept: string, question: string) {
  if (!(concept in this.askedQuestions)) {
    this.askedQuestions[concept] = [];
  }

  const questionExists = this.askedQuestions[concept].some(mcq => mcq.question === question);

  if (!questionExists) {
    this.askedQuestions[concept].push({ question: question, options: [] });
  }
  }

  private replaceOption(concept: string, question: string, oldOption: string, newOption: string) {
  if (concept in this.askedQuestions) {
    this.askedQuestions[concept].forEach((mcq: McqGenerationDTO) => {
      if (mcq.question === question) {
        mcq.options = mcq.options.map(option => option.answer === oldOption ? { ...option, answer: newOption } : option);
      }
    });
  }
  }

  private addOptionsToQuestion(concept: string, question: string, options: string[]) {
  if (concept in this.askedQuestions) {
    const mcq = this.askedQuestions[concept].find(mcq => mcq.question === question);

    if (mcq) {
      const mcqOptions = options.map(option => ({ answer: option, isCorrect: false }));
      mcq.options.push(...mcqOptions);
    }
  }
}

  private initPgVectorStore() {
    return PGVectorStore.initialize(
      new OpenAIEmbeddings({openAIApiKey: env.OPEN_API_KEY}),
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

  /** Called when generating a question title
   * @param concept
   * @returns
   */
  async getQuestionTitle(concept: string): Promise<McqGenerationDTO> {
    const parser = StructuredOutputParser.fromZodSchema(z.object({
      question: z.string().describe("Question to the user without answering options"),
    }));
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(concept, 10));
    const conceptContext = await this.getFileFromFolder(this.folderPath,concept);
    if(!(conceptContext === null)) {
      const response = await RunnableSequence.from([
      {
        concept: () => concept,
        completeContext: () => completeContext,
        questions: () => this.askedQuestions[concept],
        conceptText:  () =>  conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(questionTitlePrompt),
      this.llm,
      parser,
      ]).invoke({callbacks: [tracer]})

      if (!this.askedQuestions[concept].some(questionDto => questionDto.question === response.question)) {
        this.askedQuestions[concept].push(response);
      }


      return response;
    } else {
      const response2 = await RunnableSequence.from([
        {
          concept: () => concept,
          conceptText: () => completeContext,
          questions: () => this.askedQuestions[concept],
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(questionTitlePrompt2),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]})

      if (!this.askedQuestions[concept].some(questionDto => questionDto.question === response2.question)) {
        this.askedQuestions[concept].push(response2);
      }

      return response2;
    }
  }

  /** Called when regenerating one single answer
   * @param question
   * @param option
   * @param otherOptions
   * @returns Answer to the user's question
   */
  async getAnswer(question: string, option: string, otherOptions: string[], concept: string) :Promise<Answer> {
  if (!this.askedQuestions[concept].some(questionDto => questionDto.question === question)) {
    const optionsForQuestion = otherOptions.map(option => ({ answer: option}));
    this.askedQuestions[concept].push({ question: question, options: optionsForQuestion });
  }

    const parser = StructuredOutputParser.fromZodSchema(
      z.object(
                {
                  answer: z.string().describe("Answer to the user's question. Dont enumerate"),
                  isCorrect: z.boolean().describe("Indicates if the answer is correct (true/false)"),
                }));
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(question, 10));
    const conceptContext = await this.getFileFromFolder(this.folderPath,concept);
    if(!(conceptContext === null)) {
      const response = await RunnableSequence.from([
      {
        option: () => option,
        concept: () => concept,
        options: () => {
          const questionDto = this.askedQuestions[concept].find(dto => dto.question === question);
          return questionDto ? questionDto.options : [];
        },
        question: () => question,
        completeContext: () => completeContext,
        conceptText:  () =>  conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(regeneratePrompt),
      this.regenLlm,
      parser,
      ]).invoke({callbacks: [tracer]})

      this.replaceOption(concept, question, option, response.answer);
      return response;
    } else
    {
      const response2 = await RunnableSequence.from([
      {
        option: () => option,
        concept: () => concept,
        options: () => {
          const questionDto = this.askedQuestions[concept].find(dto => dto.question === question);
          return questionDto ? questionDto.options : [];
        },
        question: () => question,
        completeContext: async () => completeContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(regeneratePrompt2),
      this.regenLlm,
      parser,
      ]).invoke({callbacks: [tracer]})
      console.log("response for single answer is: ", response2)
      //this.addOption(concept, response2.answer);
      return response2;
    }

  }

  /** Called when question, concept  and number of options is entered into the frontend
   * @param options
   * @param question
   * @returns all answers to the user's question
   */
  async getAnswers(options: number, question: string, concept: string) :Promise<McqGenerationDTO> {
    //adding question to local data structure for llm to know
    this.addQuestion(concept, question);
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        answers: z.array(
          z.object({
            answer: z.string().describe("Answer to the user's question. Dont enumerate"),
            isCorrect: z.boolean().describe("Indicates if the answer is correct (true/false)"),
          })
        ),
        description: z.string().describe("Brief Description of the Question with regards to the Topic/Concept"),
        score: z.number().describe("Score for answering the Question right ranging from 0 for an easy Question to 5 for a hard question. Choose according to the difficulty of the question."),
      })
    )
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(question, 10));
    const conceptContext = await this.getFileFromFolder(this.folderPath, concept);

    if(!(conceptContext === null))
    {
      console.log("result with concept context is fired")
      const contextResult = await RunnableSequence.from([
      {
        options: () => options.toString(),
        concept: () => concept,
        question: () => question,
        completeContext:  () => completeContext,
        conceptText:  () => conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(systemMsg),
      this.llm,
      parser,
    ]).invoke({callbacks: [tracer]});

    contextResult.answers.forEach(result => {
        this.addOptionsToQuestion(concept, question, [result.answer]);
      });

    return contextResult;

    } else
    {
      console.log("result without concept context is fired")
      const contextResult2 = await RunnableSequence.from([
        {
          options: () => options.toString(),
          concept: () => concept,
          question: () => question,
          completeContext: () => completeContext,
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(systemMsg2),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]});

      contextResult2.answers.forEach(result => {
        this.addOptionsToQuestion(concept, question, [result.answer]);
      });
      console.log("this.chosenOptions: ", this.otherOptions[concept])

      return contextResult2
    }


  }

  /** Called when only  concept and number of options is entered into the frontend
   * @param concept
   * @param options
   * @returns question and answers to the user's question
   */
  async getQuestionAndAnswers(concept: string, options: number) :Promise<McqGenerationDTO> {
    console.log("concept: ", concept)
    console.log("otherOptions: ", options)

  this.jsonLoaderService.loadJson(concept).subscribe((mcqs: { questions: McqGenerationDTO[] }) => {
    mcqs.questions.forEach((mcq: McqGenerationDTO) => {
      if(mcq.options)
      {
        this.addQuestionAndOptions(concept, mcq.question, mcq.options.map(answer => answer.answer));
      }
    });
  });
    let questions = this.askedQuestions[concept].map(mcq => mcq.question);

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
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(concept, 10));
    const conceptText = await this.getFileFromFolder(this.folderPath,concept);

    questions = this.askedQuestions[concept].map(mcq => mcq.question);
    console.log("loaded questions:", questions);
    if(!(conceptText === null)) {
      console.log("result with concept context is fired")

      const result = await RunnableSequence.from([
        {
          concept: () => concept,
          options: () => options ?? 6,
          completeContext: () => completeContext,
          //conceptText: () => conceptText,
          questions: () => questions,
          //otherOptions: () => this.chosenOptions[concept],
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(questionAndAnswerPrompt),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]});

      this.addQuestionAndOptions(concept, result.question, result.answers.map(answer => answer.answer));

      return result;
    } else {
      console.log("result without concept fired:");
        const result2 = await RunnableSequence.from([
          {
            concept: () => concept,
            options: () => options,
            completeContext: () => completeContext,
            questions: () => questions,
            //otherOptions: () => this.chosenOptions[concept],
            format_instructions: () => parser.getFormatInstructions(),
          },
          PromptTemplate.fromTemplate(questionAndAnswerPrompt2),
          this.llm,
          parser,
        ]).invoke({callbacks: [tracer]});

        this.addQuestionAndOptions(concept, result2.question, result2.answers.map(answer => answer.answer));


        return result2;
    }
  }

  //NOT IMPLEMENTED YET: ToDo: creating a chain, which reevaluates the given question and its options and maybe returns changes afterwards
  async getReevaluatedQuestionAndAnswers(question: string, options: string, concept: string) :Promise<McqGenerationDTO> {
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

    this.addQuestionAndOptions(concept, result.question, result.answers.map(answer => answer.answer));


    return result;
  }

  //NOT IMPLEMENTED YET: ToDo: creating a chain, which evaluates the given question and its options and returns reasoning
  async getEvaluation(question: string, concept: string, answers: {answer: string, isCorrect: boolean}[]) : Promise<{evaluations?: {answer?: string, isCorrect?: boolean}[], reasoning?: string}> {
    console.log("evaluation fired")
    console.log("question: ", question)
    console.log("concept: ", concept)
    console.log("answers: ", answers)
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        evaluations: z.array(
          z.object({
            answer: z.string().describe("Evaluation of the Answer with regards to the original question."),
            isCorrect: z.boolean().describe("Evaluates if the answer really is correct for that question"),
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
    return result;

  }
}
