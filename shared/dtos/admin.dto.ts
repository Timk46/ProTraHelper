/**
 * Admin and Analytics DTOs
 *
 * Contains all data transfer objects related to:
 * - User management and listing
 * - Progress tracking and analytics
 * - Subject management
 */

/**
 * Subject information with registration status
 */
export interface SubjectDTO {
  id: number;
  name: string;
  registeredForSL: boolean;
}

/**
 * User list item for admin overview
 *
 * @interface UserListItemDTO
 */
export interface UserListItemDTO {
  id: number;
  email: string;
  kiFeedbackCount: number;
  chatBotMessageCount: number;
  totalProgress: number;
  subjects: SubjectDTO[];
}

/**
 * Detailed user information for admin panel
 *
 * @interface UserDetailsDTO
 */
export interface UserDetailsDTO {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  globalRole: string;
  createdAt: string;
  totalProgress: number;
}

/**
 * Progress statistics grouped by question type
 *
 * @interface QuestionTypeProgressDTO
 */
export interface QuestionTypeProgressDTO {
  [key: string]: {
    total: number;
    completed: number;
  };
}

/**
 * Daily progress entry for a single user
 *
 * @interface DailyProgressDTO
 */
export interface DailyProgressDTO {
  date: string;
  count: number;
}

/**
 * Aggregated daily progress across all users
 *
 * @interface AllUsersDailyProgressDTO
 */
export interface AllUsersDailyProgressDTO {
  date: string;
  type: string;
  count: number;
}
