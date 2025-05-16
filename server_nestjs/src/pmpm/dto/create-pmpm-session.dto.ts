import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * DTO for creating a new PMPM session
 */
export class CreatePmpmSessionDto {
  /**
   * ID of the model to be loaded in PMPM
   */
  @IsString()
  @IsNotEmpty()
  modelId: string;

  /**
   * Optional configuration parameters for the session
   */
  @IsOptional()
  @IsString()
  configuration?: string;
}
