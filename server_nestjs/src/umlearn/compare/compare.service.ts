import { editorDataDTO } from '@DTOs/index';
import { swappableEditorElement } from '@DTOs/index';
import { Injectable } from '@nestjs/common';
import { detailedDiff } from 'deep-object-diff';
import { ClassNode, ClassAttribute, ClassMethod, NodeMatch } from '@DTOs/index';
import { ClassEdge, EdgeMatch } from '@DTOs/index';
import * as _ from 'lodash';
import { JaroWinklerDistance } from 'natural';
import { PointCalculationService } from '../point-calculation/point-calculation.service';
import { pointDefinitions } from '../point-calculation/point-calculation.settings';

@Injectable()
export class CompareService {
  constructor(private readonly pointCalculator: PointCalculationService) {}

  /**
   * Compares the solution and the attempt and returns the attempt with highlights.
   * @param {editorDataDTO} solution - The solution data to compare.
   * @param {editorDataDTO} attempt - The attempt data to compare.
   * @returns {editorDataDTO} The highlighted differences between the solution and attempt data.
   */
  async compare(solution: editorDataDTO, attempt: editorDataDTO): Promise<editorDataDTO> {
    // matchNodes returns an object containing the final matches and the nodes with no matches
    const { finalMatches, noMatches } = this.matchNodes(solution.nodes, attempt.nodes);
    // matchEdges returns an array of edge matches between solution and attempt
    const edgeMatches = this.matchEdges(solution.edges, attempt.edges, finalMatches);

    const highlightedNodes = this.highlightNodes(
      finalMatches,
      noMatches,
      solution.nodes,
      attempt.nodes,
    );
    const highlightedEdges = this.highlightEdges(
      finalMatches,
      edgeMatches,
      solution.edges,
      attempt.edges,
    );

    return {
      nodes: highlightedNodes,
      edges: highlightedEdges,
    };
  }

  /**
   * Compares the solutions and calculates the reached points based on the maximum points.
   *
   * @param {editorDataDTO} solution - The solution data to compare.
   * @param {editorDataDTO} attempt - The attempt data to compare.
   * @param maxPoints The maximum points that can be achieved.
   * @returns The reached points calculated based on the comparison.
   */
  async compareAndCalculate(
    solution: editorDataDTO,
    attempt: editorDataDTO,
    maxPoints: number,
  ): Promise<{ points: number; highlightData: editorDataDTO }> {
    //console.log("datatatat: ", attempt);
    if (attempt.nodes.length == 0) {
      //return 0;
      return { points: 0, highlightData: { nodes: [], edges: [] } };
    }
    if (solution.nodes.length == 0) {
      //for later: what to do when a task is given, but no solution?
      //return 0;
      return { points: 0, highlightData: { nodes: [], edges: [] } };
    }

    const highlightedData = await this.compare(solution, attempt);

    const reachedPoints = await this.pointCalculator.calculatePoints(
      highlightedData,
      solution,
      maxPoints,
    );

    /* console.log("##### solution: #####", solution);
    console.log("##### attempt: #####", attempt);
    console.log("##### highlightedData: #####", highlightedData);
    console.log("##### mistakes: #####", (nodesMistakes + edgesMistakes), " / ", maxPoints); */
    //return reachedPoints;
    return { points: reachedPoints, highlightData: highlightedData };
  }

  /**
   * Highlights the nodes based on the final matches, no matches, solution nodes, and attempt nodes.
   *
   * @param finalMatches - The final matches between solution nodes and attempt nodes.
   * @param noMatches - The nodes that do not have any matches.
   * @param solutionNodes - The solution nodes.
   * @param attemptNodes - The attempt nodes.
   * @returns An array of class nodes with highlights.
   */
  highlightNodes(
    finalMatches: NodeMatch[],
    noMatches: ClassNode[],
    solutionNodes: ClassNode[],
    attemptNodes: ClassNode[],
  ): ClassNode[] {
    const result: ClassNode[] = [];

    // For each match in finalMatches, find the corresponding node in solutionNodes and attemptNodes
    finalMatches.forEach(match => {
      const solutionNode = solutionNodes.find(node => node.id === match.solutionNode.id);
      const attemptNode = attemptNodes.find(node => node.id === match.attemptNode.id);

      if (solutionNode && attemptNode) {
        // compareNodes returns the attemptNode with highlights
        result.push(this.compareNodes(solutionNode, attemptNode));
      }
    });

    // Add the nodes from noMatches to the result array
    noMatches.forEach(noMatch => {
      result.push(noMatch);
    });

    // Update the position of the missing nodes
    this.updateMissingNodesPosition(result);

    return result;
  }

  /**
   * Highlights the edges based on the highlighted nodes, edge matches, solution edges, and attempt edges.
   *
   * @param highlightedNodes - The highlighted nodes.
   * @param edgeMatches - The edge matches between solution edges and attempt edges.
   * @param solutionEdges - The solution edges.
   * @param attemptEdges - The attempt edges.
   * @returns An array of class edges with highlights.
   */
  highlightEdges(
    finalMatches: NodeMatch[],
    edgeMatches: EdgeMatch[],
    solutionEdges: ClassEdge[],
    attemptEdges: ClassEdge[],
  ): ClassEdge[] {
    const result: ClassEdge[] = [];

    // For each match in edgeMatches compare the solutionEdge and attemptEdge and add the attemptEdge with highlights to result
    edgeMatches.forEach(match => {
      const solutionEdge = match.solutionEdge;
      const attemptEdge = match.attemptEdge;

      // compareEdges returns the attemptEdge with highlights
      result.push(this.compareEdges(solutionEdge, attemptEdge));
    });

    // For each edge in attemptEdges, that is not in edgeMatches, add the edge with highlighted code "not_found" to result
    attemptEdges.forEach(attemptEdge => {
      if (!edgeMatches.some(match => match.attemptEdge.id === attemptEdge.id)) {
        result.push({
          ...attemptEdge,
          highlighted: {
            code: 'not_found',
          },
        });
      }
    });

    // For each edge in solutionEdges, that is not in edgeMatches, add the edge with highlighted code "missing" to result
    solutionEdges.forEach(solutionEdge => {
      if (!edgeMatches.some(match => match.solutionEdge.id === solutionEdge.id)) {
        // if the start or end node of the edge is in finalMatches, then replace the id with the id of the corresponding node in attemptNodes
        if (finalMatches.some(match => match.solutionNode.id === solutionEdge.start)) {
          solutionEdge.start = finalMatches.find(
            match => match.solutionNode.id === solutionEdge.start,
          ).attemptNode.id;
        }
        result.push({
          ...solutionEdge,
          highlighted: {
            code: 'missing',
          },
        });
      }
    });
    return result;
  }

  /**
   * Performs typo detection on the given solutionNode and attemptNode.
   * If the distance between the titles of the nodes is greater than or equal to 0.85,
   * the title of the attemptNode is updated to match the title of the solutionNode.
   * For each method in the attemptNode, the method name is updated to match the method name
   * in the solutionNode if the Jaro-Winkler distance between them is greater than 0.8.
   * Similarly, for each attribute in the attemptNode, the attribute name is updated to match
   * the attribute name in the solutionNode if the Jaro-Winkler distance between them is greater than 0.8.
   * Returns the updated attemptNode.
   *
   * @param solutionNode - The solution node to compare against.
   * @param attemptNode - The attempt node to perform typo detection on.
   * @returns The updated attemptNode with corrected titles, method names, and attribute names.
   */
  typoDetection(solutionNode: ClassNode, attemptNode: ClassNode): ClassNode {
    // For the title
    var distance = JaroWinklerDistance(solutionNode.title, attemptNode.title, undefined);
    if (distance >= 0.85) {
      attemptNode.title = solutionNode.title;
    }

    // For the methods
    for (let k = 0; k < attemptNode.methods.length; k++) {
      var maxDistance = 0.0;
      var maxString = '';
      for (let l = 0; l < solutionNode.methods.length; l++) {
        if (solutionNode.methods[l] && attemptNode.methods[k]) {
          var distance = JaroWinklerDistance(
            solutionNode.methods[l].name,
            attemptNode.methods[k].name,
            undefined,
          );
          if (distance > maxDistance) {
            maxDistance = distance;
            maxString = solutionNode.methods[l].name;
          }
        }
      }
      if (maxDistance > 0.85) {
        attemptNode.methods[k].name = maxString;
      }
      var maxDistance = 0.0;
      var maxString = '';
    }

    // For the attributes
    for (let k = 0; k < attemptNode.attributes.length; k++) {
      var maxDistance = 0.0;
      var maxString = '';
      for (let l = 0; l < solutionNode.attributes.length; l++) {
        if (solutionNode.attributes[l] && attemptNode.attributes[k]) {
          var distance = JaroWinklerDistance(
            solutionNode.attributes[l].name,
            attemptNode.attributes[k].name,
            undefined,
          );
          if (distance > maxDistance) {
            maxDistance = distance;
            maxString = solutionNode.attributes[l].name;
          }
        }
      }
      if (maxDistance > 0.85) {
        attemptNode.attributes[k].name = maxString;
      }
      var maxDistance = 0.0;
      var maxString = '';
    }
    return attemptNode;
  }

  /**
   * Matches the nodes from the solutionNodes array with the nodes from the attemptNodes array.
   * Returns an object containing the final matches and the nodes that have no matches.
   *
   * @param solutionNodes - An array of ClassNode objects representing the solution nodes.
   * @param attemptNodes - An array of ClassNode objects representing the attempt nodes.
   * @returns An object with finalMatches and noMatches arrays.
   */
  matchNodes(
    solutionNodes: ClassNode[],
    attemptNodes: ClassNode[],
  ): { finalMatches: NodeMatch[]; noMatches: ClassNode[] } {
    let allMatches: NodeMatch[] = [];
    const attemptNodesCopy: ClassNode[] = _.cloneDeep(attemptNodes);
    const solutionNodesCopy: ClassNode[] = _.cloneDeep(solutionNodes);
    const finalMatches: NodeMatch[] = [];
    const noMatches: ClassNode[] = [];

    // Loop over all nodes of the solution
    for (let j = 0; j < solutionNodesCopy.length; j++) {
      let solutionNode = solutionNodesCopy[j];

      // Array for matches for this solutionNode
      const matchesForSolutionNode: NodeMatch[] = [];

      // Loop over all nodes of the attempt
      for (let i = 0; i < attemptNodesCopy.length; i++) {
        let attemptNode = _.cloneDeep(attemptNodesCopy[i]);

        // prepareWordsForMatching converts all attribute and method names to lowercase and replaces umlauts
        attemptNode = this.prepareWordsForMatching(attemptNode);
        solutionNode = this.prepareWordsForMatching(solutionNode);

        attemptNode = this.typoDetection(solutionNode, attemptNode);

        // Align attributes and methods
        [solutionNode, attemptNode] = this.alignAttributesAndMethods(solutionNode, attemptNode);

        // Diff between solutionNode and attemptNode
        const detailedDifferences = this.customDetailedDiff(solutionNode, attemptNode, [
          'id',
          'width',
          'height',
          'position',
        ]);

        // Calculate percentage match
        const percentageMatch = this.calculatePercentageMatch(detailedDifferences, attemptNode);

        // Create match object
        const match: NodeMatch = {
          solutionNode: solutionNode,
          attemptNode: attemptNode,
          percentageMatch: percentageMatch,
        };

        // Add match to matchesForSolutionNode
        matchesForSolutionNode.push(match);
      }

      // Check if there is a match with solutionNodeTitle === attemptNodeTitle
      const sameTitleMatch = matchesForSolutionNode.find(
        match => match.solutionNode.title === match.attemptNode.title,
      );

      // if there is a sameTitleMatch, then add it to finalMatches
      if (sameTitleMatch) {
        finalMatches.push(sameTitleMatch);
      } else {
        // All matches for this solutionNode to allMatches
        allMatches.push(...matchesForSolutionNode);
      }
    }

    // Sort allMatches by percentageMatch in descending order
    allMatches.sort((a, b) => b.percentageMatch - a.percentageMatch);

    // Loop over allMatches and add the best matches to finalMatches until there are no matches left or the percentageMatch is below 50
    while (allMatches.length > 0 && allMatches.some(match => match.percentageMatch > 50)) {
      const bestMatch = allMatches.shift();

      if (!bestMatch) {
        continue;
      }

      // Check if there are entries with the same percentageMatch for this solutionNodeID
      const sameCountMatches = allMatches.filter(
        match =>
          match.percentageMatch === bestMatch.percentageMatch &&
          match.solutionNode.id === bestMatch.solutionNode.id,
      );

      if (sameCountMatches.length > 0) {
        // Check if one of the entries has solutionNodeTitle === attemptNodeTitle
        const sameTitleMatch = sameCountMatches.find(
          match => match.solutionNode.title === bestMatch.attemptNode.title,
        );

        if (!sameTitleMatch) {
          // If no matching title was found, add bestMatch to finalMatches
          finalMatches.push(bestMatch);
        } else {
          // Add sameTitleMatch to finalMatches if a matching title was found
          finalMatches.push(sameTitleMatch);
          // Remove sameTitleMatch from allMatches
          allMatches = allMatches.filter(match => match !== sameTitleMatch);
        }
      } else {
        // Add the best match to finalMatches if there are no entries with the same differenceCount
        finalMatches.push(bestMatch);
      }

      // Remove matches with the same solutionNodeId from allMatches
      allMatches = allMatches.filter(match => match.solutionNode.id !== bestMatch.solutionNode.id);
      // Remove matches with the same attemptNodeId from allMatches
      allMatches = allMatches.filter(match => match.attemptNode.id !== bestMatch.attemptNode.id);
    }

    // Check which Nodes in solutionNodes are not in finalMatches and add them to noMatches with highlighted code "missing"
    solutionNodes.forEach(node => {
      if (!finalMatches.some(match => match.solutionNode.id === node.id)) {
        noMatches.push({
          ...node,
          highlighted: {
            code: 'missing',
          },
        });
      }
    });

    // Check which Nodes in attemptNodes are not in finalMatches and add them to noMatches with highlighted code "not_found"
    attemptNodes.forEach(node => {
      if (!finalMatches.some(match => match.attemptNode.id === node.id)) {
        noMatches.push({
          ...node,
          highlighted: {
            code: 'not_found',
          },
        });
      }
    });

    return { finalMatches, noMatches };
  }

  /**
   * Matches the edges between solution and attempt nodes based on the provided finalMatches.
   *
   * @param solutionEdges - The array of solution edges.
   * @param attemptEdges - The array of attempt edges.
   * @param finalMatches - The array of final node matches.
   * @returns An array of matched edges between solution and attempt nodes.
   */
  matchEdges(
    solutionEdges: ClassEdge[],
    attemptEdges: ClassEdge[],
    finalMatches: NodeMatch[],
  ): EdgeMatch[] {
    const edgeMatches: EdgeMatch[] = [];

    for (const attemptEdge of attemptEdges) {
      // find match in finalMatches for start and end node
      const startMatch = finalMatches.find(match => match.attemptNode.id === attemptEdge.start);
      const endMatch = finalMatches.find(match => match.attemptNode.id === attemptEdge.end);

      // if both start and end node have a match in finalMatches
      if (startMatch && endMatch) {
        // then search for corresponding edge in solutionEdges with startMatch.solutionNode.id and endMatch.solutionNode.id
        const solutionEdge = solutionEdges.find(
          edge =>
            edge.start === startMatch.solutionNode.id &&
            edge.end === endMatch.solutionNode.id &&
            edge.type === attemptEdge.type,
        );
        // alternatively search for edges in the wrong direction, but only allow directionless edge types - NEEDS TESTING
        const swappedEdge = solutionEdges.find(
          edge =>
            edge.start === endMatch.solutionNode.id &&
            edge.end === startMatch.solutionNode.id &&
            edge.type === attemptEdge.type &&
            swappableEditorElement.includes(attemptEdge.type),
        );

        if (solutionEdge) {
          // Create match object
          const match: EdgeMatch = {
            solutionEdge: solutionEdge,
            attemptEdge: attemptEdge,
          };
          // Add match to edgeMatches
          edgeMatches.push(match);
        } else if (swappedEdge) {
          console.log('Swapped edge found');
          // Create match object, but with swapped start and end
          const match: EdgeMatch = {
            solutionEdge: swappedEdge,
            attemptEdge: {
              ...attemptEdge,
              start: attemptEdge.end,
              end: attemptEdge.start,
              cardinalityStart: attemptEdge.cardinalityEnd,
              cardinalityEnd: attemptEdge.cardinalityStart,
            },
          };
          // Add match to edgeMatches
          edgeMatches.push(match);
        }
      }
    }
    return edgeMatches;
  }

  /**
   * Creates a new object by copying all properties from the input object, except for the specified properties to ignore.
   * @param obj - The input object to copy properties from.
   * @param propertiesToIgnore - An array of property names to ignore while copying.
   * @returns A new object with all properties from the input object, except for the ignored properties.
   */
  ignoreProperties(obj: any, propertiesToIgnore: string[]): any {
    const newObj = { ...obj };
    propertiesToIgnore.forEach(property => delete newObj[property]);
    return newObj;
  }

  /**
   * Compares two objects and returns a detailed difference between them,
   * ignoring specified properties.
   *
   * @param obj1 - The first object to compare.
   * @param obj2 - The second object to compare.
   * @param propertiesToIgnore - An array of property names to ignore during the comparison.
   * @returns An object representing the detailed difference between the two objects.
   */
  customDetailedDiff(
    obj1: ClassNode | ClassEdge,
    obj2: ClassNode | ClassEdge,
    propertiesToIgnore: string[],
  ): object {
    const obj1WithoutIgnoredProperties = this.ignoreProperties(obj1, propertiesToIgnore);
    const obj2WithoutIgnoredProperties = this.ignoreProperties(obj2, propertiesToIgnore);
    return detailedDiff(obj1WithoutIgnoredProperties, obj2WithoutIgnoredProperties);
  }

  /**
   * Counts the total number of entries in a given node, excluding specific keys.
   *
   * @param node - The node to count the entries from.
   * @returns The total number of entries in the node.
   */
  countTotalEntries(node: any): number {
    let count = 0;
    const excludeKeys = ['id', 'width', 'height', 'position', 'identification'];

    for (const key in node) {
      if (excludeKeys.includes(key)) {
        continue;
      }

      if (typeof node[key] === 'object' && node[key] !== null) {
        count += this.countTotalEntries(node[key]);
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Counts the number of deep differences in an object.
   *
   * @param differences - The object to compare for deep differences.
   * @returns The number of deep differences found in the object.
   */
  countDeepDifferences(differences: any): number {
    let count = 0;

    for (const key in differences) {
      if (typeof differences[key] === 'object' && differences[key] !== null) {
        count += this.countDeepDifferences(differences[key]);
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculates the percentage match between the differences and the attempt node.
   *
   * @param differences - The differences between the attempt and the reference.
   * @param attemptNode - The attempt node to compare.
   * @returns The percentage match between the differences and the attempt node.
   */
  calculatePercentageMatch(differences: any, attemptNode: any): number {
    const totalEntries = this.countTotalEntries(attemptNode);
    const differenceCount = this.countDeepDifferences(differences);

    const matchingEntries = totalEntries - differenceCount;
    const percentageMatch = (matchingEntries / totalEntries) * 100;

    return percentageMatch;
  }

  /**
   * Aligns the attributes and methods of two nodes.
   *
   * @param solutionNode - The solution node.
   * @param attemptNode - The attempt node.
   * @returns An array containing the updated solution node and attempt node.
   */
  alignAttributesAndMethods(
    solutionNode: ClassNode,
    attemptNode: ClassNode,
  ): [ClassNode, ClassNode] {
    // Create new lists for attributes and methods
    const newSolutionAttributes: ClassAttribute[] = [];
    const newAttemptAttributes: ClassAttribute[] = [];
    const newSolutionMethods: ClassMethod[] = [];
    const newAttemptMethods: ClassMethod[] = [];

    // Add attributes that are in both lists
    solutionNode.attributes.forEach((attr: ClassAttribute) => {
      if (attemptNode.attributes.some((a: ClassAttribute) => a.name === attr.name)) {
        newSolutionAttributes.push(attr);
        newAttemptAttributes.push(
          attemptNode.attributes.find((a: ClassAttribute) => a.name === attr.name)!,
        );
      }
    });

    // Add methods that are in both lists
    solutionNode.methods.forEach((method: ClassMethod) => {
      if (attemptNode.methods.some((m: ClassMethod) => m.name === method.name)) {
        newSolutionMethods.push(method);
        newAttemptMethods.push(
          attemptNode.methods.find((m: ClassMethod) => m.name === method.name)!,
        );
      }
    });

    // Add attributes and methods that are only in solutionNode
    solutionNode.attributes.forEach((attr: ClassAttribute) => {
      if (!newSolutionAttributes.some((a: ClassAttribute) => a.name === attr.name)) {
        newSolutionAttributes.push(attr);
      }
    });
    solutionNode.methods.forEach((method: ClassMethod) => {
      if (!newSolutionMethods.some((m: ClassMethod) => m.name === method.name)) {
        newSolutionMethods.push(method);
      }
    });

    // Add attributes and methods that are only in attemptNode
    attemptNode.attributes.forEach((attr: ClassAttribute) => {
      if (!newAttemptAttributes.some((a: ClassAttribute) => a.name === attr.name)) {
        newAttemptAttributes.push(attr);
      }
    });
    attemptNode.methods.forEach((method: ClassMethod) => {
      if (!newAttemptMethods.some((m: ClassMethod) => m.name === method.name)) {
        newAttemptMethods.push(method);
      }
    });

    // Replace the old lists with the new ones
    solutionNode.attributes = newSolutionAttributes;
    attemptNode.attributes = newAttemptAttributes;
    solutionNode.methods = newSolutionMethods;
    attemptNode.methods = newAttemptMethods;

    return [solutionNode, attemptNode];
  }

  /**
   * Converts the attribute and method names of a Node object to lowercase and replaces umlauts.
   *
   * @param node - The Node object to convert.
   * @returns The modified Node object with lowercase attribute and method names.
   */
  prepareWordsForMatching(node: ClassNode): ClassNode {
    // Lowercase title and replace umlauts
    node.title = (node.title ?? '')
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');

    // Lowercase all attribute names and replace umlauts
    node.attributes.forEach((attr: ClassAttribute) => {
      attr.name = attr.name
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');
    });

    // Lowercase all method names and replace umlauts
    node.methods.forEach((method: ClassMethod) => {
      method.name = method.name
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');
    });

    return node;
  }

  /**
   * Creates a custom detailed difference between two ClassNodes.
   * @param {ClassNode} solutionNode - The solution ClassNode.
   * @param {ClassNode} attemptNode - The attempt ClassNode.
   * @returns {any} - The custom detailed difference between the two ClassNodes.
   */
  makeCustomDetailedDiff(solutionNode: ClassNode, attemptNode: ClassNode) {
    return this.customDetailedDiff(solutionNode, attemptNode, [
      'id',
      'width',
      'height',
      'position',
      'identification',
    ]);
  }

  /**
   * Compares two ClassNode objects and returns a modified ClassNode object with highlighted changes.
   * @param solution - The solution ClassNode object.
   * @param attempt - The attempt ClassNode object.
   * @returns The modified ClassNode object with highlighted changes.
   */
  compareNodes(solution: ClassNode, attempt: ClassNode): ClassNode {
    // clone the attempt node
    const resultWithoutTypoCorrection: ClassNode = _.cloneDeep(attempt);
    const result = this.typoDetection(solution, attempt);

    // define the node points
    //const nodePoints: {attributePoints: number, methodPoints: number} = this.pointCalculator.defineNodePoints(solution);
    const nodePoints = {
      attributes: pointDefinitions.node.attribute * solution.attributes.length,
      methods: pointDefinitions.node.method * solution.methods.length,
    };

    // initialize the highlighted object
    result.highlighted = {
      code: 'found',
      maxPoints: nodePoints,
      added: {},
      deleted: {},
      updated: {},
    };

    // compare title and type and add them to the updated object if they are different
    if (result.type.localeCompare(solution.type, undefined, { sensitivity: 'base' }) !== 0) {
      result.highlighted.updated.type = result.type;
    }
    if (
      result.title &&
      solution.title &&
      result.title.localeCompare(solution.title, undefined, { sensitivity: 'base' }) !== 0
    ) {
      result.highlighted.updated.title = result.title;
    }

    // initialize the arrays with null
    result.highlighted.added.attributes = new Array(result.attributes.length).fill(null);
    result.highlighted.updated.attributes = new Array(result.attributes.length).fill(null);
    result.highlighted.added.methods = new Array(result.methods.length).fill(null);
    result.highlighted.updated.methods = new Array(result.methods.length).fill(null);

    // compare attributes and add them to updated object if they are different or to added object if they are not in the solution
    result.attributes.forEach((attr, index) => {
      const match = solution.attributes.find(
        sAttr => sAttr.name.localeCompare(attr.name, undefined, { sensitivity: 'base' }) === 0,
      );
      console.log('##### match: ', match, '##### attr: ', attr);
      if (!match) {
        result.highlighted.added.attributes = result.highlighted.added.attributes || []; // Initialize the array if it's undefined
        result.highlighted.added.attributes[index] = attr;
      } else if (match.dataType !== attr.dataType || match.visibility !== attr.visibility) {
        result.highlighted.updated.attributes = result.highlighted.updated.attributes || []; // Initialize the array if it's undefined
        result.highlighted.updated.attributes[index] = attr;
      }
    });

    // compare attributes and add them to deleted object if they are not in the attempt
    solution.attributes.forEach(attr => {
      const match = result.attributes.find(
        rAttr => rAttr.name.localeCompare(attr.name, undefined, { sensitivity: 'base' }) === 0,
      );
      if (!match) {
        result.highlighted.deleted.attributes = [
          ...(result.highlighted.deleted.attributes || []),
          attr,
        ];
      }
    });

    // compare methods and add them to updated object if they are different or to added object if they are not in the solution
    result.methods.forEach((method, index) => {
      const match = solution.methods.find(
        sMethod =>
          sMethod.name.localeCompare(method.name, undefined, { sensitivity: 'base' }) === 0,
      );
      if (!match) {
        result.highlighted.added.methods = result.highlighted.added.methods || []; // Initialize the array if it's undefined
        result.highlighted.added.methods[index] = method;
      } else if (match.dataType !== method.dataType || match.visibility !== method.visibility) {
        result.highlighted.updated.methods = result.highlighted.updated.methods || []; // Initialize the array if it's undefined
        result.highlighted.updated.methods[index] = method;
      }
    });

    // compare methods and add them to deleted object if they are not in the attempt
    solution.methods.forEach(method => {
      const match = result.methods.find(
        rMethod =>
          rMethod.name.localeCompare(method.name, undefined, { sensitivity: 'base' }) === 0,
      );
      if (!match) {
        result.highlighted.deleted.methods = [
          ...(result.highlighted.deleted.methods || []),
          method,
        ];
      }
    });

    resultWithoutTypoCorrection.highlighted = result.highlighted;
    return resultWithoutTypoCorrection;
  }

  /**
   * Compares two ClassEdge objects and returns a modified ClassEdge object with highlighted changes.
   * @param solution - The solution ClassEdge object.
   * @param attempt - The attempt ClassEdge object.
   * @returns The modified ClassEdge object with highlighted changes.
   */
  compareEdges(solution: ClassEdge, attempt: ClassEdge): ClassEdge {
    // clone the attempt edge
    const result: ClassEdge = _.cloneDeep(attempt);

    // define the edge points
    const edgePoints =
      pointDefinitions.edge.type +
      (solution.cardinalityStart ? pointDefinitions.edge.cardinalityStart : 0) +
      (solution.cardinalityEnd ? pointDefinitions.edge.cardinalityEnd : 0) +
      (solution.description ? pointDefinitions.edge.description : 0);

    // initialize the highlighted object
    result.highlighted = {
      code: 'found',
      maxPoints: edgePoints,
      added: {},
      deleted: {},
      updated: {},
    };

    // compare type and add it to the updated object if it is different
    if (result.type.localeCompare(solution.type, undefined, { sensitivity: 'base' }) !== 0) {
      result.highlighted.updated.type = result.type;
    }
    // compare cardinalityStart and add it to the updated object if it is different
    if (
      result.cardinalityStart &&
      solution.cardinalityStart &&
      result.cardinalityStart.localeCompare(solution.cardinalityStart, undefined, {
        sensitivity: 'base',
      }) !== 0
    ) {
      result.highlighted.updated.cardinalityStart = result.cardinalityStart;
    }
    // compare cardinalityEnd and add it to the updated object if it is different
    if (
      result.cardinalityEnd &&
      solution.cardinalityEnd &&
      result.cardinalityEnd.localeCompare(solution.cardinalityEnd, undefined, {
        sensitivity: 'base',
      }) !== 0
    ) {
      result.highlighted.updated.cardinalityEnd = result.cardinalityEnd;
    }
    // compare description and add it to the updated object if it is different
    if (
      result.description &&
      solution.description &&
      result.description.localeCompare(solution.description, undefined, { sensitivity: 'base' }) !==
        0
    ) {
      result.highlighted.updated.description = result.description;
    }
    // compare cardinalityStart and if it is not in the solution add it to the added object
    if (result.cardinalityStart && !solution.cardinalityStart) {
      result.highlighted.added.cardinalityStart = result.cardinalityStart;
    }
    // compare cardinalityEnd and if it is not in the solution add it to the added object
    if (result.cardinalityEnd && !solution.cardinalityEnd) {
      result.highlighted.added.cardinalityEnd = result.cardinalityEnd;
    }
    // compare description and if it is not in the solution add it to the added object
    if (result.description && !solution.description) {
      result.highlighted.added.description = result.description;
    }
    // compare cardinalityStart and if it is not in the attempt add it to the deleted object
    if (solution.cardinalityStart && !result.cardinalityStart) {
      result.highlighted.deleted.cardinalityStart = solution.cardinalityStart;
    }
    // compare cardinalityEnd and if it is not in the attempt add it to the deleted object
    if (solution.cardinalityEnd && !result.cardinalityEnd) {
      result.highlighted.deleted.cardinalityEnd = solution.cardinalityEnd;
    }
    // compare description and if it is not in the attempt add it to the deleted object
    if (solution.description && !result.description) {
      result.highlighted.deleted.description = solution.description;
    }
    return result;
  }

  /**
   * Updates the position of missing nodes in the attempt.
   *
   * @param highlightedNodes - An array of ClassNode objects representing the highlighted nodes.
   */
  updateMissingNodesPosition(highlightedNodes: ClassNode[]) {
    // get all nodes that are missing in the attempt
    const missingNodes = highlightedNodes.filter(node => node.highlighted.code === 'missing');
    // get all other nodes
    const otherNodes = highlightedNodes.filter(node => node.highlighted.code !== 'missing');

    // check which node from otherNodes has the highest y position
    const mostBottomNode = otherNodes.reduce((prev, current) =>
      prev.position.y > current.position.y ? prev : current,
    );

    // place the first missingNode 400px below the mostBottomNode at x position 0
    if (missingNodes.length > 0) {
      missingNodes[0].position.x = 0;
      missingNodes[0].position.y = mostBottomNode.position.y + 400;

      // place every other missingNode at the same y postion as the previous missingNode and with + 300px x position
      for (let i = 1; i < missingNodes.length; i++) {
        missingNodes[i].position.x = missingNodes[i - 1].position.x + 300;
        missingNodes[i].position.y = missingNodes[i - 1].position.y;
      }
    }
  }
}
