import { Injectable } from '@angular/core';

/**
 * Interface for task view data to maintain type safety
 */
export interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number;
  name: string;
  type: string;
  progress: number;
  description?: string;
}

/**
 * Service providing mock data for different task types
 * This service provides sample data for MC, fill-in and free text tasks
 */
@Injectable({
  providedIn: 'root',
})
export class TaskMockDataService {
  constructor() {}

  /**
   * Returns mock data for a Multiple Choice task
   */
  getMcTaskMockData(): TaskViewData {
    return {
      contentNodeId: 1,
      contentElementId: 101,
      id: 1001,
      name: 'Multiple Choice Beispielaufgabe',
      type: 'mcTask',
      progress: 0,
      description: 'Eine Beispielaufgabe vom Typ Multiple Choice',
    };
  }

  /**
   * Returns mock data for a Fill-in task
   */
  getFillInTaskMockData(): TaskViewData {
    return {
      contentNodeId: 2,
      contentElementId: 102,
      id: 1002,
      name: 'Lückentext Beispielaufgabe',
      type: 'fillInTask',
      progress: 0,
      description: 'Eine Beispielaufgabe vom Typ Lückentext',
    };
  }

  /**
   * Returns mock data for a Free Text task
   */
  getFreeTextTaskMockData(): TaskViewData {
    return {
      contentNodeId: 3,
      contentElementId: 103,
      id: 1003,
      name: 'Freitext Beispielaufgabe',
      type: 'freeTextTask',
      progress: 0,
      description: 'Eine Beispielaufgabe vom Typ Freitext',
    };
  }
}
