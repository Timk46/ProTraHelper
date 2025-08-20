import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { UserGroupingComponent } from "./user-grouping/user-grouping.component";
import { GroupReviewSessionComponent } from "./group-review-session/group-review-session.component";

const routes: Routes = [
  {
    path: 'grouping',
    component: UserGroupingComponent
  },
  {
    path: 'group-review-sessions',
    component: GroupReviewSessionComponent
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