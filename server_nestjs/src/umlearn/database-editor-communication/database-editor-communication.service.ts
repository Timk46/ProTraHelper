import { PrismaService } from '@/prisma/prisma.service';
import {
  EditorElement,
  EditorElementType,
  EditorModel,
  editorElementDTO,
  editorModelDTO,
} from '@DTOs/index';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseEditorCommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the editor models from the server
   * @returns editorModelsDTO
   */
  async getEditorModels(): Promise<editorModelDTO[]> {
    try {
      const editorModels = await this.prisma.umlEditorModel.findMany();
      if (editorModels === null) {
        throw new Error('No editor Models found');
      }
      return editorModels.map(editorModel => {
        return {
          id: editorModel.id,
          model: editorModel.model as EditorModel,
          title: editorModel.title,
          description: editorModel.description,
        };
      });
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Gets an editor model from the server by id
   * @param id
   * @returns editorModelDTO
   */
  async getEditorModel(id: number): Promise<editorModelDTO> {
    try {
      const editorModel = await this.prisma.umlEditorModel.findUnique({
        where: {
          id: id,
        },
      });
      if (editorModel === null) {
        throw new Error('No editor Model found');
      }
      return {
        id: editorModel.id,
        model: editorModel.model as EditorModel,
        title: editorModel.title,
        description: editorModel.description,
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Gets the editor elements from the server
   * @param editorModel
   * @returns editorElementsDTO
   */
  async getEditorElements(editorModel: string): Promise<editorElementDTO[]> {
    try {
      const editorElements = await this.prisma.umlEditorElement.findMany({
        where: {
          editorModel: {
            model: editorModel,
          },
        },
      });
      if (editorElements === null) {
        throw new Error('No editor Elements found');
      }
      return editorElements.map(editorElement => {
        return {
          id: editorElement.id,
          element: editorElement.element as EditorElement,
          elementType: editorElement.elementType as EditorElementType,
          title: editorElement.title,
          description: editorElement.description,
          editorModelId: editorElement.editorModelId,
          data: editorElement.data,
        };
      });
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves an editor element by its ID.
   *
   * @param id - The ID of the editor element.
   * @returns A Promise that resolves to an editorElementDTO object.
   */
  async getEditorElement(id: number): Promise<editorElementDTO> {
    try {
      const editorElement = await this.prisma.umlEditorElement.findUnique({
        where: {
          id: id,
        },
      });
      if (editorElement === null) {
        throw new Error('No editor Element found');
      }
      return {
        id: editorElement.id,
        element: editorElement.element as EditorElement,
        elementType: editorElement.elementType as EditorElementType,
        title: editorElement.title,
        description: editorElement.description,
        editorModelId: editorElement.editorModelId,
        data: editorElement.data,
      };
    } catch (error) {
      throw new HttpException('Fehler beim Laden der Daten', HttpStatus.BAD_REQUEST);
    }
  }
}
