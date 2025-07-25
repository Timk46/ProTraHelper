import { IsInt, IsPositive } from 'class-validator';

export class CreateUserGroupMembershipDto {
  @IsInt()
  @IsPositive()
  userId: number;

  @IsInt()
  @IsPositive()
  groupId: number;
}
