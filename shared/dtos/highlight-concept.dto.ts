export interface HighlightConceptDto {
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

export interface CreateHighlightConceptDto {
  moduleId: number;
  conceptNodeId: number;
  alias?: string;
  description?: string;
  pictureData?: string;
  position?: number;
  isUnlocked?: boolean;
}

export interface UpdateHighlightConceptDto {
  alias?: string;
  description?: string;
  pictureData?: string;
  position?: number;
  isUnlocked?: boolean;
}
