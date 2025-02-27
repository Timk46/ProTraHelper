import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, AllUsersDailyProgress } from '../services/admin.service';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { ConfirmationBoxComponent } from "../../confirmation-box/confirmation-box.component";
import { MatDialog } from "@angular/material/dialog";
import { UserService } from "../../../Services/auth/user.service";

interface UserListItem {
  id: number;
  email: string;
  kiFeedbackCount: number;
  chatBotMessageCount: number;
  totalProgress: number;
  subjects: { id: number; name: string; registeredForSL: boolean }[];
}

interface Subject {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, AfterViewInit {
  dataSource: MatTableDataSource<UserListItem> = new MatTableDataSource<UserListItem>([]);
  displayedColumns: string[] = ['email', 'id', 'kiFeedbackCount', 'chatBotMessageCount', 'totalProgress', 'subjects'];
  subjects: Subject[] = [];
  selectedSubject: number | null = null;
  selectedFile: File | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // New properties for the all users daily progress chart
  allUsersDailyProgressData: any[] = [];
  view: [number, number] = [700, 400];
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = false;
  showLegend: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Date';
  showYAxisLabel: boolean = true;
  yAxisLabel: string = 'Completed Tasks';
  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };

  constructor(
    private adminService: AdminService,
    private router: Router,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadSubjects();
    this.loadAllUsersDailyProgress();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe(
      (users: UserListItem[]) => {
        this.dataSource = new MatTableDataSource(users);
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
      },
      (error: any) => console.error('Error loading users:', error)
    );
  }

  loadSubjects(): void {
    this.adminService.getSubjects().subscribe(
      (subjects: Subject[]) => {
        this.subjects = subjects;
      },
      (error: any) => console.error('Error loading subjects:', error)
    );
  }

  loadAllUsersDailyProgress(): void {
    this.adminService.getAllUsersDailyProgress().subscribe(
      (progress: AllUsersDailyProgress[]) => {
        // Process the data for the chart
        const progressByType: { [key: string]: { name: string; series: { name: string; value: number }[] } } = {};

        progress.forEach((item) => {
          if (!progressByType[item.type]) {
            progressByType[item.type] = {
              name: item.type,
              series: []
            };
          }
          progressByType[item.type].series.push({
            name: item.date,
            value: item.count
          });
        });

        this.allUsersDailyProgressData = Object.values(progressByType);
      },
      (error: any) => console.error('Error loading all users daily progress:', error)
    );
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  viewUserProgress(userId: number): void {
    this.router.navigate(['/admin/user-progress', userId]);
  }

  toggleRegisteredForSL(userId: number, subjectId: number, currentValue: boolean): void {
    this.adminService.toggleRegisteredForSL(userId, subjectId, !currentValue).subscribe(
      () => {
        this.loadUsers(); // Reload the user list to reflect the changes
      },
      (error: any) => console.error('Error toggling registeredForSL:', error)
    );
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList) {
      this.selectedFile = fileList[0];
    }
  }

  uploadFile(): void {
    if (this.selectedFile && this.selectedSubject !== null) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const content = e.target?.result as string;
        const emails = content.split(';').map(email => email.trim());
        this.adminService.processEmailsForSubject(emails, this.selectedSubject as number).subscribe(
          (response: { message: string }) => {
            console.log('File processed successfully');
            this.snackBar.open(response.message, 'Close', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            });
            this.loadUsers(); // Reload the user list to reflect the changes
          },
          (error: any) => {
            console.error('Error processing file:', error);
            this.snackBar.open('Error processing file: ' + error.message, 'Close', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            });
          }
        );
      };
      reader.readAsText(this.selectedFile);
    } else {
      this.snackBar.open('No file selected or subject not chosen', 'Close', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  logoutAllUsers(): void {
    const dialog = this.dialog.open(ConfirmationBoxComponent, {
      data: {
        title: 'Alle Nutzer abmelden bestätigen',
        message: 'Möchten Sie sich wirklich ALLE Nutzer abmelden?',
        decline: 'Abbrechen',
        accept: 'Abmelden',
        swapButtons: false,
        swapColors: true
      }
    });

    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.userService.logoutAllUser().then(() => {
          // Open CAS logout URL in a new tab
          window.open('https://cas.zimt.uni-siegen.de/cas/logout', '_blank');

          // Navigate to the login page in the current tab
          this.router.navigate(['/login']);
        });
      }
    });
  }
}
