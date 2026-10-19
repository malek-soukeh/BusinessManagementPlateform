import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Grey placeholder shown while content loads, to keep the layout stable (no full-screen spinner). */
@Component({
  selector: 'app-skeleton',
  template: '',
  styles: [`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--app-skeleton);
    }
    :host::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, var(--app-skeleton-shine), transparent);
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
  `],
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width',
    '[style.height]': 'height',
    '[style.border-radius]': 'radius'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '16px';
  @Input() radius = '6px';
}
