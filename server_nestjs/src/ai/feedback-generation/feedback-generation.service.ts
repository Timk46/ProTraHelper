import { ChatBotMessageDTO, freeTextQuestionDTO, freetextFeedbackRequestDTO } from '@Interfaces/index';
import { Injectable } from '@nestjs/common';
import { RagService } from '../services/rag.service';
import { LlmBasicPromptService } from '../services/llmBasicPrompt.service';
import { feedbackGenerationPrompts } from './feedback-generation.prompts';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fileSystem from 'fs';

@Injectable()
export class FeedbackGenerationService {
  constructor(private ragService: RagService, private llmService: LlmBasicPromptService, private prisma: PrismaClient) { } // Retrieval Augmented Generation

  /**
   * Generates freetext feedback based on the provided data and user answer.
   * @param freeTextData - The data for the freetext question.
   * @param userAnswer - The user's answer to the freetext question.
   * @returns A promise that resolves to an object containing the generated feedback text and the reached points.
   */
  async generateFreetextFeedback(freeTextData: freeTextQuestionDTO, userAnswer: string): Promise<{feedbackText: string, reachedPoints: number}> {
    console.log("FeedbackGenerationService.generateFreetextQuestion");

    const llmResponse = await this.llmService.generateLlmAnswer( feedbackGenerationPrompts.byExpectations(freeTextData.text, freeTextData.maxPoints, freeTextData.expectations, freeTextData.exampleSolution || undefined), userAnswer );
    let reachedPoints = 0;

    //find the reached points and convert it to a float number
    const match = llmResponse.match(/Erreichte Punktzahl: (\d+([.,]\d+)?)/);
    if (match) {
      reachedPoints = parseFloat(match[1].replace(/,/g, '.'));
      console.log(">> Reached points: " + reachedPoints);
    } else {
      console.error("Could not find reached points in LLM response.");
    }

    return {feedbackText: llmResponse, reachedPoints: reachedPoints};
  }


  /**
   * Generates freetext transcript feedback. Not in use yet.
   *
   * @param requestData - The freetext feedback request data.
   * @returns A promise that resolves to a string representing the generated feedback.
   */
  async generateFreetextTranscriptFeedback(requestData: freetextFeedbackRequestDTO): Promise<string> {
    console.log("FeedbackGenerationService.generateFreetextQuestion");
    console.log(requestData);

    let lecture_data: string = "";
    lecture_data = await this.getTranscripts(requestData.conceptNodeId);
    if (lecture_data === "") {
      lecture_data = await this.getSimilarities(requestData.question);
    }
    const llmResponse = await this.llmService.generateLlmAnswer( feedbackGenerationPrompts.byTranscriptSearch(requestData.question, lecture_data), requestData.answer );

    return llmResponse;
  }


  /**
   * Retrieves similarities for a given question.
   * @param question - The question to search for similarities.
   * @returns A promise that resolves to a string containing the similarities.
   */
  async getSimilarities(question: string): Promise<string> {
    const ragResponse = await this.ragService.lectureSimilaritySearch(question, 3);
    let ragResponseString = "";
    ragResponse.forEach((element) => {
      ragResponseString += "..." + element.pageContent + "...;\n";
    });

    return ragResponseString;
  }


  /**
   * Retrieves the transcripts for a given concept node.
   *
   * @param conceptNodeId - The ID of the concept node.
   * @returns A promise that resolves to a string containing the transcripts.
   */
  async getTranscripts(conceptNodeId: number): Promise<string> {
    // get the concept node from db
    const conceptNode = await this.prisma.conceptNode.findUnique({
      where: {
        id: conceptNodeId
      }
    });
    if (!conceptNode) {
      // we don't want this to be an error, because we have other ways to get the transcript information
      return "";
    }

    const transcriptsPath = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'shared', 'transcripts');
    // get all transcripts from the transcripts folder
    let transcripts = [];
    try {
      transcripts = fileSystem.readdirSync(transcriptsPath);
    } catch (error) {
      console.log(error);
      return "";
    }
    //filter transcripts for the concept node name
    const filteredTranscripts = transcripts.filter((transcript) => {
      return this.prepareCompareString(transcript).includes(this.prepareCompareString(conceptNode.name));
    });

    //combine all transcripts into one string
    let transcriptString = "";
    filteredTranscripts.forEach((transcript) => {
      transcriptString += '...' + fileSystem.readFileSync(path.join(transcriptsPath, transcript), 'utf8') + '...;\n';
    });

    return transcriptString;
  }


  /**
   * Removes line breaks, whitespaces, special characters, and converts the text to lowercase.
   * Also replaces umlauts with their corresponding ASCII characters.
   *
   * @param text - The input text to be prepared for comparison.
   * @returns The prepared text for comparison.
   */
  private prepareCompareString(text: string): string {
    // remove all line breaks
    text = text.replace(/(\r\n|\n|\r)/gm, "");
    // remove all whitespaces
    text = text.replace(/\s/g, "");
    // remove all special characters
    text = text.replace(/[^\w\s]/gi, '');
    // make everything lowercase
    text = text.toLowerCase();
    //replace all umlauts
    text = text.replace(/ä/g, "ae");
    text = text.replace(/ö/g, "oe");
    text = text.replace(/ü/g, "ue");
    text = text.replace(/ß/g, "ss");

    return text;
  }

}
