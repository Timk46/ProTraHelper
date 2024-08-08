import { ClassAttribute, ClassMethod, ClassNode } from "@Interfaces/index";
import { Injectable } from "@nestjs/common";
import { JaroWinklerDistance } from 'natural';
import { nodeWeights, edgeWeights } from "./similarity-weights.config";


@Injectable()
export class SimilarityCompareService {


  // TODO

  public getGraphSimilarity(attemptGraph: ClassNode[], solutionGraph: ClassNode[]): number {
    return 0;
  }



  public getNodesSimilarity(attemptNodes: ClassNode[], solutionNodes: ClassNode[]): number {
    const matching = this.getElementMatching(attemptNodes, solutionNodes, this.getSingleNodeSimilarity);
    return matching.reduce((acc, curr) => acc + curr.similarity, 0) / matching.length;
  }


  public getAttributesSimilarity(attemptAttributes: ClassAttribute[], solutionAttributes: ClassAttribute[]): number {
    const matching = this.getElementMatching(attemptAttributes, solutionAttributes, this.getSingleAttributeSimilarity);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }


  public getMethodsSimilarity(attemptMethods: ClassMethod[], solutionMethods: ClassMethod[]): number {
    const matching = this.getElementMatching(attemptMethods, solutionMethods, this.getSingleMethodSimilarity);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }


  public getSingleNodeSimilarity(attemptElement: ClassNode, solutionElement: ClassNode): number {

    const nameSimilarity = JaroWinklerDistance(attemptElement.title || "", solutionElement.title || "");
    const typeSimilarity = attemptElement.type == solutionElement.type ? 1 : 0;
    const attributesSimilarity = this.getAttributesSimilarity(attemptElement.attributes || [], solutionElement.attributes || []);
    const methodsSimilarity = this.getMethodsSimilarity(attemptElement.methods || [], solutionElement.methods || []);

    const similarity =
      nameSimilarity * nodeWeights.title +
      typeSimilarity * nodeWeights.type +
      attributesSimilarity * nodeWeights.attributes.total +
      methodsSimilarity * nodeWeights.methods.total;

    return similarity;
  }


  public getSingleAttributeSimilarity(attemptAttribute: ClassAttribute, solutionAttribute: ClassAttribute): number {
    const nameSimilarity = JaroWinklerDistance(attemptAttribute.name, solutionAttribute.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptAttribute.dataType, solutionAttribute.dataType);
    const visibilitySimilarity = attemptAttribute.visibility == solutionAttribute.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.attributes.name +
      dataTypeSimilarity * nodeWeights.attributes.dataType +
      visibilitySimilarity * nodeWeights.attributes.visibility;

    return similarity;
  }


  public getSingleMethodSimilarity(attemptMethod: ClassMethod, solutionMethod: ClassMethod): number {
    const nameSimilarity = JaroWinklerDistance(attemptMethod.name, solutionMethod.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptMethod.dataType, solutionMethod.dataType);
    const visibilitySimilarity = attemptMethod.visibility == solutionMethod.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.methods.name +
      dataTypeSimilarity * nodeWeights.methods.dataType +
      visibilitySimilarity * nodeWeights.methods.visibility;

    return similarity;
  }


  public getElementMatching(
    attemptElement: any[],
    solutionAttempt: any[],
    similarityFunction: (attempt: any, solution: any) => number ): { attempt: any | null, solution: any | null, similarity: number }[] {
    // copy the arrays
    const tempAttempt = [...attemptElement];
    const tempSolution = [...solutionAttempt];
    const matching: { attempt: any | null, solution: any | null, similarity: number }[] = [];

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
        matching.push({ attempt: tempAttempt[currentAttemptIndex], solution: tempSolution[bestMatchIndex], similarity: bestMatch });
        tempAttempt.splice(currentAttemptIndex, 1);
        tempSolution.splice(bestMatchIndex, 1);
      }
    }
    console.log(matching);
    return matching;
  }

}
