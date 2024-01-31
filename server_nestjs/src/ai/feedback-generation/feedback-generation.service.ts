import { ChatBotMessageDTO, freetextFeedbackRequestDTO } from '@Interfaces/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeedbackGenerationService {

    promt: string = "Please provide feedback for the following question: ";

    async generateFreetextFeedback(requestData: freetextFeedbackRequestDTO): Promise<string> {
        console.log("FeedbackGenerationService.generateFreetextQuestion");
        console.log(requestData);
        return "This is a dummy freetext feedback.";
    }

}
