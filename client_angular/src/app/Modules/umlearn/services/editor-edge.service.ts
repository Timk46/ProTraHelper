import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class EditorEdgeService {

  movedNode = new Subject<string>();
  positionedEdge = new Subject<string>();
  reconnectedEdge = new Subject<{id: string, start?: string | HTMLElement, end?: string | HTMLElement}>();

  mousePosition: {x: number, y: number} = { x: 0, y: 0 };

  constructor() {
    document.addEventListener("mousemove", (event) => {
      this.mousePosition = {x: event.clientX, y: event.clientY};
    });
  }

  /**
   * Notifies subscribers when a node is moved.
   * @param nodeId - The ID of the moved node.
   */
  positionConnected(nodeUuid: string){
    this.movedNode.next(nodeUuid);
  }

  /**
   * Notifies subscribers when an edge is positioned.
   * @param edgeUuid - The UUID of the positioned edge.
   */
  positionEdge(edgeUuid: string){
    this.positionedEdge.next(edgeUuid);
  }

  /**
   * Notifies subscribers when an edge is reconnected.
   * @param id - The ID of the reconnected edge.
   * @param start - The start node or element of the edge.
   * @param end - The end node or element of the edge.
   */
  reconnectEdge(id: string, start?: string | HTMLElement, end?: string | HTMLElement){
    this.reconnectedEdge.next({id: id, start: start, end: end});
  }

  /**
   * Notifies subscribers to position all nodes.
   */
  positionAll(){
    this.movedNode.next("all");
  }

  /**
   * Returns the current mouse position.
   * @returns The current mouse position.
   */
  getMousePosition(): {x: number, y: number} {
    return this.mousePosition;
  }
}
