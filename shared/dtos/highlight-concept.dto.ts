export class HighlightConceptDto {
  id: number;
  moduleId: number;
  conceptNodeId: number;
  alias?: string;
  description?: string;
  pictureData?: string;
  position?: number;
  isUnlocked: boolean;
  conceptNode?: any; // Could be replaced with a more detailed DTO for ConceptNode
}

export class CreateHighlightConceptDto {
  moduleId: number;
  conceptNodeId: number;
  alias?: string;
  description?: string;
  pictureData?: string;
  position?: number;
  isUnlocked?: boolean;
}

export class UpdateHighlightConceptDto {
  alias?: string;
  description?: string;
  pictureData?: string;
  position?: number;
  isUnlocked?: boolean;
}
