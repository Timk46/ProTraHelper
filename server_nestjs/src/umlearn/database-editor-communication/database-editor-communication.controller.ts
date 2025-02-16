import { EditorModel, editorElementDTO, editorModelDTO } from '@DTOs/index';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DatabaseEditorCommunicationService } from './database-editor-communication.service';
import { roles, RolesGuard } from '@/auth/common/guards/roles.guard';

@UseGuards(RolesGuard)
@Controller('editor')
export class DatabaseEditorCommunicationController {

    constructor(private decs: DatabaseEditorCommunicationService) { }

    /**
     * Gets the editor models from the server
     * @returns editorModelsDTO
     */
    @Get('models')
    async getEditorModels(): Promise<editorModelDTO[]> {
      console.log('DatabaseEditorCommunicationController: getEditorModels()');
      return this.decs.getEditorModels();
    }

    /**
     * Gets an editor model from the server by id
     * @param id
     * @returns editorModelDTO
     */
    @Get('models/:id')
    async getEditorModel(@Param('id') id: number): Promise<editorModelDTO> {
      console.log('DatabaseEditorCommunicationController: getEditorModel()');
      return this.decs.getEditorModel(id);
    }

    /**
     * Gets the editor elements from the server
     * @param editorModel
     * @returns editorElementsDTO
     */
    @Get('elements/:editorModel')
    async getEditorElements( @Param('editorModel') editorModel: string): Promise<editorElementDTO[]> {
      if (!Object.values(EditorModel).includes(editorModel as EditorModel)) {
        throw new Error('Invalid editor model. Valid models are: ' + Object.keys(EditorModel).join(', '));
      }
      console.log('DatabaseEditorCommunicationController: getEditorElements()');
      return this.decs.getEditorElements(editorModel);
    }

    /**
     * Gets an editor element from the server by id
     * @param id
     * @returns editorElementDTO
     */
    @Get('elements/:id')
    async getEditorElement(@Param('id') id: number): Promise<editorElementDTO> {
      console.log('DatabaseEditorCommunicationController: getEditorElement()');
      return this.decs.getEditorElement(id);
    }

}
