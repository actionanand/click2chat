import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ThemePreference } from '../models/app.models';

interface SystemBarsBridge {
  setDarkMode(enabled: boolean): void;
}

interface NativeWindow extends Window {
  Click2ChatSystemBars?: SystemBarsBridge;
}

const THEME_STORAGE_KEY = 'click2chat-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(Boolean(this.media?.matches));
  readonly preference = signal<ThemePreference>(this.savedPreference());
  readonly isDark = computed(
    () => this.preference() === 'dark' || (this.preference() === 'system' && this.systemDark()),
  );

  constructor() {
    this.apply(this.preference());
    this.media?.addEventListener('change', (event) => {
      this.systemDark.set(event.matches);
      this.apply(this.preference());
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage can be unavailable in private browser contexts; the active theme still applies.
    }
    this.apply(preference);
  }

  private savedPreference(): ThemePreference {
    try {
      const saved = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // Fall back to the system preference when storage is unavailable.
    }
    return 'system';
  }

  private apply(preference: ThemePreference): void {
    const root = this.document.documentElement;
    if (preference === 'system') root.removeAttribute('data-theme');
    else root.dataset['theme'] = preference;
    root.style.colorScheme = this.isDark() ? 'dark' : 'light';
    const nativeWindow = this.document.defaultView as NativeWindow | null;
    nativeWindow?.Click2ChatSystemBars?.setDarkMode(this.isDark());
  }
}
