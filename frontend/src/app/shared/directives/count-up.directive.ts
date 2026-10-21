import { formatNumber } from '@angular/common';
import {
  Directive, ElementRef, InjectionToken, Input, LOCALE_ID, NgZone, OnChanges, OnDestroy, inject
} from '@angular/core';

import { prefersReducedMotion } from '../../core/utils/motion.util';

/** Length of the count-up animation, in milliseconds. 0 shows the final value at once. */
export const COUNT_UP_DURATION = new InjectionToken<number>('COUNT_UP_DURATION', {
  providedIn: 'root',
  factory: () => (prefersReducedMotion() ? 0 : 300)
});

/**
 * Displays a number that counts up to its value, formatted for the current locale,
 * e.g. `<span [appCountUp]="total" [decimals]="3" suffix=" TND"></span>`.
 * The animation runs outside Angular: it does not trigger any change detection.
 */
@Directive({ selector: '[appCountUp]' })
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) appCountUp: number | null = 0;
  @Input() decimals = 0;
  @Input() suffix = '';

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly locale = inject(LOCALE_ID);
  private readonly duration = inject(COUNT_UP_DURATION);
  private shown = 0;
  private frame: number | null = null;

  ngOnChanges(): void {
    const target = this.appCountUp ?? 0;
    this.cancel();

    if (this.duration <= 0 || target === this.shown) {
      this.render(target);
      return;
    }

    const from = this.shown;
    const start = performance.now();
    this.render(from);
    this.zone.runOutsideAngular(() => {
      const step = (now: number) => {
        const progress = Math.min((now - start) / this.duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.render(progress === 1 ? target : from + (target - from) * eased);
        this.frame = progress < 1 ? requestAnimationFrame(step) : null;
      };
      this.frame = requestAnimationFrame(step);
    });
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private render(value: number): void {
    this.shown = value;
    const digits = `1.${this.decimals}-${this.decimals}`;
    this.element.textContent = formatNumber(value, this.locale, digits) + this.suffix;
  }

  private cancel(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
