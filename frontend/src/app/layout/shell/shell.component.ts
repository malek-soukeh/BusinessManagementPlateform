import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { catchError, map, of, shareReplay } from 'rxjs';

import { UserProfile } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { prefersReducedMotion } from '../../core/utils/motion.util';
import { ROLE_LABELS, visibleNavGroups } from '../nav-items';
import { routeFade } from '../route-animations';

const COLLAPSED_KEY = 'bmp.nav-collapsed';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  animations: [routeFade]
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);
  readonly theme = inject(ThemeService);

  readonly reducedMotion = prefersReducedMotion();

  readonly roleLabels = ROLE_LABELS;
  readonly navGroups = visibleNavGroups(this.auth.role);

  /** Desktop only: the sidebar shrinks to its icons (64 px). The choice is kept in the browser. */
  collapsed = this.readCollapsed();

  /** The profile only decorates the toolbar: a failure must not break the page. */
  readonly profile$ = this.auth.me().pipe(
    catchError(() => of(null)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly isHandset$ = this.breakpoints.observe(Breakpoints.Handset).pipe(
    map(result => result.matches),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  initials(profile: UserProfile): string {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    try {
      localStorage.setItem(COLLAPSED_KEY, String(this.collapsed));
    } catch {
      // Storage unavailable: the choice lasts until the page is reloaded.
    }
  }

  /** On a phone the menu is a drawer over the page: it closes once a page is chosen. */
  closeIfOver(drawer: MatSidenav): void {
    if (drawer.mode === 'over') {
      drawer.close();
    }
  }

  /** Identifies the page shown in the outlet, so that a change of page triggers the transition. */
  routeKey(outlet: RouterOutlet): string {
    return outlet.isActivated ? outlet.activatedRoute.routeConfig?.path ?? '' : '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
