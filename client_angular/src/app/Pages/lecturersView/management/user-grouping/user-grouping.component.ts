import { Component } from '@angular/core';
import { AdminService } from 'src/app/Pages/admin/services/admin.service';
import { SubjectManagementService } from '../../services/subject-management.service';

@Component({
  selector: 'app-user-grouping',
  templateUrl: './user-grouping.component.html',
  styleUrl: './user-grouping.component.scss'
})
export class UserGroupingComponent {

  constructor(
    private adminService: AdminService,
    private subjectManagementService: SubjectManagementService
  ) { }

}
