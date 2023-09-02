import { Component, Inject } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { GraphDataService } from 'src/app/Services/graph-data.service';

@Component({
  selector: 'app-create-concept-dialog',
  templateUrl: './create-concept-dialog.component.html',
  styleUrls: ['./create-concept-dialog.component.scss']
})
export class CreateConceptDialogComponent {
  name: string = "";
  description: string = "";
  currentModuleId: number = 1;
  levels: number[] = [1,2,3,4,5,6];
  moduleGoal: number = 0;
  
    constructor(
      public dialogRef: MatDialogRef<CreateConceptDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      private graphService: GraphDataService
      ) {

      }
  

    onDialogOpen(): void {
      console.log("in onDialogOpen")
    }
    onNoClick(): void {
      this.dialogRef.close();
    }

    createConcept(): void {
      console.log("trying to create concept: ", this.name, this.description)
      this.graphService.createConcept(this.data.parentId, this.name, this.description, [{ moduleId: this.currentModuleId, goal: this.moduleGoal }]);
      this.dialogRef.close({name: this.name, description: this.description});
    }

    cancelCreateConcept(): void {
      this.dialogRef.close();
    }

}
