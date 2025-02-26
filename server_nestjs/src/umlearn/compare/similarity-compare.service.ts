import { BasicMatching, GraphMatching, ClassAttribute, ClassEdge, ClassMethod, ClassNode } from "@Interfaces/index";
import { editorDataDTO, swappableEditorElement } from "@DTOs/index";
import { Injectable } from "@nestjs/common";
import { JaroWinklerDistance } from 'natural';
import { nodeWeights, edgeWeights } from "./similarity-weights.config";
import { similarityLogEntries } from "./similarity-log.config";


@Injectable()
export class SimilarityCompareService {

  private nodeMap: Map<string, string> = null;

  constructor() {
    this.calcSingleNodeSimilarity = this.calcSingleNodeSimilarity.bind(this);
  }

  /**
   * Finds the graph matching between the attempt graph and the solution graph,
   * and generates a similarity log based on the matching.
   *
   * @param attemptGraph - The graph data representing the user's attempt.
   * @param solutionGraph - The graph data representing the correct solution.
   * @returns A string containing the similarity log of the graph matching.
   */
  public compare(attemptGraph: editorDataDTO, solutionGraph: editorDataDTO): string {
    this.nodeMap = this.createNodeMap(attemptGraph.nodes, solutionGraph.nodes); // to get a nodes name by its ids, useful for the edge comparison
    const graphMatching = this.findGraphMatching(attemptGraph, solutionGraph);
    return this.generateGraphSimilarityLog(graphMatching);
  }

  private createNodeMap(attemptNodes: ClassNode[], solutionNodes: ClassNode[]): Map<string, string> {
    const nodeMap = new Map<string, string>();
    for (const node of attemptNodes) {
      nodeMap.set(node.id, node.title);
    }
    for (const node of solutionNodes) {
      nodeMap.set(node.id, node.title);
    }
    return nodeMap;
  }



  /**
   * Finds the matching between the attempt graph and the solution graph.
   *
   * This method compares the nodes and edges of the attempt graph with those of the solution graph
   * to determine the best matching. It first finds the matching for the nodes and then maps the
   * node IDs of the attempt graph to the solution graph to ensure that the edges are correctly matched.
   * Finally, it finds the matching for the edges.
   *
   * @param attemptGraph - The graph representing the user's attempt.
   * @param solutionGraph - The graph representing the correct solution.
   * @returns An object containing the node matchings and edge matchings.
   */
  public findGraphMatching(attemptGraph: editorDataDTO, solutionGraph: editorDataDTO): GraphMatching {
    const nodeMatching = this.findElementMatching(attemptGraph.nodes, solutionGraph.nodes, this.calcSingleNodeSimilarity);
    const mappedAttemptEdges = attemptGraph.edges;
    // we need to map the node ids to the solution ids to ensure that the edges are correctly matched
    for (const edge of mappedAttemptEdges) {
      edge.start = nodeMatching.find(node => node.attempt.id == edge.start).solution.id || edge.start;
      edge.end = nodeMatching.find(node => node.attempt.id == edge.end).solution.id || edge.end;
    }

    const edgeMatching = this.findElementMatching(mappedAttemptEdges, solutionGraph.edges, this.calcSingleEdgeSimilarity);

    return { nodeMatchings: nodeMatching, edgeMatchings: edgeMatching };
  }


  /**
   * Calculates the similarity between two graphs.
   *
   * @param {editorDataDTO} attemptGraph - The graph representing the attempt.
   * @param {editorDataDTO} solutionGraph - The graph representing the solution.
   * @returns {number} - The similarity score between the attemptGraph and solutionGraph.
   *
   * The function first finds the matching nodes and edges between the two graphs.
   * If there are no matchings, it assumes the graphs are 100% similar.
   * It then calculates the average similarity for nodes and edges separately.
   * Finally, it combines these similarities using predefined weights and returns the overall similarity score.
   */
  public calcGraphSimilarity(attemptGraph: editorDataDTO, solutionGraph: editorDataDTO): number {
    const { nodeMatchings, edgeMatchings } = this.findGraphMatching(attemptGraph, solutionGraph);

    // if the matching is empty, there is nothing to compare so it has to be 100% similar
    const nodeSimilarity = nodeMatchings.length === 0 ? 1 : nodeMatchings.reduce((acc, curr) => acc + curr.similarity, 0) / nodeMatchings.length;
    const edgeSimilarity = edgeMatchings.length === 0 ? 1 : edgeMatchings.reduce((acc, curr) => acc + curr.similarity, 0) / edgeMatchings.length;

    const similarity = nodeSimilarity * nodeWeights.total + edgeSimilarity * edgeWeights.total;
    //console.log(similarity);
    return similarity;
  }


  /**
   * Generates a log string that describes the similarity between two graphs.
   * The log includes an introduction, node similarity details, and edge similarity details.
   *
   * @param {GraphMatching} graphMatching - The object containing the node and edge matchings between two graphs.
   * @returns {string} A formatted string that logs the similarity information of the graphs.
   */
  public generateGraphSimilarityLog(graphMatching: GraphMatching): string {
    return similarityLogEntries.LOG_GRAPH_INTRODUCTION + "\n"
    + ("----------------------------------\n")
    + (this.generateNodesSimilarityLog(graphMatching.nodeMatchings) + "\n")
    + ("----------------------------------\n")
    + (this.generateEdgesSimilarityLog(graphMatching.edgeMatchings));
  }


  /**
   * Generates a log string that describes the similarity between edges.
   *
   * This method calculates the overall similarity of the edges and generates
   * a log entry based on the similarity values. If the overall similarity is 1,
   * it logs that no differences were found. Otherwise, it logs the differences
   * for each edge where the similarity is less than 1.
   *
   * @param edgesMatching - An array of objects containing the attempt edge,
   *                        the solution edge, and their similarity value.
   * @returns A string representing the log of edge similarities.
   */
  private generateEdgesSimilarityLog(edgesMatching: {attempt: ClassEdge, solution: ClassEdge, similarity: number}[]): string {
    const edgesSimilarity = edgesMatching.reduce((acc, curr) => acc + curr.similarity, 0) / edgesMatching.length;
    let log = similarityLogEntries.LOG_EDGES_INTRODUCTION + "\n";
    if (edgesSimilarity == 1) {
      return log + similarityLogEntries.LOG_EDGES_NOTHINGFOUND + "\n";
    } else {
      for (const edge of edgesMatching) {
        if (edge.similarity < 1) {
          if (edge.attempt == null) {
            log += similarityLogEntries.CLASS_EDGE_MISSING(edge.solution.description) + "\n";
          } else if (edge.solution == null) {
            log += similarityLogEntries.CLASS_EDGE_ADDED(edge.attempt.description) + "\n";
          } else {
            log += this.generateSingleEdgeSimilarityLog(edge.attempt, edge.solution) + "\n";
          }
        }
      }
    }
    return log;
  }


  /**
   * Calculates the similarity between two sets of class nodes.
   *
   * This function compares the nodes from the attempt and solution sets,
   * finds the best matching pairs, and computes the average similarity score.
   *
   * @param attemptNodes - An array of class nodes representing the attempt.
   * @param solutionNodes - An array of class nodes representing the solution.
   * @returns The average similarity score between the attempt and solution nodes.
   */
  private calcNodesSimilarity(attemptNodes: ClassNode[], solutionNodes: ClassNode[]): number {
    const matching = this.findElementMatching(attemptNodes, solutionNodes, this.calcSingleNodeSimilarity);
    return matching.reduce((acc, curr) => acc + curr.similarity, 0) / matching.length;
  }


  /**
   * Generates a log string that describes the similarity between nodes.
   *
   * @param nodesMatching - An array of objects containing the attempt node, solution node, and their similarity score.
   * @returns A string containing the similarity log.
   *
   * The function calculates the average similarity of the nodes. If the average similarity is 1, it returns a log indicating that nothing was found.
   * Otherwise, it iterates through the nodes and generates log entries for nodes that have a similarity less than 1.
   * - If the attempt node is missing, it logs that the solution node is missing.
   * - If the solution node is missing, it logs that the attempt node was added.
   * - If both nodes are present, it generates a detailed similarity log for the node.
   */
  private generateNodesSimilarityLog(nodesMatching: {attempt: ClassNode, solution: ClassNode, similarity: number}[]): string {
    const nodesSimilarity = nodesMatching.reduce((acc, curr) => acc + curr.similarity, 0) / nodesMatching.length;
    let log = similarityLogEntries.LOG_NODES_INTRODUCTION + "\n";
    if (nodesSimilarity == 1) {
      return log + similarityLogEntries.LOG_NODES_NOTHINGFOUND + "\n";
    } else {
      for (const node of nodesMatching) {
        if (node.similarity < 1) {
          if (node.attempt == null) {
            log += similarityLogEntries.CLASS_NODE_MISSING(node.solution.title) + "\n";
          } else if (node.solution == null) {
            log += similarityLogEntries.CLASS_NODE_ADDED(node.attempt.title) + "\n";
          } else {
            log += this.generateSingleNodeSimilarityLog(node.attempt, node.solution) + "\n";
          }
        }
      }
    }
    return log;
  }


  /**
   * Calculates the similarity between two sets of class attributes.
   *
   * @param attemptAttributes - The attributes of the attempt to compare.
   * @param solutionAttributes - The attributes of the solution to compare against.
   * @returns A number between 0 and 1 representing the similarity, where 1 means identical and 0 means completely different.
   */
  private calcAttributesSimilarity(attemptAttributes: ClassAttribute[], solutionAttributes: ClassAttribute[]): number{
    if (attemptAttributes.length == 0 && solutionAttributes.length == 0) {
      return 1;
    }
    const matching = this.findElementMatching(attemptAttributes, solutionAttributes, this.calcSingleAttributeSimilarity);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }


  /**
   * Calculates the similarity between two sets of class methods.
   *
   * @param attemptMethods - An array of methods from the attempt.
   * @param solutionMethods - An array of methods from the solution.
   * @returns A number representing the similarity between the two sets of methods.
   *          Returns 1 if both sets are empty.
   */
  private calcMethodsSimilarity(attemptMethods: ClassMethod[], solutionMethods: ClassMethod[]): number {
    if (attemptMethods.length == 0 && solutionMethods.length == 0) {
      return 1;
    }
    const matching = this.findElementMatching(attemptMethods, solutionMethods, this.calcSingleMethodSimilarity);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }


  /**
   * Calculates the similarity between two class nodes.
   *
   * This function compares the title, type, attributes, and methods of two class nodes
   * and returns a similarity score based on these comparisons. The similarity score is
   * calculated using the Jaro-Winkler distance for the titles, a binary comparison for
   * the types, and custom similarity calculations for the attributes and methods.
   *
   * @param {ClassNode} attemptElement - The class node from the attempt.
   * @param {ClassNode} solutionElement - The class node from the solution.
   * @returns {number} The similarity score between the two class nodes.
   */
  private calcSingleNodeSimilarity(attemptElement: ClassNode, solutionElement: ClassNode): number {
    const nameSimilarity = JaroWinklerDistance(attemptElement.title || "", solutionElement.title || "");
    const typeSimilarity = attemptElement.type == solutionElement.type ? 1 : 0;
    const attributesSimilarity = this.calcAttributesSimilarity(attemptElement.attributes || [], solutionElement.attributes || []);
    const methodsSimilarity = this.calcMethodsSimilarity(attemptElement.methods || [], solutionElement.methods || []);

    const similarity =
      nameSimilarity * nodeWeights.title +
      typeSimilarity * nodeWeights.type +
      attributesSimilarity * nodeWeights.attributes.total +
      methodsSimilarity * nodeWeights.methods.total;
    return similarity;
  }


  /**
   * Generates a similarity log for a single node comparison between an attempt element and a solution element.
   *
   * @param attemptElement - The class node representing the attempt element.
   * @param solutionElement - The class node representing the solution element.
   * @returns A string containing the similarity log. If all similarities are perfect (1), an empty string is returned.
   *
   * The similarity is calculated based on:
   * - Name similarity using Jaro-Winkler distance.
   * - Type similarity (exact match or not).
   * - Attributes similarity using a custom attribute similarity calculation.
   * - Methods similarity using a custom method similarity calculation.
   *
   * If attributes or methods are not identical, detailed logs for each attribute or method are generated.
   */
  private generateSingleNodeSimilarityLog(attemptElement: ClassNode, solutionElement: ClassNode): string {
    const nameSimilarity = JaroWinklerDistance(attemptElement.title || "", solutionElement.title || "");
    const typeSimilarity = attemptElement.type == solutionElement.type ? 1 : 0;
    const attributesSimilarity = this.calcAttributesSimilarity(attemptElement.attributes || [], solutionElement.attributes || []);
    const methodsSimilarity = this.calcMethodsSimilarity(attemptElement.methods || [], solutionElement.methods || []);
    let attributesSimilarityLog = "";
    let methodsSimilarityLog = "";

    if (attributesSimilarity < 1) {
      for (const attribute of this.findElementMatching(attemptElement.attributes || [], solutionElement.attributes || [], this.calcSingleAttributeSimilarity)) {
        if (attribute.attempt == null) {
          attributesSimilarityLog += similarityLogEntries.CLASS_NODE_ATTRIBUTE_MISSING(attribute.solution.name) + "\n";
        } else if (attribute.solution == null) {
          attributesSimilarityLog += similarityLogEntries.CLASS_NODE_ATTRIBUTE_ADDED(attribute.attempt.name) + "\n";
        } else {
          attributesSimilarityLog += this.generateSingleAttributeSimilarityLog(attribute.attempt, attribute.solution);
        }
      }
    }
    if (methodsSimilarity < 1) {
      for (const method of this.findElementMatching(attemptElement.methods || [], solutionElement.methods || [], this.calcSingleMethodSimilarity)) {
        if (method.attempt == null) {
          methodsSimilarityLog += similarityLogEntries.CLASS_NODE_METHOD_MISSING(method.solution.name) + "\n";
        } else if (method.solution == null) {
          methodsSimilarityLog += similarityLogEntries.CLASS_NODE_METHOD_ADDED(method.attempt.name) + "\n";
        } else {
          methodsSimilarityLog += this.generateSingleMethodSimilarityLog(method.attempt, method.solution);
        }
      }
    }

    if (nameSimilarity == 1 && typeSimilarity == 1 && attributesSimilarity == 1 && methodsSimilarity == 1) {
      return "";
    } else {
      return (
        similarityLogEntries.CLASS_NODE_INTRODUCTION(attemptElement.title) + "\n"
      + ( (nameSimilarity < 1) ? similarityLogEntries.CLASS_NODE_TITLE(attemptElement.title, solutionElement.title) + "\n" : "")
      + ( (typeSimilarity < 1) ? similarityLogEntries.CLASS_NODE_TYPE(attemptElement.type, solutionElement.type) + "\n" : "")
      + ( (attributesSimilarity < 1) ? attributesSimilarityLog + "\n" : "")
      + ( (methodsSimilarity < 1) ? methodsSimilarityLog + "\n" : "") );
    }
  }


  /**
   * Calculates the similarity between two class attributes based on their name, data type, and visibility.
   *
   * @param {ClassAttribute} attemptAttribute - The attribute from the attempt to compare.
   * @param {ClassAttribute} solutionAttribute - The attribute from the solution to compare.
   * @returns {number} The similarity score between the two attributes, ranging from 0 to 1.
   */
  private calcSingleAttributeSimilarity(attemptAttribute: ClassAttribute, solutionAttribute: ClassAttribute): number {
    const nameSimilarity = JaroWinklerDistance(attemptAttribute.name, solutionAttribute.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptAttribute.dataType, solutionAttribute.dataType);
    const visibilitySimilarity = attemptAttribute.visibility == solutionAttribute.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.attributes.name +
      dataTypeSimilarity * nodeWeights.attributes.dataType +
      visibilitySimilarity * nodeWeights.attributes.visibility;

    return similarity;
  }

  /**
   * Generates a similarity log for a single attribute by comparing the attempt attribute
   * with the solution attribute. The similarity is calculated based on the name, data type,
   * and visibility of the attributes.
   *
   * @param {ClassAttribute} attemptAttribute - The attribute from the attempt to be compared.
   * @param {ClassAttribute} solutionAttribute - The attribute from the solution to be compared.
   * @returns {string} - A log entry detailing the differences between the attributes, or an empty string if they are identical.
   */
  private generateSingleAttributeSimilarityLog(attemptAttribute: ClassAttribute, solutionAttribute: ClassAttribute): string {
    const nameSimilarity = JaroWinklerDistance(attemptAttribute.name, solutionAttribute.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptAttribute.dataType, solutionAttribute.dataType);
    const visibilitySimilarity = attemptAttribute.visibility == solutionAttribute.visibility ? 1 : 0;

    if (nameSimilarity == 1 && dataTypeSimilarity == 1 && visibilitySimilarity == 1) {
      return "";
    } else {
      return similarityLogEntries.CLASS_NODE_ATTRIBUTE_INTRODUCTION(attemptAttribute.name) + "\n"
      + ((nameSimilarity < 1) ? similarityLogEntries.CLASS_NODE_ATTRIBUTE_NAME(attemptAttribute.name, solutionAttribute.name) + "\n" : "")
      + ((dataTypeSimilarity < 1) ? similarityLogEntries.CLASS_NODE_ATTRIBUTE_DATATYPE(attemptAttribute.dataType, solutionAttribute.dataType) + "\n" : "")
      + ((visibilitySimilarity < 1) ? similarityLogEntries.CLASS_NODE_ATTRIBUTE_VISIBILITY(attemptAttribute.visibility, solutionAttribute.visibility) + "\n" : "");
    }
  }


  /**
   * Calculates the similarity between two class methods based on their name, data type, and visibility.
   *
   * @param {ClassMethod} attemptMethod - The method from the attempt to compare.
   * @param {ClassMethod} solutionMethod - The method from the solution to compare against.
   * @returns {number} - The similarity score between the two methods.
   */
  private calcSingleMethodSimilarity(attemptMethod: ClassMethod, solutionMethod: ClassMethod): number {
    const nameSimilarity = JaroWinklerDistance(attemptMethod.name, solutionMethod.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptMethod.dataType, solutionMethod.dataType);
    const visibilitySimilarity = attemptMethod.visibility == solutionMethod.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.methods.name +
      dataTypeSimilarity * nodeWeights.methods.dataType +
      visibilitySimilarity * nodeWeights.methods.visibility;

    return similarity;
  }


  /**
   * Generates a similarity log for a single method comparison between an attempt method and a solution method.
   *
   * This function compares the name, data type, and visibility of the two methods using the Jaro-Winkler distance
   * for name and data type similarity, and a direct comparison for visibility. If all similarities are perfect (i.e., 1),
   * an empty string is returned. Otherwise, a log entry is generated detailing the differences.
   *
   * @param {ClassMethod} attemptMethod - The method from the attempt to be compared.
   * @param {ClassMethod} solutionMethod - The method from the solution to be compared.
   * @returns {string} A log entry detailing the differences between the attempt method and the solution method, or an empty string if they are identical.
   */
  private generateSingleMethodSimilarityLog(attemptMethod: ClassMethod, solutionMethod: ClassMethod): string {
    const nameSimilarity = JaroWinklerDistance(attemptMethod.name, solutionMethod.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptMethod.dataType, solutionMethod.dataType);
    const visibilitySimilarity = attemptMethod.visibility == solutionMethod.visibility ? 1 : 0;

    if (nameSimilarity == 1 && dataTypeSimilarity == 1 && visibilitySimilarity == 1) {
      return "";
    } else {
      return similarityLogEntries.CLASS_NODE_METHOD_INTRODUCTION(attemptMethod.name) + "\n"
      + ((nameSimilarity < 1) ? similarityLogEntries.CLASS_NODE_METHOD_NAME(attemptMethod.name, solutionMethod.name) + "\n" : "")
      + ((dataTypeSimilarity < 1) ? similarityLogEntries.CLASS_NODE_METHOD_DATATYPE(attemptMethod.dataType, solutionMethod.dataType) + "\n" : "")
      + ((visibilitySimilarity < 1) ? similarityLogEntries.CLASS_NODE_METHOD_VISIBILITY(attemptMethod.visibility, solutionMethod.visibility) + "\n" : "");
    }
  }


  /**
   * Calculates the similarity between two edges in a class diagram.
   *
   * @param {ClassEdge} attemptEdge - The edge from the attempt diagram.
   * @param {ClassEdge} solutionEdge - The edge from the solution diagram.
   * @returns {number} The similarity score between the two edges.
   *
   * The similarity is calculated based on the following criteria:
   * - Type similarity: 1 if the types are the same, 0 otherwise.
   * - Start similarity: 1 if the start nodes are the same, 0 otherwise.
   * - End similarity: 1 if the end nodes are the same, 0 otherwise.
   * - Cardinality start similarity: Calculated using the Jaro-Winkler distance between the cardinality start values.
   * - Description similarity: Calculated using the Jaro-Winkler distance between the descriptions.
   * - Cardinality end similarity: Calculated using the Jaro-Winkler distance between the cardinality end values.
   *
   * If the start and end nodes are not similar and the edge type has no direction (as defined in `swappableEditorElement`),
   * the start and end nodes are swapped and the similarity is recalculated.
   *
   * The final similarity score is a weighted sum of the individual similarity scores, with weights defined in `edgeWeights`.
   */
  private calcSingleEdgeSimilarity(attemptEdge: ClassEdge, solutionEdge: ClassEdge): number {
    const typeSimilarity = attemptEdge.type == solutionEdge.type ? 1 : 0;
    let startSimilarity = attemptEdge.start == solutionEdge.start ? 1 : 0;
    let endSimilarity = attemptEdge.end == solutionEdge.end ? 1 : 0;

    // if there is no similarity and the edge type has no direction per definition in swappableEditorElement, we can try swapping the start and end
    if (startSimilarity == 0 && endSimilarity == 0 && typeSimilarity == 1 && (attemptEdge.type in swappableEditorElement) ) {
      startSimilarity = attemptEdge.end == solutionEdge.start ? 1 : 0;
      endSimilarity = attemptEdge.start == solutionEdge.end ? 1 : 0;
    }
    const cardinalityStartSimilarity = JaroWinklerDistance(attemptEdge.cardinalityStart || "", solutionEdge.cardinalityStart || "");
    const descriptionSimilarity = JaroWinklerDistance(attemptEdge.description || "", solutionEdge.description || "");
    const cardinalityEndSimilarity = JaroWinklerDistance(attemptEdge.cardinalityEnd || "", solutionEdge.cardinalityEnd || "");

    const similarity =
      typeSimilarity * edgeWeights.type +
      startSimilarity * edgeWeights.start +
      endSimilarity * edgeWeights.end +
      cardinalityStartSimilarity * edgeWeights.cardinalityStart +
      descriptionSimilarity * edgeWeights.description +
      cardinalityEndSimilarity * edgeWeights.cardinalityEnd;
    return similarity;
  }


  /**
   * Generates a similarity log for a single edge comparison between an attempt edge and a solution edge.
   *
   * @param {ClassEdge} attemptEdge - The edge from the attempt to be compared.
   * @param {ClassEdge} solutionEdge - The edge from the solution to be compared against.
   * @returns {string} - A log entry detailing the similarities and differences between the two edges.
   *
   * The function compares the following properties of the edges:
   * - Type
   * - Start node
   * - End node
   * - Cardinality at the start
   * - Description
   * - Cardinality at the end
   *
   * If the edges are identical in all properties, an empty string is returned. Otherwise, a log entry is generated
   * detailing the differences.
   *
   * If the edge type has no direction (as defined in `swappableEditorElement`), the function attempts to swap the start
   * and end nodes to find a match.
   *
   * The similarity of the cardinality and description properties is calculated using the Jaro-Winkler distance.
   *
   * The log entry is constructed using various `similarityLogEntries` functions to describe the differences.
   */
  private generateSingleEdgeSimilarityLog(attemptEdge: ClassEdge, solutionEdge: ClassEdge): string {
    const typeSimilarity = attemptEdge.type == solutionEdge.type ? 1 : 0;
    let startSimilarity = attemptEdge.start == solutionEdge.start ? 1 : 0;
    let endSimilarity = attemptEdge.end == solutionEdge.end ? 1 : 0;

    // if there is no similarity and the edge type has no direction per definition in swappableEditorElement, we can try swapping the start and end
    if (startSimilarity == 0 && endSimilarity == 0 && typeSimilarity == 1 && (attemptEdge.type in swappableEditorElement) ) {
      startSimilarity = attemptEdge.end == solutionEdge.start ? 1 : 0;
      endSimilarity = attemptEdge.start == solutionEdge.end ? 1 : 0;
    }

    const cardinalityStartSimilarity = JaroWinklerDistance(attemptEdge.cardinalityStart || "", solutionEdge.cardinalityStart || "");
    const descriptionSimilarity = JaroWinklerDistance(attemptEdge.description || "", solutionEdge.description || "");
    const cardinalityEndSimilarity = JaroWinklerDistance(attemptEdge.cardinalityEnd || "", solutionEdge.cardinalityEnd || "");

    if (typeSimilarity == 1 && startSimilarity == 1 && endSimilarity == 1 && cardinalityStartSimilarity == 1 && descriptionSimilarity == 1 && cardinalityEndSimilarity == 1) {
      return "";
    } else {
      return similarityLogEntries.CLASS_EDGE_INTRODUCTION(attemptEdge.description) + "\n"
      + ((typeSimilarity < 1) ? similarityLogEntries.CLASS_EDGE_TYPE(attemptEdge.type, solutionEdge.type) + "\n" : "")
      + ((startSimilarity < 1) ? similarityLogEntries.CLASS_EDGE_START(this.nodeMap.get(attemptEdge.start) ?? 'nameless', this.nodeMap.get(solutionEdge.start) ?? 'nameless') + "\n" : "")
      + ((endSimilarity < 1) ? similarityLogEntries.CLASS_EDGE_END(this.nodeMap.get(attemptEdge.end) ?? 'nameless', this.nodeMap.get(solutionEdge.end) ?? 'nameless') + "\n" : "")
      + ((cardinalityStartSimilarity < 1) ? similarityLogEntries.CLASS_EDGE_CARDINALITY_START(attemptEdge.cardinalityStart, solutionEdge.cardinalityStart) + "\n" : "")
      + ((descriptionSimilarity < 1) ? similarityLogEntries.CLASS_EDGE_DESCRIPTION(attemptEdge.description, solutionEdge.description) + "\n" : "")
      + ((cardinalityEndSimilarity < 1) ? similarityLogEntries.CLASS_EDGE_CARDINALITY_END(attemptEdge.cardinalityEnd, solutionEdge.cardinalityEnd) + "\n" : "");
    }
  }


  /**
   * Finds the best matching elements between two arrays using a provided similarity function.
   *
   * @param attemptElement - The array of elements to be matched against the solution elements.
   * @param solutionAttempt - The array of solution elements to be matched against the attempt elements.
   * @param similarityFunction - A function that takes two elements (one from each array) and returns a similarity score between them.
   * @returns An array of BasicMatching objects, each containing an attempt element, a solution element, and their similarity score.
   */
  private findElementMatching(
    attemptElement: any[],
    solutionAttempt: any[],
    similarityFunction: (attempt: any, solution: any) => number ): BasicMatching[] {
    // copy the arrays
    const tempAttempt = [...attemptElement];
    const tempSolution = [...solutionAttempt];
    const matching: BasicMatching[] = [];

    while (tempAttempt.length + tempSolution.length > 0) {
      if (tempAttempt.length === 0) {
        matching.push({ attempt: null, solution: tempSolution[0], similarity: 0 });
        tempSolution.splice(0, 1);
      } else if (tempSolution.length === 0) {
        matching.push({ attempt: tempAttempt[0], solution: null, similarity: 0 });
        tempAttempt.splice(0, 1);
      } else {
        let bestMatch = 0;
        let currentAttemptIndex = 0;
        let bestMatchIndex = 0;
        for (let i = 0; i < tempAttempt.length; i++) {
          for (let j = 0; j < tempSolution.length; j++) {
            const similarity = similarityFunction(tempAttempt[i], tempSolution[j]);
            if (similarity > bestMatch) {
              bestMatch = similarity;
              currentAttemptIndex = i;
              bestMatchIndex = j;
            }
          }
        }
        // we found the best match and remove it from the arrays (providing a rounded similarity)
        matching.push({ attempt: tempAttempt[currentAttemptIndex], solution: tempSolution[bestMatchIndex], similarity: Math.round(bestMatch * 1000000) / 1000000 });
        tempAttempt.splice(currentAttemptIndex, 1);
        tempSolution.splice(bestMatchIndex, 1);
      }
    }
    return matching;
  }

}
