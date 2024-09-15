import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { genTaskDto } from '@DTOs/tutorKaiDtos/genTask.dto';
import { ChatOpenAI } from '@langchain/openai';
import { z } from "zod";

import {
  HumanMessage,
  BaseMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {
  END,
  START,
  StateGraph,
  Annotation,
} from '@langchain/langgraph';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import axios from 'axios';
import { CodeGeruestDto } from '@DTOs/question.dto';
import { StructuredOutputParser } from "langchain/output_parsers";

interface localCodeFile {
  filename: string;
  code: string;
}

@Injectable()
export class CodingQuestionGeneratorCppService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  encodeBased64(text: string): string {
    return Buffer.from(text).toString('base64');
  }

  decodeBased64(text: string): string {
    return Buffer.from(text, 'base64').toString('utf-8');
  }

  extractFinalStep(response: string): string {
    const finalStepMarker = '## FinalStep';
    const finalStepIndex = response.indexOf(finalStepMarker);
    if (finalStepIndex === -1) {
      throw new Error('FinalStep marker not found in the response.');
    }
    return response.substring(finalStepIndex + finalStepMarker.length).trim();
  }

  async createDatabaseEntry(data: any): Promise<any> {
    const solutionOne = data.solution[0];
    const solutionTwo = data.solution.length > 1 ? data.solution[1] : null;
    const solutionThree = data.solution.length > 2 ? data.solution[2] : null;

    const unitTestOne = data.unitTest[0];
    const unitTestTwo = data.unitTest.length > 1 ? data.unitTest[1] : null;
    const unitTestThree = data.unitTest.length > 2 ? data.unitTest[2] : null;

    const errorOne = data.checkCodeError[0];
    const errorTwo =
      data.checkCodeError.length > 1 ? data.checkCodeError[1] : null;
    const errorThree =
      data.checkCodeError.length > 2 ? data.checkCodeError[2] : null;

    const juryResponseOne = data.juryResponses[0];
    const juryResponseTwo =
      data.juryResponses.length > 1 ? data.juryResponses[1] : null;
    const juryResponseThree =
      data.juryResponses.length > 2 ? data.juryResponses[2] : null;

    const dbEntry = await this.prisma.genTaskData.create({
      data: {
        topic: "TESTING", //data.topic,
        context: "TESTING", //data.context,
        task: data.task,
        expectation: data.expectation,
        solutionOne: solutionOne,
        solutionTwo: solutionTwo,
        solutionThree: solutionThree,
        unitTestOne: unitTestOne,
        unitTestTwo: unitTestTwo,
        unitTestThree: unitTestThree,
        errorIteration: data.checkCodeInteration,
        isErrorAtEnd: data.checkCodeErrorHappend,
        errorOne: errorOne,
        errorTwo: errorTwo,
        errorThree: errorThree,
        codeFramework: data.codeFramework,
        juryOne: juryResponseOne,
        juryTwo: juryResponseTwo,
        juryThree: juryResponseThree,
        runMethod: data.runMethod,
        runMethodInput: data.runMethodInput,
        judgeTask: data.judgeTask,
        allTaskData: data,
      },
    });

    return dbEntry;
  }

  /**
   * Generates a task for the given topic and context
   * @param topic the topic of the Programming task
   * @param context the context of the Programming task
   * @returns a JSON object with the task, expectation, solution, unitTest, codeFramework and hasFailure (true = error in Response from Jury1 during testing Solution and Unittest, false = No error from Jury1)
   */
  async genCPPTask(taksdecription: string, codeGerueste: CodeGeruestDto[]): Promise<genTaskDto> {
    console.log('genTask gestartet');

    const gptModel = 'gpt-4o-2024-08-06'; //Aktuelles Modell "GPT-4o"
    const maxIterations = 5; //Maximale Anzahl an Iterationen für die Codeüberprüfung
    const langGraphRecursionLimit = 50; //Maximale Anzahl an Rekursionen für LangGraph
    const jury1url =
      'http://jury1.bshefl2.bs.informatik.uni-siegen.de/execute/cpp-assignment';

    const model = new ChatOpenAI({
      temperature: 0,
      streaming: false,
      model: gptModel,
    });
    interface TaskGenState {
      messages: BaseMessage[];
      task: string;
      expectation: string;
      solution: localCodeFile[];
      unitTest: string[];
      checkCodeIteration: number;
      checkCodeError: string[];
      checkCodeErrorHappend: boolean;
      codeFramework: string;
      juryResponses: string[];
      runMethod: string;
      runMethodInput: string;
      judgeTask: string;
    }

    const TaskGenState = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      task: Annotation<string>(),
      expectation: Annotation<string>(),
      solution: Annotation<localCodeFile[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      unitTest: Annotation<string[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      checkCodeIteration: Annotation<number>(),
      checkCodeError: Annotation<string[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      checkCodeErrorHappend: Annotation<boolean>(),
      codeFramework: Annotation<string>(),
      juryResponses: Annotation<string[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      runMethod: Annotation<string>(),
      runMethodInput: Annotation<string>(),
      judgeTask: Annotation<string>(),
    });


    const genSolution = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      const SolutionSchema = z.array(z.object({
        filename: z.string(),
        code: z.string()
      }));

      const outputParser = StructuredOutputParser.fromZodSchema(SolutionSchema);

      let prompt: ChatPromptTemplate = null;

      const taskDescriptionString = `## Aufgabestellung\n ${taksdecription}`;
      const codeGeruesteDescriptionString = `## Codegerüste\n \n${codeGerueste.map((geruest) => `### ${geruest.codeFileName}:\n${geruest.code}`).join('\n\n')}`;

      if (state.checkCodeErrorHappend) {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `Du bist ein Programmierexperte. Erstelle eine strukturierte Lösung mit Dateinamen und Code.`
          ),
          new HumanMessage(`Erstelle die korrigierte Musterlösung für eine Programmieraufgabe. Du hast dies bereits versucht, es gab aber einen Fehler. Generiere hier nur die korrigierte Musterlösung und keinen UnitTest. \n
                Die Aufgabe lautet: ${taksdecription} \n
                Die aufgetauchte Fehlermeldung: ${
                  state.checkCodeError[state.checkCodeError.length - 1]
                }
                Gib die Lösung als Array von Objekten zurück, wobei jedes Objekt einen Dateinamen und den zugehörigen Code enthält.`),
          new MessagesPlaceholder('messages'),
          new SystemMessage(outputParser.getFormatInstructions()),
        ]);
      } else {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `Du bist Senior C++ Entwickler. Erstelle eine strukturierte Lösung mit Dateinamen und Code.`
          ),
          new HumanMessage(
            `Für eine Programmieraufgabe sollst du eine Musterlösung erstellen. Die Musterlösung soll auf einem einfachen Weg das Ziel erreichen.
            Für jedes Codegerüst muss eine entsprechende Musterlösung erstellt werden.
            Kommentare sind nur an entscheidenden beziehungsweise komplexen Stellen zu ergänzen.
            Erstelle eine Musterlösung für die Aufgabe in der übergebenen Programmiersprache. Implementiere in der Musterlösung immer die Funktion aus der Aufgabenstellung.
            Gib die Musterlösung als Array von Objekten zurück, wobei jedes Objekt einen Dateinamen und den zugehörigen Code enthält.
            In dem Code soll niemals nach einer Eingabe gefragt werden. Ausgaben in der Konsole sind gewollt.
            Der Code soll ohne weitere Eingaben sofort ausführbar sein.\n
            ${taskDescriptionString}\n
            ${codeGeruesteDescriptionString}\n
            `
          ),
          new MessagesPlaceholder('messages'),
          new SystemMessage(outputParser.getFormatInstructions()),
        ]);
      }

      const model = new ChatOpenAI({ temperature: 0, streaming: false, model: gptModel });

      const response = await prompt.pipe(model).invoke({ messages });

      let contentString = "";
      if (typeof response.content === "string") {
        contentString = response.content;
      } else if (Array.isArray(response.content)) {
        contentString = response.content.map(item =>
          typeof item === "string" ? item : JSON.stringify(item)
        ).join("\n");
      } else if (response.content && typeof response.content === "object") {
        contentString = JSON.stringify(response.content);
      }

      const parsedSolution = await outputParser.parse(contentString);

      return {
        messages: [response],
        checkCodeIteration: state.checkCodeIteration + 1,
        solution: parsedSolution,
      };
    };

    const genUnitTest = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      let prompt: ChatPromptTemplate = null;

      if (state.checkCodeErrorHappend) {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `Du bist Senior C++ Entwickler und Hochschuldozent. Im Rahmen eines Universitätskurses "Algorithmen und Datenstrukturen mit C++" erhalten Studierende Programmieraufgaben.
            Die Lösungen der Studierenden sollen durch Unit-Tests automatisch bewertet werden.
            Beachte, dass immer die folgenden zwei Zeilen am Anfang enthalten sein müssen:
            #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
            #include <JsonReporter.h>
            Erstelle auf Basis der Aufgabenstellung sowie der Musterlösung Unit-Tests, welche alle Edge-Cases abdecken. Die Unit-Tests sollen wie im Beispiel aufgebaut sein.
            Gib den Unit-Test als "String" wieder und markiere den Code nicht mit "'''cpp" oder ähnlichem.

                Beispiel:

                #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
                #include <JsonReporter.h>
                #include "Calculator.h"
                #include "Greeter.h"

                TEST_CASE("Calculator add method") {
                    Calculator calc;

                    SUBCASE("Adding positive numbers") {
                        REQUIRE(calc.add(5, 3) == 8);
                    }

                    SUBCASE("Adding negative numbers") {
                        REQUIRE(calc.add(-2, -4) == -6);
                    }
                }

                TEST_CASE("Greeter greet method") {
                    Greeter greeter;

                    SUBCASE("Greeting a person") {
                        REQUIRE(greeter.greet("John") == "Hello, John!");
                    }

                    SUBCASE("Greeting an empty string") {
                        REQUIRE(greeter.greet("") == "Hello, !");
                    }
                }
                        `),
          new HumanMessage(`Erstelle einen Unit-Test für die Programmieraufgabe inklusive aller benötigten Imports zu der nachfolgenden Musterlösung. Generiere nur den Unit-Test ohne zusätzlichen Text. Der Unit-Test soll direkt ausführbar sein.
                Du hast bereits einmal versucht diesen Unit-Test zu erstellen, es gab aber einen Fehler. Generiere hier nur den korrigierten Unit-Test. \n
                \n
                Die Musterlösung lautet: ${
                  state.solution[state.solution.length - 1]
                } \n
                Die aufgetauchte Fehlermeldung: ${
                  state.checkCodeError[state.checkCodeError.length - 1]
                } \n
                `),
          new MessagesPlaceholder('messages'),
        ]);
      } else {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `
            Du bist Senior C++ Entwickler und Hochschuldozent. Im Rahmen eines Universitätskurses "Algorithmen und Datenstrukturen mit C++" erhalten Studierende Programmieraufgaben.
            Die Lösungen der Studierenden sollen durch Unit-Tests automatisch bewertet werden.
            Beachte, dass immer die folgenden zwei Zeilen am Anfang enthalten sein müssen:
            #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
            #include <JsonReporter.h>
            Erstelle auf Basis der Aufgabenstellung sowie der Musterlösung passende Unit-Tests. Die Unit-Tests sollen wie im Beispiel aufgebaut sein.
            Gib den Unit-Test als "String" wieder und markiere den Code nicht mit "'''cpp" oder ähnlichem.

                Beispiel:

                #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
                #include <JsonReporter.h>
                #include "Calculator.h"
                #include "Greeter.h"

                TEST_CASE("Calculator add method") {
                    Calculator calc;

                    SUBCASE("Adding positive numbers") {
                        REQUIRE(calc.add(5, 3) == 8);
                    }

                    SUBCASE("Adding negative numbers") {
                        REQUIRE(calc.add(-2, -4) == -6);
                    }
                }

                TEST_CASE("Greeter greet method") {
                    Greeter greeter;

                    SUBCASE("Greeting a person") {
                        REQUIRE(greeter.greet("John") == "Hello, John!");
                    }

                    SUBCASE("Greeting an empty string") {
                        REQUIRE(greeter.greet("") == "Hello, !");
                    }
                }

                        `),
          new HumanMessage(
            'Entwickle einen Unit-Test für eine Programmieraufgabe inklusive aller benötigten Imports zu der nachfolgenden Musterlösung. Generiere nur den Unit-Test ohne zusätzlichen Text. Der Unit-Test soll direkt ausführbar sein.',
          ),
          new MessagesPlaceholder('messages'),
        ]);
      }

      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: false, model: gptModel }),
        )
        .invoke({ messages });

      return {
        messages: [response],
        unitTest: [response.content],
      };
    };

    const genExpectation = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage('Du bist ein Dozent an einer Hochschule.'),
        new HumanMessage(`Erstelle einen Erwartungshorizont zu der nachfolgenden Programmieraufgabe und der Musterlösung. Der Erwartungshorizont soll dabei jeden Schritt, welcher für das Lösen der Aufgabe nötig ist, einzeln erfassen und im Anschluss die konkret benötigten Kompetenzen zu den einzelnen Schritten festhalten. Gehe dabei wie folgt vor:
            1. Gehe Zeile für Zeile durch die Musterlösung und entscheide, was ein Student können muss, der diese Zeile programmiert. Schreibe diesen Schritt in dreifach Anführungszeichen (""") \n
            2. Erstelle nun einen Erwartungshorizont, welcher mit durchnummerierten Schritten den jeweiligen Code und die dazugehörigen Kompetenzen notiert, welcher der Student durchführen muss um diese Zeile zu lösen. \n
            3. Erstelle nun einen Erwartungshorizont, welcher die jeweiligen Kompetenzen aus Schritt 2 als Übersicht darstellt, sodass mehrfach auftauchende Kompetenzen nur einmal in der Liste vorkommen. Markiere den Anfang des Erwartungshorizontes einmalig mit "## FinalStep" und schreibe einmalig in die erste Zeile "Erwartungshorizont".

            Aufgabenstellung:\n ${state.task} \n \n Musterlösung:\n ${
          state.solution[state.solution.length - 1]
        }`),
        new MessagesPlaceholder('messages'),
      ]);

      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: false, model: gptModel }),
        )
        .invoke({ messages });

      const expectation = this.extractFinalStep(response.content.toString());
      console.log('Erwartungshorizont NACH Parsen:\n ', expectation);

      return {
        messages: [response],
        expectation: expectation,
      };
    };

    const checkCode = async (state: typeof TaskGenState.State) => {
      const solution = state.solution[state.solution.length - 1];
      const unitTest = state.unitTest[state.unitTest.length - 1];
      let reflection = '';
      let errorMessages = '';

      console.log('--- CheckCode ---');
      console.log("BEGIN SOLUTION");
      console.log(JSON.stringify(state.solution));
      console.log("END");

      //HIER DER TEST MIT JURY1 OB DER CODE FUNKTIONIERT - Rückgabe true oder false
      const jury1Response = await axios.post(jury1url, {
        files: state.solution.reduce((acc, file) => ({
          ...acc,
          [file.filename]: this.encodeBased64(file.code)
        }), {}),
        testFile: this.encodeBased64(unitTest),
      });

      console.log('jury1Response: ', jury1Response.data);

      const testResults = jury1Response.data.testResults;
      const testsPassed = jury1Response.data.testsPassed;
      const output = jury1Response.data.output;

      if (!testsPassed) {
        for (let i = 0; i < testResults.length; i++) {
          if (testResults[i].status === 'FAILED') {
            //Es gab einen Fehler in einem Testcase
            if (
              testResults[i].test === 'MAIN_COMPILATION' &&
              testResults[i].status === 'FAILED'
            ) {
              errorMessages += `Kompilierungsfehler: ${output} \n`;
            } else {
              const testCase = testResults[i].test;
              const testException = testResults[i].exception;
              errorMessages += `Fehler in Testcase: ${testCase}\n Fehlermeldung: ${testException} \n`;
            }
          } else if (testResults[i].status === 'ERROR') {
            //ERROR -> alter Kompilierungsfehler
            const testCase = testResults[i].test;
            const testError = testResults[i].error;

            errorMessages += `Fehler: ${testCase}\n Fehlermeldung: ${testError} \n`;
          } else if (testResults[i].status === 'MAIN_COMPILATION') {
            //Kompilierungsfehler (neu seid Jury1 update)

            errorMessages += `Kompilierungsfehler: ${output} \n`;
          }
        }
      }

      if (testsPassed) {
        return {
          checkCodeErrorHappend: false,
          juryResponses: [jury1Response.data],
        };
      } else {
        return {
          checkCodeErrorHappend: true,
          checkCodeError: [errorMessages],
          juryResponses: [jury1Response.data],
        };
      }
    };

    const _CheckCodePassed = (state): string => {
      console.log(
        '_CheckCodePassed - state.checkCodeErrorHappen = ',
        state.checkCodeErrorHappend,
      );

      if (
        state.checkCodeErrorHappend === true &&
        state.checkCodeIteration < maxIterations
      ) {
        console.log(
          '----------------------- SOLUTION ERROR => Retry! -----------------------',
          state.checkCodeIteration,
        );
        return 'retry';
      } else {
        return 'continue';
      }
    };


    const workflow = new StateGraph(TaskGenState)
      .addNode('genSolution', genSolution)
      .addNode('genUnitTest', genUnitTest)
      .addNode('genExpectation', genExpectation)
      .addNode('checkCode', checkCode)
      .addEdge(START, 'genSolution')
      .addEdge('genSolution', 'genUnitTest')
      .addEdge('genUnitTest', 'checkCode')
      .addConditionalEdges('checkCode', _CheckCodePassed, {
        retry: 'genSolution',
        continue: 'genExpectation',
      })
      .addEdge('genExpectation', END)

    const app = workflow.compile();

    const inputs = {
      //messages: [new HumanMessage("Erstelle eine Programmieraufagbe für die Programmiersprache Python zu dem Thema Strings verketten. Als Kontext sollen Züge dienen.")],
    };

    const result = await app.invoke(
      {},
      { recursionLimit: langGraphRecursionLimit },
    );
    //console.log("result", result);

    //console.log("---------- ALLES ----------");
    //console.log(result);
    console.log('---------- Aufgabe ----------');
    console.log(result.task);
    console.log('---------- Erwartungshorizont ----------');
    console.log(result.expectation);
    console.log('---------- Codegerüst ----------');
    console.log(result.codeFramework);
    console.log('---------- Musterlösung ----------');
    console.log(result.solution[result.solution.length - 1]);
    console.log('---------- UnitTest ----------');
    console.log(result.unitTest[result.unitTest.length - 1]);
    console.log('---------- JudgeTask ----------');
    console.log(result.judgeTask);
    console.log('---------- CheckCodeError ----------');
    console.log(
      `Nach dem ${result.checkCodeIteration}. Versuche den Code zu testen (Anzahl Solutions: ${result.solution.length}, Anzahl UnitTests: ${result.unitTest.length}) lag noch ein Fehler vor (true = ja / false = nein): ${result.checkCodeErrorHappend}`,
    );

    //Erstelle einen Eintrag in der Datenbank, in welchem alle Daten als JSON-Objekt gespeichert werden

    var jsonData = {
      task: result.task,
      expectation: result.expectation,
      solution: result.solution,
      unitTest: result.unitTest,
      checkCodeInteration: result.checkCodeIteration,
      checkCodeErrorHappend: result.checkCodeErrorHappend,
      checkCodeError: result.checkCodeError,
      codeFramework: result.codeFramework,
      juryResponses: result.juryResponses,
      runMethod: result.runMethod,
      runMethodInput: result.runMethodInput,
      judgeTask: result.judgeTask,
    };

    const dbEntry = await this.createDatabaseEntry(jsonData);
    console.log('Datenbank Eintrag erstellt - ID der Aufgabe: ', dbEntry.id);

    return {
      id: dbEntry.id,
      task: result.task,
      expectation: result.expectation,
      solution: result.solution[result.solution.length - 1],
      unitTest: result.unitTest[result.unitTest.length - 1],
      codeFramework: result.codeFramework,
      hasFailure: result.checkCodeErrorHappend,
      iterations: result.checkCodeIteration,
      runMethod: result.runMethod,
      runMethodInput: result.runMethodInput,
    };
  }
}
