import { UserDTO } from './user.dto';
import { EvaluationSubmissionDTO } from './evaluation-submission.dto';
import { EvaluationCommentDTO } from './evaluation-comment.dto';

export interface AnonymousEvaluationUserDTO {
  id: number;
  userId: number;
  submissionId: number;
  displayName: string;
  colorCode: string;
  createdAt: Date;
  
  // Relations
  user?: UserDTO;
  submission?: EvaluationSubmissionDTO;
  comments?: EvaluationCommentDTO[];
}

export interface CreateAnonymousUserDTO {
  submissionId: number;
  // Optional: Allow custom display name
  displayName?: string;
}

// Configuration for anonymous user generation
export interface AnonymousUserConfig {
  namePrefixes: string[];
  colors: string[];
  maxUsers: number;
  
  // Display settings
  showColorBadge: boolean;
  showUserNumber: boolean;
  
  // Privacy settings
  hideRealIdentity: boolean;
  allowMultipleUsers: boolean;
}

// Default configuration
export const DEFAULT_ANONYMOUS_CONFIG: AnonymousUserConfig = {
  namePrefixes: [
    'Teilnehmer',
    'Bewerter',
    'Diskutant',
    'Reviewer',
    'Kommentator',
    'Analyst',
    'Kritiker',
    'Prüfer'
  ],
  colors: [
    '#F44336', // Red
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#673AB7', // Deep Purple
    '#3F51B5', // Indigo
    '#2196F3', // Blue
    '#03A9F4', // Light Blue
    '#00BCD4', // Cyan
    '#009688', // Teal
    '#4CAF50', // Green
    '#8BC34A', // Light Green
    '#CDDC39', // Lime
    '#FFC107', // Amber
    '#FF9800', // Orange
    '#FF5722', // Deep Orange
    '#795548', // Brown
    '#607D8B'  // Blue Grey
  ],
  maxUsers: 100,
  showColorBadge: true,
  showUserNumber: true,
  hideRealIdentity: true,
  allowMultipleUsers: false
};

// Extended user info for UI display
export interface AnonymousUserDisplayDTO extends AnonymousEvaluationUserDTO {
  // UI display properties
  avatarBackground: string;
  avatarText: string;
  badgeColor: string;
  
  // Statistics
  totalComments: number;
  totalVotes: number;
  isActive: boolean;
  lastActivityAt?: Date;
}