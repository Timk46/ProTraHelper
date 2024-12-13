import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { AiFeedbackService } from './ai-feedback.service';

@Controller('graph-ai-feedback')
export class AiFeedbackController {
  constructor(private readonly aiFeedbackService: AiFeedbackService) {}

  @Post()
  create(@Body() createAiFeedbackDto: { userAnswerId: number }) {
    return this.aiFeedbackService.create(createAiFeedbackDto);
  }

  @Patch(':id')
  rateFeedback(@Param('id') id: string, @Body() updateAiFeedbackDto: {rating: 1 | 2 | 3 | 4 | 5 }) {
    return this.aiFeedbackService.rateFeedback(+id, updateAiFeedbackDto);
  }

}
