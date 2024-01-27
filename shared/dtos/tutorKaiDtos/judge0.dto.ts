export interface Judge0Dto {
  stdout: null | string;
  time: string;
  memory: number;
  stderr: null | string;
  token: string;
  compile_output: null | string;
  message: null | string;
  status: StatusDto;
}

export interface StatusDto {
  id: number;
  description: string;
}

export interface ProgrammingLanguageDto {
  id: number;
  name: string;
  is_archived: boolean;
}
