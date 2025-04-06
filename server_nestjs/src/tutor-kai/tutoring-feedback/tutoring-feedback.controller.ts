import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TutoringFeedbackService } from './tutoring-feedback.service';
import { FeedbackContextDto } from '../../../../shared/dtos/tutorKaiDtos/FeedbackContext.dto';
import { FeedbackOutput } from './dtos/feedback-output.schema'; // Import the specific output type

@Controller('tutor-kai/tutoring-feedback')
export class TutoringFeedbackController {
  constructor(private readonly tutoringFeedbackService: TutoringFeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.OK) // Explicitly set OK status for successful feedback generation
  async generateFeedback(
    @Body() feedbackContextDto: FeedbackContextDto,
  ): Promise<FeedbackOutput> { // Use specific return type
    // Basic validation could be added here using ValidationPipe if needed
    return this.tutoringFeedbackService.generateFeedback(feedbackContextDto);
  }
}
