import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService } from '../services/admin.service';

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

  constructor(
    private adminService: AdminService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadSubjects();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe(
      (users: UserListItem[]) => {
        this.dataSource = new MatTableDataSource(users);
        this.dataSource.sort = this.sort;
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

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
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
}
