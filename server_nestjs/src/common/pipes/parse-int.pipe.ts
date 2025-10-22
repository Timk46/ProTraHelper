import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Custom pipe for parsing and validating integer parameters
 *
 * @description Converts string parameters to numbers and validates them.
 * Throws BadRequestException if the value is not a valid integer.
 *
 * @example
 * ```typescript
 * @Get(':id')
 * findOne(@Param('id', ParseIntPipe) id: number) {
 *   // id is guaranteed to be a valid number
 * }
 * ```
 */
@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException(`Validation failed: "${value}" is not a valid integer`);
    }
    return val;
  }
}
