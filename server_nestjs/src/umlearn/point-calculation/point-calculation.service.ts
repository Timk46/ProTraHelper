import { ClassEdge, ClassNode, editorDataDTO } from '@Interfaces/index';
import { Injectable } from '@nestjs/common';
import { pointDefinitions } from './point-calculation.settings';

@Injectable()
export class PointCalculationService {

  private pointDefinitions = pointDefinitions;

  constructor() { }

  async definePoints(taskData: editorDataDTO): Promise<number> {
    // we want to consider all the nodes and edges in the taskData
    // for now everything is worth 1 point
    // Following should give points:
    // - each node (this basically includes the correct name)
    //  - the type
    //  - each attribute
    //  - each method
    // - each edge (if found, the edge is connected to the correct nodes in the correct direction - even for basic relation?)
    //  - the type
    //  - the source text
    //  - the target text
    //  - the description

    let points = 0;
    const nodes = taskData.nodes;
    const edges = taskData.edges;

    // calculate points for nodes
    for (let node of nodes) {
      points += this.pointDefinitions.node.found;
      points += this.pointDefinitions.node.name;
      points += this.pointDefinitions.node.type;
      points += this.pointDefinitions.node.attribute * node.attributes.length;
      points += this.pointDefinitions.node.method * node.methods.length;
    }
    console.log("Points for nodes: " + points);
    // calculate points for edges
    for (let edge of edges) {
      points += this.pointDefinitions.edge.found;
      points += this.pointDefinitions.edge.type;
      points += (edge.cardinalityStart? this.pointDefinitions.edge.cardinalityStart : 0);
      points += (edge.cardinalityEnd? this.pointDefinitions.edge.cardinalityEnd : 0);
      points += (edge.description? this.pointDefinitions.edge.description : 0);

      console.log(edge.cardinalityStart, edge.cardinalityEnd, edge.description);
    }

    return points;
  }

  /**
   * Calculate the attribute and method points for a single node
   * @param node
   * @returns
   */
  async defineNodePoints(node: ClassNode): Promise<{attributePoints: number, methodPoints: number}> {
    return {
      attributePoints: (this.pointDefinitions.node.attribute * node.attributes.length),
      methodPoints: (this.pointDefinitions.node.method * node.methods.length)
    };
  }

  /**
   * Calculate the points for a single edge (without the found points)
   * @param edge
   * @returns
   */
  async defineEdgePoints(edge: ClassEdge): Promise<number> {
    return this.pointDefinitions.edge.found
      + this.pointDefinitions.edge.type
      + (edge.cardinalityStart? this.pointDefinitions.edge.cardinalityStart : 0)
      + (edge.cardinalityEnd? this.pointDefinitions.edge.cardinalityEnd : 0)
      + (edge.description? this.pointDefinitions.edge.description : 0);
  }

  // only for highlighted data
  async calculatePoints(taskData: editorDataDTO, maxPoints = -1): Promise<number> {
    let points = 0;
    let solutionPoints = 0;

    // calculate points for nodes
    for (let node of taskData.nodes) {
      if (node.highlighted && node.highlighted.code == "found" && node.highlighted.maxPoints) {
        // the maxPoints.attributes and maxPoints.methods are already multiplied with the pointDefinitions
        solutionPoints += this.pointDefinitions.node.found
          + this.pointDefinitions.node.name
          + this.pointDefinitions.node.type
          + node.highlighted.maxPoints.attributes
          + node.highlighted.maxPoints.methods;

        points += this.pointDefinitions.node.found;
        points += this.pointDefinitions.node.name;
        points += node.highlighted.updated!.type? 0 : this.pointDefinitions.node.type;

        const maxAttrPoints = node.highlighted.maxPoints.attributes;
        const maxMethodPoints = node.highlighted.maxPoints.methods;

        // check for attribute in highlighted.updated and highlighted.deleted, if not there, give points
        for (let attr of node.attributes) {
          let attrPoint = this.pointDefinitions.node.attribute;
          for (let hAttr of node.highlighted.updated!.attributes) {
            if (hAttr && hAttr.name == attr.name) {
              attrPoint = 0;
            }
          }
          if (node.highlighted.deleted!.attributes) {
            for (let hAttr of node.highlighted.deleted!.attributes) {
              if (hAttr && hAttr.name == attr.name) {
                attrPoint = 0;
              }
            }
          }
          points += attrPoint;
        }

        let addedPoints = 0;
        for (let hAttr of node.highlighted.added!.attributes) {
          if (hAttr && hAttr != null) {
            addedPoints++;
          }
        }
        points -= Math.min(maxAttrPoints, addedPoints * this.pointDefinitions.node.attribute);

        // check for method in highlighted.updated and highlighted.deleted, if not there, give points
        for (let method of node.methods) {
          let methodPoint = this.pointDefinitions.node.method;
          for (let hMethod of node.highlighted.updated!.methods) {
            if (hMethod && hMethod.name == method.name) {
              methodPoint = 0;
            }
          }
          if (node.highlighted.deleted!.methods) {
            for (let hMethod of node.highlighted.deleted!.methods) {
              if (hMethod && hMethod.name == method.name) {
                methodPoint = 0;
              }
            }
          }
          points += methodPoint;
        }

        addedPoints = 0;
        for (let hMethod of node.highlighted.added!.methods) {
          if (hMethod && hMethod != null) {
            addedPoints++;
          }
        }
        points -= Math.min(maxMethodPoints, addedPoints * this.pointDefinitions.node.method);
      }
    }

    console.log("Points after nodes:", points);

    // calculate points for edges
    for (let edge of taskData.edges) {
      if (edge.highlighted && edge.highlighted.code == "found" && edge.highlighted.maxPoints) {
        // the maxPoints are already multiplied with the pointDefinitions
        solutionPoints += this.pointDefinitions.edge.found + edge.highlighted.maxPoints;
        let edgePoints = edge.highlighted.maxPoints;

        console.log("single edge max:", edgePoints);

        // check if keys are in added, deleted or updated
        for (let key in edge.highlighted) {
          if (key == "added" || key == "deleted" || key == "updated") {
            const properties = ['type', 'cardinalityStart', 'cardinalityEnd', 'description'];
            if (['added', 'deleted', 'updated'].includes(key)) {
              properties.forEach(prop => {
                if (edge.highlighted[key][prop]) {
                  console.log("buup found:", prop);
                  console.log("buuped:", this.pointDefinitions.edge[prop]);
                  edgePoints -= this.pointDefinitions.edge[prop];
                }
              });
            }
          }
        }
        console.log("are u breaking it:", edgePoints);
        points += this.pointDefinitions.edge.found + Math.max(0, edgePoints);
      }
      console.log("after single edge:", points);
    }
    console.log("Total points: ", points, "/", solutionPoints);

    //return maxPoints > -1? Math.floor((points/solutionPoints) * maxPoints) : points;
    return maxPoints > -1? Math.floor((points)) : points;
  }

}
