import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'bmp.theme';
const DARK_CLASS = 'dark-theme';

/**
 * Light / dark mode. The choice is kept in the browser; without one, the system preference is used.
 * The theme itself lives in styles.scss (Material theme + CSS variables under body.dark-theme).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly modeSubject = new BehaviorSubject<ThemeMode>(this.initialMode());

  readonly mode$ = this.modeSubject.asObservable();

  constructor() {
    this.apply(this.modeSubject.value);
  }

  get mode(): ThemeMode {
    return this.modeSubject.value;
  }

  get isDark(): boolean {
    return this.mode === 'dark';
  }

  toggle(): void {
    this.set(this.isDark ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage unavailable: the choice lasts until the page is reloaded.
    }
    this.apply(mode);
    this.modeSubject.next(mode);
  }

  private apply(mode: ThemeMode): void {
    this.document.body.classList.toggle(DARK_CLASS, mode === 'dark');
  }

  private initialMode(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // Ignore and fall back to the system preference.
    }
    const view = this.document.defaultView;
    return view?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
