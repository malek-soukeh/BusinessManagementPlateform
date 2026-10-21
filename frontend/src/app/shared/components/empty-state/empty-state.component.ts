import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Empty list or search without result: icon, title, explanation and an optional action (projected). */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state" role="status">
      <span class="icon" aria-hidden="true"><mat-icon>{{ icon }}</mat-icon></span>
      <p class="empty-title">{{ title }}</p>
      <p class="empty-text" *ngIf="description">{{ description }}</p>
      <div class="empty-actions"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 16px;
      text-align: center;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      margin-bottom: 12px;
      border-radius: 12px;
      background: var(--app-hover);
      color: var(--app-muted);
    }
    .empty-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--app-text); }
    .empty-text { margin: 4px 0 0; max-width: 380px; font-size: 13px; color: var(--app-muted); }
    .empty-actions { margin-top: 16px; }
    .empty-actions:empty { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input({ required: true }) title = '';
  @Input() description: string | null = null;
}
