import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemePreference } from './core/models/app.models';
import { ThemeService } from './core/services/theme.service';
import { AppIcon } from './shared/components/app-icon';
import { SelectPicker, SelectPickerOption } from './shared/components/select-picker';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [AppIcon, NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet, SelectPicker],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.call-history-enabled]': 'callHistoryEnabled',
  },
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly callHistoryEnabled = environment.enableCallHistory;
  protected readonly themeOptions: readonly SelectPickerOption[] = [
    { value: 'system', label: 'System', detail: 'Match this device', icon: 'system' },
    { value: 'light', label: 'Light', detail: 'Always use light mode', icon: 'sun' },
    { value: 'dark', label: 'Dark', detail: 'Always use dark mode', icon: 'moon' },
  ];

  protected setTheme(value: string): void {
    if (value === 'system' || value === 'light' || value === 'dark') {
      this.theme.setPreference(value as ThemePreference);
    }
  }
}
