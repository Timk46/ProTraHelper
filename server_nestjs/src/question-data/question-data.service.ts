/* eslint-disable prettier/prettier */
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { ContentService } from '@/content/content.service';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDTO, questionType, detailedQuestionDTO, FillinQuestionDTO, editorDataDTO, taskSettingsDTO } from '@DTOs/index';
import { UserAnswerDataDTO, userAnswerFeedbackDTO, UserFillinAnswer } from '@DTOs/userAnswer.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QuestionDataChoiceService } from './question-data-choice/question-data-choice.service';
import { QuestionDataCodeService } from './question-data-code/question-data-code.service';
import { QuestionDataFillinService } from './question-data-fillin/question-data-fillin.service';
import { QuestionDataFreetextService } from './question-data-freetext/question-data-freetext.service';
import { QuestionDataGraphService } from './question-data-graph/question-data-graph.service';
import { GraphSolutionEvaluationService } from '@/graph-solution-evaluation/graph-solution-evaluation.service';
import { QuestionDataUmlService } from './question-data-uml/question-data-uml.service';
import { QuestionDataCodeGameService } from '@/question-data/question-data-code-game/question-data-code-game.service';
import { QuestionDataUploadService } from './question-data-upload/question-data-upload.service';
import { ProductionFilesService } from '@/files/production-files.service';

@Injectable()
export class QuestionDataService {
  constructor(
    private prisma: PrismaService,
    private feedbackGenerationService: FeedbackGenerationService,
    private contentService: ContentService,
    private qdChoice: QuestionDataChoiceService,
    private qdCode: QuestionDataCodeService,
    private qdFillin: QuestionDataFillinService,
    private qdFreetext: QuestionDataFreetextService,
    private qdGraph: QuestionDataGraphService,
    private graphEvalService: GraphSolutionEvaluationService,
    private qdUml: QuestionDataUmlService,
    private qdCodeGame: QuestionDataCodeGameService,
    private qdUpload: QuestionDataUploadService,
    private productionFilesService: ProductionFilesService
  ) {}

  /**
   * @description Retrieves a question by its ID.
   * @param {number} questionId - The ID of the question.
   * @returns {Promise<QuestionDTO>} the question data
   */
  async getQuestion(questionId: number): Promise<QuestionDTO> {
    const question = await this.prisma.question.findUnique({
      where: {
        id: Number(questionId)
      }
    });

    if(!question) {
      throw new Error('Question ' + questionId + ' not found');
    }

    const questionData: QuestionDTO = {
      id: question.id,
      name: question.name,
      description: question.description,
      score: question.score,
      type: question.type,
      text: question.text,
      isApproved: question.isApproved,
      originId: question.originId,
      conceptNodeId: question.conceptNodeId || undefined,
      level: question.level,
    };

    return questionData;
  }


  /**
   * @description Retrieves a detailed question by its ID and type. Primarily used in the lecturers view.
   * @param {number} questionId - The ID of the question to retrieve.
   * @param {string} questionTypeStr - The type of the question.
   * @returns {Promise<detailedQuestionDTO>} A promise that resolves to a detailedQuestionDTO object representing the detailed question.
   * @throws An error if the question with the specified ID is not found.
   */
  async getDetailedQuestion(questionId: number, questionTypeStr: string): Promise<detailedQuestionDTO> {
    const question = await this.prisma.question.findUnique({
      where: {
        id: Number(questionId)
      },
    });

    if(!question) {
      throw new Error('Question ' + questionId + ' not found');
    }

    let specificQuestionData;

    switch (questionTypeStr) {
      case questionType.CODE:
        specificQuestionData = await this.prisma.codingQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          },
          include: {
            codeGerueste: true,
            automatedTests: true,
            modelSolutions: true
          }
        });
        break;
      case questionType.FREETEXT:
        specificQuestionData = await this.prisma.freeTextQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          }
        });
        break;
      case questionType.MULTIPLECHOICE:
      case questionType.SINGLECHOICE:
        const mcQuestion = await this.prisma.mCQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          }
        });
        if (mcQuestion) {
          const mcOptions = await this.prisma.mCQuestionOption.findMany({
            where: {
              mcQuestionId: mcQuestion.id
            }, select: {
              option: true
            }
          });
          specificQuestionData = {
            ...mcQuestion,
            mcOptions: mcOptions.map(option => option.option)
          };
        }
        break;
      case questionType.FILLIN:
        specificQuestionData = await this.prisma.fillinQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          },
          include: {
            blanks: true
          }
        });
        break;
      case questionType.GRAPH:
        specificQuestionData = await this.prisma.graphQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          }
        });
        break;
      case questionType.UML:
        const questionData = await this.prisma.umlQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          }
        });
        if (!questionData) {
          specificQuestionData = undefined;
          break;
        }
        specificQuestionData = {
          ...questionData,
          editorData: questionData.editorData as unknown as editorDataDTO,
          startData: questionData.startData as unknown as editorDataDTO,
          taskSettings: questionData.taskSettings as unknown as taskSettingsDTO,
        };
        break;
      case questionType.CODEGAME:
        specificQuestionData = await this.prisma.codeGameQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          },
          include: {
            codeGameScaffolds: true,
          }
        });
        break;
      case questionType.UPLOAD:
        specificQuestionData = await this.prisma.uploadQuestion.findFirst({
          where: {
            questionId: Number(questionId)
          }
        });
        break;
    }

    console.log('specificQuestionData: ', specificQuestionData);

    const questionData: detailedQuestionDTO = {
      ...question,
      type: questionTypeStr as questionType,
      codingQuestion: questionTypeStr === questionType.CODE ? specificQuestionData : undefined,
      freetextQuestion: questionTypeStr === questionType.FREETEXT ? specificQuestionData : undefined,
      mcQuestion: (questionTypeStr === questionType.MULTIPLECHOICE || questionTypeStr === questionType.SINGLECHOICE) ? specificQuestionData : undefined,
      fillinQuestion: questionTypeStr === questionType.FILLIN ? specificQuestionData : undefined,
      graphQuestion: questionTypeStr === questionType.GRAPH ? specificQuestionData : undefined,
      umlQuestion: questionTypeStr === questionType.UML ? specificQuestionData : undefined,
      codeGameQuestion: questionTypeStr === questionType.CODEGAME ? specificQuestionData : undefined,
      uploadQuestion: questionTypeStr === questionType.UPLOAD ? specificQuestionData : undefined,
    };

    return questionData;
  }


  /**
   * @description Retrieves the newest user answer for a specific question and user.
   * @param {number} questionId - The ID of the question.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<UserAnswerDataDTO>} A promise that resolves to a UserAnswerDataDTO object representing the newest user answer.
   */
  async getNewestUserAnswer(questionId: number, userId: number): Promise<UserAnswerDataDTO> {
    const userAnswer = await this.prisma.userAnswer.findFirst({
      where: {
        questionId: questionId,
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    if (!userAnswer) {
      return {
        id: -1,
        questionId: questionId,
        userId: userId
      };
    }

    return {
      id: userAnswer.id,
      questionId: userAnswer.questionId,
      userId: userAnswer.userId,
      userFreetextAnswer: userAnswer.userFreetextAnswer || undefined,
      userFreetextAnswerRaw: undefined,
      userGraphAnswer: JSON.parse(JSON.stringify(userAnswer.userGraphAnswer)) || undefined,
      userMCAnswer: (await this.prisma.userMCOptionSelected.findMany({
        where: {
          userAnswerId: userAnswer.id
        }
      })).map((option) => option.mcOptionId)
    };
  }


  /**
   * @description Creates a new question. Also works for version control.
   * @param {QuestionDTO} question - The question data.
   * @param {number} authorId - The ID of the author.
   * @returns {Promise<QuestionDTO>} A promise that resolves to the created question.
   * @throws An error if the concept node is not defined or if the question is not created.
   */
  async createQuestion(question: QuestionDTO, authorId: number): Promise<QuestionDTO> {
      console.log("question origin Id", question.originId);

      let newQuestion = await this.prisma.question.create({
          data: {
              name: question.name || 'New Question',
              author:  {connect: {id: authorId}},
              description: question.description || null,
              score: question.score || 100,
              type: question.type as questionType,
              level: question.level,
              mode: question.mode || 'practise',
              text: question.text,
              isApproved: question.isApproved || false,
              version: question.version || 1,
              //origin has to be set in the next step
              conceptNode: {connect: {id: question.conceptNodeId}},
          }
      });

      newQuestion = await this.prisma.question.update({
        where: {
          id: newQuestion.id
        },
        data: {
          originId: question.originId || newQuestion.id
        }
      });

      if(!newQuestion) {
          throw new Error('Question not created');
      }

      return newQuestion;
  }


  /**
   * @description Updates a whole question.
   * @param {detailedQuestionDTO} question - The detailed question object to be updated.
   * @param {number} authorId - The ID of the author.
   * @param {boolean} createNewVersion - Optional. Indicates whether to create a new version of the question. Default is false.
   * @returns {Promise<detailedQuestionDTO>} A promise that resolves to the updated detailed question object.
   * @throws Error if the question is not updateable.
   */
  async updateWholeQuestion(question: detailedQuestionDTO, authorId: number, createNewVersion: boolean = false): Promise<detailedQuestionDTO> {
    const currentQuestion = await this.getDetailedQuestion(question.id, question.type as questionType);

    if (!this.detailedQuestionsUpdateable(currentQuestion, question)) {
      console.log('currentQuestion: ', currentQuestion);
      console.log('newQuestion: ', question);
      throw new Error('Question not updateable');

    }

    let updatedQuestion = null;
    // if createNewVersion is true, we create a new version of the question
    if (createNewVersion) {
      updatedQuestion = await this.prisma.question.create({
        data: {
          name: question.name,
          description: question.description,
          score: question.score,
          type: question.type as questionType,
          level: question.level,
          mode: question.mode,
          author: {connect: {id: authorId}},
          text: question.text,
          isApproved: question.isApproved,
          version: currentQuestion.version + 1,
          origin: {connect: {id: currentQuestion.originId}},
          conceptNode: question.conceptNodeId? {connect: {id: question.conceptNodeId}}: (currentQuestion.conceptNodeId? {connect: {id: currentQuestion.conceptNodeId}}: undefined),
        }
      });

    // if versions are equal, we update the question
    } else if (currentQuestion.version === question.version) {
      updatedQuestion = await this.prisma.question.update({
        where: {
          id: question.id
        },
        data: {
          updatedAt: new Date(),
          name: question.name,
          description: question.description,
          score: question.score,
          type: question.type as questionType,
          level: question.level,
          mode: question.mode,
          text: question.text,
          isApproved: question.isApproved,
          conceptNode: question.conceptNodeId? {connect: {id: question.conceptNodeId}}: (currentQuestion.conceptNodeId? {connect: {id: currentQuestion.conceptNodeId}}: undefined),
        }
      });
    }

    // we also need to update the awards level
    const contentNodes = await this.prisma.contentView.findMany({
      where: {
        contentElement: {
          questionId: question.originId
        }
      }
    });

    for (const contentNode of contentNodes) {
      if (contentNode.contentNodeId) {
        await this.contentService.updateAwardsLevel(contentNode.contentNodeId);
      } else {
        console.log('Cannot update awards for content node ' + contentNode.contentNodeId);
      }
    }

    switch (question.type) {
      case questionType.FREETEXT:
        if (createNewVersion || !currentQuestion.freetextQuestion) {
          await this.qdFreetext.createFreeTextQuestion(question.freetextQuestion, updatedQuestion.id);
        } else {
          await this.qdFreetext.updateFreeTextQuestion(question.freetextQuestion);
        }
        break;
      case questionType.MULTIPLECHOICE:
      case questionType.SINGLECHOICE:
        if (createNewVersion || !currentQuestion.mcQuestion) {
          await this.qdChoice.createChoiceQuestion(question.mcQuestion);
        } else {
          await this.qdChoice.updateChoiceQuestion(question.mcQuestion);
        }
        break;
      case questionType.CODE:
        if (createNewVersion || !currentQuestion.codingQuestion) {
          await this.qdCode.createCodingQuestion(question.codingQuestion, updatedQuestion.id);
        } else {
          await this.qdCode.updateCodingQuestion(question.codingQuestion);
        }
        break;
      case questionType.GRAPH:
        if (createNewVersion || !currentQuestion.graphQuestion) {
          await this.qdGraph.createGraphQuestion(question.graphQuestion, updatedQuestion.id);
        } else {
          await this.qdGraph.updateGraphQuestion(question.graphQuestion);
        }
        break;
      case questionType.FILLIN:
        if (createNewVersion || !currentQuestion.fillinQuestion) {
          await this.qdFillin.createFillinQuestion(question.fillinQuestion, updatedQuestion.id);
        } else {
          await this.qdFillin.updateFillinQuestion(question.fillinQuestion);
        }
        break;
      case questionType.UML:
        if (createNewVersion || !currentQuestion.umlQuestion) {
          await this.qdUml.createUmlQuestion(question.umlQuestion, updatedQuestion.id);
        } else {
          await this.qdUml.updateUmlQuestion(question.umlQuestion);
        }
        break; // Hinzugefügtes break-Statement, um das "Durchfallen" in den CODEGAME-Fall zu verhindern
      case questionType.CODEGAME:
        if (createNewVersion || !currentQuestion.codeGameQuestion) {
          await this.qdCodeGame.createCodeGameQuestion(question.codeGameQuestion, updatedQuestion.id);
        } else {
          await this.qdCodeGame.updateCodeGameQuestion(question.codeGameQuestion);
        }
        break;
      case questionType.UPLOAD:
        if (createNewVersion || !currentQuestion.uploadQuestion) {
          await this.qdUpload.createUploadQuestion(question.uploadQuestion, updatedQuestion.id);
        } else {
          await this.qdUpload.updateUploadQuestion(question.uploadQuestion);
        }
        break;
    }

    return await this.getDetailedQuestion(updatedQuestion.id, question.type as questionType);
  }


  /**
   * @description Checks if the detailed questions can be updated based on certain conditions.
   * @param {detailedQuestionDTO} currQuestion - The current detailed question data transfer object.
   * @param {detailedQuestionDTO} newQuestion - The new detailed question data transfer object.
   * @returns {boolean} `true` if the detailed questions are updateable, `false` otherwise.
   */
  private detailedQuestionsUpdateable(currQuestion: detailedQuestionDTO, newQuestion: detailedQuestionDTO): boolean {
    if (
      currQuestion &&
      newQuestion &&
      (currQuestion.type === newQuestion.type ||
        (currQuestion.type === questionType.MULTIPLECHOICE && newQuestion.type === questionType.SINGLECHOICE) ||
        (currQuestion.type === questionType.SINGLECHOICE && newQuestion.type === questionType.MULTIPLECHOICE)
      ) &&
      currQuestion.version <= newQuestion.version &&
      (
        newQuestion.codingQuestion ||
        newQuestion.freetextQuestion ||
        newQuestion.mcQuestion ||
        newQuestion.fillinQuestion ||
        newQuestion.graphQuestion ||
        newQuestion.umlQuestion ||
        newQuestion.codeGameQuestion ||
        newQuestion.uploadQuestion
      )
    ){
      return true;
    }
    return false;
  }


  /**
   * @description Creates a new user answer and generates feedback for it.
   * @param {number} userId - The ID of the user.
   * @param {UserAnswerDataDTO} answerData - The user answer data.
   * @returns {Promise<userAnswerFeedbackDTO>} A promise that resolves to the new user answer feedback.
   */
  async createUserAnswer(userId: number, answerData: UserAnswerDataDTO) : Promise<userAnswerFeedbackDTO> {
    console.log('create user answer: '+userId + ' ' + answerData.questionId + ' ' + answerData.contentElementId);

    const createdData = await this.prisma.userAnswer.create({
      data: {
          userId: userId,
          questionId: answerData.questionId,
          //if answerData has a userFreetextAnswer, use it, else use null
          userFreetextAnswer: answerData.userFreetextAnswer ?? null,
          //if answerData has a userGraphAnswer, use it, else use null
          userGraphAnswer: answerData.userGraphAnswer ? JSON.parse(JSON.stringify(answerData.userGraphAnswer)) : null,
      }
    });

    if (!createdData) throw new Error('Could not create userAnswer');

    //connect all mc options
    if (answerData.userMCAnswer) {
      for (const mcOptionId of answerData.userMCAnswer) {
        await this.qdChoice.createUserMCOptionSelected(createdData.id, mcOptionId);
      }
    }

    const question = await this.getQuestion(answerData.questionId);
    if (!question) throw new Error('Could not get question');
    const detailedQuestion = await this.getDetailedQuestion(answerData.questionId, question.type);
    if (!detailedQuestion) throw new Error('Could not get detailed question');


    //generate feedback for user answer
    if (question.type === questionType.MULTIPLECHOICE) {
      console.log('generate feedback for multiple choice user answer');
      //const question = await this.getQuestion(answerData.questionId);
      const mcOptions = await this.qdChoice.getMCCheckOptions((await this.qdChoice.getMCQuestion(answerData.questionId)).id);
      let userScore = 0;
      const scorePerOption = question.score / mcOptions.length;

      //generate user score
      for(const mcOption of mcOptions) {
        if (mcOption.correct && answerData.userMCAnswer.includes(mcOption.id)) {
          userScore += scorePerOption;
        }
        else if (!mcOption.correct && !answerData.userMCAnswer.includes(mcOption.id)) {
          userScore += scorePerOption;
        }
      }
      // Round the userScore to avoid floating point precision issues
      userScore = Math.round(userScore * 100) / 100;

      const progress = userScore / question.score;
      let feedbackText = "";
      let markedAsDone = false;
      if(progress == 1) {
        feedbackText = 'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht. Das ist die maximale Punktzahl. Gut gemacht! Die Aufgabe wird als gelöst markiert und dein Fortschritt erhöht.';
        //set contentElement as done
        console.log('contentElementId: ' + answerData.contentElementId + ' conceptNode: ' + question.conceptNodeId + ' level: ' + question.level + ' userId: ' + userId)
        await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNodeId, question.level, userId);
        markedAsDone = true;
      }
      else {
        feedbackText = 'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht.';
      }

      console.log(feedbackText);

      //create feedback for user answer
      const feedback = await this.prisma.feedback.create({
        data: {
          userAnswerId: createdData.id,
          text: feedbackText,
          score: userScore
        }
      });

      if (!feedback) throw new Error('Could not create Feedback');

      console.log('element done: ' + markedAsDone);
      return {
        id: feedback.id,
        userAnswerId: feedback.userAnswerId,
        score: feedback.score,
        feedbackText: feedback.text,
        elementDone: markedAsDone,
        progress: progress*100,
      }
    }

    if (question.type === questionType.SINGLECHOICE) {
      console.log('generate feedback for single choice user answer');
      //const question = await this.getQuestion(answerData.questionId);
      const mcOptions = await this.qdChoice.getMCCheckOptions((await this.qdChoice.getMCQuestion(answerData.questionId)).id);
      let userScore = 0;
      let progress = 0;

      //generate user score
      for(const mcOption of mcOptions) {
        if (mcOption.correct && answerData.userMCAnswer.includes(mcOption.id)) {
          userScore += question.score;
          progress = 1;
          break;
        }
        else {
          console.log('answer not correct');
          userScore = 0;
        }
      }

      let feedbackText = "";
      let markedAsDone = false;
      if(progress == 1) {
        feedbackText = 'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht. Das ist die maximale Punktzahl. Gut gemacht! Die Aufgabe wird als gelöst markiert und dein Fortschritt erhöht.';
        console.log('contentElementId: ' + answerData.contentElementId + ' conceptNode: ' + question.conceptNodeId + ' level: ' + question.level + ' userId: ' + userId)
        await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNodeId, question.level, userId);
        markedAsDone = true;
      }
      else {
        feedbackText = 'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht.';
      }

      console.log(feedbackText);

      //create feedback for user answer
      const feedback = await this.prisma.feedback.create({
        data: {
            userAnswerId: createdData.id,
            text: feedbackText,
            score: userScore
        }
      });

      if (!feedback) throw new Error('Could not create Feedback');

      console.log('element done: ' + markedAsDone);
      return {
        id: feedback.id,
        userAnswerId: feedback.userAnswerId,
        score: feedback.score,
        feedbackText: feedback.text,
        elementDone: markedAsDone,
        progress: progress*100,
      }
    }


    //generate feedback for user freetext answer
    if (question.type === questionType.FREETEXT && question.text) {
      console.log('generate feedback for freetext user answer');

      //TODO: generate a feedback text based on the user answer
      let feedbackText = 'Du hast keine Antwort eingeben.';
      let userScore = 0;
      if (answerData.userFreetextAnswerRaw && answerData.userFreetextAnswerRaw != '') {
        await this.qdFreetext.getFreeTextQuestion(answerData.questionId, true).then(async (questionData) => {
          await this.feedbackGenerationService.generateFreetextFeedback(questionData, answerData.userFreetextAnswerRaw).then((feedback) => {
            feedbackText = feedback.feedbackText;
            userScore = feedback.reachedPoints;
          });
        });
      }

      const progress = userScore / question.score;
      let markedAsDone = false;
      console.log('progress: '+progress);

      if(progress == 1) {
        await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNodeId, question.level, userId);
        markedAsDone = true;

      }

      console.log('generated Text:', feedbackText);
      console.log('userScore: ' + userScore);
      //create feedback for user answer
      const feedback = await this.prisma.feedback.create({
        data: {
          userAnswerId: createdData.id,
          text: feedbackText,
          score: userScore
        }
      });

      if (!feedback) throw new Error('Could not create Feedback');

      return {
        id: feedback.id,
        userAnswerId: feedback.userAnswerId,
        score: feedback.score,
        feedbackText: feedback.text,
        elementDone: markedAsDone,
        progress: progress*100,
      }

    }

    // fillin
    if(question.type === questionType.FILLIN) {
      console.log('generate feedback for fill-in-the-blank user answer');
      const fillInTask = await this.prisma.fillinQuestion.findFirst({
        where: {
          questionId: question.id,
        },
        include: {
          blanks: true
        }
      });

      // Fetch the correct answers from the blanks table
      const correctAnswers = await this.prisma.blank.findMany({
        where: {
          fillinQuestionId: fillInTask.id,
          isDistractor: false,
          isCorrect: true
        },
        orderBy: {
          position: 'asc'
        },
      });

      const importantBlankPositions = [...new Set(correctAnswers.map(blank => blank.position))];
      console.log("correct answers: ", correctAnswers);
      let userScore = 0;

      // Compare user answers with correct answers
      const userAnswers: UserFillinAnswer[] = answerData.userFillinTextAnswer;
      const feedbackDetails = [];
      console.log("user answers: ", userAnswers);

      for (const blankPosition of importantBlankPositions) {
        const userAnswer = userAnswers.find(answer => answer.position === blankPosition)?.answer?.toLowerCase().trim();
        const correctPositionAnswers = correctAnswers.filter(blank => blank.position === blankPosition).map(blank => blank.blankContent.toLowerCase().trim());

        if (correctPositionAnswers.includes(userAnswer)) {
          userScore += 1;
          //feedbackDetails.push(`Blank ${blankPosition}: Correct`);
        } else {
          //feedbackDetails.push(`Blank ${blankPosition}: Incorrect`);
        }

      }

      let feedbackText = '';
      let markedAsDone = false;
      const reachedPoints = Math.floor(userScore * (question.score / importantBlankPositions.length));

      if (userScore === importantBlankPositions.length) {
        feedbackText = `Herzlichen Glückwunsch! Du hast alle ${importantBlankPositions.length} Lücken richtig ausgefüllt. Du hast ${question.score} von ${question.score} Punkten erreicht. Die Aufgabe ist als abgeschlossen markiert und dein Fortschritt wurde aktualisiert.`;
        this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNodeId, question.level, userId);
        markedAsDone = true;
      } else {
        feedbackText = `Du hast ${userScore} von ${importantBlankPositions.length} Lücken richtig ausgefüllt. Du hast ${reachedPoints} von ${question.score} Punkten erreicht.\n\n`;
        feedbackText += feedbackDetails.join('\n');
      }

      //create feedback for user answer
      const feedback = await this.prisma.feedback.create({
        data: {
          userAnswerId: createdData.id,
          text: feedbackText,
          score: reachedPoints
        }
      });

      if (!feedback) throw new Error('Could not create Feedback');

      console.log('element done: ' + markedAsDone);
      return {
        id: feedback.id,
        userAnswerId: feedback.userAnswerId,
        score: feedback.score,
        feedbackText: feedback.text,
        elementDone: markedAsDone,
        progress: Math.floor((feedback.score/question.score) * 100),
      }

    }
      // Create feedback for user answer

    //generate feedback for user graph answer
    if (question.type === questionType.GRAPH) {
      console.log('generate feedback for graph user answer');

      let feedbackText = 'Du hast keine Antwort eingegeben.';
      let userScore = 0;

      if (answerData.userGraphAnswer) {

        await this.qdGraph.getGraphQuestion(answerData.questionId, true).then(async (questionData) => {

          // Generate feedback based on the user answer
          const { feedbackHTML, receivedPoints } = this.graphEvalService.evaluateSolution(questionData, answerData.userGraphAnswer);
          feedbackText = feedbackHTML;
          userScore = receivedPoints;
        });
      }

      const progress = userScore / question.score;
      let markedAsDone = false;
      console.log('progress: '+progress);

      if(progress == 1) {
        // answerData for graphQuestions does not contain a contentElementId, so we need to fetch it from the database
        const contentElement = await this.prisma.contentElement.findUnique({
          where: {
            questionId: question.originId
          }
        });
        await this.contentService.questionContentElementDone(contentElement.id, question.conceptNodeId, question.level, userId);
        markedAsDone = true;
      }

      console.log('generated Text:', feedbackText);
      console.log('userScore: ' + userScore);

      //create feedback for user answer
      const feedback = await this.prisma.feedback.create({
        data: {
          userAnswerId: createdData.id,
          text: feedbackText,
          score: userScore
        }
      });

      if (!feedback) throw new Error('Could not create Feedback');

      console.log('element done: ' + markedAsDone);
      return {
        id: feedback.id,
        userAnswerId: feedback.userAnswerId,
        score: feedback.score,
        feedbackText: feedback.text,
        elementDone: markedAsDone,
        progress: Math.floor((feedback.score/question.score) * 100),
      }
    }

    if (question.type === questionType.CODEGAME) {
      if (!answerData.codeGameEvaluation) {
        throw new Error('No code game evaluation provided');
      }

      const codeGameAnswer = await this.prisma.codeGameAnswer.create({
        data: {
          codeGameQuestionId: question.originId,
          userAnswerId: createdData.id,
          codeGameExecutionResult: answerData.codeGameEvaluation.codeGameExecutionResult,
          codeSolutionRestriction: answerData.codeGameEvaluation.codeSolutionRestriction,
          frequencyOfMethodEvaluationResult: answerData.codeGameEvaluation?.frequencyOfMethodEvaluationResult,
          frequencyOfMethodCallsResult: answerData.codeGameEvaluation?.frequencyOfMethodCallsResult,
          reachedDestination: answerData.codeGameEvaluation?.reachedDestination,
          totalItems: answerData.codeGameEvaluation?.totalItems,
          collectedItems: answerData.codeGameEvaluation?.collectedItems,
          allItemsCollected: answerData.codeGameEvaluation?.allItemsCollected,
          visitedCellsAreAllowed: answerData.codeGameEvaluation?.visitedCellsAreAllowed,
          allWhiteListCellsVisited: answerData.codeGameEvaluation?.allWhiteListCellsVisited,
          executionSuccess: answerData.codeGameEvaluation?.executionSuccess,
          executionMessage: answerData.codeGameEvaluation?.executionMessage,
        },
      });

      if (answerData.codeGameEvaluation?.submittedCode) {
        for (const [fileName, code] of Object.entries(answerData.codeGameEvaluation.submittedCode)) {
          await this.prisma.codeGameScaffoldAnswer.create({
            data: {
              codeGameAnswerId: codeGameAnswer.id,
              language: answerData.codeGameEvaluation.language,
              code: code,
              codeFileName: fileName,
            },
          });
        }
      }

      let countEvaluationOptions = 4;
      let userScore = 0; // max. 100
      if (answerData.codeGameEvaluation.reachedDestination) {
        userScore += 1;
      }
      if (answerData.codeGameEvaluation.allItemsCollected) {
        userScore += 1;
      }
      if (answerData.codeGameEvaluation.visitedCellsAreAllowed) {
        userScore += 1;
      }
      if (answerData.codeGameEvaluation.allWhiteListCellsVisited) {
        userScore += 1;
      }
      if (answerData.codeGameEvaluation.codeSolutionRestriction) {
        if (answerData.codeGameEvaluation.frequencyOfMethodEvaluationResult) {
          countEvaluationOptions++;
          userScore += 1;
        }
      }
      userScore = Math.round((userScore / countEvaluationOptions) * 100);

      const progress = userScore / question.score;
      let feedbackText = '';
      let markedAsDone = false;
      if (progress == 1) {
        feedbackText =
          'Du hast ' +
          userScore +
          ' von ' +
          question.score +
          ' Punkten erreicht. Das ist die maximale Punktzahl. Gut gemacht! Die Aufgabe wird als gelöst markiert und dein Fortschritt erhöht.';
        //set contentElement as done
        console.log(
          'contentElementId: ' +
          answerData.contentElementId +
          ' conceptNode: ' +
          question.conceptNodeId +
          ' level: ' +
          question.level +
          ' userId: ' +
          userId,
        );
        await this.contentService.questionContentElementDone(
          answerData.contentElementId,
          question.conceptNodeId,
          question.level,
          userId,
        );
        markedAsDone = true;
      } else {
        feedbackText =
          'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht.';
      }

      const feedback = await this.prisma.feedback.create({
        data: {
          userAnswerId: createdData.id,
          text: feedbackText,
          score: userScore,
        },
      });

      if (!feedback) throw new Error('Could not create Feedback');

      console.log('element done: ' + markedAsDone);
      return {
        id: feedback.id,
        userAnswerId: feedback.userAnswerId,
        score: feedback.score,
        feedbackText: feedback.text,
        elementDone: markedAsDone,
        progress: progress * 100,
      };
    }

    // generate feedback for upload question
    if (question.type === questionType.UPLOAD) {
      console.log('generate feedback for upload user answer');
      let userScore = 0;

      // Check file type compatibility - handle both simple types and MIME types
      const expectedFileType = detailedQuestion.uploadQuestion.fileType.toLowerCase();
      const actualFileType = answerData.userUploadAnswer.file.type.toLowerCase();

      console.log('expectedFileType: ' + expectedFileType);
      console.log('actualFileType: ' + actualFileType);

      // Create a mapping of simple types to MIME types
      const mimeTypeMap: { [key: string]: string[] } = {
        'pdf': ['application/pdf'],
        'doc': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'txt': ['text/plain'],
        'jpg': ['image/jpeg'],
        'jpeg': ['image/jpeg'],
        'png': ['image/png'],
        'gif': ['image/gif'],
        'zip': ['application/zip'],
        'rar': ['application/x-rar-compressed'],
        'mp4': ['video/mp4'],
        'mp3': ['audio/mpeg'],
        'wav': ['audio/wav']
      };

      // Check if file type matches
      let isValidType = false;

      if (expectedFileType.includes('*')) {
        // Handle wildcard types like "image/*"
        const typeCategory = expectedFileType.replace('*', '');
        isValidType = actualFileType.startsWith(typeCategory);
      } else if (mimeTypeMap[expectedFileType]) {
        // Check against known MIME types
        isValidType = mimeTypeMap[expectedFileType].includes(actualFileType);
      } else {
        // Direct comparison (fallback)
        isValidType = expectedFileType === actualFileType;
      }

      if (!isValidType) {
        throw new Error(`File type mismatch: expected ${expectedFileType}, got ${actualFileType}`);
      }

      const uploadedFile = await this.productionFilesService.uploadProductionFile(
        Buffer.from(answerData.userUploadAnswer.file.file, 'base64'),
        answerData.userUploadAnswer.file.name,
        expectedFileType,
      );

      if (!uploadedFile) {
        throw new Error('File upload failed');
      }

      // Create UserUploadAnswer entry
      const uploadAnswer = await this.prisma.userUploadAnswer.create({
        data: {
          userAnswerId: createdData.id,
          fileId: uploadedFile.id
          }
      });

      if (!uploadAnswer) throw new Error('Could not create UserUploadAnswer');

      userScore = question.score; // Full points if file exists
      const feedbackText = `Du hast erfolgreich die Datei "${uploadedFile.name}" hochgeladen.`;

      // Mark as done since upload was successful
      await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNodeId, question.level, userId);
      const markedAsDone = true;


      console.log('generated Text:', feedbackText);
      console.log('userScore: ' + userScore);

      // Create feedback for user answer
      const feedback = await this.prisma.feedback.create({
        data: {
          userAnswerId: createdData.id,
          text: feedbackText,
          score: userScore
        }
      });

      if (!feedback) throw new Error('Could not create Feedback');

      console.log('element done: ' + markedAsDone);
      return {
        id: feedback.id,
        userAnswerId: feedback.userAnswerId,
        score: feedback.score,
        feedbackText: feedback.text,
        elementDone: markedAsDone,
        progress: Math.floor((feedback.score/userScore) * 100),
      }
    }

    // TODO: Uml
  }

  /**
   * @description Calculates the progress of a question based on the user answers.
   * The progress is calculated based on the aggregated 'score'.
   * @param {number} questionId - The ID of the question.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<number>} The calculated progress in percentage.
   */
  async getQuestionProgress(questionId: number, userId: number): Promise<number> {
    try {
      // Get the maximum score for the question
      const question = await this.getQuestion(questionId);
      if (!question) throw new Error('Question not found');

      // Get the total number of answers for the question and the user
      const totalAnswers = await this.prisma.userAnswer.count({
        where: {
          questionId: questionId,
          userId: userId,
        },
      });

      if (totalAnswers === 0) return 0;

      // Aggregated score of all user answers
      const aggregatedScoreResult = await this.prisma.feedback.aggregate({
        where: {
          userAnswer: {
            questionId: questionId,
            userId: userId,
          }
        },
        _max: {
          score: true
        }
      });

      const maxScore = aggregatedScoreResult._max.score || 0;

      // Calculate the progress
      const progress = Math.floor((maxScore / question.score) * 100);

      // Ensure progress does not exceed 100%
      return Math.min(progress, 100);
    } catch (error) {
      console.error(`Error calculating progress for question ${questionId} and user ${userId}:`, error);
      throw new Error('Could not calculate progress');
    }
  }

  /**
   * @description Fetches the corresponding contentNodeId and contentElementId for a given question.
   * @param {number} questionId - The ID of the question.
   * @returns {Promise<{ contentNodeId: number; contentElementId: number }>} A promise that resolves to an object containing contentNodeId and contentElementId.
   * @throws {NotFoundException} if the question does not exist or has no associated file.
   */
  async getContentIdsForQuestion(questionId: number): Promise<{ contentNodeId: number; contentElementId: number }> {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId },
      select: {
        id: true,
        contentElement: {
          select: {
            id: true,
            ContentView: {
              select: {
                contentNodeId: true
              }
            }
          }
        }
      }
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }
    const contentElementId = question.contentElement.id;
    const contentNodeId = question.contentElement.ContentView[0].contentNodeId;

    return {
      contentNodeId,
      contentElementId,
    };
  }

}
