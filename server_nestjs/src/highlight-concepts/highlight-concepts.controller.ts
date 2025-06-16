import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { roles, RolesGuard } from '../auth/common/guards/roles.guard';
import { HighlightConceptsService } from './highlight-concepts.service';
import { CreateHighlightConceptDto, UpdateHighlightConceptDto } from './dto/highlight-concept.dto';

@Controller('highlight-concepts')
@UseGuards(RolesGuard)
export class HighlightConceptsController {
  constructor(private readonly highlightConceptsService: HighlightConceptsService) {}

  @roles('ANY')
  @Get('module/:moduleId')
  async getHighlightConcepts(@Param('moduleId', ParseIntPipe) moduleId: number) {
    return this.highlightConceptsService.getHighlightConcepts(moduleId);
  }

  @roles('ANY')
  @Get(':id')
  async getHighlightConcept(@Param('id', ParseIntPipe) id: number) {
    return this.highlightConceptsService.getHighlightConcept(id);
  }

  @roles('ADMIN')
  @Post()
  async createHighlightConcept(@Body() createDto: CreateHighlightConceptDto) {
    return this.highlightConceptsService.createHighlightConcept(createDto);
  }

  @roles('ADMIN')
  @Put(':id')
  async updateHighlightConcept(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateHighlightConceptDto
  ) {
    return this.highlightConceptsService.updateHighlightConcept(id, updateDto);
  }

  @roles('ADMIN')
  @Delete(':id')
  async deleteHighlightConcept(@Param('id', ParseIntPipe) id: number) {
    return this.highlightConceptsService.deleteHighlightConcept(id);
  }
}
