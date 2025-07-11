import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import type { ActivatedRoute } from '@angular/router';
import type {
  AdminService,
  QuestionTypeProgress,
  DailyProgress,
  UserDetails,
} from '../services/admin.service';
import type { Color } from '@swimlane/ngx-charts';
import { ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-user-progress',
  templateUrl: './user-progress.component.html',
  styleUrls: ['./user-progress.component.scss'],
})
export class UserProgressComponent implements OnInit {
  userId: number = 0;
  userDetails: UserDetails | null = null;
  questionTypeProgress: QuestionTypeProgress | null = null;
  dailyProgress: DailyProgress[] | null = null;

  // ngx-charts data
  questionTypeProgressData: any[] = [];
  dailyProgressData: any[] = [];

  // Chart options
  view: [number, number] = [700, 400];
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = false;
  showLegend: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Question Types';
  showYAxisLabel: boolean = true;
  yAxisLabel: string = 'Questions';
  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA'],
  };

  // Daily progress chart options
  dailyProgressView: [number, number] = [700, 300];
  dailyProgressXAxisLabel: string = 'Date';
  dailyProgressYAxisLabel: string = 'Completed Tasks';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly adminService: AdminService,
  ) {}

  ngOnInit(): void {
    this.userId = +this.route.snapshot.paramMap.get('userId')!;
    this.loadUserDetails();
    this.loadUserProgress();
  }

  loadUserDetails(): void {
    this.adminService.getUserDetails(this.userId).subscribe(
      (details: UserDetails) => {
        this.userDetails = details;
      },
      (error: any) => console.error('Error loading user details:', error),
    );
  }

  loadUserProgress(): void {
    this.adminService.getUserProgressByQuestionType(this.userId).subscribe(
      (progress: QuestionTypeProgress) => {
        this.questionTypeProgress = progress;
        this.updateQuestionTypeProgressData();
      },
      (error: any) => console.error('Error loading question type progress:', error),
    );

    this.adminService.getUserDailyProgress(this.userId).subscribe(
      (progress: DailyProgress[]) => {
        this.dailyProgress = progress;
        this.updateDailyProgressData();
      },
      (error: any) => console.error('Error loading daily progress:', error),
    );
  }

  updateQuestionTypeProgressData(): void {
    if (this.questionTypeProgress) {
      this.questionTypeProgressData = Object.entries(this.questionTypeProgress).map(
        ([type, data]) => ({
          name: type,
          series: [
            {
              name: 'Completed',
              value: data.completed || 0,
            },
            {
              name: 'Remaining',
              value: (data.total || 0) - (data.completed || 0),
            },
          ],
        }),
      );
    } else {
      this.questionTypeProgressData = [];
    }
  }

  updateDailyProgressData(): void {
    if (this.dailyProgress) {
      this.dailyProgressData = [
        {
          name: 'Daily Progress',
          series: this.dailyProgress.map(progress => ({
            name: progress.date,
            value: progress.count,
          })),
        },
      ];
    } else {
      this.dailyProgressData = [];
    }
  }
}
