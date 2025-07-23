import { NgModule } from "@angular/core";
import { ManagementRoutingModule } from "./management-routing.module";
import { UserGroupingComponent } from "./user-grouping/user-grouping.component";

@NgModule({
  imports: [ManagementRoutingModule],
  declarations: [UserGroupingComponent],
  providers: [],
  bootstrap: []
})
export class ManagementModule {}