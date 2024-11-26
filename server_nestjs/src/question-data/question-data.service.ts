import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { ContentService } from '@/content/content.service';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDTO, questionType, detailedQuestionDTO, FillinQuestionDTO } from '@DTOs/index';
import { UserAnswerDataDTO, userAnswerFeedbackDTO, UserFillinAnswer } from '@DTOs/userAnswer.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QuestionDataChoiceService } from './question-data-choice/question-data-choice.service';
import { QuestionDataCodeService } from './question-data-code/question-data-code.service';
import { QuestionDataFillinService } from './question-data-fillin/question-data-fillin.service';
import { QuestionDataFreetextService } from './question-data-freetext/question-data-freetext.service';
import { QuestionDataGraphService } from './question-data-graph/question-data-graph.service';
import { GraphSolutionEvaluationService } from '@/graph-solution-evaluation/graph-solution-evaluation.service';

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
    private graphEvalService: GraphSolutionEvaluationService
  ) {}

  /**
   *
   * @param questionId
   * @returns the question data
   */
  async getQuestion(questionId: number): Promise<QuestionDTO> {
    let question = await this.prisma.question.findUnique({
      where: {
        id: Number(questionId)
      }
    });

    if(!question) {
      throw new Error('Question ' + questionId + ' not found');
    }

    let questionData: QuestionDTO = {
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
   * Retrieves a detailed question by its ID and type. Primarily used in the lecturers view.
   * @param questionId - The ID of the question to retrieve.
   * @param questionType - The type of the question.
   * @returns A promise that resolves to a detailedQuestionDTO object representing the detailed question.
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
    }

    const questionData: detailedQuestionDTO = {
      ...question,
      codingQuestion: questionTypeStr === questionType.CODE ? specificQuestionData : undefined,
      freetextQuestion: questionTypeStr === questionType.FREETEXT ? specificQuestionData : undefined,
      mcQuestion: (questionTypeStr === questionType.MULTIPLECHOICE || questionTypeStr === questionType.SINGLECHOICE) ? specificQuestionData : undefined,
      fillinQuestion: questionTypeStr === questionType.FILLIN ? specificQuestionData : undefined,
      graphQuestion: questionTypeStr === questionType.GRAPH ? specificQuestionData : undefined,
      // fillinQuestion: questionTypeStr === questionType.FILLIN ? specificQuestionData : undefined,
    };

    return questionData;
  }


  /**
   * Retrieves the newest user answer for a specific question and user.
   *
   * @param questionId - The ID of the question.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to a UserAnswerDataDTO object representing the newest user answer.
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
   * Creates a new question. Also works for version control.
   *
   * @param question - The question data.
   * @param authorId - The ID of the author.
   * @returns A promise that resolves to the created question.
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
              type: question.type,
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
   * Updates a whole question.
   *
   * @param question - The detailed question object to be updated.
   * @param authorId - The ID of the author.
   * @param createNewVersion - Optional. Indicates whether to create a new version of the question. Default is false.
   * @returns A promise that resolves to the updated detailed question object.
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
          type: question.type,
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
          type: question.type,
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
          await this.qdChoice.createChoiceQuestion(question.mcQuestion, updatedQuestion.id);
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
    }

    return await this.getDetailedQuestion(updatedQuestion.id, question.type as questionType);
  }


  /**
   * Checks if the detailed questions can be updated based on certain conditions.
   *
   * @param currQuestion - The current detailed question data transfer object.
   * @param newQuestion - The new detailed question data transfer object.
   * @returns `true` if the detailed questions are updateable, `false` otherwise.
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
        //TODO: uml, graph
        newQuestion.graphQuestion // ||
        //TODO: fill, uml
        // newQuestion.fillinQuestion // das hier einfügen
      )
    ){
      return true;
    }
    return false;
  }


  /**
   *
   * @param userId
   * @param answerData
   * @returns the new user answer
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

      for (let blankPosition of importantBlankPositions) {
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
          const { feedback, receivedPoints } = await this.graphEvalService.evaluateSolution(question.text, questionData, answerData.userGraphAnswer);
          feedbackText = feedback;
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
  }
}
