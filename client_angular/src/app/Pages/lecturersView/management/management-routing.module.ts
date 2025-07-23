import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { UserGroupingComponent } from "./user-grouping/user-grouping.component";

const routes: Routes = [
  {
    path: 'grouping',
    component: UserGroupingComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  declarations: [],
  providers: [],
  bootstrap: []
})
export class ManagementRoutingModule {}