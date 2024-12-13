import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { AiFeedbackService } from './ai-feedback.service';

export class AiFeedbackController {
  constructor(private readonly aiFeedbackService: AiFeedbackService) {}

  /**
   * Creates a new AI feedback entry.
   * @param createAiFeedbackDto - The data transfer object containing the user answer ID.
   * @returns The created AI feedback entry.
   */
  @Post()
  create(@Body() createAiFeedbackDto: { userAnswerId: number }) {
    return this.aiFeedbackService.create(createAiFeedbackDto);
  }

  /**
   * Rates an existing AI feedback entry.
   * @param id - The ID of the AI feedback entry to be rated.
   * @param updateAiFeedbackDto - The data transfer object containing the rating (1 to 5).
   * @returns The updated AI feedback entry.
   */
  @Patch(':id')
  rateFeedback(@Param('id') id: string, @Body() updateAiFeedbackDto: { rating: 1 | 2 | 3 | 4 | 5 }) {
    return this.aiFeedbackService.rateFeedback(+id, updateAiFeedbackDto);
  }
}
