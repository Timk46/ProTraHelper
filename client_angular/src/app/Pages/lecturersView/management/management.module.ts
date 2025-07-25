import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ManagementRoutingModule } from "./management-routing.module";
import { UserGroupingComponent } from "./user-grouping/user-grouping.component";
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from "@angular/forms";

@NgModule({
  imports: [CommonModule, ManagementRoutingModule, DragDropModule, FormsModule],
  declarations: [UserGroupingComponent],
  providers: [],
  bootstrap: []
})
export class ManagementModule {}