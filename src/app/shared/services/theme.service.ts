import { Injectable, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private document = inject(DOCUMENT);
  private readonly THEME_KEY = 'hms-theme';

  public isDarkMode = signal<boolean>(false);

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = localStorage.getItem(this.THEME_KEY);
      if (savedTheme) {
        this.setTheme(savedTheme === 'dark');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(systemPrefersDark);
      }
    }
  }

  public toggleTheme(): void {
    this.setTheme(!this.isDarkMode());
  }

  private setTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    if (typeof window !== 'undefined') {
      const themeValue = isDark ? 'dark' : 'light';
      // Apply data-bs-theme to document element so Bootstrap 5.3 picks it up
      this.document.documentElement.setAttribute('data-bs-theme', themeValue);
      // Also add/remove dark-theme class for custom slate overrides
      if (isDark) {
        this.document.documentElement.classList.add('dark-theme');
      } else {
        this.document.documentElement.classList.remove('dark-theme');
      }
      localStorage.setItem(this.THEME_KEY, themeValue);
    }
  }
}
