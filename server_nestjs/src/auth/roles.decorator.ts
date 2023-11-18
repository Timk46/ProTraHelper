import { SetMetadata } from '@nestjs/common';

// possible roles: 1 ('Admin'), 2 ('Teacher'), 3 ('Student')
export const Roles = (...roles: number[]) => SetMetadata('roles', roles);
