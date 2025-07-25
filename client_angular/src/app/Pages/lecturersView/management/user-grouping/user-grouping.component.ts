import { Component, OnInit, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { SubjectManagementService } from '../../services/subject-management.service';
import { UserGroupDTO, CreateUserGroupDTO, CreateUserGroupMembershipDTO } from '@DTOs/index';
import { UserDTO } from '@DTOs/user.dto';

// Client-side interface to handle UI logic easily
interface ClientUserGroup extends UserGroupDTO {
  members: UserDTO[];
  isDragOver?: boolean;
}

@Component({
  selector: 'app-user-grouping',
  templateUrl: './user-grouping.component.html',
  styleUrls: ['./user-grouping.component.scss']
})
export class UserGroupingComponent implements OnInit {

  allUsers: UserDTO[] = [];
  unassignedUsers: UserDTO[] = [];
  groups: ClientUserGroup[] = [];

  // For change tracking
  private originalUnassignedUsers: UserDTO[] = [];
  private originalGroups: ClientUserGroup[] = [];

  autoGroupSize = 4;
  private nextGroupId = 1;

  constructor(
    private subjectManagementService: SubjectManagementService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  get isAutoGroupingDisabled(): boolean {
    const allUsersInGroups = this.groups.flatMap(g => g.members);
    const allAvailableUsers = [...this.unassignedUsers, ...allUsersInGroups];
    return !this.autoGroupSize || allAvailableUsers.length === 0;
  }

  loadData(): void {
    this.subjectManagementService.getAllUsers().subscribe(users => {
      this.allUsers = users.sort((a, b) => (a.firstname || '').localeCompare(b.firstname || ''));
      this.subjectManagementService.getUserGroups().subscribe(groups => {
        const allGroupedUserIds = new Set<number>();

        this.groups = groups.map(groupDto => {
          const members = groupDto.UserGroupMembership?.map(membership => {
            allGroupedUserIds.add(membership.userId);
            const user = this.allUsers.find(u => u.id === membership.userId);
            return user ? { ...user, userGroupMembershipId: membership.id } : undefined;
          }).filter(u => u !== undefined) as UserDTO[] || [];
          members.sort((a, b) => (a.firstname || '').localeCompare(b.firstname || ''));
          return {
            ...groupDto,
            members,
            isDragOver: false
          };
        });

        this.nextGroupId = this.groups.length > 0 ? Math.max(...this.groups.map(g => g.id)) + 1 : 1;

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
      event.container.data.sort((a, b) => (a.firstname || '').localeCompare(b.firstname || ''));
    }
  }

  createGroup(): void {
    const newGroup: ClientUserGroup = {
      id: this.nextGroupId, // Temporary ID for client-side handling
      name: `Gruppe ${this.nextGroupId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
      maxSize: this.autoGroupSize
    };
    this.groups.push(newGroup);
    this.nextGroupId++;
  }

  deleteGroup(groupId: number): void {
    const groupIndex = this.groups.findIndex(g => g.id === groupId);
    if (groupIndex > -1) {
      const deletedGroup = this.groups.splice(groupIndex, 1)[0];
      // Move members back to unassigned list
      this.unassignedUsers.push(...deletedGroup.members);
      this.unassignedUsers.sort((a, b) => (a.firstname || '').localeCompare(b.firstname || ''));
    }
  }

  autoAssignGroups(): void {
    if (!this.autoGroupSize || this.autoGroupSize < 1) {
      alert("Bitte eine gültige maximale Gruppengröße angeben.");
      return;
    }

    // Collect all users from unassigned and existing groups
    const allUsers = [...this.unassignedUsers];
    this.groups.forEach(group => {
      allUsers.push(...group.members);
    });
    allUsers.sort(() => Math.random() - 0.5); // Shuffle users

    if (allUsers.length === 0) return;

    // Calculate optimal number of groups
    const numGroups = Math.ceil(allUsers.length / this.autoGroupSize);

    // Create new groups
    this.groups = [];
    this.nextGroupId = 1;
    for (let i = 0; i < numGroups; i++) {
      this.groups.push({
        id: this.nextGroupId + i,
        name: `Gruppe ${this.nextGroupId + i}`,
        members: [],
        maxSize: this.autoGroupSize,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    this.nextGroupId += numGroups;

    // Distribute users evenly
    allUsers.forEach((user, index) => {
      const groupIndex = index % numGroups;
      this.groups[groupIndex].members.push(user);
    });

    // Sort members within each new group
    this.groups.forEach(group => group.members.sort((a, b) => (a.firstname || '').localeCompare(b.firstname || '')));

    this.unassignedUsers = [];
  }

  hasChanges(): boolean {
    const currentUnassigned = JSON.stringify(this.unassignedUsers.map(u => u.id).sort());
    const originalUnassigned = JSON.stringify(this.originalUnassignedUsers.map(u => u.id).sort());

    const currentGroups = JSON.stringify(this.groups.map(g => ({ id: g.id, members: g.members.map(m => m.id).sort() })).sort((a,b) => a.id - b.id));
    const originalGroups = JSON.stringify(this.originalGroups.map(g => ({ id: g.id, members: g.members.map(m => m.id).sort() })).sort((a,b) => a.id - b.id));

    return currentUnassigned !== originalUnassigned || currentGroups !== originalGroups;
  }

  discardChanges(): void {
    this.loadData(); // Just reload the initial state from the server
  }

  saveChanges(): void {
    const originalGroupIds = new Set(this.originalGroups.map(g => g.id));
    const currentGroupIds = new Set(this.groups.map(g => g.id));

    // 1. Delete groups that are no longer present
    for (const originalGroup of this.originalGroups) {
      if (!currentGroupIds.has(originalGroup.id)) {
        this.subjectManagementService.deleteUserGroup(originalGroup.id).subscribe();
      }
    }

    // 2. Create or update groups
    for (const group of this.groups) {
      if (!originalGroupIds.has(group.id)) {
        // Create new group
        const createDto: CreateUserGroupDTO = { name: group.name, maxSize: group.maxSize };
        this.subjectManagementService.createUserGroup(createDto).subscribe(newGroup => {
          group.id = newGroup.id; // Update temporary ID
          this.updateMemberships(newGroup.id, [], group.members);
        });
      } else {
        // Update existing group
        const originalGroup = this.originalGroups.find(g => g.id === group.id);
        if (originalGroup) {
          this.updateMemberships(group.id, originalGroup.members, group.members);
        }
      }
    }

    // Use a timeout to ensure all backend operations have a chance to complete before reloading
    setTimeout(() => this.loadData(), 1000);
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
        // We need the membership ID to delete it, which we don't have here.
        // The backend should probably handle deletion by userId and groupId.
        // Assuming the service has a method for this.
        this.subjectManagementService.deleteUserGroupMembership(member.id, groupId).subscribe();
      }
    }
  }
}