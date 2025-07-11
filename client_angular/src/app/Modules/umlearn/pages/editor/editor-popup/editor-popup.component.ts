import type {
  ClassAttribute,
  ClassEdge,
  ClassMethod,
  ClassNode,
  EditorElementType,
} from '@DTOs/index';
import { dataType, EditorElement, visibilityType } from '@DTOs/index';

import type { OnInit } from '@angular/core';
import { Component, Inject, ViewChild } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import type { EditorCommunicationService } from '@UMLearnServices/editor-communication.service';
import type { NotificationService } from '@UMLearnServices/notification.service';
import { MatTableDataSource } from '@angular/material/table';
import type { EditorEdgeNewComponent } from '../editor-edge-new/editor-edge-new.component';
import { timer } from 'rxjs';

@Component({
  selector: 'app-editor-popup',
  templateUrl: './editor-popup.component.html',
  styleUrls: ['./editor-popup.component.scss'],
})
export class EditorPopupComponent implements OnInit {
  elementType: string;
  elementData: ClassNode | ClassEdge;
  nodeData?: ClassNode;
  edgeData?: ClassEdge;
  edgeDisplayData?: ClassEdge;
  switchPosition?: boolean;
  visibilityTypes: string[] = Object.values(visibilityType) as string[];
  dataTypes: string[] = Object.values(dataType) as string[];

  editorElement = EditorElement;

  // first table data
  attributes?: ClassAttribute[] = [
    { name: '', dataType: dataType.empty, visibility: visibilityType.empty },
  ];
  attributesDataSource: MatTableDataSource<ClassAttribute>;

  // second table data
  methods?: ClassMethod[] = [
    { name: '', dataType: dataType.empty, visibility: visibilityType.empty },
  ];
  methodsDataSource: MatTableDataSource<ClassMethod>;

  nodeTypes: string[] = [
    EditorElement.CD_CLASS,
    EditorElement.CD_INTERFACE,
    EditorElement.CD_ABSTRACT_CLASS,
  ];

  edgeTypes: string[] = [
    EditorElement.CD_ASSOCIATION,
    EditorElement.CD_DIRECTIONAL_ASSOCIATION,
    EditorElement.CD_BIDIRECTIONAL_ASSOCIATION,
    EditorElement.CD_COMPOSITION,
    EditorElement.CD_AGGREGATION,
    EditorElement.CD_DEPENDENCY,
  ];

  @ViewChild('previewLine') previewLine!: EditorEdgeNewComponent;

  constructor(
    public dialogRef: MatDialogRef<EditorPopupComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      elementData: ClassNode | ClassEdge;
      elementType: EditorElementType;
      switchPosition: boolean;
      additionalDataTypes: string[];
    },
    private readonly notification: NotificationService,
    private readonly ecs: EditorCommunicationService,
  ) {
    this.attributesDataSource = new MatTableDataSource(this.attributes || []);
    this.methodsDataSource = new MatTableDataSource(this.methods || []);
    this.dataTypes = [...(Object.values(dataType) as string[]), ...this.data.additionalDataTypes];

    this.elementType = data.elementType;
    this.elementData = { ...data.elementData };

    if ('attributes' in this.elementData) {
      this.attributes = this.elementData.attributes;
      this.attributesDataSource = new MatTableDataSource(this.attributes);
    }

    if ('methods' in this.elementData) {
      this.methods = this.elementData.methods;
      this.methodsDataSource = new MatTableDataSource(this.methods);
    }

    if ('switchPosition' in this.data) {
      this.switchPosition = this.data.switchPosition;
    }
  }

  ngOnInit(): void {
    if (this.elementType === 'node') {
      this.nodeData = this.elementData as ClassNode;
    } else if (this.elementType === 'edge') {
      this.edgeData = this.elementData as ClassEdge;
      this.edgeDisplayData = {
        ...this.edgeData,
        startDirection: undefined,
        startDirectionOffset: undefined,
        endDirection: undefined,
        endDirectionOffset: undefined,
      };
    }
  }

  /**
   * Checks if the element is a ClassEdge by checking if it has the properties 'start' and 'end'.
   * @param element
   * @returns the
   */
  isClassEdge(): ClassEdge | undefined {
    return 'start' in this.elementData && 'end' in this.elementData ? this.elementData : undefined;
  }

  /**
   * Adds a new attribute row to the list of attributes.
   */
  addAttributeRow(): void {
    if (this.attributes) {
      this.attributes.push({
        name: '',
        dataType: dataType.empty,
        visibility: visibilityType.empty,
      });
      this.attributesDataSource.data = [...this.attributes];
    }
  }

  /**
   * Adds a new method row to the methods.
   */
  addMethodRow(): void {
    if (this.methods) {
      this.methods.push({ name: '', dataType: dataType.empty, visibility: visibilityType.empty });
      this.methodsDataSource.data = [...this.methods];
    }
  }

  /**
   * Deletes a row from the specified table.
   * @param index - The index of the row to delete.
   * @param tableType - The type of table ('attribute' or 'method').
   */
  deleteRow(index: number, tableType: string): void {
    if (tableType === 'attribute' && this.attributes) {
      this.attributes.splice(index, 1);
      this.attributesDataSource.data = [...this.attributes];
    } else if (tableType === 'method' && this.methods) {
      this.methods.splice(index, 1);
      this.methodsDataSource.data = [...this.methods];
    }
  }

  /**
   * Closes the dialog when the cancel button is clicked.
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Closes the dialog and sends the changed data to the editor component.
   */
  onAccept() {
    // if interface, delete attributes
    if (this.elementData.type === EditorElement.CD_INTERFACE) {
      (this.elementData as ClassNode).attributes = [];
    }
    const result = {
      command: 'update',
      changedData: this.elementData,
    };
    this.dialogRef.close(result);
  }

  /**
   * Closes the dialog and sends the changed data to the editor component.
   */
  onDelete() {
    const result = {
      command: 'delete',
      changedData: this.elementData,
    };
    this.dialogRef.close(result);
  }

  /**
   * Updates the title of the node.
   * @param newTitle - The new title for the node.
   */
  updateNodeTitle(newTitle: string): void {
    if (this.nodeData) {
      this.nodeData.title = newTitle;
    }
  }

  /**
   * Updates the edge type based on the current edge data and edge display data.
   * Refreshes the preview line.
   */
  updateEdgeType(): void {
    if (this.edgeData && this.edgeDisplayData) {
      this.edgeDisplayData.type = this.edgeData.type;
      this.previewLine.refresh();
    }
  }

  /**
   * Updates the cardinality start of the edge.
   *
   * @param newCardinalityStart - The new cardinality start value.
   */
  updateEdgeCardinalityStart(newCardinalityStart: string): void {
    if (this.edgeData) {
      this.edgeData.cardinalityStart = newCardinalityStart;
      this.edgeDisplayData!.cardinalityStart = newCardinalityStart;
      this.previewLine.refresh();
    }
  }

  /**
   * Updates the cardinality end of the edge.
   *
   * @param newCardinalityEnd - The new cardinality end value.
   */
  updateEdgeCardinalityEnd(newCardinalityEnd: string): void {
    if (this.edgeData) {
      this.edgeData.cardinalityEnd = newCardinalityEnd;
      this.edgeDisplayData!.cardinalityEnd = newCardinalityEnd;
      this.previewLine.refresh();
    }
  }

  /**
   * Updates the edge description.
   *
   * @param newDescription - The new description.
   */
  updateEdgeDescription(newDescription: string): void {
    if (this.edgeData) {
      this.edgeData.description = newDescription;
      this.edgeDisplayData!.description = newDescription;
      this.previewLine.refresh();
    }
  }

  /**
   * Swaps the direction of the edge.
   */
  onSwapEdgeDirection(): void {
    if (this.edgeData) {
      const temp = this.edgeData.start;
      this.edgeData.start = this.edgeData.end;
      this.edgeData.end = temp;

      this.switchPosition == true ? (this.switchPosition = false) : (this.switchPosition = true);
      setTimeout(() => {
        this.previewLine.refresh();
      }, 0);
    }
  }
}
