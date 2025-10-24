import { ConceptNode } from '@DTOs/index';

/**
 * Data passed to RhinoFileUploadDialog when opened
 */
export interface RhinoFileDialogData {
  conceptNode: ConceptNode;
}

/**
 * Result returned from RhinoFileUploadDialog after successful upload
 */
export interface RhinoFileDialogResult {
  fileId: number;
  fileName: string;
}
