import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface Breadcrumb {
  label: string;
  /** Absent for the current page. */
  link?: string | unknown[];
}

/**
 * Header of every page: discreet breadcrumb, title, subtitle, and the page actions
 * (projected content) on the right.
 */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="main">
        <nav class="crumbs" aria-label="Fil d'Ariane" *ngIf="breadcrumbs.length">
          <ol>
            <li *ngFor="let crumb of breadcrumbs; let last = last">
              <a *ngIf="crumb.link && !last; else current" [routerLink]="crumb.link">{{ crumb.label }}</a>
              <ng-template #current><span [attr.aria-current]="last ? 'page' : null">{{ crumb.label }}</span></ng-template>
              <mat-icon *ngIf="!last" aria-hidden="true">chevron_right</mat-icon>
            </li>
          </ol>
        </nav>
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-actions"><ng-content></ng-content></div>
    </header>
  `,
  styles: [`
    .page-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px 16px;
      margin-bottom: 20px;
    }
    .main { min-width: 0; }
    .crumbs ol { display: flex; flex-wrap: wrap; align-items: center; margin: 0 0 6px; padding: 0; list-style: none; }
    .crumbs li { display: inline-flex; align-items: center; font-size: 12px; color: var(--app-muted); }
    .crumbs a { color: var(--app-muted); text-decoration: none; }
    .crumbs a:hover { color: var(--app-text); }
    .crumbs mat-icon { width: 16px; height: 16px; font-size: 16px; margin: 0 2px; opacity: 0.7; }
    .page-title { margin: 0; font-size: 24px; line-height: 32px; font-weight: 600; letter-spacing: -0.02em; }
    .page-subtitle { margin: 2px 0 0; font-size: 14px; color: var(--app-muted); }
    .page-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .page-actions:empty { display: none; }
    @media (max-width: 600px) { .page-title { font-size: 20px; line-height: 28px; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle: string | null = null;
  @Input() breadcrumbs: Breadcrumb[] = [];
}
