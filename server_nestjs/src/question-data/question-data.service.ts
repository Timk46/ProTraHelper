import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { ContentService } from '@/content/content.service';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDTO, questionType, detailedQuestionDTO } from '@DTOs/index';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { Injectable } from '@nestjs/common';
import { QuestionDataChoiceService } from './question-data-choice/question-data-choice.service';
import { QuestionDataCodeService } from './question-data-code/question-data-code.service';
import { QuestionDataFillinService } from './question-data-fillin/question-data-fillin.service';
import { QuestionDataFreetextService } from './question-data-freetext/question-data-freetext.service';

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
        conceptNode: question.conceptNodeId || undefined,
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
              }
            });
            specificQuestionData = {
              ...mcQuestion,
              mcOptions: mcOptions
            };
          }
          break;
      }

      const questionData: detailedQuestionDTO = {
        ...question,
        codingQuestion: questionTypeStr === questionType.CODE ? specificQuestionData : undefined,
        freetextQuestion: questionTypeStr === questionType.FREETEXT ? specificQuestionData : undefined,
        mcQuestion: (questionTypeStr === questionType.MULTIPLECHOICE || questionTypeStr === questionType.SINGLECHOICE) ? specificQuestionData : undefined,
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
                conceptNode: question.conceptNode? {connect: {id: question.conceptNode}}: undefined,
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
        throw new Error('Question not updateable');
      }

      let updatedQuestion = null;
      // if we have a version difference, we create a new version of the question
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
        case questionType.CODE:
      }

      return await this.getDetailedQuestion(updatedQuestion.id, question.type as questionType);
    }

    private detailedQuestionsUpdateable(currQuestion: detailedQuestionDTO, newQuestion: detailedQuestionDTO): boolean {
      if (
        currQuestion &&
        newQuestion &&
        currQuestion.type === newQuestion.type &&
        currQuestion.version <= newQuestion.version &&
        (
          newQuestion.codingQuestion ||
          newQuestion.freetextQuestion ||
          newQuestion.mcQuestion
          //TODO: fill, uml, graph
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

        const progress = userScore / question.score;
        let feedbackText = "";
        let markedAsDone = false;
        if(progress == 1) {
          feedbackText = 'Du hast ' + userScore + ' von ' + question.score + ' Punkten erreicht. Das ist die maximale Punktzahl. Gut gemacht! Die Aufgabe wird als gelöst markiert und dein Fortschritt erhöht.';
          //set contentElement as done
          console.log('contentElementId: ' + answerData.contentElementId + ' conceptNode: ' + question.conceptNode + ' level: ' + question.level + ' userId: ' + userId)
          await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNode, question.level, userId);
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
          console.log('contentElementId: ' + answerData.contentElementId + ' conceptNode: ' + question.conceptNode + ' level: ' + question.level + ' userId: ' + userId)
          await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNode, question.level, userId);
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
          await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNode, question.level, userId);
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

    }




}
