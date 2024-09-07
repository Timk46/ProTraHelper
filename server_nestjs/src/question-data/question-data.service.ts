import { Client } from 'langsmith';
/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
import { FeedbackGenerationService } from '@/ai/feedback-generation/feedback-generation.service';
import { ContentService } from '@/content/content.service';
import { PrismaService } from '@/prisma/prisma.service';
import { McQuestionDTO, MCOptionDTO, MCOptionViewDTO, QuestionDTO, questionType, McQuestionOptionDTO, freeTextQuestionDTO, CodingQuestionInternal } from '@DTOs/question.dto';
import { UserAnswerDataDTO, UserMCOptionSelectedDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { detailedFreetextQuestionDTO, detailedQuestionDTO } from '@Interfaces/detailedQuestion.dto';
import { CodingQuestion } from '@prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuestionDataService {
    constructor(
      private prisma: PrismaService,
      private feedbackGenerationService: FeedbackGenerationService,
      private contentService: ContentService) {}

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
              automatedTests: true
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
     *
     * @param question_id
     * @returns the mc question data
     */
    async getMCQuestion(question_id: number): Promise<McQuestionDTO> {
        let mcQuestion = await this.prisma.mCQuestion.findFirst({
            where: {
                questionId: Number(question_id)
            }
        })

        let mcQuestionData: McQuestionDTO = {
            id: mcQuestion.id,
            questionId: mcQuestion.questionId,
            isSC: mcQuestion.isSC,
            shuffleOptions: mcQuestion.shuffleoptions
        }

        return mcQuestionData;
    }

    /**
     *
     * @param mcQuestion_id
     * @returns the options of the mc question
     */
    async getMCOptions(mcQuestion_id: number): Promise<MCOptionViewDTO[]> {
        let mcOptions : MCOptionViewDTO[] = [];

        let mcQuestionOptions = await this.prisma.mCQuestionOption.findMany({
            where: {
                mcQuestionId: Number(mcQuestion_id)
            }
        });

        for(let mcQuestionOption of mcQuestionOptions) {
            let mcOption = await this.prisma.mCOption.findUnique({
                where: {
                    id: Number(mcQuestionOption.mcOptionId)
                }
            })

            let mcOptionData : MCOptionViewDTO = {
                id: mcOption.id,
                text: mcOption.text,
            }

            mcOptions.push(mcOptionData);
        }

        return mcOptions;
    }

    /**
     *
     * @param mcQuestion_id
     * @returns the options of the mc question
     */
    async getMCCheckOptions(mcQuestion_id: number): Promise<MCOptionDTO[]> {
        let mcOptions : MCOptionDTO[] = [];

        let mcQuestionOptions = await this.prisma.mCQuestionOption.findMany({
            where: {
                mcQuestionId: Number(mcQuestion_id)
            }
        });

        for(let mcQuestionOption of mcQuestionOptions) {
            let mcOption = await this.prisma.mCOption.findUnique({
                where: {
                    id: Number(mcQuestionOption.mcOptionId)
                }
            })

            let mcOptionData : MCOptionDTO = {
                id: mcOption.id,
                text: mcOption.text,
                correct: mcOption.is_correct,
            }

            mcOptions.push(mcOptionData);
        }

        return mcOptions;
    }

    /**
     * get the free text question, including the solution and expectations if requested
     * @param questionVersionId
     * @param fullData if true, the solution and expectations are returned
     * @returns the free text question
     */
    async getFreeTextQuestion(questionId: number, fullData = false): Promise<freeTextQuestionDTO> {
      const question = await this.getQuestion(questionId);
      const freeTextQuestion = await this.prisma.freeTextQuestion.findFirst({
          where: {
              questionId: Number(questionId)
          }
      });
      if (!freeTextQuestion) {
          throw new Error('FreeTextQuestion not found');
      }
      return {
        questionId: freeTextQuestion.questionId,
        title: question.name,
        text: question.text,
        textHTML: freeTextQuestion.textHTML || undefined,
        expectations: fullData? freeTextQuestion.expectations: "",
        expectationsHTML: fullData? (freeTextQuestion.expectationsHTML || undefined) : undefined,
        exampleSolution: fullData? (freeTextQuestion.exampleSolution || undefined) : undefined,
        exampleSolutionHTML: fullData? (freeTextQuestion.exampleSolutionHTML || undefined) : undefined,
        maxPoints: question.score,
      };
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

    // this function can initialize, make a new version of or overwrite a question including all its specific question types, based on
    // the provided version differences and the object presence of the defined specific question types
    // a existing question (with or without its type data) has to be provided
    async updateWholeQuestion(question: detailedQuestionDTO, authorId: number): Promise<detailedQuestionDTO> {
      const currentQuestion = await this.getDetailedQuestion(question.id, question.type as questionType);

      if (!this.detailedQuestionsUpdateable(currentQuestion, question)) {
        throw new Error('Question not updateable');
      }

      let newQuestion = null;
      // if we have a version difference, we create a new version of the question
      if (currentQuestion.version < question.version) {
        newQuestion = await this.createQuestion({
          id: question.id,
          name: question.name,
          description: question.description,
          score: question.score,
          type: question.type,
          text: question.text,
          conceptNode: question.conceptNodeId || undefined,
          isApproved: question.isApproved,
          originId: currentQuestion.originId,
          level: question.level,
          mode: question.mode,
          version: question.version
        }, authorId);

      // if versions are equal, we update the question
      } else if (currentQuestion.version === question.version) {
        newQuestion = await this.prisma.question.update({
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

      // if the question version differs or no type data is present, we initialize or add the specific question type data
      if(
        currentQuestion.version < question.version ||
        !currentQuestion.freetextQuestion &&
        !currentQuestion.mcQuestion &&
        !currentQuestion.codingQuestion
        //TODO: fill, uml, graph
      ){
        switch (question.type) {
          case questionType.FREETEXT:
            await this.createFreeTextQuestion(question.freetextQuestion, newQuestion.id);
            break;
          case questionType.MULTIPLECHOICE:
          case questionType.SINGLECHOICE:
          case questionType.CODE:
          //TODO: fill, uml, graph
        }
      // else we update
      } else {
        switch (question.type) {
          case questionType.FREETEXT:
            await this.updateFreeTextQuestion(question.freetextQuestion);
            break;
          case questionType.MULTIPLECHOICE:
          case questionType.SINGLECHOICE:
          case questionType.CODE:
          //TODO: fill, uml, graph
        }
      }

      return await this.getDetailedQuestion(newQuestion.id, question.type as questionType);
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
     * @param mcOptions
     * @returns Options
     */
    async createOptions(mcOptions: MCOptionDTO[]): Promise<MCOptionDTO[]> {
        let newOptions : MCOptionDTO[] = [];

         const optionPromises = mcOptions.map(async (mcOption) => {
             const newOption =  await this.prisma.mCOption.create({
                data: {
                    id: mcOption.id,
                    text: mcOption.text,
                    is_correct: mcOption.correct
                }
            });
            if(!newOption) {
                throw new Error('Option not created');
            }
            return {...newOption, correct: newOption.is_correct};
        });
        newOptions = await Promise.all(optionPromises);
        return newOptions;

    }

    /**
     *
     * @param mcQuestion
     * @returns McQuestion Object
     */
    async createMcQuestion(mcQuestion: McQuestionDTO): Promise<McQuestionDTO> {

      //console.log("concepts in createMcQuestion", concept);
        const newMcQuestion = await this.prisma.mCQuestion.create({
            data: {
                question: {connect: {id: mcQuestion.questionId}},
                isSC: mcQuestion.isSC,
                shuffleoptions: mcQuestion.shuffleOptions
            },
        });

        if(!newMcQuestion) {
            throw new Error('McQuestion not created');
        }

        return {...newMcQuestion,
                shuffleOptions: newMcQuestion.shuffleoptions};
    }

        /**
     *
     * @param mcQuestionOption
     * @returns McQuestionOption Object
     */
    async createMcQuestionOption(mcQuestionOption: McQuestionOptionDTO): Promise<McQuestionOptionDTO> {
      if(mcQuestionOption.mcQuestion === undefined) {
        throw new Error('McQuestion not defined');
      }
      if(!mcQuestionOption.mcQuestion.id) {
        throw new Error('McQuestion ID not defined');
      }
      if(!mcQuestionOption.mcOption.id){
        throw new Error('McOption ID not defined');
      }
        const newMcQuestionOption = await this.prisma.mCQuestionOption.create({
            data: {

              question: {connect: {id: mcQuestionOption.mcQuestion.id}},
              option: {connect: {id: mcQuestionOption.mcOption.id}},

            },
            include: {
              question: {include: {questionVersion: true}},
              option: true,

            }
        });

        if(!newMcQuestionOption) {
            throw new Error('McQuestionOption not created');
        }

        return {...newMcQuestionOption,
                mcOption: {...newMcQuestionOption.option,
                          correct: newMcQuestionOption.option.is_correct},
                mcQuestion: {...newMcQuestionOption.question,
                            shuffleOptions: newMcQuestionOption.question.shuffleoptions,
                          }};
    }

    /**
     * Creates a new free text question.
     *
     * @param freeTextQuestion - The detailed information of the free text question to be created.
     * @returns A promise that resolves to the created free text question.
     * @throws An error if the free text question is not created.
     */
    async createFreeTextQuestion(freeTextQuestion: detailedFreetextQuestionDTO, questionId: number): Promise<detailedFreetextQuestionDTO> {
      const newFreeTextQuestion = await this.prisma.freeTextQuestion.create({
        data: {
          textHTML: freeTextQuestion.textHTML || undefined,
          expectations: freeTextQuestion.expectations,
          expectationsHTML: freeTextQuestion.expectationsHTML || undefined,
          exampleSolution: freeTextQuestion.exampleSolution,
          exampleSolutionHTML: freeTextQuestion.exampleSolutionHTML || undefined,
          question: {connect: {id: questionId}},
        },
      });

      if(!newFreeTextQuestion) {
        throw new Error('FreeTextQuestion not created');
      }
      return newFreeTextQuestion;
    }

    /**
     * Updates a free text question.
     *
     * @param freeTextQuestion - The detailed free text question DTO.
     * @returns A promise that resolves to the updated detailed free text question DTO.
     * @throws An error if the free text question is not updated.
     */
    async updateFreeTextQuestion(freeTextQuestion: detailedFreetextQuestionDTO): Promise<detailedFreetextQuestionDTO> {
      const originalFreeTextQuestion = await this.prisma.freeTextQuestion.findFirst({
        where: {
          questionId: freeTextQuestion.questionId
        }
      });

      const updatedFreeTextQuestion = await this.prisma.freeTextQuestion.update({
        where: {
          id: freeTextQuestion.id
        },
        data: {
          textHTML: freeTextQuestion.textHTML || originalFreeTextQuestion.textHTML,
          expectations: freeTextQuestion.expectations,
          expectationsHTML: freeTextQuestion.expectationsHTML || originalFreeTextQuestion.expectationsHTML,
          exampleSolution: freeTextQuestion.exampleSolution,
          exampleSolutionHTML: freeTextQuestion.exampleSolutionHTML || originalFreeTextQuestion.exampleSolutionHTML,
        },
      });

      if(!updatedFreeTextQuestion) {
        throw new Error('FreeTextQuestion not updated');
      }
      return updatedFreeTextQuestion;
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
                await this.createUserMCOptionSelected(createdData.id, mcOptionId);
            }
        }

        const question = await this.getQuestion(answerData.questionId);
        if (!question) throw new Error('Could not get question');

        //generate feedback for user answer
        if (question.type === questionType.MULTIPLECHOICE) {
            console.log('generate feedback for multiple choice user answer');
            //const question = await this.getQuestion(answerData.questionId);
            const mcOptions = await this.getMCCheckOptions((await this.getMCQuestion(answerData.questionId)).id);
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
            const mcOptions = await this.getMCCheckOptions((await this.getMCQuestion(answerData.questionId)).id);
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
              await this.getFreeTextQuestion(answerData.questionId, true).then(async (questionData) => {
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


    /**
     *
     * @param userAnswer_id
     * @param mcOption_id
     * @returns the selected options
     */
    async createUserMCOptionSelected(userAnswer_id: number, mcOption_id: number) : Promise<UserMCOptionSelectedDTO> {
        return await this.prisma.userMCOptionSelected.create({
            data: {
                userAnswerId: userAnswer_id,
                mcOptionId: mcOption_id
            }
        })
    }

}
