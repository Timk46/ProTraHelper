import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { roles, RolesGuard } from '@/auth/common/guards/roles.guard';
import { ModuleSettingsService } from './module-settings.service';

@Controller('module-settings')
@UseGuards(RolesGuard)
export class ModuleSettingsController {
  constructor(private readonly moduleSettingsService: ModuleSettingsService) {}

  @roles('ANY')
  @Get(':moduleId/:key')
  async getSetting(
    @Param('moduleId') moduleId: string,
    @Param('key') key: string,
  ) {
    const setting = await this.moduleSettingsService.getSetting(parseInt(moduleId), key);
    return { value: setting?.value };
  }

  @roles('ADMIN')
  @Post(':moduleId/:key')
  async updateSetting(
    @Param('moduleId') moduleId: string,
    @Param('key') key: string,
    @Body() data: { value: string },
    @Req() req,
  ) {
    await this.moduleSettingsService.updateSetting(parseInt(moduleId), key, data.value, req.user.id);
    return { message: 'Setting updated successfully' };
  }
}
