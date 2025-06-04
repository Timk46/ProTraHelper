import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ContentManagementService } from '../services/content-management.service';
import { AdminGuard } from '../../auth/guards/is-admin.guard';

@Controller('admin/content')
@UseGuards(AdminGuard)
export class ContentManagementController {
  constructor(private contentManagementService: ContentManagementService) {}

  @Get('export')
  async exportContent() {
    return this.contentManagementService.exportContent();
  }

  @Post('import')
  async importContent(@Body() data: any) {
    return this.contentManagementService.importContent(data);
  }
}
