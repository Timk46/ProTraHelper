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


  public calcGraphSimilarity(attemptGraph: editorDataDTO, solutionGraph: editorDataDTO): number {
    const { nodeMatchings, edgeMatchings } = this.findGraphMatching(attemptGraph, solutionGraph);

    // if the matching is empty, there is nothing to compare so it has to be 100% similar
    const nodeSimilarity = nodeMatchings.length === 0 ? 1 : nodeMatchings.reduce((acc, curr) => acc + curr.similarity, 0) / nodeMatchings.length;
    const edgeSimilarity = edgeMatchings.length === 0 ? 1 : edgeMatchings.reduce((acc, curr) => acc + curr.similarity, 0) / edgeMatchings.length;

    const similarity = nodeSimilarity * nodeWeights.total + edgeSimilarity * edgeWeights.total;
    console.log(similarity);
    return similarity;
  }


  public generateGraphSimilarityLog(graphMatching: GraphMatching): string {
    return similarityLogEntries.LOG_GRAPH_INTRODUCTION + "\n"
    + ("----------------------------------\n")
    + (this.generateNodesSimilarityLog(graphMatching.nodeMatchings) + "\n")
    + ("----------------------------------\n")
    + (this.generateEdgesSimilarityLog(graphMatching.edgeMatchings));
  }


  public generateEdgesSimilarityLog(edgesMatching: {attempt: ClassEdge, solution: ClassEdge, similarity: number}[]): string {
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


  public calcNodesSimilarity(attemptNodes: ClassNode[], solutionNodes: ClassNode[]): number {
    const matching = this.findElementMatching(attemptNodes, solutionNodes, this.calcSingleNodeSimilarity);
    return matching.reduce((acc, curr) => acc + curr.similarity, 0) / matching.length;
  }


  public generateNodesSimilarityLog(nodesMatching: {attempt: ClassNode, solution: ClassNode, similarity: number}[]): string {
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


  public calcAttributesSimilarity(attemptAttributes: ClassAttribute[], solutionAttributes: ClassAttribute[]): number{
    if (attemptAttributes.length == 0 && solutionAttributes.length == 0) {
      return 1;
    }
    const matching = this.findElementMatching(attemptAttributes, solutionAttributes, this.calcSingleAttributeSimilarity);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }


  public calcMethodsSimilarity(attemptMethods: ClassMethod[], solutionMethods: ClassMethod[]): number {
    if (attemptMethods.length == 0 && solutionMethods.length == 0) {
      return 1;
    }
    const matching = this.findElementMatching(attemptMethods, solutionMethods, this.calcSingleMethodSimilarity);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }


  public calcSingleNodeSimilarity(attemptElement: ClassNode, solutionElement: ClassNode): number {
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


  public generateSingleNodeSimilarityLog(attemptElement: ClassNode, solutionElement: ClassNode): string {
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


  public calcSingleAttributeSimilarity(attemptAttribute: ClassAttribute, solutionAttribute: ClassAttribute): number {
    const nameSimilarity = JaroWinklerDistance(attemptAttribute.name, solutionAttribute.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptAttribute.dataType, solutionAttribute.dataType);
    const visibilitySimilarity = attemptAttribute.visibility == solutionAttribute.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.attributes.name +
      dataTypeSimilarity * nodeWeights.attributes.dataType +
      visibilitySimilarity * nodeWeights.attributes.visibility;

    return similarity;
  }

  public generateSingleAttributeSimilarityLog(attemptAttribute: ClassAttribute, solutionAttribute: ClassAttribute): string {
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


  public calcSingleMethodSimilarity(attemptMethod: ClassMethod, solutionMethod: ClassMethod): number {
    const nameSimilarity = JaroWinklerDistance(attemptMethod.name, solutionMethod.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptMethod.dataType, solutionMethod.dataType);
    const visibilitySimilarity = attemptMethod.visibility == solutionMethod.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.methods.name +
      dataTypeSimilarity * nodeWeights.methods.dataType +
      visibilitySimilarity * nodeWeights.methods.visibility;

    return similarity;
  }


  public generateSingleMethodSimilarityLog(attemptMethod: ClassMethod, solutionMethod: ClassMethod): string {
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


  public calcSingleEdgeSimilarity(attemptEdge: ClassEdge, solutionEdge: ClassEdge): number {
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


  public generateSingleEdgeSimilarityLog(attemptEdge: ClassEdge, solutionEdge: ClassEdge): string {
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


  public findElementMatching(
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
