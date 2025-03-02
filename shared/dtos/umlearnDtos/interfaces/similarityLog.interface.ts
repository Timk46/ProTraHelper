export interface similarityLog {
  nodes?: {
    updated?: ClassNodeSimilarityLog[],
    added?: string[],
    missing?: string[]
  }
  edges?: {
    updated?: ClassEdgeSimilarityLog[],
    added?: string[],
    missing?: string[]
  }
}

export interface ClassNodeSimilarityLog {
  type?: string,
  title?: string,
  attributes?: {
    updated?: ClassNodeAttributeSimilarityLog[],
    added?: string[],
    missing?: string[]
  };
  methods?: {
    updated?: ClassNodeMethodSimilarityLog[],
    added?: string[],
    missing?: string[]
  }
}

export interface ClassNodeAttributeSimilarityLog {
  name?: string,
  dataType?: string,
  visibility?: string
}

export interface ClassNodeMethodSimilarityLog {
  name?: string,
  dataType?: string,
  visibility?: string
}

export interface ClassEdgeSimilarityLog {
  type?: string,
  start?: string,
  end?: string,
  cardinalityStart?: string,
  cardinalityEnd?: string,
  description?: string
}
