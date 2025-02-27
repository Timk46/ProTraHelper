export interface BasicMatching {
  attempt: any | null,
  solution: any | null,
  similarity: number
}

export interface GraphMatching {
  nodeMatchings: BasicMatching[],
  edgeMatchings: BasicMatching[]
}