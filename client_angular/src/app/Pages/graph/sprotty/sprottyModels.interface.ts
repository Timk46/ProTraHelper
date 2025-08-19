import { Expandable } from 'sprotty';
import { SNode } from 'sprotty-protocol';

import { SEdge } from 'sprotty-protocol';

// interface for concept nodes
// needed for sprotty
export interface SprottyConceptNode extends SNode, Expandable {
  // inherited mandatory fields from SNode:
  // id: string; // node_ + string der Datenbank-id, außer für die root node (id: 'root')
  // type: string; // z.B. 'node:concept'
  // children: element[]

  // neu:
  name: string;
  expanded: boolean;

  level?: number; //user level, currently only important for leaf nodes
  levelGoal: number; //module goal for this level, currently only important for leaf nodes
  numberDescendants?: number; // number of leaf node descendants
  descendantLevels?: number[]; // array of six numbers, each number represents the number of descendants that have reached the corresponding level
  descendantLevelGoals?: number[]; // array of six numbers, each number represents the number of descendants that have this level as goal

  // helper fields
  databaseId: number;
  parentIds: string[];
  childIds?: string[];
  prerequisiteEdgeIds?: string[];
  successorEdgeIds?: string[];
  edgeChildDatabaseIds?: number[];
}

// interface for concept edges
// needed for sprotty
export interface SprottyConceptEdge extends SEdge {
  //inherited mandatory fields from SEdge:
  //id: string; // edge_ + string der Datenbank-id
  //type: string; // z.B. 'edge:concept'
  //sourceId: string;
  //targetId: string;

  //
  parentId: string;
  databaseId: number;
}
