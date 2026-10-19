import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let body: HTMLElement;

  beforeEach(() => {
    localStorage.removeItem('bmp.theme');
    body = TestBed.inject(DOCUMENT).body;
    body.classList.remove('dark-theme');
  });

  afterEach(() => {
    localStorage.removeItem('bmp.theme');
    body.classList.remove('dark-theme');
  });

  it('restores the stored choice', () => {
    localStorage.setItem('bmp.theme', 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.mode).toBe('dark');
    expect(body.classList).toContain('dark-theme');
  });

  it('toggles between light and dark and remembers the choice', () => {
    localStorage.setItem('bmp.theme', 'light');
    const service = TestBed.inject(ThemeService);
    const modes: string[] = [];
    service.mode$.subscribe(mode => modes.push(mode));

    service.toggle();

    expect(service.isDark).toBeTrue();
    expect(body.classList).toContain('dark-theme');
    expect(localStorage.getItem('bmp.theme')).toBe('dark');

    service.toggle();

    expect(body.classList).not.toContain('dark-theme');
    expect(modes).toEqual(['light', 'dark', 'light']);
  });
});
