import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { catchError, map, of, shareReplay } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { prefersReducedMotion } from '../../core/utils/motion.util';
import { ROLE_LABELS, visibleNavItems } from '../nav-items';
import { routeFade } from '../route-animations';

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

  /** Identifies the page shown in the outlet, so that a change of page triggers the transition. */
  routeKey(outlet: RouterOutlet): string {
    return outlet.isActivated ? outlet.activatedRoute.routeConfig?.path ?? '' : '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}