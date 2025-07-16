import { OnInit } from '@angular/core';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NavigationType } from 'src/app/Services/navigation/navigation-preference.service';
import { ModuleSettingsService } from 'src/app/Services/module-settings/module-settings.service';
import { CommonModule } from '@angular/common';

interface NavigatorSetting {
  enabled: NavigationType[];
}

@Component({
  selector: 'app-navigation-preference-settings',
  templateUrl: './navigation-preference-settings.component.html',
  styleUrls: ['./navigation-preference-settings.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCheckboxModule],
})
export class NavigationPreferenceSettingsComponent implements OnInit {
  navigatorOptions: { type: NavigationType; label: string; enabled: boolean }[] = [
    { type: 'graph', label: 'Graph-Navigation', enabled: true },
    { type: 'mobile', label: 'Mobile Navigation', enabled: true },
    { type: 'highlight', label: 'Highlight Navigation', enabled: true },
  ];

  constructor(
    private readonly dialogRef: MatDialogRef<NavigationPreferenceSettingsComponent>,
    private readonly moduleSettings: ModuleSettingsService,
    @Inject(MAT_DIALOG_DATA) private readonly data: { moduleId: number },
  ) {}

  ngOnInit(): void {
    this.moduleSettings
      .getSetting<NavigatorSetting>(this.data.moduleId, 'enabled_navigators')
      .subscribe(setting => {
        if (setting?.enabled) {
          this.navigatorOptions.forEach(opt => {
            opt.enabled = setting.enabled.includes(opt.type);
          });
        }
      });
  }

  isLastEnabledOption(option: { type: NavigationType; label: string; enabled: boolean }): boolean {
    return option.enabled && this.navigatorOptions.filter(o => o.enabled).length === 1;
  }

  hasEnabledOptions(): boolean {
    return this.navigatorOptions.some(opt => opt.enabled);
  }

  onSave(): void {
    if (this.navigatorOptions.some(opt => opt.enabled)) {
      const enabledTypes = this.navigatorOptions.filter(opt => opt.enabled).map(opt => opt.type);

      const setting: NavigatorSetting = {
        enabled: enabledTypes,
      };

      this.moduleSettings
        .updateSetting(this.data.moduleId, 'enabled_navigators', setting)
        .subscribe(() => {
          this.dialogRef.close(setting);
        });
    }
  }
}
