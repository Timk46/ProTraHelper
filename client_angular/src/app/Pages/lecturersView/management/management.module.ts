import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ManagementRoutingModule } from "./management-routing.module";
import { UserGroupingComponent } from "./user-grouping/user-grouping.component";
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from "@angular/forms";
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  imports: [CommonModule, ManagementRoutingModule, DragDropModule, FormsModule, MatIconModule, MatButtonModule],
  declarations: [UserGroupingComponent],
  providers: [],
  bootstrap: []
})
export class ManagementModule {}