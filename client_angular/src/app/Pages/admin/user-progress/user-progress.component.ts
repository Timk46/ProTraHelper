import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../services/admin.service';

interface UserProgress {
  totalProgress: number;
  subjects: { name: string; progress: number }[];
}

@Component({
  selector: 'app-user-progress',
  templateUrl: './user-progress.component.html',
  styleUrls: ['./user-progress.component.scss']
})
export class UserProgressComponent implements OnInit {
  userId: number = 0;
  userProgress: UserProgress | null = null;

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.userId = +this.route.snapshot.paramMap.get('userId')!;
    this.loadUserProgress();
  }

  loadUserProgress(): void {
    this.adminService.getUserTotalProgress(this.userId).subscribe(
      (progress: UserProgress) => {
        this.userProgress = progress;
      },
      (error: any) => console.error('Error loading user progress:', error)
    );
  }
}
