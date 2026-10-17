import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** Temporary landing page: it proves that login, token and guards work. The real dashboard comes later. */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly profile$ = this.auth.me();

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
