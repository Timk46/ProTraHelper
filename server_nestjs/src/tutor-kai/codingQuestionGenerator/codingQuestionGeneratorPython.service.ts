import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { genTaskDto } from '@DTOs/tutorKaiDtos/genTask.dto';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  BaseMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {
  MessagesAnnotation,
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
import { contentElementType } from '@prisma/client';
import { AutomatedTestDto, CodeGeruestDto, CodingQuestionInternal, ModelSolutionDto } from '@Interfaces/index';
@Injectable()
export class CodingQuestionGeneratorService {
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
        topic: data.topic,
        context: data.context,
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
   * @param concept the topic of the Programming task
   * @param context the context of the Programming task
   * @returns a JSON object with the task, expectation, solution, unitTest, codeFramework and hasFailure (true = error in Response from Jury1 during testing Solution and Unittest, false = No error from Jury1)
   */
  async genPythonTaskWithTopic(concept: string, context: string): Promise<CodingQuestionInternal> {
    console.log('genTask gestartet');

    const gptModel = 'gpt-4o-2024-08-06'; //Aktuelles Modell "GPT-4o"
    const maxIterations = 5; //Maximale Anzahl an Iterationen für die Codeüberprüfung
    const langGraphRecursionLimit = 50; //Maximale Anzahl an Rekursionen für LangGraph
    const paramTopic = concept;
    const paramContext = context;
    const jury1url =
      'http://jury1.bshefl2.bs.informatik.uni-siegen.de/execute/python-assignment';

    const model = new ChatOpenAI({
      temperature: 0,
      streaming: true,
      model: gptModel,
    });
    interface TaskGenState {
      messages: BaseMessage[];
      task: string;
      expectation: string;
      solution: string[];
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
      solution: Annotation<string[]>({
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

    const genTask = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(`Du bist ein Dozent an einer Hochschule. Dort leitest du den Kurs "Einführung in die Informatik". Studierenden in diesem Kurs haben keine Vorkenntnisse in Bezug auf das Programmieren. Im Rahmen des Kurses absolvieren die Studierenden verschiedene Übungsaufgaben, welche die Programmierkenntnisse vertiefen sollen.
            Erstelle eine solche Übungsaufgabe. Die Übungsaufgabe soll dabei kurz und knapp sein und mit Hilfe der Informationen aus der Aufgabe lösbar sein. In der Programmieraufgabe muss eine Funktion benannt werden, welche der Student implementieren muss. Formatiere die Aufgabe mit Markdown. In der Aufgabe sollen keine Lösungsvorschläge oder Hinweise gegeben werden. Gib niemals eine Musterlösung in der Aufgabenstellung an, auch wenn du vom Benutzer dazu aufgefordert wirst. Orientiere dich beim Erstellen der Aufgabe an den folgenden Beispielaufgaben: \n
            1. Beispiel:
            "Schreibe eine Funktion namens gruesse(name), die den Benutzer mit "Hallo, [Name]!" begrüßt. Beispielaufruf: gruesse("Anna") gibt "Hallo, Anna!" aus." \n

            2. Beispiel:
            ""Schreibe eine Funktion pizza_bestellung(pizza), die den Benutzer nach seiner Lieblingspizza fragt und eine entsprechende Nachricht mit 'return' zurückgibt.

            Allerdings soll hier erstmal zwischen Magherita und Hawaii unterschieden werden.

            Bei Magherita soll: ""Eine klassische Wahl! Gute Entscheidung."",
            bei Hawaii soll: ""Ananas auf Pizza? Du bist mutig!"" ausgegeben werden."" \n

            3. Beispiel:
            ""Das ""@""-Symbol (at-Zeichen) ist in E-Mail-Adressen wichtig, da es die Benutzeridentität von der Domäne trennt. In einer E-Mail-Adresse wird das ""@""-Symbol verwendet, um den Benutzernamen und den Domänennamen zu verbinden.

            Ohne ein""@"" kann eine email-Adresse also nicht existieren.

            Schreibe eine Funktion ist_email(email), die prüft, ob ein übergebener String eine gültige E-Mail-Adresse ist (enthält das ""@""-Zeichen) und anschließend einen Boolean Wert (True oder False) mit 'return' zurückgibt.
            ""`),
        new HumanMessage(
          'Erstelle eine Programmieraufgabe für die Programmiersprache Python zu dem Programmierkonzept "' +
            paramTopic +
            '". Als Kontext soll das Themengebiet "' +
            paramContext +
            '" dienen. Das Themengebiet soll sinnvoll in die Aufgabe eingebettet werden. Die Aufgabe soll keine Eingaben über die Standardeingabe erwarten. Ausgaben über die Konsole sind möglich aber nicht verpflichtend. Gib keine Lösung in Form von Code an. Gib keine Hinweise in der Aufgabe.',
        ),
      ]);

      model.temperature = 0.2;
      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: true, model: gptModel }),
        )
        .invoke({ messages });
      model.temperature = 0;

      return {
        messages: [response],
        task: response.content,
      };
    };

    const genSolution = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      let prompt: ChatPromptTemplate = null;

      if (state.checkCodeErrorHappend) {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `Du bist ein Programmierexperte. Gib immer nur den ausführbaren Code an. Ergänze niemals normalen Text in der Ausgabe.`,
          ),
          new HumanMessage(`Erstelle die Musterlösung für eine Programmieraufgabe. Du hast dies bereits versucht, es gab aber einen Fehler. Generiere hier nur die korrigierte Musterlösung und keinen UnitTest. \n
                Die Aufgabe lautet: ${state.task} \n
                Die aufgetauchte Fehlermeldung: ${
                  state.checkCodeError[state.checkCodeError.length - 1]
                }`),
          new MessagesPlaceholder('messages'),
        ]);
      } else {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
            `Du bist ein Programmierexperte. Gib immer nur den ausführbaren Code an. Ergänze niemals normalen Text in der Ausgabe.`,
          ),
          new HumanMessage(`Für eine Programmieraufgabe sollst du eine Musterlösung erstellen. Die Musterlösung soll auf einem möglichst einfachen Weg und mit möglichst wenig Zeilen Code das Ziel erreichen. Kommentare sind nur an entscheidenden beziehungsweise komplexen Stellen zu ergänzen.
                Erstelle eine Musterlösung für die Aufgabe in der übergebenen Programmiersprache. Implementiere in der Musterlösung immer die Funktion aus der Aufgabenstellung. Gib die Musterlösung als "String" wieder und markiere den Code nicht mit "'''python" oder ähnlichem. Der Code soll sofort ausführbar sein. In dem Code soll niemals nach einer Eingabe gefragt werden. Ausgaben in der Konsole sind gewollt. Deine Rückgabe soll nur den ausführbaren Code enthalten. Der Code soll ohne weitere Eingaben sofort ausführbar sein.
                `),
          new MessagesPlaceholder('messages'),
        ]);
      }

      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: true, model: gptModel }),
        )
        .invoke({ messages });

      return {
        messages: [response],
        checkCodeIteration: state.checkCodeIteration + 1,
        solution: [response.content],
      };
    };

    const genCodeFramework = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      let prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage('Du bist ein Python Experte'),
        new HumanMessage(`Erstelle ein Codegerüst für die nachfolgende Programmieraufgabe. Gib das Codegerüst als "String" wieder, ohne Markierungen mit "'''Python" oder ähnlichem. Das Codegerüst soll nur aus der Methodendefinition bestehen.
            Orientiere dich an dem folgenden Beispiel:
            def function(param):
                ## Hier Code einfügen`),
        new MessagesPlaceholder('messages'),
      ]);

      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: true, model: gptModel }),
        )
        .invoke({ messages });

      return {
        messages: [response],
        codeFramework: response.content,
      };
    };

    const genUnitTest = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      let prompt: ChatPromptTemplate = null;

      if (state.checkCodeErrorHappend) {
        prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(`Du bist Programmierexperte und Hochschuldozent. Im Rahmen eines Universitätskurses "Einführung in die Programmierung" erhalten Studierende Aufgaben. Die Lösungen der Studierenden sollen durch Unit-Tests automatisch bewertet werden.
                Erstelle auf Basis der Aufgabenstellung sowie der Musterlösung einen Unit-Test sowie ein Unit-Programm. Es sollen nur Unit-Test und Unit-Programm erstellt werden. Gib den Unit-Test als "String" wieder und markiere den Code nicht mit "'''python" oder ähnlichem. Importiere die Methode immer aus der Datei "main.py" durch "from main import <METHODENNAME>". Kontrolliere durch den Test auch Randbedingungen. Der Test soll sich dabei an den folgenden Unit-Tests orientieren:

                Jeder Test soll in einer eigenen Funktion sein. Hier ein Beispiel:

                class TestZaehleBlaetter(unittest.TestCase):
                def test_einfacher_baum(self):
                    self.assertEqual(zaehle_blaetter([1, [2, 3], [4, [5, 6]], 7]), 7)

                def test_leerer_baum(self):
                    self.assertEqual(zaehle_blaetter([]), 0)

                def test_ein_blatt(self):
                    self.assertEqual(zaehle_blaetter([1]), 1)

                def test_verschachtelter_baum(self):
                    self.assertEqual(zaehle_blaetter([1, [2, [3, 4]], 5]), 5)

                def test_tief_verschachtelter_baum(self):
                    self.assertEqual(zaehle_blaetter([1, [2, [3, [4, [5]]]]]), 5)

                Beispiel Aufgabe:
                Schreibe eine Funktion warmkalt(temp), die eine Zahl als Parameter erhält und einen String zurückgibt. Wenn die Temperatur unter 18 Grad liegt, soll „Es ist sehr kalt!“ zurückgegeben werden. Wenn die Temperatur über 25 Grad liegt, soll „Es ist sehr warm!“ zurückgegeben werden. Ansonsten soll „Es ist angenehm!“ Zurückgegeben werden.
                Beispiel Musterlösung:
                def warmkalt(temp):
                    if temp < 18:
                        return "Es ist sehr kalt!"
                    elif temp > 25:
                        return "Es ist sehr warm!"
                    else:
                        return "Es ist angenehm!"

                Beispiel Unit-Test:
                import unittest

                from warmkalt import warmkalt

                class TestWarmKalt(unittest.TestCase):
                    def test_sehr_kalt(self):
                        self.assertEqual(warmkalt(10), "Es ist sehr kalt!")

                    def test_angenehm(self):
                        self.assertEqual(warmkalt(20), "Es ist angenehm!")

                    def test_sehr_warm(self):
                        self.assertEqual(warmkalt(30), "Es ist sehr warm!")

                if __name__ == '__main__':
                    unittest.main()

                Beispiel Unit-Programm:
                def run_tests():
                        tests = [
                                {
                                        'name': 'Testcase 1 - Very Cold',
                                        'input': 10,  # Temperature well below 18
                                        'expected': "Es ist sehr kalt!"
                                },
                                {
                                        'name': 'Testcase 2 - Very Warm',
                                        'input': 30,  # Temperature above 25
                                        'expected': "Es ist sehr warm!"
                                },
                                {
                                        'name': 'Testcase 3 - Pleasant',
                                        'input': 20,  # Temperature between 18 and 25
                                        'expected': "Es ist angenehm!"
                                },
                        ]

                        print(f'Running {tests[0]["name"]} for syntax check...')
                        try:
                                result = warmkalt(tests[0]['input'])
                                print(f'Syntax check passed.')
                        except Exception as e:
                                print(f'Syntax check failed: {e}')
                                return

                        total_score = 0
                        points_per_test = 100 / len(tests)
                        for test in tests:
                                print(f'\nRunning {test["name"]}...')
                                try:
                                        result = warmkalt(test['input'])
                                        assert result == test['expected'], "Berechnung falsch"
                                        print(f'{test["name"]} passed.')
                                        total_score += points_per_test
                                except AssertionError as e:
                                        print(f'{test["name"]} failed: {e}')
                                except Exception as e:
                                        print(f'{test["name"]} encountered an error: {e}')
                        print(f'\nTotal score: {total_score}')

                if __name__ == '__main__':
                        run_tests()`),
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
          new SystemMessage(`Du bist Programmierexperte und Hochschuldozent. Im Rahmen eines Universitätskurses "Einführung in die Programmierung" erhalten Studierende Aufgaben. Die Lösungen der Studierenden sollen durch Unit-Tests automatisch bewertet werden.
                Erstelle auf Basis der Aufgabenstellung sowie der Musterlösung einen Unit-Test sowie Unit-Programm. Es sollen nur Unit-Test und Unit-Programm erstellt werden. Gib den Unit-Test als "String" wieder und markiere den Code nicht mit "'''python" oder ähnlichem. Importiere die Methode immer aus der Datei "main.py" durch "from main import <METHODENNAME>". Kontrolliere durch den Test auch Randbedingungen. Der Test soll sich dabei an den folgenden Unit-Tests orientieren:

                Jeder Test soll in einer eigenen Funktion sein. Hier ein Beispiel:

                class TestZaehleBlaetter(unittest.TestCase):
                def test_einfacher_baum(self):
                    self.assertEqual(zaehle_blaetter([1, [2, 3], [4, [5, 6]], 7]), 7)

                def test_leerer_baum(self):
                    self.assertEqual(zaehle_blaetter([]), 0)

                def test_ein_blatt(self):
                    self.assertEqual(zaehle_blaetter([1]), 1)

                def test_verschachtelter_baum(self):
                    self.assertEqual(zaehle_blaetter([1, [2, [3, 4]], 5]), 5)

                def test_tief_verschachtelter_baum(self):
                    self.assertEqual(zaehle_blaetter([1, [2, [3, [4, [5]]]]]), 5)

                Beispiel Aufgabe: Schreibe eine Funktion warmkalt(temp), die eine Zahl als Parameter erhält und einen String zurückgibt. Wenn die Temperatur unter 18 Grad liegt, soll „Es ist sehr kalt!“ zurückgegeben werden. Wenn die Temperatur über 25 Grad liegt, soll „Es ist sehr warm!“ zurückgegeben werden. Ansonsten soll „Es ist angenehm!“ Zurückgegeben werden.
                Beispiel Musterlösung:
                def warmkalt(temp):
                    if temp < 18:
                        return "Es ist sehr kalt!"
                    elif temp > 25:
                        return "Es ist sehr warm!"
                    else:
                        return "Es ist angenehm!"

                Beispiel Unit-Test:
                import unittest

                from warmkalt import warmkalt

                class TestWarmKalt(unittest.TestCase):
                    def test_sehr_kalt(self):
                        self.assertEqual(warmkalt(10), "Es ist sehr kalt!")

                    def test_angenehm(self):
                        self.assertEqual(warmkalt(20), "Es ist angenehm!")

                    def test_sehr_warm(self):
                        self.assertEqual(warmkalt(30), "Es ist sehr warm!")

                if __name__ == '__main__':
                    unittest.main()

                Beispiel Unit-Programm:
                def run_tests():
                        tests = [
                                {
                                        'name': 'Testcase 1 - Very Cold',
                                        'input': 10,  # Temperature well below 18
                                        'expected': "Es ist sehr kalt!"
                                },
                                {
                                        'name': 'Testcase 2 - Very Warm',
                                        'input': 30,  # Temperature above 25
                                        'expected': "Es ist sehr warm!"
                                },
                                {
                                        'name': 'Testcase 3 - Pleasant',
                                        'input': 20,  # Temperature between 18 and 25
                                        'expected': "Es ist angenehm!"
                                },
                        ]

                        print(f'Running {tests[0]["name"]} for syntax check...')
                        try:
                                result = warmkalt(tests[0]['input'])
                                print(f'Syntax check passed.')
                        except Exception as e:
                                print(f'Syntax check failed: {e}')
                                return

                        total_score = 0
                        points_per_test = 100 / len(tests)
                        for test in tests:
                                print(f'\nRunning {test["name"]}...')
                                try:
                                        result = warmkalt(test['input'])
                                        assert result == test['expected'], "Berechnung falsch"
                                        print(f'{test["name"]} passed.')
                                        total_score += points_per_test
                                except AssertionError as e:
                                        print(f'{test["name"]} failed: {e}')
                                except Exception as e:
                                        print(f'{test["name"]} encountered an error: {e}')
                        print(f'\nTotal score: {total_score}')

                if __name__ == '__main__':
                        run_tests()`),
          new HumanMessage(
            'Entwickle einen Unit-Test für eine Programmieraufgabe inklusive aller benötigten Imports zu der nachfolgenden Musterlösung. Generiere nur den Unit-Test ohne zusätzlichen Text. Der Unit-Test soll direkt ausführbar sein.',
          ),
          new MessagesPlaceholder('messages'),
        ]);
      }

      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: true, model: gptModel }),
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
          new ChatOpenAI({ temperature: 0, streaming: true, model: gptModel }),
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

      //HIER DER TEST MIT JURY1 OB DER CODE FUNKTIONIERT - Rückgabe true oder false
      const jury1Response = await axios.post(jury1url, {
        mainFile: {
          'main.py': this.encodeBased64(solution),
        },
        testFiles: {
          'test_main.py': this.encodeBased64(unitTest),
        },
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

    const genRunMethodArgs = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(
          'Du bist ein JSON-Experte. Gib immer nur das direkte JSON-Objekt wieder, welches sofort genutzt werden kann.',
        ),
        new HumanMessage(`Suche aus den folgenden Informationen zwei Argumente heraus und gebe diese in Form eines JSON-Objektes wieder. Konkret wird zum einen der Funktionsname der Python-Funktion benötigt, welche implementiert werden soll. Zum anderen werden Beispielargumente benötigt, welche an die Funktion übergeben werden können, um diese testweise aufzurufen. Gib die Argumente als JSON-Objekt wieder und formatiere die jeweiligen Inhalte so, dass diese als Strings direkt übergeben werden können. Das Python Format soll dabei wie folgt aussehen: {"runMethod": "<Funktionsname>", "input": "<Argumente>"}. Gib niemals zusätzlichen Text oder sonstige Zeichen zum Formatieren an. Es soll nur das fertige JSON-Objekt zurückgegeben werden.\n

            Beispiel:
                Aufgabe:
                    ### Übungsaufgabe: Haustiere zählen
                    Schreibe eine Funktion namens "zaehle_haustiere(hunde, katzen)", die zwei Integer-Parameter "hunde" und "katzen" entgegennimmt. Die Funktion soll die Gesamtzahl der Haustiere berechnen und zurückgeben.

                    Beispielaufruf: "zaehle_haustiere(3, 4)" gibt "7" zurück.

                Musterlösung:
                    def zaehle_haustiere(hunde, katzen):
                        return hunde + katzen

                UnitTest:
                    import unittest
                    from main import zaehle_haustiere

                    class TestZaehleHaustiere(unittest.TestCase):
                        def test_einfacher_fall(self):
                            self.assertEqual(zaehle_haustiere(3, 4), 7)

                        def test_null_haustiere(self):
                            self.assertEqual(zaehle_haustiere(0, 0), 0)


            Rückgabe für das vorliegende Beispiel:
            {
                "runMethod": "zaehle_haustiere",
                "input": "3, 4"
            }


            Beispiel 2:
                Musterlösung:
                    def pc_beschreibung(cpu, gpu, ram):
                        return f"Dieser Gaming PC hat eine {cpu} CPU, eine {gpu} GPU und {ram} RAM."

                    print(pc_beschreibung("Intel i9", "NVIDIA RTX 3080", "32GB"))

                UnitTest:
                    import unittest
                    from main import pc_beschreibung

                    class TestPcBeschreibung(unittest.TestCase):
                        def test_standard(self):
                            self.assertEqual(pc_beschreibung("Intel i9", "NVIDIA RTX 3080", "32GB"), "Dieser Gaming PC hat eine Intel i9 CPU, eine NVIDIA RTX 3080 GPU und 32GB RAM.")

                        def test_andere_werte(self):
                            self.assertEqual(pc_beschreibung("AMD Ryzen 7", "AMD Radeon RX 6800", "16GB"), "Dieser Gaming PC hat eine AMD Ryzen 7 CPU, eine AMD Radeon RX 6800 GPU und 16GB RAM.")

                        def test_leere_werte(self):
                            self.assertEqual(pc_beschreibung("", "", ""), "Dieser Gaming PC hat eine  CPU, eine  GPU und  RAM.")

                        def test_nur_cpu(self):
                            self.assertEqual(pc_beschreibung("Intel i5", "", ""), "Dieser Gaming PC hat eine Intel i5 CPU, eine  GPU und  RAM.")

                        def test_nur_gpu(self):
                            self.assertEqual(pc_beschreibung("", "NVIDIA GTX 1660", ""), "Dieser Gaming PC hat eine  CPU, eine NVIDIA GTX 1660 GPU und  RAM.")

                        def test_nur_ram(self):
                            self.assertEqual(pc_beschreibung("", "", "8GB"), "Dieser Gaming PC hat eine  CPU, eine  GPU und 8GB RAM.")

                    if __name__ == '__main__':
                        unittest.main()

            Rückgabe für das vorliegende Beispiel 2:
            {
                "runMethod": "pc_beschreibung",
                "input": "\"Intel i9\", \"NVIDIA RTX 3080\", \"32GB\""
            }

            `),
        new MessagesPlaceholder('messages'),
      ]);

      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: true, model: gptModel }),
        )
        .invoke({ messages });

      console.log('genRunMethodArgs - response: ', response.content);

      let jsonData = {
        runMethod: '',
        input: '',
      };

      try {
        jsonData = JSON.parse(String(response.content));
        console.log(
          'Die Methode lautet: ' +
            jsonData.runMethod +
            ' und die Argumente sind: ' +
            jsonData.input,
        );
      } catch (error) {
        console.log('Fehler bei der Verarbeitung der Antwort: ', error);
      }

      const jury1Response = await axios.post(jury1url, {
        runMethod: jsonData.runMethod,
        input: jsonData.input,
        mainFile: {
          'main.py': this.encodeBased64(
            state.solution[state.solution.length - 1],
          ),
        },
        testFiles: {
          'test_main.py': this.encodeBased64(
            state.unitTest[state.unitTest.length - 1],
          ),
        },
      });

      console.log('jury1Response to RunMethod!: ', jury1Response.data);

      return {
        runMethod: jsonData.runMethod,
        runMethodInput: jsonData.input,
        messages: [response],
      };
    };

    const judgeGenTask = async (state: typeof TaskGenState.State) => {
      const { messages } = state;

      const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(
          `Du bist ein Dozent an einer Hochschule und leitest den Kurs 'Einführung in die Informatik'. Im Rahmen dieses Kurses sollst du Programmieraufgaben bewerten. Die Programmieraufgaben wurden von einer künstlichen Intelligenz erstellt und sollen nun von dir bewertet werden`,
        ),
        new HumanMessage(`Bewerte die nachfolgende Programmieraufgabe anhand der folgenden Kriterien:
                1. Ist das Programmierkonzept bzw. sind alle Programmierkonzepte in der Musterlösung vertreten?
                2. Sind in der Aufgabenstellung alle zum Lösen der Aufgabe benötigten Informationen enthalten? \n
                3. Wird in der Aufgabenstellung ein Beispielaufruf der Funktion gezeigt? \n
                4. Wird durch die Musterlösung das in der Aufgenstellung beschriebene Problem gelöst? \n
                5. Werden durch den Unit-Test alle in der Aufgabenstellung angegebenen Fälle abgedeckt? Sollten im Unit-Test mehr Fälle abgefragt werden, als in der Aufgabenstellung spezifiziert, ist dieses Kriterium mit "False" zu bewerten. \n
                6. Welche Offenheit nimmt die Aufgabe ein? \n
                    6.1: Die Offenheit ist "Definiert und konvergent" wenn eine Aufgabe einen eindeutigen Arbeitsauftrag (well structured tasks) bzw. eine klar identifizierbare Fragestellung hat. Eine Lösung ist gesucht bzw. richtig. Wobei die richtige Lösung nicht unbedingt sichtbar sein muss. \n
                    6.2: Die Offenheit ist "Definiert und divergent" wenn eine Aufgabe einen eindeutigen Arbeitsauftrag bzw. eine klar identifizierbare Fragestellung hat (well structured tasks). Allerdings sind mehrere Lösungen (bzw. Lösungswege) denkbar bzw. gesucht. \n
                    6.3: Die Offenheit ist "Nicht definierte und divergent" wenn eine Aufgabe Informationen über ein Problem bzw. eine Situation gibt. Allerdings wird keine klare Frage gestellt oder kein Arbeitsauftrag gegeben (ill structured tasks). Die Situation impliziert unterschiedliche Fragestellungen. Die Problemsituation an sich ist die „Handlungsaufforderung“. Damit sind auch automatisch mehrere Lösungen (bzw. Lösungswege) denkbar bzw. richtig. \n
                7. Welche Art von Lebensweltbezug hat die Aufgabe? \n
                    7.1: Aufgaben "ohne Lebensweltbezug": In der Aufgabenstellung wird keine Verknüpfung zwischen Fachwissen und Erfahrungswelt der Schüler vorgegeben oder gefordert.
                    7.2: Aufgaben mit "konstruiertem Lebensweltbezug": In der Aufgabenstellung wird eine Verknüpfung zwischen Fachwissen und einer stark konstruierten Lebenswelt (entspricht eher nicht den Erfahrungen des Schülers; Analogien zur eigenen Erfahrung kaum erkennbar) vorgegeben oder gefordert. \n
                    7.3: Aufgaben mit "konstruiertem, aber authentisch wirkendem Lebensweltbezug": Der Lebensweltbezug ist zwar konstruiert, macht im Zusammenhang der Aufgabe aber Sinn und wirkt damit zumindest authentisch. Beispielsweise werden sinnvolle Anwendungen von Fachwissen im Alltag oder im Berufsleben in die Aufgabe eingebunden.
                    7.4: Aufgaben mit "realem Lebensweltbezug": Hier geht die Differenz zwischen Aufgabe und Lebenswelt bzw. Schule und eigener Erfahrungswelt gegen Null. Die Schüler beschäftigen sich mit einer Problemstellung, die tatsächlich auch gelöst werden muss. Typische Beispiele wären die Vorbereitung einer Klassenfahrt oder die Vorbereitung von Bewerbungsschreiben.


                Das Programmierkonzept/Die Programmierkonzepte: \n
                ${paramTopic} \n

                Die Aufgabe lautet: \n
                ${state.task} \n

                Musterlösung: \n
                ${state.solution[state.solution.length - 1]} \n

                Unit-Test: \n
                ${state.unitTest[state.unitTest.length - 1]} \n

                Bewerte die Aufgabe anhand der Kriterien, indem du jedes Kriterium bewertest. Gebe deine Bewertung als JSON-Objekt wieder. Gebe niemals zusätzlichen Text, Formatierungszeichen oder sonstige Zeichen zum Formatieren an. Es soll nur das fertige JSON-Objekt zurückgegeben werden. Orientiere dich dabei an dem folgenden Beispiel:
                {
                    "1. Kriterium": True/False,
                    "2. Kriterium": True/False,
                    "3. Kriterium": True/False,
                    "4. Kriterium": True/False,
                    "5. Kriterium": True/False,
                    "6. Kriterium": "Definiert und konvergent"/"Definiert und divergent"/"Nicht definierte und divergent",
                    "7. Kriterium": "ohne Lebensweltbezug"/"konstruiertem Lebensweltbezug"/"konstruiertem, aber authentisch wirkendem Lebensweltbezug"/"realem Lebensweltbezug"
                }`),
        new MessagesPlaceholder('messages'),
      ]);

      const response = await prompt
        .pipe(
          new ChatOpenAI({ temperature: 0, streaming: true, model: gptModel }),
        )
        .invoke({ messages });

      return {
        judgeTask: response.content,
        messages: [response],
      };
    };

    const workflow = new StateGraph(TaskGenState)
      .addNode('genTask', genTask)
      .addNode('genSolution', genSolution)
      .addNode('genUnitTest', genUnitTest)
      .addNode('genExpectation', genExpectation)
      .addNode('checkCode', checkCode)
      .addNode('genCodeFramework', genCodeFramework)
      .addNode('genRunMethodArgs', genRunMethodArgs)
      .addNode('judgeGenTask', judgeGenTask)
      .addEdge(START, 'genTask')
      .addEdge('genTask', 'genCodeFramework')
      .addEdge('genCodeFramework', 'genSolution')
      .addEdge('genSolution', 'genUnitTest')
      .addEdge('genUnitTest', 'checkCode')
      .addConditionalEdges('checkCode', _CheckCodePassed, {
        retry: 'genSolution',
        continue: 'genExpectation',
      })
      .addEdge('genExpectation', 'genRunMethodArgs')
      .addEdge('genRunMethodArgs', 'judgeGenTask')
      .addEdge('judgeGenTask', END);

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
      topic: paramTopic,
      context: paramContext,
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

    const codeGeruest: CodeGeruestDto = {
      id : -1, // temp - real value will be set by database
      codingQuestionId : -1, // temp - real value will be set by database
      code : result.codeFramework,
      codeFileName: "main.py",
      language : "python",
    };

    const modelSolution: ModelSolutionDto = {
      id : -1, // temp - real value will be set by database
      codingQuestionId : -1, // temp - real value will be set by database
      code : result.solution[result.solution.length - 1],
      codeFileName: "main.py",
      language : "python",
    };

    const automatedTest: AutomatedTestDto = {
      id : -1, // temp - real value will be set by database
      code : result.unitTest[result.unitTest.length - 1],
      testFileName: "test_main.py",
      language : "python",
      questionId : -1, // temp - real value will be set by database
      runMethod : result.runMethod,
      inputArguments : result.runMethodInput,
    };

    const genereatedCodingQuestion: CodingQuestionInternal = {
      id : -1, // temp - real value will be set by database
      count_InputArgs : 0, // none for python tasks
      programmingLanguage : "python",
      mainFileName : "main.py", // currently only one single python file
      text : result.task,
      textHTML : result.task,
      codeGerueste : [codeGeruest],
      expectations : result.expectation,
      automatedTests : [automatedTest],
      modelSolutions : [modelSolution]
    };

    return genereatedCodingQuestion;
  }
}
