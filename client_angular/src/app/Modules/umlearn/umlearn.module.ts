import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EditorComponent } from './pages/editor/editor.component';
import { EditorPopupComponent } from './pages/editor/editor-popup/editor-popup.component';
import { EditorNodeComponent } from './pages/editor/editor-node/editor-node.component';
import { EditorEdgeNewComponent } from './pages/editor/editor-edge-new/editor-edge-new.component';
import { ConfirmationComponent } from './pages/confirmation/confirmation.component';
import { NotificationComponent } from './pages/notification/notification.component';
import { EdgeGrabPointComponent } from './pages/editor/editor-edge-new/edge-grab-point/edge-grab-point.component';
import { MaterialModule } from '../material.module';
import { FormsModule } from '@angular/forms';
import { TinymceComponent } from './pages/tinymce/tinymce.component';
import { TaskWorkspaceComponent } from './pages/task-workspace/task-workspace.component';
import { UmlearnRoutingModule } from './umlearn-routing.module';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { TaskDescriptionPopupComponent } from './pages/task-creation/task-description-popup/task-description-popup.component';
import { TaskCreationComponent } from './pages/task-creation/task-creation.component';
import { TooltippComponent } from './pages/tooltip/tooltipp.component';
import { EditorCommunicationService } from '@UMLearnServices/editor-communication.service';

@NgModule({
  declarations: [
    EditorComponent,
    EditorPopupComponent,
    EditorNodeComponent,
    EditorEdgeNewComponent,
    ConfirmationComponent,
    NotificationComponent,
    EdgeGrabPointComponent,
    TinymceComponent,
    TaskWorkspaceComponent,
    TaskDescriptionPopupComponent,
    TaskCreationComponent,
    TooltippComponent,
  ],
  imports: [CommonModule, MaterialModule, FormsModule, UmlearnRoutingModule],
  providers: [{ provide: TINYMCE_SCRIPT_SRC, useValue: 'tinymce/tinymce.min.js' }, EditorModule],
  exports: [TaskCreationComponent, EditorComponent],
})
export class UmlearnModule {}
