export const similarityLogEntries = {
  LOG_GRAPH_INTRODUCTION: `Comparison results:`,
  LOG_NODES_INTRODUCTION: `Node comparison results:`,
  LOG_EDGES_INTRODUCTION: `Edge comparison results:`,

  CLASS_NODE_INTRODUCTION: (nodeTitle: string) => `Attempt node: ${nodeTitle}:`,
  CLASS_NODE_TYPE: (attempt: string, solution: string) => `- Differing node type: ${attempt} should be ${solution}.`,
  CLASS_NODE_TITLE: (attempt: string, solution: string) => `- Differing node title: ${attempt} should be ${solution}.`,

  CLASS_NODE_ATTRIBUTE_INTRODUCTION: (attributeName: string) => `- Attempt attribute: ${attributeName}:`,
  CLASS_NODE_ATTRIBUTE_NAME: (attempt: string, solution: string) => `-- Differing attribute name: ${attempt} should be ${solution}.`,
  CLASS_NODE_ATTRIBUTE_DATATYPE: (attempt: string, solution: string) => `-- Differing attribute datatype: ${attempt} should be ${solution}.`,
  CLASS_NODE_ATTRIBUTE_VISIBILITY: (attempt: string, solution: string) => `-- Differing attribute visibility: ${attempt} should be ${solution}.`,

  CLASS_NODE_METHOD_INTRODUCTION: (methodName: string) => `- Attempt method: ${methodName}:`,
  CLASS_NODE_METHOD_NAME: (attempt: string, solution: string) => `-- Differing method name: ${attempt} should be ${solution}.`,
  CLASS_NODE_METHOD_DATATYPE: (attempt: string, solution: string) => `-- Differing method datatype: ${attempt} should be ${solution}.`,
  CLASS_NODE_METHOD_VISIBILITY: (attempt: string, solution: string) => `-- Differing method visibility: ${attempt} should be ${solution}.`,

  CLASS_EDGE_INTRODUCTION: (edgeDescription: string) => `Attempt edge: ${edgeDescription}:`,
  CLASS_EDGE_TYPE: (attempt: string, solution: string) => `- Differing edge type: ${attempt} should be ${solution}.`,
  CLASS_EDGE_START: (attempt: string, solution: string) => `- Differing edge start node: ${attempt} should be ${solution}.`,
  CLASS_EDGE_END: (attempt: string, solution: string) => `- Differing edge end node: ${attempt} should be ${solution}.`,
  CLASS_EDGE_CARDINALITY_START: (attempt: string, solution: string) => `- Differing edge cardinality start: ${attempt} should be ${solution}.`,
  CLASS_EDGE_CARDINALITY_END: (attempt: string, solution: string) => `- Differing edge cardinality end: ${attempt} should be ${solution}.`,
  CLASS_EDGE_DESCRIPTION: (attempt: string, solution: string) => `- Differing edge description: ${attempt} should be ${solution}.`,

  CLASS_NODE_MISSING: (node: string) => `Missing node: ${node}.`,
  CLASS_EDGE_MISSING: (edge: string) => `Missing edge: ${edge}.`,
  CLASS_NODE_ATTRIBUTE_MISSING: (attribute: string) => `- Missing node attribute: ${attribute}.`,
  CLASS_NODE_METHOD_MISSING: (method: string) => `- Missing node method: ${method}.`,

  CLASS_NODE_ADDED: (node: string) => `Unnecessary node: ${node}.`,
  CLASS_EDGE_ADDED: (edge: string) => `Unnecessary edge: ${edge}.`,
  CLASS_NODE_ATTRIBUTE_ADDED: (attribute: string) => `- Unnecessary node attribute: ${attribute}.`,
  CLASS_NODE_METHOD_ADDED: (method: string) => `- Unnecessary node method: ${method}.`,

  LOG_NODES_NOTHINGFOUND: `No node mistakes found.`,
  LOG_EDGES_NOTHINGFOUND: `No edge mistakes found.`,

};
