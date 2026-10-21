import { animate, query, style, transition, trigger } from '@angular/animations';

/** Short fade-and-rise of the page that comes in; the page that leaves is hidden at once. */
export const routeFade = trigger('routeFade', [
  transition('* <=> *', [
    query(':leave', [style({ display: 'none' })], { optional: true }),
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(6px)' }),
      animate('180ms cubic-bezier(0.2, 0, 0, 1)', style({ opacity: 1, transform: 'none' }))
    ], { optional: true })
  ])
]);
