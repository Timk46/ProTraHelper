/**
 * Type declarations for @stagewise/extension-toolbar-srpc-contract
 * This module appears to be missing from npm registry, so we provide minimal type definitions
 * to satisfy the @stagewise/toolbar dependency.
 */

declare module '@stagewise/extension-toolbar-srpc-contract' {
  /**
   * Represents a prompt request structure used by the stagewise toolbar
   */
  export interface PromptRequest {
    /** The prompt text content */
    text?: string;
    /** Optional context or metadata for the prompt */
    context?: Record<string, any>;
    /** Optional parameters for the prompt request */
    parameters?: Record<string, any>;
    /** Optional identifier for the request */
    id?: string;
    /** Optional type identifier for the prompt */
    type?: string;
  }
}
