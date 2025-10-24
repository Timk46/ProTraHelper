import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { UserGroupingComponent } from "./user-grouping/user-grouping.component";
import { GroupReviewSessionComponent } from "./group-review-session/group-review-session.component";
import { ConceptRhinoFilesComponent } from "./concept-rhino-files/concept-rhino-files.component";

/**
 * Management module routes for instructor features
 *
 * Authorization: All routes inherit guards from parent '/lecturer' route
 * which requires LoggedInGuard and AdminGuard (see app-routing.module.ts:198)
 */
const routes: Routes = [
  {
    path: 'grouping',
    component: UserGroupingComponent
  },
  {
    path: 'group-review-sessions',
    component: GroupReviewSessionComponent
  },
  {
    path: 'concept-rhino-files',
    component: ConceptRhinoFilesComponent
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