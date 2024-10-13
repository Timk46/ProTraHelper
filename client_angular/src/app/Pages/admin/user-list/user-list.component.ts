import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { AdminService } from '../services/admin.service';

interface UserListItem {
  id: number;
  email: string;
  kiFeedbackCount: number;
  chatBotMessageCount: number;
  totalProgress: number;
  subjects: { id: number; name: string; registeredForSL: boolean }[];
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, AfterViewInit {
  dataSource: MatTableDataSource<UserListItem> = new MatTableDataSource<UserListItem>([]);
  displayedColumns: string[] = ['email', 'id', 'kiFeedbackCount', 'chatBotMessageCount', 'totalProgress', 'subjects'];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch(property) {
        case 'id': return item.id;
        case 'totalProgress': return item.totalProgress;
        default: return (item as any)[property];
      }
    };
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
}
