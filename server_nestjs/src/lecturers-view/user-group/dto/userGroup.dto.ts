import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateUserGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  maxSize: number;
}
