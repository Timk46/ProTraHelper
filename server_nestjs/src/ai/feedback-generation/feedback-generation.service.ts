import { ChatBotMessageDTO, freetextFeedbackRequestDTO } from '@Interfaces/index';
import { Injectable } from '@nestjs/common';
import { RagService } from '../services/rag.service';
import { LlmBasicPromptService } from '../services/llmBasicPrompt.service';
import { feedbackGenerationPrompts } from './feedback-generation.prompts';

@Injectable()
export class FeedbackGenerationService {
    constructor(private ragService: RagService, private llmService: LlmBasicPromptService) { } // Retrieval Augmented Generation

    async generateFreetextFeedback(requestData: freetextFeedbackRequestDTO): Promise<string> {
        console.log("FeedbackGenerationService.generateFreetextQuestion");
        console.log(requestData);

        const ragResponse = await this.ragService.lectureSimilaritySearch(requestData.question, 3);
        let ragResponseString = "";
        ragResponse.forEach((element) => {
            ragResponseString += "..." + element.pageContent + "...;\n";
        });

        const llmResponse = await this.llmService.generateLlmAnswer( feedbackGenerationPrompts.freeText(requestData.question, ragResponseString), requestData.answer );

        //console.log(ragResponseString);
        //console.log(llmResponse);


        //return "This is a dummy freetext feedback.";
        return llmResponse;
    }

}
