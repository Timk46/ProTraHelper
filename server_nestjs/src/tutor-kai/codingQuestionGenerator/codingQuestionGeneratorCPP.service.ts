import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { genTaskDto } from '@DTOs/tutorKaiDtos/genTask.dto';
import { CodingQuestionInternal, CodeGeruestDto } from '@DTOs/question.dto';
import { ChatOpenAI } from '@langchain/openai';
import { z } from "zod";
import { RunCodeService } from '../run-code/run-code.service';
import { CodeSubmissionResult } from '@DTOs/index';

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
import { StructuredOutputParser } from "langchain/output_parsers";

interface localCodeFile {
  codeFileName: string;
  code: string;
}

@Injectable()
export class CodingQuestionGeneratorCppService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private runCodeService: RunCodeService
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
  async genCPPTask(taksdecription: string, codeGerueste: CodeGeruestDto[]): Promise<CodingQuestionInternal> {
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
        codeFileName: z.string().describe("Der Dateiname der Datei, die den Code enthält."),
        code: z.array(z.string().describe("Der korrekte Programmcode zum codeFileName. Der Code sollte als Array von Strings zurückgegeben werden, wobei jeder String eine Zeile des Codes repräsentiert. Daher muss kein \\n verwendet werden!"))
      }));

      const outputParser = StructuredOutputParser.fromZodSchema(SolutionSchema);

      let prompt: ChatPromptTemplate = null;

      const taskDescriptionString = `## Aufgabestellung\n ${taksdecription}`;
      const codeGeruesteDescriptionString = `\n \n${codeGerueste.map((geruest) => `## ${geruest.codeFileName}:\n${geruest.code}`).join('\n\n')}`;

      if (state.checkCodeErrorHappend) {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `Du bist ein Programmierexperte. Erstelle eine strukturierte Lösung mit Dateinamen und Code.`
          ),
          new HumanMessage(`
            Erstelle die korrigierte Musterlösung für eine Programmieraufgabe. Du hast dies bereits versucht, es gab aber einen Fehler.
            Generiere hier nur die korrigierte Musterlösung und keinen UnitTest. \n
            # Aufgabenstellung:\n
            ${taksdecription} \n
            # Die Unit-Tests:\n
            ${state.unitTest[state.unitTest.length - 1]} \n
            # Die falsche Musterlösung:
            ## Datei ${state.solution[state.solution.length - 1].codeFileName} \n
            ${state.solution[state.solution.length - 1].code}
            # Die aufgetauchte Fehlermeldung:\n
            ${ state.checkCodeError[state.checkCodeError.length - 1]} \n
            Gib die Musterlösung als Array von Objekten zurück, wobei jedes Objekt einen Dateinamen und den zugehörigen Code enthält.
            **Der Code sollte als Array von Strings zurückgegeben werden, wobei jeder String eine Zeile des Codes repräsentiert. Daher muss kein \\n verwendet werden!**
            In dem Code soll niemals nach einer Eingabe gefragt werden. Ausgaben in der Konsole sind gewollt.
            Der Code soll ohne weitere Eingaben sofort ausführbar sein.\n
            `),
          //new MessagesPlaceholder('messages'),
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
            **Der Code sollte als Array von Strings zurückgegeben werden, wobei jeder String eine Zeile des Codes repräsentiert. Daher muss kein \\n verwendet werden!**
            In dem Code soll niemals nach einer Eingabe gefragt werden. Ausgaben in der Konsole sind gewollt.
            Der Code soll ohne weitere Eingaben sofort ausführbar sein.\n
            # Aufgabenstellung:\n
            ${taskDescriptionString}\n
            # Codegerüste:\n
            ${codeGeruesteDescriptionString}\n
            `
          ),
          //new MessagesPlaceholder('messages'),
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
      const reconstructedSolution = parsedSolution.map(item => ({
        ...item,
        code: item.code.join('\n')
      }));
      console.log("******************************* BEGIN PROGRAMMCODE");
      console.log(reconstructedSolution);
      console.log("******************************* ENDE PROGRAMMCODE");

      return {
        messages: [response],
        checkCodeIteration: state.checkCodeIteration + 1,
        solution: reconstructedSolution,
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
            #define UNIT_TEST
            #include <JsonReporter.h>
            Du hast in der Vergangenheit bereits versucht, Unit-Tests zu generieren. Hier liegt doch ein Fehler vor. Korrigiere die Unit-Tests basierend auf den Informationen des Users.
            Die Unit-Tests sollen wie im Beispiel aufgebaut sein. Gib den Unit-Test als "String" wieder und markiere den Code nicht mit "'''cpp" oder ähnlichem.

            # 1. Beispiel:

            #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
            #define UNIT_TEST
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

            # 2. Beispiel:
            #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
            #define UNIT_TEST
            #include <JsonReporter.h>
            #include "doctest.h"

            // Definiere UNIT_TEST, um die main-Funktion in Ausleihe.cpp auszuschließen
            #define UNIT_TEST
            #include "Ausleihe.cpp"

            TEST_CASE("Book-Klasse") {
                Book book("Introduction to Algorithms", "Th. Cormen, Ch. Leiserson, R. Rivest", "0262531968");

                SUBCASE("Getter-Funktionen") {
                    CHECK(book.getTitle() == "Introduction to Algorithms");
                    CHECK(book.getAuthor() == "Th. Cormen, Ch. Leiserson, R. Rivest");
                    CHECK(book.getISBN() == "0262531968");
                }

                SUBCASE("Setter-Funktionen") {
                    book.setTitle("Neuer Titel");
                    book.setAuthor("Neuer Autor");
                    book.setISBN("1234567890");
                    CHECK(book.getTitle() == "Neuer Titel");
                    CHECK(book.getAuthor() == "Neuer Autor");
                    CHECK(book.getISBN() == "1234567890");
                }
            }

            TEST_CASE("Student-Klasse") {
                Student student;
                Book book1("Introduction to Algorithms", "Th. Cormen, Ch. Leiserson, R. Rivest", "0262531968");
                Book book2("The C++ Programming Language", "Bjarne Stroustrup", "0201700735");

                SUBCASE("Bücher hinzufügen und ausgeben") {
                    student.addBook(book1);
                    student.addBook(book2);
                    // Da printBooks() cout verwendet, können wir den Output nicht direkt testen, ohne cout umzuleiten.
                    // Wir stellen jedoch sicher, dass keine Ausnahmen geworfen werden.
                    CHECK_NOTHROW(student.printBooks());
                }

                SUBCASE("Buch entfernen") {
                    student.addBook(book1);
                    student.addBook(book2);
                    student.removeBook(book1);
                    CHECK_NOTHROW(student.printBooks());
                }
            }

                        `),
          new HumanMessage(`Erstelle einen Unit-Test für die Programmieraufgabe inklusive aller benötigten Imports zu der nachfolgenden Musterlösung. Generiere nur den Unit-Test ohne zusätzlichen Text. Der Unit-Test soll direkt ausführbar sein.
                Du hast bereits einmal versucht diesen Unit-Test zu erstellen, es gab aber einen Fehler. Generiere hier nur den korrigierten Unit-Test. ES DARF NUR DER CODE OHNE SONSTIGEN TEXT DAVOR ODER DANACH SEIN! \n
                Korrigiere die Unit-Tests basierend auf den folgenden Informationen:
                # Aufgabenstellung:\n
                ${taksdecription} \n
                # Die Musterlösung:
                ## Datei ${state.solution[state.solution.length - 1].codeFileName} \n
                ${state.solution[state.solution.length - 1].code}
                # Die fehlerhaften Unit-Tests:\n
                ${state.unitTest[state.unitTest.length - 1]} \n
                # Die aufgetauchte Fehlermeldung:\n
                ${ state.checkCodeError[state.checkCodeError.length - 1]} \n
                `),
          //new MessagesPlaceholder('messages'),
        ]);
      } else {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `
            Du bist Senior C++ Entwickler und Hochschuldozent. Im Rahmen eines Universitätskurses "Algorithmen und Datenstrukturen mit C++" erhalten Studierende Programmieraufgaben.
            Die Lösungen der Studierenden sollen durch Unit-Tests automatisch bewertet werden.
            Beachte, dass immer die folgenden zwei Zeilen am Anfang enthalten sein müssen:
            #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
            #define UNIT_TEST
            #include <JsonReporter.h>
            Erstelle auf Basis der Aufgabenstellung sowie der Musterlösung passende Unit-Tests. Die Unit-Tests sollen wie im Beispiel aufgebaut sein.
            Gib den Unit-Test als "String" wieder und markiere den Code nicht mit "'''cpp" oder ähnlichem. ES DARF NUR DER CODE OHNE SONSTIGEN TEXT DAVOR ODER DANACH SEIN!

            # 1. Beispiel:
                #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
                #define UNIT_TEST
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

            # 2. Beispiel:
                #define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
                #define UNIT_TEST
                #include <JsonReporter.h>
                #include "doctest.h"

                // Definiere UNIT_TEST, um die main-Funktion in Ausleihe.cpp auszuschließen
                #define UNIT_TEST
                #include "Ausleihe.cpp"

                TEST_CASE("Book-Klasse") {
                    Book book("Introduction to Algorithms", "Th. Cormen, Ch. Leiserson, R. Rivest", "0262531968");

                    SUBCASE("Getter-Funktionen") {
                        CHECK(book.getTitle() == "Introduction to Algorithms");
                        CHECK(book.getAuthor() == "Th. Cormen, Ch. Leiserson, R. Rivest");
                        CHECK(book.getISBN() == "0262531968");
                    }

                    SUBCASE("Setter-Funktionen") {
                        book.setTitle("Neuer Titel");
                        book.setAuthor("Neuer Autor");
                        book.setISBN("1234567890");
                        CHECK(book.getTitle() == "Neuer Titel");
                        CHECK(book.getAuthor() == "Neuer Autor");
                        CHECK(book.getISBN() == "1234567890");
                    }
                }

                TEST_CASE("Student-Klasse") {
                    Student student;
                    Book book1("Introduction to Algorithms", "Th. Cormen, Ch. Leiserson, R. Rivest", "0262531968");
                    Book book2("The C++ Programming Language", "Bjarne Stroustrup", "0201700735");

                    SUBCASE("Bücher hinzufügen und ausgeben") {
                        student.addBook(book1);
                        student.addBook(book2);
                        // Da printBooks() cout verwendet, können wir den Output nicht direkt testen, ohne cout umzuleiten.
                        // Wir stellen jedoch sicher, dass keine Ausnahmen geworfen werden.
                        CHECK_NOTHROW(student.printBooks());
                    }

                    SUBCASE("Buch entfernen") {
                        student.addBook(book1);
                        student.addBook(book2);
                        student.removeBook(book1);
                        CHECK_NOTHROW(student.printBooks());
                    }
                }

                        `),
          new HumanMessage(
            `Entwickle einen Unit-Test für eine Programmieraufgabe inklusive aller benötigten Imports zu der nachfolgenden Musterlösung. Generiere nur den Unit-Test ohne zusätzlichen Text. Der Unit-Test soll direkt ausführbar sein.
            # Musterlösung
            ## Datei ${ state.solution[state.solution.length - 1].codeFileName} \n
            ${state.solution[state.solution.length - 1].code} \n
            `,
          ),
          //new MessagesPlaceholder('messages'),
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

      const files = state.solution.reduce((acc, file) => {
        acc[file.codeFileName] = file.code;
        return acc;
      }, {} as { [codeFileName: string]: string });

      // Prepare the testFiles object
      const testFiles = { 'testFile': this.encodeBased64(unitTest) };
      // student code will be first searched for main method in submitCodeForExecutionCpp and transformed to base64 later

      const jury1Response: CodeSubmissionResult = await this.runCodeService.submitCodeForExecutionCpp(files, testFiles);


      const jury1ResponseString = JSON.stringify(jury1Response);


      if (jury1Response.testsPassed) {
        return {
          checkCodeErrorHappend: false,
          juryResponses: [jury1Response],
        };
      } else {
        return {
          checkCodeErrorHappend: true,
          checkCodeError: [jury1ResponseString], // wird an andere Knoten weitergegeben
          juryResponses: [jury1ResponseString], // nur für die Datenbank
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
    /*
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
*/
    //Erstelle einen Eintrag in der Datenbank, in welchem alle Daten als JSON-Objekt gespeichert werden

    var jsonData = {
      task: result.task,
      expectation: result.expectation,
      solution: result.solution[result.solution.length - 1],
      unitTest: result.unitTest[result.unitTest.length - 1],
      checkCodeInteration: result.checkCodeIteration,
      checkCodeErrorHappend: result.checkCodeErrorHappend,
      checkCodeError: result.checkCodeError,
      codeFramework: result.codeFramework,
      juryResponses: result.juryResponses,
      runMethod: result.runMethod,
      runMethodInput: result.runMethodInput,
      judgeTask: result.judgeTask
    };

    const genereatedCodingQuestion: CodingQuestionInternal = {
      id : -1, // temp - real value will be set by database
      count_InputArgs : 0, // none fpr cp tasks
      programmingLanguage : "CPP",
      mainFileName : "", // not needed for cpp tasks
      text : result.task,
      textHTML : result.task,
      codeGerueste : codeGerueste,
      expectations : result.expectation,
      automatedTests : [result.unitTest[result.unitTest.length - 1]],
      modelSolutions : [result.solution[result.solution.length - 1]]

    };

    console.log("RESULT:**************************************************************")
    console.log(jsonData);
    //const dbEntry = await this.createDatabaseEntry(jsonData);
    //console.log('Datenbank Eintrag erstellt - ID der Aufgabe: ', dbEntry.id);

    return genereatedCodingQuestion;
  }
}
