import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDropList } from '@angular/cdk/drag-drop';
import { SubjectManagementService } from '../../services/subject-management.service';
import { UserGroupDTO, CreateUserGroupDTO, CreateUserGroupMembershipDTO } from '@DTOs/index';
import { UserDTO } from '@DTOs/user.dto';

// Client-side interface to handle UI logic easily
interface ClientUserGroup extends UserGroupDTO {
  members: UserDTO[];
}

@Component({
  selector: 'app-user-grouping',
  templateUrl: './user-grouping.component.html',
  styleUrls: ['./user-grouping.component.scss']
})
export class UserGroupingComponent implements OnInit {

  @ViewChild('unassignedList') unassignedDropList!: CdkDropList;
  @ViewChildren('groupList') groupDropLists!: QueryList<CdkDropList>;

  allUsers: UserDTO[] = [];
  unassignedUsers: UserDTO[] = [];
  groups: ClientUserGroup[] = [];

  // For change tracking
  private originalUnassignedUsers: UserDTO[] = [];
  private originalGroups: ClientUserGroup[] = [];

  autoGroupSize = 1;

  constructor(
    private subjectManagementService: SubjectManagementService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  getConnectedListsForGroup(currentGroupList: CdkDropList): CdkDropList[] {
    if (!this.unassignedDropList || !this.groupDropLists) {
      return [];
    }
    const otherGroupLists = this.groupDropLists.filter(list => list !== currentGroupList);
    return [this.unassignedDropList, ...otherGroupLists];
  }

  loadData(): void {
    this.subjectManagementService.getAllUsers().subscribe(users => {
      this.allUsers = users;
      this.subjectManagementService.getUserGroups().subscribe(groups => {
        const allGroupedUserIds = new Set<number>();

        this.groups = groups.map(groupDto => {
          const members = groupDto.UserGroupMembership?.map(membership => {
            allGroupedUserIds.add(membership.userId);
            const user = this.allUsers.find(u => u.id === membership.userId);
            return user ? { ...user, userGroupMembershipId: membership.id } : undefined;
          }).filter(u => u !== undefined) as UserDTO[] || [];
          return {
            ...groupDto,
            members,
          };
        });

        this.unassignedUsers = this.allUsers.filter(user => !allGroupedUserIds.has(user.id));

        // Store original state for change tracking
        this.originalUnassignedUsers = JSON.parse(JSON.stringify(this.unassignedUsers));
        this.originalGroups = JSON.parse(JSON.stringify(this.groups));
      });
    });
  }

  drop(event: CdkDragDrop<UserDTO[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  openCreateGroupDialog(): void {
    // Replace with a real dialog (e.g., using MatDialog)
    const groupName = prompt('Enter group name:');
    const maxSize = prompt('Enter max size:', '10');
    if (groupName && maxSize) {
      const newGroup: ClientUserGroup = {
        id: Date.now(), // Temporary ID for client-side handling
        name: groupName,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
        maxSize: parseInt(maxSize, 10)
      };
      this.groups.push(newGroup);
    }
  }

  deleteGroup(groupId: number): void {
    const groupIndex = this.groups.findIndex(g => g.id === groupId);
    if (groupIndex > -1) {
      const deletedGroup = this.groups.splice(groupIndex, 1)[0];
      // Move members back to unassigned list
      this.unassignedUsers.push(...deletedGroup.members);
    }
  }

  autoAssignGroups(): void {
    if (!this.autoGroupSize || this.unassignedUsers.length === 0) {
      return;
    }

    const usersToAssign = [...this.unassignedUsers];
    const groupCount = Math.ceil(usersToAssign.length / this.autoGroupSize);

    for (let i = 0; i < groupCount; i++) {
      const newGroup: ClientUserGroup = {
        id: Date.now() + i, // Temporary ID
        name: `Gruppe ${this.groups.length + i + 1}`,
        maxSize: this.autoGroupSize,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: []
      };
      this.groups.push(newGroup);
    }

    // Distribute users
    let currentGroupIndex = this.groups.length - groupCount;
    while(usersToAssign.length > 0) {
        const user = usersToAssign.shift();
        if(user) {
            const targetGroup = this.groups[currentGroupIndex];
            if(targetGroup.members.length < targetGroup.maxSize) {
                targetGroup.members.push(user);
            } else {
                usersToAssign.unshift(user); // Put it back if group is full
            }
            currentGroupIndex++;
            if(currentGroupIndex >= this.groups.length) {
                currentGroupIndex = this.groups.length - groupCount;
            }
        }
    }
    this.unassignedUsers = [];
  }

  hasChanges(): boolean {
    return JSON.stringify(this.unassignedUsers) !== JSON.stringify(this.originalUnassignedUsers) ||
           JSON.stringify(this.groups) !== JSON.stringify(this.originalGroups);
  }

  discardChanges(): void {
    this.unassignedUsers = JSON.parse(JSON.stringify(this.originalUnassignedUsers));
    this.groups = JSON.parse(JSON.stringify(this.originalGroups));
  }

  saveChanges(): void {
    const originalGroupIds = new Set(this.originalGroups.map(g => g.id));
    const currentGroupIds = new Set(this.groups.map(g => g.id));

    // 1. Delete groups
    for (const originalGroup of this.originalGroups) {
      if (!currentGroupIds.has(originalGroup.id)) {
        this.subjectManagementService.deleteUserGroup(originalGroup.id).subscribe();
      }
    }

    // 2. Create groups
    for (const group of this.groups) {
      if (!originalGroupIds.has(group.id)) {
        const createDto: CreateUserGroupDTO = { name: group.name, maxSize: group.maxSize };
        this.subjectManagementService.createUserGroup(createDto).subscribe(newGroup => {
          // Update the temporary ID with the real one from the backend
          const tempGroup = this.groups.find(g => g.id === group.id);
          if (tempGroup) {
            tempGroup.id = newGroup.id;
          }
          // Now handle memberships for this new group
          this.updateMemberships(newGroup.id, [], group.members);
        });
      } else {
        // 3. Update memberships for existing groups
        const originalGroup = this.originalGroups.find(g => g.id === group.id);
        if (originalGroup) {
          this.updateMemberships(group.id, originalGroup.members, group.members);
        }
      }
    }

    // After all operations, reload data to be in sync with the server
    this.loadData();
  }

  private updateMemberships(groupId: number, originalMembers: UserDTO[], currentMembers: UserDTO[]) {
    const originalMemberIds = new Set(originalMembers.map(m => m.id));
    const currentMemberIds = new Set(currentMembers.map(m => m.id));

    // Add new members
    for (const member of currentMembers) {
      if (!originalMemberIds.has(member.id)) {
        const membershipDto: CreateUserGroupMembershipDTO = { userId: member.id, groupId };
        this.subjectManagementService.createUserGroupMembership(membershipDto).subscribe();
      }
    }

    // Remove old members
    for (const member of originalMembers) {
      if (!currentMemberIds.has(member.id)) {
        this.subjectManagementService.deleteUserGroupMembership(member.id, groupId).subscribe();
      }
    }
  }
}
