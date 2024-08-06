/* eslint-disable prefer-const */
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
  correct?: boolean;
}
interface McqEvaluation {
  correct?: boolean;
  reasoning?: string;
}
interface McqEvaluations {
  question?: string;
  evaluations?: McqEvaluation[];
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
  modelName: 'gpt-4o-2024-05-13', // other options: 'gpt-4-0314', 'gpt-3.5-turbo'
  openAIApiKey: env.OPEN_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
};

const regenerateLLmconfig = {
  modelName: 'gpt-4o-2024-05-13', // other options: 'gpt-4-0314', 'gpt-3.5-turbo'
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

const systemMsg2 = `Du bist ein Programmierexperte und erstellst Multiple Choice Questions (MCQs) und dazu passende Beschreibungen und Punktzahlen, welche von 1 bis 5 reichen können und symbolisch für den Schwierigkeitsgrad stehen.
Hier eine Beschreibung von Eigenschaften einer MCQ, die in jeden Fall vorhanden sein müssen innerhalb der triple quotes ("""):
"""Beschreibung der wesentlichen 3 Eigenschaften einer MCQ:
1. MCQs bestehen aus einem klaren Fragestamm und mehreren Antwortoptionen, darunter eine richtige Antwort und plausible Distraktoren, um effektives Lernen zu unterstützen.
2. Effektive MCQs testen höhere kognitive Fähigkeiten, indem sie Verständnis, Anwendung und Analyse von Konzepten über Faktenwissen hinaus fordern.
3. Gute MCQs zeichnen sich durch eindeutige Fragen, plausible Distraktoren, die Vermeidung von sprachlichen Verzerrungen und die Fähigkeit aus, höhere Denkprozesse zu prüfen, ohne dass die Antwort erraten werden kann.

Zu den Merkmalen einer gut konstruierten MCQ gehören eindeutige und relevante Fragestellungen, plausible und gleichmäßig überzeugende Distraktoren. Beachte hierbei die folgenden 5 Eigenschaften von Distraktoren:
1. Distraktoren müssen plausibel und herausfordernd für Unkundige sein, um effektiv das Verständnis statt Erkennungsfähigkeit zu prüfen.
2. Sie sollten thematisch zum Fragestamm passen und die Konzentration auf die geprüften Konzepte lenken.
3. Jedes erkennbare Muster, das zur Antwortfindung durch Eliminierung führen könnte, ist zu vermeiden.
4. Distraktoren sollen herausfordernd, aber nicht verwirrend oder irreführend sein, um Klarheit zu bewahren.
5. Sie sollten verschiedene häufige Missverständnisse abdecken, um das Verständnis gründlich zu testen."""
---
Hier eine Liste bereits existierender Multiple Choice Questions, welche nicht widerholt werden dürfen.
Es ist verboten, die bereits existierenden Fragen nur etwas umformuliert erneut vorzuschlagen.
---
Bereits existierende Fragen: {questions}.
---
Erstelle die MCQs ausschließlich zur Thematik und dem jeweiligen Konzept aus der Einführungsverstanstaltung "Objektorientierte und Funktionale Programmierung". Lies das dazugehörige Transkript aufmerksam durch, denn die Multiple Choice Questions müssen mit dem Wissen daraus beantwortet werden können sollen.
Die MCQs müssen aber nicht ausschließlich aus dem Transkript generiert werden, sie dürfen auch aus dem allgemeinen Wissen zu den Themen generiert werden.
Der thematische Teil der objektorientierten Programmierung wird hier anhand der Programmiersprache Java gelehrt. Der thematische Teil der funktionalen Programmierung hingegen eher anhand der Programmiersprache Python.
Beziehe dich immer auf das konkrete Konzept, welches als übergeordnetes Thema dienen soll zu welchem die Fragestellung und die dazugehörigen Antwortmöglichkeiten erstellt werden sollen.
Es ist verboten, bereits existierenden Multiple Choice Questions erneut vorzuschlagen. Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal 2 Sätze. Benutze unbedingt immer die deutsche Sprache.
---
Das dazugehörige Transkript: {transcript}
---
thematisch verwandter Kontext: {context}
---
Anzahl an Antwortmöglichkeiten: {options}
---
Konzept, welches als übergeordnetes Thema dienen soll: {concept}

---
format instructions: {format_instructions}
`
// needs to be altered because llm needs to know what kind of expert he needs to be etc. (example: suggests network related stuff when asking about interfaces in programming languages if not specified in question field in the frontend
const regeneratePrompt = `Du bist ein Programmierexperte und erstellst eine neue auswählbare Antwortmöglichkeit für eine bestehende Multiple Choice Frage. Folgendes Konzept ist das Oberthema zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen wurden:
---
Konzept: {concept}
---
Beachte dabei unter anderem das Transkript des Oberthemas, um neue Antwortmöglichkeiten zu generieren. Beachte ausserdem den thematisch verwandten Kontext, um bessere Antwortmöglichkeiten zu erstellen.
Transkript des Oberthemas: {conceptText}
---
thematisch verwandter Kontext: {completeContext}
---
Es ist verboten bereits vorgeschlagene Antwortmöglichkeiten erneut vorzuschlagen. Nachdem du die neu zu generierende Antwortmöglichkeit und die bereits vorgeschlagenen Antwortmöglichkeiten gelesen hast, liefere mir bitte eine neue.
---
neu zu generierende Antwortmöglichkeit: {option}.
---
Bereits vorgeschlagene Antwortmöglichkeiten: {options}.
---
Die bereits vorgeschlagenen Antwortmöglichkeiten dürfen sich nicht widerholen. Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist.
 Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal 2 Sätze. Benutze unbedingt immer die deutsche Sprache.
---
bestehende Multiple Choice Frage: {question}
---
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

const questionAndAnswerPrompt = `Du bist ein Programmierexperte und erstellst Multiple Choice Questions (MCQs) und dazu passende Beschreibungen und Punktzahlen, welche von 1 bis 5 reichen können und symbolisch für den Schwierigkeitsgrad stehen.
Hier eine Beschreibung von Eigenschaften einer MCQ, die in jeden Fall vorhanden sein müssen innerhalb der triple quotes ("""):
"""Beschreibung der wesentlichen 3 Eigenschaften einer MCQ:
1. MCQs bestehen aus einem klaren Fragestamm und mehreren Antwortoptionen, darunter eine richtige Antwort und plausible Distraktoren, um effektives Lernen zu unterstützen.
2. Effektive MCQs testen höhere kognitive Fähigkeiten, indem sie Verständnis, Anwendung und Analyse von Konzepten über Faktenwissen hinaus fordern.
3. Gute MCQs zeichnen sich durch eindeutige Fragen, plausible Distraktoren, die Vermeidung von sprachlichen Verzerrungen und die Fähigkeit aus, höhere Denkprozesse zu prüfen, ohne dass die Antwort erraten werden kann.

Zu den Merkmalen einer gut konstruierten MCQ gehören eindeutige und relevante Fragestellungen, plausible und gleichmäßig überzeugende Distraktoren. Beachte hierbei die folgenden 5 Eigenschaften von Distraktoren:
1. Distraktoren müssen plausibel und herausfordernd für Unkundige sein, um effektiv das Verständnis statt Erkennungsfähigkeit zu prüfen.
2. Sie sollten thematisch zum Fragestamm passen und die Konzentration auf die geprüften Konzepte lenken.
3. Jedes erkennbare Muster, das zur Antwortfindung durch Eliminierung führen könnte, ist zu vermeiden.
4. Distraktoren sollen herausfordernd, aber nicht verwirrend oder irreführend sein, um Klarheit zu bewahren.
5. Sie sollten verschiedene häufige Missverständnisse abdecken, um das Verständnis gründlich zu testen."""
---
Hier eine Liste bereits existierender Multiple Choice Questions, welche nicht widerholt werden dürfen.
Es ist verboten, die bereits existierenden Fragen nur etwas umformuliert erneut vorzuschlagen.
---
Bereits existierende Fragen: {questions}.
---
Erstelle die MCQs ausschließlich zur Thematik und dem jeweiligen Konzept aus der Einführungsverstanstaltung "Objektorientierte und Funktionale Programmierung". Lies das dazugehörige Transkript aufmerksam durch, denn die Multiple Choice Questions müssen mit dem Wissen daraus beantwortet werden können sollen.
Die MCQs müssen aber nicht ausschließlich aus dem Transkript generiert werden, sie dürfen auch aus dem allgemeinen Wissen zu den Themen generiert werden.
Der thematische Teil der objektorientierten Programmierung wird hier anhand der Programmiersprache Java gelehrt. Der thematische Teil der funktionalen Programmierung hingegen eher anhand der Programmiersprache Python.
Beziehe dich immer auf das konkrete Konzept, welches als übergeordnetes Thema dienen soll zu welchem die Fragestellung und die dazugehörigen Antwortmöglichkeiten erstellt werden sollen.
Es ist verboten, bereits existierenden Multiple Choice Questions erneut vorzuschlagen. Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal 2 Sätze. Benutze unbedingt immer die deutsche Sprache.
---
Das dazugehörige Transkript: {transcript}
---
thematisch verwandter Kontext: {context}
---
Anzahl an Antwortmöglichkeiten: {options}
---
Konzept, welches als übergeordnetes Thema dienen soll: {concept}

---
format instructions: {format_instructions}
`
// To Add: Bigger context if no transcript is found
const questionAndAnswerPrompt2 = `Du bist ein Programmierexperte und hilfst mir dabei eine Frage und dazugehörige Antwortmöglichkeiten, eine Beschreibung und eine Punktzahl für eine Multiple Choice Aufgabe zu erstellen. Die Punktzahl soll dabei von 0 für besonders einfach bis 5 für besonders schwer reichen. Nutze dabei folgendes Konzept:
--------------
Konzept: {concept}
--------------
Dieses Konzept ist das OberThema zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen werden sollen. Denke lange und gut drüber nach, um mit den generierten Fragen den Umfang des Oberthemas gut abzudecken.
Überelege dir zusätzlich bis zu {options} verschiedene Antwortmöglichkeiten auf diese Frage.
--------------
Achte darauf, dass folgende Fragen schon bestehen und du diese nicht erneut vorschlagen darfst. Nimm dir nun erstmal etwas Zeit und lies diese bereits verwendeten Fragen genau durch. Anschließend denke genau nach, du darfst auf keinen Fall nur leicht umformulierte Fragen generieren. Wenn die Frage einen ähnlichen Kern wie eine bereits vorgeschlagene Frage hat, dann denke dir eine neue aus. Wenn die Fragen bisher zu leicht waren, dann denke dir schwerere aus:
--------------
Bereits vorgeschlagene Fragen: {questions}.
--------------
Keine der zuvor beschriebenen Fragen sollen in ihrer Sinnhaftigkeit in die neue Generierung mit aufgenommen werden, also denke hier erneut kurz nach und generiere zur not neue. Schreibe jeweils dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Achte darauf, KEINE AUFZÄHLUNGEN zu verwenden und halte die Antwortmöglichkeiten maximal 2 Sätze lang.
Benutze keine Aufzählungen bei Antworten, die nur ein Wort beinhalten. Bitte antworte auf jeden Fall auf deutsch. Beachte dass die Beschreibung, die du generierst nichts über die Lösung der Fragestellung verraten soll, sondern viel mehr das Thema der Fragestellung beschreibend in einen Kontext setzen soll.
--------------
format instructions: {format_instructions}
`

const evaluationPrompt = `Du bist ein Programmierexperte und bewertest Multiple Choice Questions (MCQs). Bewerte die MCQs anhand folgender Anweisungen:
Anweisungen zur Bewertung innerhalb der triple quotes ("""):
"""
A. Für jede Frage bewertest du, ob die Formulierung gut ist. Eine gute Formulierung ist klar, präzise, nicht zu lang und sofort verständlich.
B. Für jede Antwortoption musst du bewerten, ob diese wahr oder falsch im Kontext der gestellten Frage ist. Solltest du eine als "wahr" gekennzeichnete Antwort für "falsch" halten, begründe deine Entscheidung ausführlich. Gleiches gilt, wenn du eine als "falsch" markierte Antwortoption für "wahr" hältst.
C. Die MCQs müssen thematisch zur universitären Einführungsverstanstaltung "Objektorientierte Programmierung mit Java" und "Funktionale Programmierung mit Python" passen. Die Fragen und Antworten müssen sich auf die spezifischen Konzepte beziehen, die in den Vorlesungen behandelt werden und Fragen zu anderen Programmiersprachen sind nicht zulässig.
D. Die Eigenschaften der MCQ müssen den Vorgaben der Definition entsprechen:
Beschreibung der wesentlichen 3 Eigenschaften einer MCQ:
  1. MCQs bestehen aus einem klaren Fragestamm und mehreren Antwortoptionen, darunter eine richtige Antwort und plausible Distraktoren, um effektives Lernen zu unterstützen.
  2. Effektive MCQs testen höhere kognitive Fähigkeiten, indem sie Verständnis, Anwendung und Analyse von Konzepten über Faktenwissen hinaus fordern.
  3. Gute MCQs zeichnen sich durch eindeutige Fragen, plausible Distraktoren, die Vermeidung von sprachlichen Verzerrungen und die Fähigkeit aus, höhere Denkprozesse zu prüfen, ohne dass die Antwort erraten werden kann.

Zu den Merkmalen einer gut konstruierten MCQ gehören eindeutige und relevante Fragestellungen, plausible und gleichmäßig überzeugende Distraktoren. Beachte hierbei die folgenden 5 Eigenschaften von Distraktoren:
  1. Distraktoren müssen plausibel und herausfordernd für Unkundige sein, um effektiv das Verständnis statt Erkennungsfähigkeit zu prüfen.
  2. Sie sollten thematisch zum Fragestamm passen und die Konzentration auf die geprüften Konzepte lenken.
  3. Jedes erkennbare Muster, das zur Antwortfindung durch Eliminierung führen könnte, ist zu vermeiden.
  4. Distraktoren sollen herausfordernd, aber nicht verwirrend oder irreführend sein, um Klarheit zu bewahren.
  5. Sie sollten verschiedene häufige Missverständnisse abdecken, um das Verständnis gründlich zu testen.
"""
Bewerte weiterhin die gesamte MCQ. Wenn die MCQ nicht den Vorgaben enstpricht, erläutere kurz warum und beziehe dich dabei auf die Anweisungen "A, B, C und D". Danach gib mir Verbesserungsvorschläge.
Ansonsten antworte ausschließlich mit "Gut", "Sehr Gut" oder "Exzellent".

---
MCQ: {question}
---
Antwortoptionen der MCQ: {answers}
---
format instructions: {format_instructions}
`

// not used
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
@Injectable()
export class McqCreationService {
  private pgVectorStore: Promise<PGVectorStore>;
  private folderPath: string;
  private llm = new ChatOpenAI(llmConfig);
  private regenLlm = new ChatOpenAI(regenerateLLmconfig);
  private otherOptions : { [question: string]: string[] } = {};
  private askedQuestions: { [concept: string]: McqGenerationDTO[] } = {};
  private mcqToEvaluate: { [question: string]: string[] } = {};
  private mcqs: { questions: McqGenerationDTO[] } = { questions: [] };
  constructor(private jsonLoaderService : JsonLoaderService) {
    this.pgVectorStore = this.initPgVectorStore();
    this.folderPath = path.join(__dirname, '..', '..', '..', '..', '..', 'shared', 'transcripts');

  }

  /** adds a question and options to the askedQuestions object
   *
   * @param concept
   * @param question
   * @param options
   */
  private addQuestionAndOptions(concept: string, question: string, options: Answer[]) {
    if (!(concept in this.askedQuestions)) {
      this.askedQuestions[concept] = [];
    }

    if (!(this.askedQuestions[concept].some(mcq => mcq.question === question))) {
      const mcqOptions = options ? options.map(option => ({ answer: option.answer, correct: option.correct })) : [];
      this.askedQuestions[concept].push({ question: question, answers: mcqOptions });
    }

  }

  /** adds a question to the askedQuestions object to prevent regenerating duplicates
   *
   * @param concept
   * @param question
   */
  private addQuestion(concept: string, question: string) {
    if (!(concept in this.askedQuestions)) {
      this.askedQuestions[concept] = [];
    }

    if (!(this.askedQuestions[concept].some(mcq => mcq.question === question))) {
      this.askedQuestions[concept].push({ question: question, answers: [] });
    }
  }

  /** replaces an option in the askedQuestions object to prevent regenerating duplicates
   *
   * @param concept
   * @param question
   * @param oldOption
   * @param newOption
   */
  private addOption(concept: string, question: string, newOption: string) {
    if (concept in this.askedQuestions) {
      this.askedQuestions[concept].forEach((mcq: McqGenerationDTO) => {
        if (mcq.question === question) {
          mcq.answers.push({ answer: newOption });
        }
      });
    }
}

  /** adds options to the question in the askedQuestions object to prevent regenerating duplicates
   *
   * @param concept
   * @param question
   * @param options
   */
  private addOptionsToQuestion(concept: string, question: string, options: Answer[]) {
  if (concept in this.askedQuestions) {
    const mcq = this.askedQuestions[concept].find(mcq => mcq.question === question);

    if (mcq) {
      const mcqOptions = options.map(option => ({ answer: option.answer, correct: option.correct }));
      console.log(mcqOptions)
      mcq.answers.push(...mcqOptions);
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
    return /[äöüÄÖÜß]/i.test(concept);
  }

  /**
   *
   * @param concept
   * @returns formattedString without Umlauts
   */
  private replaceUmlauts(concept: string): string {
    return concept.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  }

  /** this function gets all necessary text files (transcripts)
   *
   * @param concept
   * @returns document of the concept if it matches
   */
  public async getFileFromFolder(searchStr: string) {
    if (this.hasUmlauts(searchStr)) {
      searchStr = this.replaceUmlauts(searchStr);
    }

    const searchStrLower = searchStr.toLowerCase();
    const prefixes = ['python_', 'java_'];
    const selectedPrefix = prefixes[Math.floor(Math.random() * prefixes.length)]; // Zufällige Auswahl zwischen 'python_' und 'java_'

    try {
      const files = fs.readdirSync(this.folderPath);
      let matchingFiles = files.filter(file => {
        const lowerCaseFileName = file.toLowerCase();
        // Prüfen, ob der Dateiname den Suchstring enthält und mit dem ausgewählten Präfix beginnt
        return lowerCaseFileName.includes(searchStrLower) && lowerCaseFileName.startsWith(selectedPrefix);
      });

      console.log("Matching files before random selection: ", matchingFiles);

      // Zufällige Auswahl von bis zu 3 Dateien, wenn mehr als 3 übereinstimmen
      if (matchingFiles.length > 3) {
        matchingFiles = matchingFiles.sort(() => 0.5 - Math.random()).slice(0, 3);
      }

      console.log("Matching files after random selection: ", matchingFiles);

      if (matchingFiles.length > 0) {
        // Inhalt aller ausgewählten Dateien zurückgeben
        return matchingFiles.map(file => {
          const filePath = path.join(this.folderPath, file);
          return fs.readFileSync(filePath, 'utf8');
        });
      } else {
        return null;
      }
    } catch (err) {
      console.error("An error occurred: ", err);
      return null;
    }
  }

  /** Called when generating a question title
   * @param concept
   * @returns
   */
  async getQuestionTitle(concept: string): Promise<McqGenerationDTO> {
    this.mcqs = await this.jsonLoaderService.loadJson(concept);
    this.mcqs.questions.forEach(mcq => {
      this.addQuestionAndOptions(concept, mcq.question, mcq.answers)
    });
    console.log("this.askedQuestions: ", this.askedQuestions[concept].map(mcq => mcq.question))

    const parser = StructuredOutputParser.fromZodSchema(z.object({
      question: z.string().describe("Question to the user without answering options"),
    }));
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(concept, 15));
    const conceptContext = await this.getFileFromFolder(concept);
    if(!(conceptContext === null)) {
      const response = await RunnableSequence.from([
      {
        concept: () => concept,
        completeContext: () => completeContext,
        questions: () => this.askedQuestions[concept].map(mcq => mcq.question),
        conceptText:  () =>  conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(questionTitlePrompt),
      this.llm,
      parser,
      ]).invoke({callbacks: [tracer]})

      this.addQuestion(concept, response.question);


      return response;
    } else {
      const response2 = await RunnableSequence.from([
        {
          concept: () => concept,
          conceptText: () => completeContext,
          questions: () => this.askedQuestions[concept].map(mcq => mcq.question),
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(questionTitlePrompt2),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]})
      this.addQuestion(concept, response2.question);

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
      this.addQuestion(concept, question);
      this.addOptionsToQuestion(concept, question, otherOptions.map(option => ({ answer: option})));
    }

    console.log("this.askedQuestions: ", this.askedQuestions[concept].map(mcq => mcq.question))
    console.log("this.otherOptions for: ","QUESTION: " ,this.otherOptions[question].map(option => option))
    const parser = StructuredOutputParser.fromZodSchema(
      z.object(
                {
                  answer: z.string().describe("Answer to the user's question. Dont enumerate"),
                  correct: z.boolean().describe("Indicates if the answer is correct (true/false)"),
                }));
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(question, 10));
    const conceptContext = await this.getFileFromFolder(concept);
    if(!(conceptContext === null)) {
      const response = await RunnableSequence.from([
      {
        option: () => option,
        concept: () => concept,
        options: () => this.askedQuestions[concept].map(mcq => mcq.answers).flat().map(answer => answer.answer),
        question: () => question,
        completeContext: () => completeContext,
        conceptText:  () =>  conceptContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(regeneratePrompt),
      this.regenLlm,
      parser,
      ]).invoke({callbacks: [tracer]})

      this.addOption(concept,question,response.answer);
      console.log("all answers: ", this.askedQuestions[concept].map(mcq => mcq.answers).flat().map(answer => answer.answer))

      return response;
    } else
    {
      const response2 = await RunnableSequence.from([
      {
        option: () => option,
        concept: () => concept,
        options: () => this.askedQuestions[concept].map(mcq => mcq.answers).flat().map(answer => answer.answer),
        question: () => question,
        completeContext: async () => completeContext,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(regeneratePrompt2),
      this.regenLlm,
      parser,
      ]).invoke({callbacks: [tracer]})


      this.addOption(concept,question,response2.answer);

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
            correct: z.boolean().describe("Indicates if the answer is correct (true/false)"),
          })
        ),
        description: z.string().describe("Brief Description of the Question with regards to the Topic/Concept"),
        score: z.number().describe("Score for answering the Question right ranging from 0 for an easy Question to 5 for a hard question. Choose according to the difficulty of the question."),
      })
    )
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(concept, 15));
    const conceptContext = await this.getFileFromFolder(concept);

    if(!(conceptContext === null))
    {
      console.log("result with concept context is fired")
      const contextResult = await RunnableSequence.from([
      {
        options: () => options.toString(),
        concept: () => concept,
        // otherOptions??
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
        this.addOptionsToQuestion(concept, question, [result]);
      });

    return contextResult;

    } else
    {
      console.log("result without concept context is fired")
      const contextResult2 = await RunnableSequence.from([
        {
          options: () => options.toString(),
          concept: () => concept,
          // otherOptions??
          question: () => question,
          completeContext: () => completeContext,
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(systemMsg2),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]});

      contextResult2.answers.forEach(result => {
        this.addOptionsToQuestion(concept, question, [result]);
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
    console.log("askedquestions = undefined?: ", this.askedQuestions[concept] === undefined)

    this.mcqs = await this.jsonLoaderService.loadJson(concept);

    this.mcqs.questions.forEach(mcq => {
      this.addQuestionAndOptions(concept, mcq.question, mcq.answers);
    })

    // parser for formatting the output in the desired way
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        question: z.string().describe("Frage an den Nutzer"),
        answers: z.array(
          z.object({
            answer: z.string().describe("Antworrtmöglichkeit des Nutzers. Keine Aufzählungen"),
            correct: z.boolean().describe("Markiert die Korrektheit der Antwortmöglichkeit (wahr/falsch)"),
          })
        ).optional().default([]),
        description: z.string().describe("Kurze Beschreibung des Themas/Konzepts"),
        score: z.number().describe("Punktzahl für das richtige beantworten der Frage, wo 1 für sehr einfach und 5 für sher schwierig steht. Wähle anhand des Schwierigekeitsgrades."),

      })
    )
    // context retrieval for the question
    const completeContext = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(concept, 15));
    const transcript = await this.getFileFromFolder(concept);

    console.log("loaded questions:", this.askedQuestions[concept].map(mcq => mcq.question));
    if(!(transcript === null)) {
      console.log("result with concept context is fired")

      const result = await RunnableSequence.from([
        {
          concept: () => concept,
          options: () => options,
          context: () => completeContext,
          completeContext: () => completeContext,
          transcript: () => transcript,
          questions: () => this.askedQuestions[concept].map(mcq => mcq.question),
          format_instructions: () => parser.getFormatInstructions(),
        },
        PromptTemplate.fromTemplate(questionAndAnswerPrompt),
        this.llm,
        parser,
      ]).invoke({callbacks: [tracer]});

      this.addQuestionAndOptions(concept, result.question, result.answers);

      return result;
    } else {
      const completeContext2 = formatDocumentsAsString(await (await this.pgVectorStore).similaritySearch(concept, 20));
      console.log("result without concept fired:");
        const result2 = await RunnableSequence.from([
          {
            concept: () => concept,
            options: () => options,
            completeContext: () => completeContext2,
            questions: () => this.askedQuestions[concept].map(mcq => mcq.question),
            //otherOptions: () => this.chosenOptions[concept],
            format_instructions: () => parser.getFormatInstructions(),
          },
          PromptTemplate.fromTemplate(questionAndAnswerPrompt2),
          this.llm,
          parser,
        ]).invoke({callbacks: [tracer]});

        this.addQuestionAndOptions(concept, result2.question, result2.answers);


        return result2;
    }
  }

   /**
  * returns evaluation of given answer options and the reasoning behind its evaluation
  * @param question
  * @param answers
  * @returns
  */
  async getEvaluation(question: string, answers: string[]) : Promise<McqEvaluations> {
    console.log("answers", answers)

    this.mcqToEvaluate[question] = answers
    console.log("mcqtoevaluateanswers: ", this.mcqToEvaluate.answers)
    console.log("mcqtoevaluateanswers: ", this.mcqToEvaluate[question])
    console.log("type of mcqtoevaluateanswers: ", typeof this.mcqToEvaluate.answers)
    console.log("evaluation fired")
    console.log("mcq question: ", question, "and: ", answers)
    console.log("types: ", typeof question, "and: ", typeof answers)
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        question: z.string().describe("Die Frage an den User"),
        evaluations: z.array(
          z.object({
            reasoning: z.string().describe("Eine ausführliche Erklärung dazu, warum diese Antwortmöglichkeit Mit Bezug zur Frage wahr oder falsch ist."),
            correct: z.boolean().describe("Evaluiert, ob die gegebene Antwortmöglichkeit auf die jeweilige Frage korrekt ist (wahr/falsch)"),

          })
        ).optional().default([]),
        commentOnQuality: z.string().describe("Die Bewertung der Gesamtfrage und der Antwortmöglichkeiten als Gut, Sehr Gut oder Exzellent. kurze Begründung für die Bewertung anhand der Anweisungen."),
      })
    )
    const options: string[] = []
    console.log("options: ", options)
    console.log("typeof options: ", typeof options)
    console.log("answers: ", answers)
    console.log("typeof answers: ", typeof answers)
    const result = await RunnableSequence.from([
      {
        question: () => question,
        answers: () => this.mcqToEvaluate[question],
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(evaluationPrompt),
      this.llm,
      parser,
    ]).invoke({callbacks: [tracer]});

    console.log("Evaluation result: ", result)

    return result;

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
    const contextText = await this.getFileFromFolder(concept);
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

    this.addQuestionAndOptions(concept, result.question, result.answers);


    return result;
  }

}
