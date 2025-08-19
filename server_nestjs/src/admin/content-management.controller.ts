import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ContentManagementService } from './content-management.service';
import { roles, RolesGuard } from '@/auth/common/guards/roles.guard';

@Controller('admin/content')
@UseGuards(RolesGuard)
export class ContentManagementController {
  constructor(private readonly contentManagementService: ContentManagementService) {}

  @roles('ADMIN')
  @Get('export')
  async exportContent() {
    return this.contentManagementService.exportContent();
  }

  @roles('ADMIN')
  @Post('import')
  async importContent(@Body() data: any) {
    return this.contentManagementService.importContent(data);
  }
}
