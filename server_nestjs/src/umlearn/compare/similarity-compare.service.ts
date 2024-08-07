import { ClassAttribute, ClassMethod, ClassNode } from "@Interfaces/index";
import { Injectable } from "@nestjs/common";
import { JaroWinklerDistance } from 'natural';
import { nodeWeights, edgeWeights } from "./similarity-weights.config";


@Injectable()
export class SimilarityCompareService {



  public getNodeSimilarity(attemptElement: ClassNode, solutionElement: ClassNode): number {

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

  public getAttributesSimilarity(attemptAttributes: ClassAttribute[], solutionAttributes: ClassAttribute[]): number {
    const matching = this.getAttributesMatching(attemptAttributes, solutionAttributes);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }

  public getMethodsSimilarity(attemptMethods: ClassMethod[], solutionMethods: ClassMethod[]): number {
    const matching = this.getMethodsMatching(attemptMethods, solutionMethods);
    return (matching.reduce((acc, curr) => acc + curr.similarity, 0)) / matching.length;
  }

  public getAttributesMatching(attemptAttributes: ClassAttribute[], solutionAttributes: ClassAttribute[]): { attempt: ClassAttribute | null, solution: ClassAttribute | null, similarity: number }[] {
    // copy the arrays
    const tempAttemptAttributes = [...attemptAttributes];
    const tempSolutionAttributes = [...solutionAttributes];
    const matching: { attempt: ClassAttribute | null, solution: ClassAttribute | null, similarity: number }[] = [];

    while (tempAttemptAttributes.length + tempSolutionAttributes.length > 0) {
      if (tempAttemptAttributes.length === 0) {
        matching.push({ attempt: null, solution: tempSolutionAttributes[0], similarity: 0 });
        tempSolutionAttributes.splice(0, 1);
      } else if (tempSolutionAttributes.length === 0) {
        matching.push({ attempt: tempAttemptAttributes[0], solution: null, similarity: 0 });
        tempAttemptAttributes.splice(0, 1);
      } else {
        let bestMatch = 0;
        let currentAttemptIndex = 0;
        let bestMatchIndex = 0;
        for (let i = 0; i < tempAttemptAttributes.length; i++) {
          for (let j = 0; j < tempSolutionAttributes.length; j++) {
            const similarity = this.getSingleAttributeSimilarity(tempAttemptAttributes[i], tempSolutionAttributes[j]);
            if (similarity > bestMatch) {
              bestMatch = similarity;
              currentAttemptIndex = i;
              bestMatchIndex = j;
            }
          }
        }
        matching.push({ attempt: tempAttemptAttributes[currentAttemptIndex], solution: tempSolutionAttributes[bestMatchIndex], similarity: bestMatch });
        tempAttemptAttributes.splice(currentAttemptIndex, 1);
        tempSolutionAttributes.splice(bestMatchIndex, 1);
      }
    }
    console.log(matching);
    return matching;
  }


  public getMethodsMatching(attemptMethods: ClassMethod[], solutionMethods: ClassMethod[]): { attempt: ClassMethod | null, solution: ClassMethod | null, similarity: number }[] {
    // copy the arrays
    const tempAttemptMethods = [...attemptMethods];
    const tempSolutionMethods = [...solutionMethods];
    const matching: { attempt: ClassMethod | null, solution: ClassMethod | null, similarity: number }[] = [];

    while (tempAttemptMethods.length + tempSolutionMethods.length > 0) {
      if (tempAttemptMethods.length === 0) {
        matching.push({ attempt: null, solution: tempSolutionMethods[0], similarity: 0 });
        tempSolutionMethods.splice(0, 1);
      } else if (tempSolutionMethods.length === 0) {
        matching.push({ attempt: tempAttemptMethods[0], solution: null, similarity: 0 });
        tempAttemptMethods.splice(0, 1);
      } else {
        let bestMatch = 0;
        let currentAttemptIndex = 0;
        let bestMatchIndex = 0;
        for (let i = 0; i < tempAttemptMethods.length; i++) {
          for (let j = 0; j < tempSolutionMethods.length; j++) {
            const similarity = this.getSingleMethodSimilarity(tempAttemptMethods[i], tempSolutionMethods[j]);
            if (similarity > bestMatch) {
              bestMatch = similarity;
              currentAttemptIndex = i;
              bestMatchIndex = j;
            }
          }
        }
        matching.push({ attempt: tempAttemptMethods[currentAttemptIndex], solution: tempSolutionMethods[bestMatchIndex], similarity: bestMatch });
        tempAttemptMethods.splice(currentAttemptIndex, 1);
        tempSolutionMethods.splice(bestMatchIndex, 1);
      }
    }
    console.log(matching);
    return matching;
  }

  private getSingleAttributeSimilarity(attemptAttribute: ClassAttribute, solutionAttribute: ClassAttribute): number {
    const nameSimilarity = JaroWinklerDistance(attemptAttribute.name, solutionAttribute.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptAttribute.dataType, solutionAttribute.dataType);
    const visibilitySimilarity = attemptAttribute.visibility == solutionAttribute.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.attributes.name +
      dataTypeSimilarity * nodeWeights.attributes.dataType +
      visibilitySimilarity * nodeWeights.attributes.visibility;

    return similarity;
  }

  private getSingleMethodSimilarity(attemptMethod: ClassMethod, solutionMethod: ClassMethod): number {
    const nameSimilarity = JaroWinklerDistance(attemptMethod.name, solutionMethod.name);
    const dataTypeSimilarity = JaroWinklerDistance(attemptMethod.dataType, solutionMethod.dataType);
    const visibilitySimilarity = attemptMethod.visibility == solutionMethod.visibility ? 1 : 0;
    const similarity =
      nameSimilarity * nodeWeights.methods.name +
      dataTypeSimilarity * nodeWeights.methods.dataType +
      visibilitySimilarity * nodeWeights.methods.visibility;

    return similarity;
  }


}
