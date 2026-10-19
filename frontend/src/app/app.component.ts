import { Component, inject } from '@angular/core';

import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';

  constructor() {
    // Applies the light / dark theme from the very first page, the login included.
    inject(ThemeService);
  }
}
