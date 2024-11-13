/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from "langchain/chat_models/openai";
import {PromptTemplate,} from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { McqGenerationDTO } from '@Interfaces/question.dto';
import { env } from 'process';
import { RagService } from '@/ai/services/rag.service';
import { TranscriptChunk } from '@Interfaces/file.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { encode, decode } from 'gpt-3-encoder'; // Install if necessary
import { HumanMessage } from '@langchain/core/messages';

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


// change to accessing sensitive data from .env(?)
const llmConfig = {
  modelName: 'gpt-4o-2024-08-06', // other options: 'gpt-4-0314', 'gpt-3.5-turbo'
  openAIApiKey: env.OPEN_API_KEY,
  temperature: 0, // Low Temperature favours the words with higher probability = less creative
  streaming: true
};

const regenerateLLmconfig = {
  modelName: 'gpt-4o-2024-08-06', // other options: 'gpt-4-0314', 'gpt-3.5-turbo'
  openAIApiKey: env.OPEN_API_KEY,
  temperature: 0.66, // higher Temperature favours the words with lower probability = more creative
  streaming: true
}

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

const answersPrompt = `Du bist ein Programmierexperte und erstellst Multiple Choice Questions (MCQs) und dazu passende Beschreibungen und Punktzahlen, welche von 1 bis 5 reichen können und symbolisch für den Schwierigkeitsgrad stehen.
Hier eine Beschreibung von Eigenschaften einer MCQ, die in jeden Fall vorhanden sein m��ssen innerhalb der triple quotes ("""):
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
Bereits existierende Fragen: {question}.
---
Erstelle die MCQs ausschließlich zur Thematik und dem jeweiligen Konzept aus der Einführungsverstanstaltung "Algorithmen und Datenstrukturen". Lies das dazugehörige Transkript aufmerksam durch, denn die Multiple Choice Questions müssen mit dem Wissen daraus beantwortet werden können sollen.
Die MCQs müssen aber nicht ausschließlich aus dem Transkript generiert werden, sie dürfen auch aus dem allgemeinen Wissen zu den Themen generiert werden.
Der praktische Teil wird hier anhand der Programmiersprache C++ gelehrt.
Beziehe dich immer auf das konkrete Konzept, welches als übergeordnetes Thema dienen soll zu welchem die Fragestellung und die dazugehörigen Antwortmöglichkeiten erstellt werden sollen.
Es ist verboten, bereits existierenden Multiple Choice Questions erneut vorzuschlagen. Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal 2 Sätze. Benutze unbedingt immer die deutsche Sprache.
---
Das dazugehörige Transkript: {transcript}
---
thematisch verwandter Kontext: {similaritySearchResults}
---
Anzahl an Antwortmöglichkeiten: {options}
---
Konzept, welches als übergeordnetes Thema dienen soll: {concept}
---
format instructions: {format_instructions}
`

const answersPrompt2 = `Du bist ein Programmierexperte und erstellst Multiple Choice Questions (MCQs) und dazu passende Beschreibungen und Punktzahlen, welche von 1 bis 5 reichen können und symbolisch für den Schwierigkeitsgrad stehen.
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
Frage, zu welcher die Antwortmöglichkeiten generiert werden: {question}.
---
Erstelle die MCQs ausschließlich zur Thematik und dem jeweiligen Konzept aus der Einführungsverstanstaltung "Algorithmen und Datenstrukturen". Lies das dazugehörige Transkript aufmerksam durch, denn die Multiple Choice Questions müssen mit dem Wissen daraus beantwortet werden können sollen.
Die MCQs müssen aber nicht ausschließlich aus dem Transkript generiert werden, sie dürfen auch aus dem allgemeinen Wissen zu den Themen generiert werden.
Der praktische Teil wird hier anhand der Programmiersprache C++ gelehrt.
Beziehe dich immer auf das konkrete Konzept, welches als übergeordnetes Thema dienen soll zu welchem die Fragestellung und die dazugehörigen Antwortmöglichkeiten erstellt werden sollen.
Es ist verboten, bereits existierenden Multiple Choice Questions erneut vorzuschlagen. Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal 2 Sätze. Benutze unbedingt immer die deutsche Sprache.
---
thematisch verwandter Kontext: {similaritySearchResults}
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
Transkript des Oberthemas: {transcript}
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
Bereits existierende Fragen: {existingQuestions}.
---
Erstelle die MCQs ausschließlich zur Thematik und dem jeweiligen Konzept aus der Einführungsverstanstaltung "Algorithmen und Datenstrukturen". Lies das dazugehörige Transkript aufmerksam durch, denn die Multiple Choice Questions müssen mit dem Wissen daraus beantwortet werden können sollen.
Die MCQs müssen aber nicht ausschließlich aus dem Transkript generiert werden, sie dürfen auch aus dem allgemeinen Wissen zu den Themen generiert werden.
Der praktische Teil der Programmierung wird hier anhand der Programmiersprache C++ gelehrt.
Beziehe dich immer auf das konkrete Konzept, welches als übergeordnetes Thema dienen soll zu welchem die Fragestellung und die dazugehörigen Antwortmöglichkeiten erstellt werden sollen.
Es ist verboten, bereits existierenden Multiple Choice Questions erneut vorzuschlagen. Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal 2 Sätze. Benutze unbedingt immer die deutsche Sprache.
---
Die gewünschte Thematik der Frage: {topic}
---
Das dazugehörige Transkript: {transcript}
---
thematisch verwandter Kontext: {similaritySearchResults}
---
Anzahl an Antwortmöglichkeiten: {options}
---
Konzept, welches als übergeordnetes Thema dienen soll: {concept}
---
format instructions: {format_instructions}
`

const questionAndAnswerPrompt2 = `Du bist ein Programmierexperte und erstellst Multiple Choice Questions (MCQs) und dazu passende Beschreibungen und Punktzahlen, welche von 1 bis 5 reichen können und symbolisch für den Schwierigkeitsgrad stehen.
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
Erstelle die MCQs ausschließlich zur Thematik und dem jeweiligen Konzept aus der Einführungsverstanstaltung "Algorithmen und Datenstrukturen". Lies das dazugehörige Transkript aufmerksam durch, denn die Multiple Choice Questions müssen mit dem Wissen daraus beantwortet werden können sollen.
Die MCQs müssen aber nicht ausschließlich aus dem Transkript generiert werden, sie dürfen auch aus dem allgemeinen Wissen zu den Themen generiert werden.
Der praktische Teil der Programmierung wird hier anhand der Programmiersprache C++ gelehrt.
Beziehe dich immer auf das konkrete Konzept, welches als übergeordnetes Thema dienen soll zu welchem die Fragestellung und die dazugehörigen Antwortmöglichkeiten erstellt werden sollen.
Es ist verboten, bereits existierenden Multiple Choice Questions erneut vorzuschlagen. Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal 2 Sätze. Benutze unbedingt immer die deutsche Sprache.
---
Die gewünschte Thematik der Frage: {topic}
---
thematisch verwandter Kontext: {similaritySearchResults2}
---
Anzahl an Antwortmöglichkeiten: {options}
---
Konzept, welches als übergeordnetes Thema dienen soll: {concept}
---
format instructions: {format_instructions}
`

const evaluationPrompt = `Du bist ein Programmierexperte und bewertest Multiple Choice Questions (MCQs). Bewerte die MCQs anhand folgender Anweisungen:
Anweisungen zur Bewertung innerhalb der triple quotes ("""):
"""
A. Für jede Frage bewertest du, ob die Formulierung gut ist. Eine gute Formulierung ist klar, präzise, nicht zu lang und sofort verständlich.
B. Für jede Antwortoption musst du bewerten, ob diese wahr oder falsch im Kontext der gestellten Frage ist. Solltest du eine als "wahr" gekennzeichnete Antwort für "falsch" halten, begründe deine Entscheidung ausführlich. Gleiches gilt, wenn du eine als "falsch" markierte Antwortoption für "wahr" hältst.
C. Die MCQs müssen thematisch zur universitären Einführungsverstanstaltung "Algorithmen und Datenstrukturen" und "Funktionale Programmierung mit Python" passen. Die Fragen und Antworten müssen sich auf die spezifischen Konzepte beziehen, die in den Vorlesungen behandelt werden und Fragen zu anderen Programmiersprachen sind nicht zulässig.
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

/**
 * Splits input text into chunks based on maximum token size.
 *
 * @param inputText - The large input text to be chunked.
 * @param maxTokens - The maximum number of tokens per chunk.
 * @returns An array of text chunks.
 */
function chunkText(inputText: string, maxTokens: number): string[] {
  const encodedText = encode(inputText);
  const chunks: number[][] = [];
  let start = 0;

  while (start < encodedText.length) {
    const end = start + maxTokens;
    const chunk = encodedText.slice(start, end);
    chunks.push(chunk);
    start = end;
  }

  return chunks.map(chunk => decode(chunk));
}

@Injectable()
export class McqCreationService {
  private readonly logger = new Logger(McqCreationService.name);
  private llm = new ChatOpenAI(llmConfig);
  private regenLlm = new ChatOpenAI(regenerateLLmconfig);
  private otherOptions : { [question: string]: string[] } = {};
  private askedQuestions: { [concept: string]: McqGenerationDTO[] } = {};
  private mcqToEvaluate: { [question: string]: string[] } = {};
  private mcqs: { questions: McqGenerationDTO[] } = { questions: [] };
  private transcript: string;

  constructor(
    private prisma: PrismaService,
    private ragService: RagService
  ) {
  }

  /** adds a question and options to the askedQuestions object to prevent generating duplicates
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

  /** adds an option in the askedQuestions object to prevent regenerating duplicates
   *
   * @param concept
   * @param question
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

  /** Called when generating a question title
   * @param concept
   * @returns
   */
  async getQuestionTitle(concept: string): Promise<McqGenerationDTO> {
    this.mcqs.questions.forEach(mcq => {
      this.addQuestionAndOptions(concept, mcq.question, mcq.answers)
    });
    console.log("this.askedQuestions: ", this.askedQuestions[concept].map(mcq => mcq.question))

    const parser = StructuredOutputParser.fromZodSchema(z.object({
      question: z.string().describe("Frage an den Nutzer. Ohne Antwortmöglichekiten"),
    }));
    const completeContext = await this.ragService.lectureSimilaritySearch(concept, 10);
    const transcript = await this.prisma.conceptNode.findFirst({
      where: {
        name: concept,
      },
      select: {
        transcript: true,
      },
    });
    if(!(transcript === null)) {
      const response = await RunnableSequence.from([
      {
        concept: () => concept,
        completeContext: () => completeContext,
        questions: () => this.askedQuestions[concept].map(mcq => mcq.question),
        transcript:  () =>  transcript,
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(questionTitlePrompt),
      this.llm,
      parser,
      ]).invoke({callbacks: []})

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
      ]).invoke({callbacks: []})
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
  async getAnswer(
    question: string,
    option: { text: string; correct: boolean },
    otherOptions: { text: string; correct: boolean }[],
    concept: string
  ): Promise<Answer> {
    // Ensure the question exists in askedQuestions
    if (!this.askedQuestions[concept]?.some(q => q.question === question)) {
      this.addQuestion(concept, question);
      // Adjusted to use otherOptions correctly
      this.addOptionsToQuestion(concept, question, otherOptions.map(opt => ({ answer: opt.text })));
    }

    this.logger.log("Asked questions:", this.askedQuestions[concept].map(mcq => mcq.question));
    this.logger.log(
      "Other options for question:",
      this.askedQuestions[concept]?.flatMap(mcq => mcq.answers).map(ans => ans.answer) || []
    );

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        answer: z.string().describe("Answer to the user's question. Don't enumerate."),
        correct: z.boolean().describe("Indicates if the answer is correct (true/false)."),
      })
    );

    // Retrieve context for the prompt
    const completeContext = await this.ragService.lectureSimilaritySearch(question, 10);
    const conceptNode = await this.prisma.conceptNode.findFirst({
      where: { name: concept },
      select: { transcript: true },
    });
    const transcript = conceptNode?.transcript || "";

    // Convert completeContext from TranscriptChunk[] to string
    const completeContextString = completeContext.map(chunk => chunk).join(' ');

    // Combine otherOptions into a single string
    const optionsString = otherOptions.map(opt => opt.text).join('\n');

    // Use the correctness from the option parameter
    const previousCorrectness = option.correct;
    const desiredCorrectness = !previousCorrectness;

    // Prepare prompt input
    const promptInput = {
      option: option.text,
      concept: concept,
      options: optionsString,
      question: question,
      completeContext: completeContextString,
      transcript: transcript,
      desiredCorrectness: desiredCorrectness ? 'korrekt' : 'falsch',
      format_instructions: parser.getFormatInstructions(),
    };

    // Update the prompt template to include desired correctness
    const regeneratePromptWithCorrectness = `
      Du bist ein Programmierexperte und erstellst eine neue auswählbare Antwortmöglichkeit für eine bestehende Multiple-Choice-Frage. Folgendes Konzept ist das Oberthema, zu dem die Fragestellung und die Antwortmöglichkeiten vorgeschlagen wurden:
      ---
      Konzept: {concept}
      ---
      Beachte dabei unter anderem das Transkript des Oberthemas und den thematisch verwandten Kontext, um neue Antwortmöglichkeiten zu generieren.
      Transkript des Oberthemas: {transcript}
      ---
      Thematisch verwandter Kontext: {completeContext}
      ---
      Es ist verboten, bereits vorgeschlagene Antwortmöglichkeiten erneut vorzuschlagen. Nachdem du die bereits vorgeschlagenen Antwortmöglichkeiten gelesen hast, liefere mir bitte eine **neue** Antwortmöglichkeit.

      **Die neue Antwortmöglichkeit soll {desiredCorrectness} sein.**

      ---
      Bereits vorgeschlagene Antwortmöglichkeiten: {options}
      ---
      Schreibe dazu, ob die vorgeschlagene Antwort für die ursprüngliche Frage wahr oder falsch ist. Benutze in den Antwortmöglichkeiten keine Aufzählungen verschiedener Optionen und nutze maximal zwei Sätze. Verwende unbedingt die deutsche Sprache.
      ---
      Bestehende Multiple-Choice-Frage: {question}
      ---
      Format instructions: {format_instructions}
    `;

    // Create the prompt template
    const promptTemplate = PromptTemplate.fromTemplate(regeneratePromptWithCorrectness);

    // Adjust the prompt to fit within token limits
    const MAX_MODEL_TOKENS = 12000;
    const MIN_TOKENS = 1000;
    const formattedPrompt = await this.adjustPrompt(promptTemplate, promptInput, MAX_MODEL_TOKENS, MIN_TOKENS);

    // Log the token count
    const numTokens = await this.llm.getNumTokens(formattedPrompt);
    this.logger.log(`Adjusted prompt contains ${numTokens} tokens.`);

    // Ensure the prompt is within the model's token limit
    if (numTokens > MAX_MODEL_TOKENS) {
      throw new Error(`Prompt exceeds the maximum token limit of ${MAX_MODEL_TOKENS}.`);
    }

    // Prepare the runnable sequence
    const sequence = RunnableSequence.from([
      promptTemplate,
      this.regenLlm,
      parser,
    ]);

    // Invoke the sequence with promptInput
    const response = await sequence.invoke(promptInput, { callbacks: [] });

    // Verify that the generated answer has the desired correctness
    if (response.correct !== desiredCorrectness) {
      this.logger.log("The generated answer did not match the desired correctness. Regenerating...");
      // Implement retry logic if necessary
    }

    // Add the generated answer to prevent duplicates
    this.addOption(concept, question, response.answer);

    this.logger.log(
      "All answers:",
      this.askedQuestions[concept]?.flatMap(mcq => mcq.answers).map(ans => ans.answer) || []
    );
    this.logger.log("Generated response correctness:", response.correct);

    return response;
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
            answer: z.string().describe("Antwortmöglichkeit des Nutzers. Keine Aufzählungen nutzen."),
            correct: z.boolean().describe("Markiert die Korrektheit der Antwortmöglichkeit (wahr/falsch)"),
          })
        ),
        description: z.string().describe("Kurze Beschreibung der Fragestellung mit Bezug auf das Oberthema"),
        score: z.number().describe("Punktzahl für das richtige beantworten der Frage. 1 für sehr einfach und 5 für sehr schwierig."),
      })
    )

    const similaritySearchResults = await this.getSimilaritySearchString(concept, 15);
    const transcriptData = await this.prisma.conceptNode.findFirst({
      where: {
        name: concept,
      },
      select: {
        transcript: true,
      },
    })
    const transcript = transcriptData?.transcript || "";
    // Prepare the prompt template
    let promptTemplate;
    if (transcript) {
      promptTemplate = PromptTemplate.fromTemplate(answersPrompt);
    } else {
      promptTemplate = PromptTemplate.fromTemplate(answersPrompt2);
    }

    const promptInput = {
      options: options.toString(),
      concept: concept,
      question: question,
      similaritySearchResults: similaritySearchResults,
      transcript: transcript,
      format_instructions: parser.getFormatInstructions(),
    };

    // Get formatted prompt
    const formattedPrompt = await promptTemplate.format(promptInput);

    // Calculate tokens for the prompt
    const numTokens = await this.llm.getNumTokens(formattedPrompt);
    this.logger.log(`Prompt contains ${numTokens} tokens`);

    // Ensure the token count is within the model's limit
    const MAX_MODEL_TOKENS = 128000; // Adjust based on model capacity
    if (numTokens > MAX_MODEL_TOKENS) {
      throw new Error(`Prompt exceeds the maximum token limit of ${MAX_MODEL_TOKENS}.`);
    }

    const response = await RunnableSequence.from([
      {
        options: () => options.toString(),
        concept: () => concept,
        question: () => question,
        similaritySearchResults: () => similaritySearchResults,
        transcript: () => transcript,
        format_instructions: () => parser.getFormatInstructions(),
      },
      promptTemplate,
      this.llm,
      parser,
    ]).invoke({ callbacks: [] });

    // Adding the generated question and answers to prevent duplicates
    this.addQuestionAndOptions(concept, question, response.answers);

    return response;
  }

  /** Called when only  concept and number of options is entered into the frontend
   * @param concept
   * @param options
   * @param topic
   * @returns question and answers to the user's question
   */
  async getQuestionAndAnswers(concept: string, options: number, topic = '(wähle selbst)'): Promise<McqGenerationDTO> {
    console.log("concept: ", concept);
    console.log("options: ", options);
    console.log("askedQuestions undefined?: ", this.askedQuestions[concept] === undefined);

    // Fetch the ConceptNode matching the concept name
    const conceptNode = await this.prisma.conceptNode.findFirst({
      where: {
        name: concept,
      },
    });

    if (!conceptNode) {
      throw new Error(`Concept with name '${concept}' not found.`);
    }

    // Fetch all SC and MC questions associated with the conceptId
    const mcqs = await this.prisma.question.findMany({
      where: {
        type: {
          in: ['SC', 'MC'],
        },
        conceptNodeId: conceptNode.id,
      },
      include: {
        mcQuestion: {
          include: {
            MCQuestionOption: {
              include: {
                option: true,
              },
            },
          },
        },
      },
    });

    console.log("mcqs: ", mcqs);

    // Process fetched questions
    mcqs.forEach(mcq => {
      mcq.mcQuestion?.forEach(question => {
        const answers = question.MCQuestionOption.map(opt => ({
          answer: opt.option.text,
          correct: opt.option.is_correct,
        }));

        this.addQuestionAndOptions(concept, mcq.name || mcq.text, answers);
      });
    });

    // Parser for formatting the output in the desired way
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        question: z.string().describe("Fragestellung an den Nutzer"),
        answers: z.array(
          z.object({
            answer: z.string().describe("Antwortmöglichkeit des Nutzers. Keine Aufzählungen nutzen."),
            correct: z.boolean().describe("Markiert die Korrektheit der Antwortmöglichkeit (wahr/falsch)"),
          })
        ).optional().default([]),
        description: z.string().describe("Kurze Beschreibung der Fragestellung"),
        score: z.number().describe("Punktzahl für das richtige beantworten der Frage. 1 für sehr einfach und 5 für sehr schwierig."),
      })
    );

    // Context retrieval for the question
    const similaritySearchResults = await this.ragService.lectureSimilaritySearch(concept, 15);
    const transcriptData = await this.prisma.conceptNode.findFirst({
      where: {
        name: concept,
      },
      select: {
        transcript: true,
      },
    });
    const transcript = transcriptData?.transcript || "";

    // Prepare the prompt template
    let promptTemplate;
    if (transcript) {
      promptTemplate = PromptTemplate.fromTemplate(questionAndAnswerPrompt);
    } else {
      promptTemplate = PromptTemplate.fromTemplate(questionAndAnswerPrompt2);
    }

    // Initial prompt input
    const promptInput = {
      topic: topic,
      concept: concept,
      options: options,
      similaritySearchResults: similaritySearchResults,
      transcript: transcript,
      existingQuestions: this.askedQuestions[concept]?.map(mcq => mcq.question) || [],
      format_instructions: parser.getFormatInstructions(),
    };

    // Adjust the prompt to fit within token limits
    const MAX_MODEL_TOKENS = 128000; // Model's maximum context length
    const MIN_TOKENS = 12000;        // Minimum tokens to send to the LLM
    const formattedPrompt = await this.adjustPrompt(promptTemplate, promptInput, MAX_MODEL_TOKENS, MIN_TOKENS);

    // Calculate tokens
    const numTokens = await this.llm.getNumTokens(formattedPrompt);
    this.logger.log(`Adjusted prompt contains ${numTokens} tokens`);

    // Proceed with invoking the model using the adjusted prompt
    const response = await this.llm.predict(formattedPrompt);
    // Parse the LLM response
    const result = await parser.parse(response);

    this.addQuestionAndOptions(concept, result.question, result.answers);

    return result;
  }

  /**
  * returns evaluation of given answer options and the reasoning behind its evaluation
  * @param question
  * @param answers
  * @returns
  */
  async getEvaluation(question: string, answers: string[]) : Promise<McqEvaluations> {

    this.mcqToEvaluate[question] = answers

    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        question: z.string().describe("Die Frage an den User"),
        evaluations: z.array(
          z.object({
            reasoning: z.string().describe("Eine ausführliche Erklärung dazu, warum diese Antwortmöglichkeit Mit Bezug zur Frage wahr oder falsch ist."),
            correct: z.boolean().describe("Evaluiert, ob die gegebene Antwortmöglichkeit auf die jeweilige Frage korrekt ist (wahr/falsch)"),

          })
        ).optional().default([]),
        commentOnQuality: z.string().describe("Die Bewertung der Gesamtfrage und der Antwortmöglichkeiten als Gut, Sehr Gut oder Exzellent. kurze Begründung für die Bewertung anhand der Anweisungen A bis D."),
      })
    )

    const result = await RunnableSequence.from([
      {
        question: () => question,
        answers: () => this.mcqToEvaluate[question],
        format_instructions: () => parser.getFormatInstructions(),
      },
      PromptTemplate.fromTemplate(evaluationPrompt),
      this.llm,
      parser,
    ]).invoke({callbacks: []});

    console.log("Evaluation result: ", result)

    return result;

  }

  private async getSimilaritySearchString(concept: string, maxTokensPerChunk: number): Promise<string> {
    const similaritySearchResults = await this.ragService.lectureSimilaritySearch(concept, 50);

    // Split the similarity search results into chunks
    const chunks = chunkText(similaritySearchResults.map(chunk => chunk).join(' '), maxTokensPerChunk);

    // Process each chunk if necessary
    // For this case, we'll join the chunks back together
    const aggregatedResult = chunks.join(' ');

    return aggregatedResult;
  }

    /**
   * Adjusts the prompt inputs to fit within the token limit while ensuring at least minTokens are sent.
   *
   * @param promptTemplate - The prompt template used for formatting.
   * @param promptInput - The initial prompt input object.
   * @param maxTokens - The maximum allowed tokens.
   * @param minTokens - The minimum tokens to send to the LLM.
   * @returns A formatted prompt that fits within the token constraints.
   */
  private async adjustPrompt(
    promptTemplate: PromptTemplate,
    promptInput: any,
    maxTokens: number,
    minTokens: number
  ): Promise<string> {
    let formattedPrompt = await promptTemplate.format(promptInput);
    let numTokens = await this.llm.getNumTokens(formattedPrompt);

    // Reduce the size of the inputs iteratively until it fits within maxTokens
    while (numTokens > maxTokens && numTokens > minTokens) {
      // Adjust the inputs contributing to the token count
      if (promptInput.similaritySearchResults) {
        promptInput.similaritySearchResults = promptInput.similaritySearchResults.slice(0, Math.floor(promptInput.similaritySearchResults.length * 0.9));
      }
      if (promptInput.transcript) {
        promptInput.transcript = promptInput.transcript.slice(0, Math.floor(promptInput.transcript.length * 0.9));
      }
      if (promptInput.existingQuestions) {
        promptInput.existingQuestions = promptInput.existingQuestions.slice(0, Math.floor(promptInput.existingQuestions.length * 0.9));
      }
      // Reformat the prompt
      formattedPrompt = await promptTemplate.format(promptInput);
      numTokens = await this.llm.getNumTokens(formattedPrompt);
    }

    // Ensure at least minTokens are sent
    if (numTokens < minTokens) {
      throw new Error(`Unable to create a prompt with at least ${minTokens} tokens.`);
    }

    this.logger.log(`Adjusted prompt contains ${numTokens} tokens`);
    return formattedPrompt;
  }

}
