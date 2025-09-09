import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { LinkableContentNodeDTO } from '@DTOs/index';
import { ReplaySubject, Subject, takeUntil } from 'rxjs';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';

@Component({
  selector: 'app-create-content-node-dialog',
  templateUrl: './create-content-node-dialog.component.html',
  styleUrls: ['./create-content-node-dialog.component.scss'],
})
export class CreateContentNodeDialogComponent implements OnInit, OnDestroy {
  creationForm: FormGroup;
  connectionForm: FormGroup;

  activeTab: 'new' | 'existing' = 'new';

  unlinkedNodes: LinkableContentNodeDTO[] = [];
  filteredNodes: ReplaySubject<LinkableContentNodeDTO[]> = new ReplaySubject<
    LinkableContentNodeDTO[]
  >(1);
  nodeFilterControl = new FormControl('');
  private readonly _onDestroy = new Subject<void>();

  constructor(
    private readonly dialogRef: MatDialogRef<CreateContentNodeDialogComponent>,
    private readonly fb: FormBuilder,
    private readonly contentLinkerService: ContentLinkerService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.creationForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      difficulty: ['', Validators.required],
    });
    this.connectionForm = this.fb.group({
      contentNodeId: ['', Validators.required],
      difficulty: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.contentLinkerService.getUnlinkedContentNodes().subscribe(nodes => {
      this.unlinkedNodes = nodes;
      this.filteredNodes.next(this.unlinkedNodes.slice());
    });

    this.nodeFilterControl.valueChanges.pipe(takeUntil(this._onDestroy)).subscribe(() => {
      this.filterNodes();
    });
  }

  onSelectClick() {
    this.filterNodes();
  }

  private filterNodes() {
    if (!this.unlinkedNodes) {
      return;
    }
    let search = this.nodeFilterControl.value;
    if (!search) {
      this.filteredNodes.next(this.unlinkedNodes.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredNodes.next(
      this.unlinkedNodes.filter(node => node.name!.toLowerCase().indexOf(search) > -1),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Handles the form submission.
   * If the active tab is 'new', checks if the creation form is valid and closes the dialog with the form value.
   * If the active tab is not 'new', checks if the connection form is valid and closes the dialog with the form value.
   * If the form is not valid, marks all form controls as touched.
   */
  onSubmit(): void {
    if (this.activeTab === 'new') {
      if (this.creationForm.valid) {
        this.dialogRef.close(this.creationForm.value);
      } else {
        this.creationForm.markAllAsTouched();
      }
    } else {
      if (this.connectionForm.valid) {
        this.dialogRef.close(this.connectionForm.value);
      } else {
        this.connectionForm.markAllAsTouched();
      }
    }
  }

  /**
   * Handles the tab change event.
   *
   * @param event - The tab change event object.
   */
  onTabChange(event: any) {
    this.activeTab = event.index === 0 ? 'new' : 'existing';
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
}
