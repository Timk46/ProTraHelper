import { ConceptGraphDTO } from '@DTOs/conceptGraph.dto';
import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { Component } from '@angular/core';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';

@Component({
  selector: 'app-mobile-navigator',
  templateUrl: './mobile-navigator.component.html',
  styleUrls: ['./mobile-navigator.component.scss']
})
export class MobileNavigatorComponent {

  private graphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();
  loadingDone: boolean = false;

  userGraphData: ConceptGraphDTO = {
    id: -1,
    name: "dummy",
    trueRootId: -1,
    nodeMap: [],
    edgeMap: [],
    currentConceptId: -1
  };
  openLayers: {id: number, name: string, isRoot: boolean, nodes: ConceptNodeDTO[]}[] = [];
  currentLayer: number = -1;
  currentNodeId: number = -1;
  lastActiveNodeId: number = -1;
  currUserModule: number = 1; //NEEDS TO BE CHANGED if multiple modules are implemented

  constructor(private graphDataService: GraphDataService) {
    this.graphDataService.fetchUserGraph(this.currUserModule).subscribe((data: ConceptGraphDTO) => {
      this.userGraphData = data;
      console.log(this.userGraphData);

      if (data.currentConceptId && data.currentConceptId != -1) {
        this.currentNodeId = data.currentConceptId;
        let currLayer = data.currentConceptId;
        if (data.nodeMap[data.currentConceptId].childIds.length == 0) {
          currLayer = data.nodeMap[data.currentConceptId].parentIds[0];
        }
        this.currentLayer = currLayer;
        this.openLayers = this.getOpenedLayers(currLayer);
        //console.log("LAYERS", this.openLayers);
        this.changeActiveNode(data.currentConceptId);
        this.loadingDone = true;
      }
    });
  }


  /**
   * Retrieves the opened layers for a given node ID.
   * Each layer contains information about the layer ID, name, nodes, and whether it is the root layer.
   * @param nodeId - The ID of the node to retrieve the opened layers for.
   * @returns An array of objects representing the opened layers, sorted in reverse order.
   */
  getOpenedLayers(nodeId: number): {id: number, name: string, nodes: ConceptNodeDTO[], isRoot: boolean}[]{
    const layers : {id: number, name: string, nodes: ConceptNodeDTO[], isRoot: boolean}[] = [];
    let parentId = nodeId;
    let layer = 0;
    while (parentId != -1) {
      const nodes: ConceptNodeDTO[] = this.getNodeLayer(parentId);
      layers[layer] = {id: parentId, name: this.userGraphData.nodeMap[parentId].name, nodes: nodes, isRoot: (this.userGraphData.nodeMap[parentId].parentIds.length == 0)};
      parentId = this.userGraphData.nodeMap[parentId].parentIds[0] || -1;
      layer++;
    }
    return layers.reverse();
  }

  /**
   * Adds an opened layer to the component's openLayers array.
   *
   * @param nodeId - The ID of the node to add as an opened layer.
   */
  addOpenedLayer(nodeId: number): void {
    const nodes = this.getNodeLayer(nodeId);
    this.openLayers.push({id: nodeId, name: this.userGraphData.nodeMap[nodeId].name, nodes: nodes, isRoot: (this.userGraphData.nodeMap[nodeId].parentIds.length == 0)});
  }


  /**
   * Retrieves the concept nodes in the layer of a given node.
   * @param nodeId - The ID of the node.
   * @returns An array of ConceptNodeDTO objects representing the nodes in the layer.
   */
  getNodeLayer(nodeId: number): ConceptNodeDTO[] {
    if (this.userGraphData.id == -1) {
      return [];
    }
    const nodes = this.userGraphData.nodeMap[nodeId].childIds.map(childId => this.userGraphData.nodeMap[childId]);
    const backCell = this.userGraphData.nodeMap[this.userGraphData.nodeMap[nodeId].parentIds[0]] || null;
    if (backCell) {
      nodes.unshift(backCell);
    }
    return nodes;
  }

  /**
   * Handles the click event on a tab.
   * @param index - The index of the clicked tab.
   */
  onTabClick(index: number): void {
    if (index != this.openLayers.length - 1) { //check tab changed
      this.currentNodeId = this.openLayers[index].id;
      this.currentLayer = this.openLayers[index].id;
      this.openLayers = this.getOpenedLayers(this.currentLayer);
    }
  }

  /**
   * Handles the click event on a table row, depending on whether the row is clicked once or twice.
   *
   * @param node - The ConceptNodeDTO object representing the clicked row.
   * @param rowIndex - The index of the clicked row.
   * @param isRoot - A boolean indicating whether the current layer is the root.
   */
  onTableRowClick(node: ConceptNodeDTO, rowIndex: number, isRoot: boolean): void {
    if (node.databaseId == this.currentNodeId) { //on double click
      if (node.childIds.length != 0) {
        this.currentLayer = node.databaseId;
        this.addOpenedLayer(this.currentLayer);
      }
      if (rowIndex == 0 && !isRoot) {
        this.currentNodeId = node.databaseId;
        this.currentLayer = this.currentNodeId;
      }
    } else { //on first click
      if (rowIndex != 0 || isRoot) {
        this.currentNodeId = node.databaseId;
      }
      if (rowIndex == 0 && !isRoot) { //if back button clicked
        this.currentNodeId = node.databaseId;
        this.currentLayer = node.databaseId;
        this.openLayers.pop();
      }
    }
  }

  /**
   * Changes the active node based on the provided nodeId.
   * If the provided nodeId is different from the last active nodeId,
   * it updates the active node in the graph communication service,
   * updates the selected concept in the graph data service,
   * and updates the last active nodeId.
   *
   * @param nodeId - The ID of the node to set as the active node.
   * @returns A promise that resolves when the active node is changed.
   */
  async changeActiveNode(nodeId: number): Promise<void> {
    if (this.lastActiveNodeId != nodeId) {
      this.graphCommunicationService.changeActiveNode(this.userGraphData.nodeMap[nodeId]);
      this.graphDataService.updateSelectedConcept(nodeId).subscribe();
      this.lastActiveNodeId = nodeId;
    }
  }

}
