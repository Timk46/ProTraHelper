import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GroupReviewGateStatusDTO, CreateGroupReviewSessionsDTO } from '@DTOs/index';
import { GroupReviewSessionService } from '../../../../Services/lecturer/group-review-session.service';

@Component({
  selector: 'app-group-review-session',
  templateUrl: './group-review-session.component.html',
  styleUrls: ['./group-review-session.component.scss'],
})
export class GroupReviewSessionComponent implements OnInit {
  isLoading = true;
  dataSource = new MatTableDataSource<GroupReviewGateStatusDTO>();
  displayedColumns: string[] = ['select', 'gateName', 'conceptName', 'status'];
  selection = new SelectionModel<GroupReviewGateStatusDTO>(true, []);

  sessionTitle = '';
  reviewDeadline: Date = new Date();

  constructor(
    private readonly groupReviewSessionService: GroupReviewSessionService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadGateStatuses();
    // Set deadline to next week by default
    this.reviewDeadline.setDate(this.reviewDeadline.getDate() + 7);
  }

  loadGateStatuses(): void {
    this.isLoading = true;
    this.groupReviewSessionService.getGroupReviewGateStatuses().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open('Fehler beim Laden der Group Review Gates.', 'Schließen', {
          duration: 5000,
        });
        this.isLoading = false;
        console.error(error);
      },
    });
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  createSessions(): void {
    if (this.selection.selected.length === 0) {
      this.snackBar.open('Bitte wählen Sie mindestens ein Gate aus.', 'OK', { duration: 3000 });
      return;
    }

    if (!this.sessionTitle.trim()) {
      this.snackBar.open('Bitte geben Sie einen Titel für die Session an.', 'OK', { duration: 3000 });
      return;
    }

    const dto: CreateGroupReviewSessionsDTO = {
      gateIds: this.selection.selected.map((gate) => gate.gateId),
      sessionTitle: this.sessionTitle,
      reviewDeadline: this.reviewDeadline,
    };

    this.isLoading = true;
    this.groupReviewSessionService.createSessions(dto).subscribe({
      next: (result) => {
        this.snackBar.open(
          `Erfolgreich ${result.createdSessions} Sessions mit ${result.createdSubmissions} Abgaben erstellt.`,
          'OK',
          { duration: 5000 },
        );
        this.selection.clear();
        this.loadGateStatuses(); // Refresh data
      },
      error: (error) => {
        this.snackBar.open('Fehler beim Erstellen der Sessions.', 'Schließen', { duration: 5000 });
        this.isLoading = false;
        console.error(error);
      },
    });
  }
}
