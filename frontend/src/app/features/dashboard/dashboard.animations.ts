import { animate, query, stagger, style, transition, trigger } from '@angular/animations';

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

/** The cards of a grid come in one after the other. */
export const staggerIn = trigger('staggerIn', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      stagger(45, animate(`320ms ${EASE}`, style({ opacity: 1, transform: 'none' })))
    ], { optional: true })
  ])
]);

/** Loaded content replaces its skeleton with a short fade. */
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(`260ms ${EASE}`, style({ opacity: 1 }))
  ])
]);
