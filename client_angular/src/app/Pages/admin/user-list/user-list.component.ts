import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ScaleType } from '@swimlane/ngx-charts';
import { UserService } from '../../../Services/auth/user.service';
import { ContentManagementService } from '../../../Services/admin/content-management.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  displayedColumns: string[] = ['email', 'id', 'kiFeedbackCount', 'chatBotMessageCount', 'totalProgress', 'subjects'];
  dataSource: MatTableDataSource<any> = new MatTableDataSource();
  subjects: any[] = [];
  selectedSubject: number = 0;
  selectedFile: File | null = null;
  selectedContentFile: File | null = null;
  allUsersDailyProgressData: any[] = [];
  view: [number, number] = [700, 300];
  colorScheme = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };
  showLegend = true;
  showXAxis = true;
  showYAxis = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Date';
  yAxisLabel = 'Progress';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private userService: UserService,
    private contentManagementService: ContentManagementService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Existing initialization code...
  }

  applyFilter(event: Event) {
    // Existing filter code...
  }

  onFileSelected(event: any) {
    // Existing file selection code...
  }

  uploadFile() {
    // Existing upload code...
  }

  logoutAllUsers() {
    // Existing logout code...
  }

  viewUserProgress(userId: number) {
    // Existing progress view code...
  }

  toggleRegisteredForSL(userId: number, subjectId: number, currentValue: boolean) {
    // Existing toggle code...
  }

  // New content management methods
  onContentFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      this.selectedContentFile = file;
    } else {
      this.snackBar.open('Bitte wählen Sie eine JSON-Datei aus', 'Schließen', {
        duration: 3000
      });
      event.target.value = '';
    }
  }

  exportContent() {
    this.contentManagementService.exportContent().subscribe({
      next: (data) => {
        // Create and download file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `learning-content-${date}.json`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.snackBar.open('Lerninhalte wurden erfolgreich exportiert', 'Schließen', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Export error:', error);
        this.snackBar.open('Fehler beim Exportieren der Lerninhalte', 'Schließen', {
          duration: 3000
        });
      }
    });
  }

  importContent() {
    if (!this.selectedContentFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        this.contentManagementService.importContent(data).subscribe({
          next: () => {
            this.snackBar.open('Lerninhalte wurden erfolgreich importiert', 'Schließen', {
              duration: 3000
            });
            this.selectedContentFile = null;
          },
          error: (error) => {
            console.error('Import error:', error);
            this.snackBar.open('Fehler beim Importieren der Lerninhalte', 'Schließen', {
              duration: 3000
            });
          }
        });
      } catch (err) {
        console.error('JSON parse error:', err);
        this.snackBar.open('Ungültiges Dateiformat', 'Schließen', {
          duration: 3000
        });
      }
    };
    reader.readAsText(this.selectedContentFile);
  }
}
