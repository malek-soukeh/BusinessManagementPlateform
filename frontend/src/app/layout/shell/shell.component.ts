import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, shareReplay } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ROLE_LABELS, visibleNavItems } from '../nav-items';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly roleLabels = ROLE_LABELS;
  readonly navItems = visibleNavItems(this.auth.role);

  /** The profile only decorates the toolbar: a failure must not break the page. */
  readonly profile$ = this.auth.me().pipe(
    catchError(() => of(null)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly isHandset$ = this.breakpoints.observe(Breakpoints.Handset).pipe(
    map(result => result.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}