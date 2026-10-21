import { animate, query, stagger, style, transition, trigger } from '@angular/animations';

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

/** The cards of a grid come in one after the other. */
export const staggerIn = trigger('staggerIn', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(6px)' }),
      stagger(30, animate(`200ms ${EASE}`, style({ opacity: 1, transform: 'none' })))
    ], { optional: true })
  ])
]);

/** Loaded content replaces its skeleton with a short fade. */
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(`200ms ${EASE}`, style({ opacity: 1 }))
  ])
]);
