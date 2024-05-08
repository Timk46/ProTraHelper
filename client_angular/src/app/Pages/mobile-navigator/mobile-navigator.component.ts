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
        console.log("LAYERS", this.openLayers);
        this.changeActiveNode(data.currentConceptId);
        this.loadingDone = true;
      }
    });
  }

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

  addOpenedLayer(nodeId: number): void {
    const nodes = this.getNodeLayer(nodeId);
    this.openLayers.push({id: nodeId, name: this.userGraphData.nodeMap[nodeId].name, nodes: nodes, isRoot: (this.userGraphData.nodeMap[nodeId].parentIds.length == 0)});
  }

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

  onTabClick(index: number): void {
    if (index != this.openLayers.length - 1) { //check tab changed
      this.currentNodeId = this.openLayers[index].id;
      this.currentLayer = this.openLayers[index].id;
      this.openLayers = this.getOpenedLayers(this.currentLayer);
      //SEND TO SERVER
      //this.changeActiveNode(this.openLayers[index].id);
    }
  }

  onTableRowClick(node: ConceptNodeDTO, rowIndex: number, isRoot: boolean): void {
    if (node.databaseId == this.currentNodeId) { //on double click
      if (node.childIds.length != 0) {
        this.currentLayer = node.databaseId;
        //this.openLayers = this.getOpenedLayers(this.currentLayer);
        this.addOpenedLayer(this.currentLayer);
      }
      //send to server if back button clicked
      if (rowIndex == 0 && !isRoot) {
        //this.currentNodeId = this.userGraphData.nodeMap[node.databaseId].parentIds[0];
        this.currentNodeId = node.databaseId;
        this.currentLayer = this.currentNodeId;
        //SEND TO SERVER
        //this.changeActiveNode(node.databaseId);

      }
    } else { //on first click
      //ONLY IF THIS IS NOT THE BACK BUTTON - TODO
      //this.currentNodeId = node.databaseId;
      if (rowIndex != 0 || isRoot) {
        this.currentNodeId = node.databaseId;
        //SEND TO SERVER
        //this.changeActiveNode(node.databaseId);
      }
      if (rowIndex == 0 && !isRoot) { //if back button clicked
        this.currentNodeId = node.databaseId;
        this.currentLayer = node.databaseId;
        //this.openLayers = this.getOpenedLayers(this.currentLayer);
        this.openLayers.pop();
      }
    }
  }

  async changeActiveNode(nodeId: number): Promise<void> {
    if (this.lastActiveNodeId != nodeId) {
      console.log("SENDING TO SERVER", nodeId);
      //this.currentNodeId = nodeId;
      this.graphCommunicationService.changeActiveNode(this.userGraphData.nodeMap[nodeId]);
      this.graphDataService.updateSelectedConcept(nodeId).subscribe();
      this.lastActiveNodeId = nodeId;
    }
  }

  /* onTabAnimationDone(): void {
    console.log("ANIMATION DONE");
    if (this.clickedIndex != -1) {
      if (this.clickedIndex != this.openLayers.length - 1) { //check tab changed
        console.log("TAB CHANGED");
        this.currentLayer = this.openLayers[this.clickedIndex].id;
        this.openLayers = this.getOpenedLayers(this.currentLayer);
      }
    }
    this.clickedIndex = -1;
  } */

}
