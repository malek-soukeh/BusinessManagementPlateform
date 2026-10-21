import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Placeholder rows shown while a table loads its first page. */
@Component({
  selector: 'app-table-skeleton',
  template: `
    <div class="table-skeleton" aria-busy="true" [attr.aria-label]="label">
      <div class="row" *ngFor="let row of rowIndexes">
        <app-skeleton
          *ngFor="let column of columnIndexes; let first = first"
          [width]="first ? '28%' : widths[(row + column) % widths.length]"
          height="12px"
        ></app-skeleton>
      </div>
    </div>
  `,
  styles: [`
    .row {
      display: flex;
      align-items: center;
      gap: 24px;
      height: 44px;
      padding: 0 16px;
      border-bottom: 1px solid var(--app-border);
    }
    .row:last-child { border-bottom: none; }
    app-skeleton { flex: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableSkeletonComponent {
  @Input() rows = 6;
  @Input() columns = 4;
  @Input() label = 'Chargement';

  readonly widths = ['14%', '10%', '18%', '8%'];

  get rowIndexes(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  get columnIndexes(): number[] {
    return Array.from({ length: this.columns }, (_, i) => i);
  }
}
