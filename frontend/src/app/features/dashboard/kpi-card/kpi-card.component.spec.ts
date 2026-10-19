import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { COUNT_UP_DURATION } from '../../../shared/directives/count-up.directive';
import { SharedModule } from '../../../shared/shared.module';
import { Kpi, KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  function create(kpi: Kpi): ComponentFixture<KpiCardComponent> {
    TestBed.configureTestingModule({
      declarations: [KpiCardComponent],
      imports: [SharedModule, RouterTestingModule],
      providers: [{ provide: COUNT_UP_DURATION, useValue: 0 }]
    });
    const fixture = TestBed.createComponent(KpiCardComponent);
    fixture.componentInstance.kpi = kpi;
    fixture.detectChanges();
    return fixture;
  }

  it('is a link when the page exists', () => {
    const fixture = create({ id: 'c', label: 'Clients actifs', icon: 'people', value: 4, tone: 'primary', link: '/customers' });

    const link = fixture.nativeElement.querySelector('a.kpi') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/customers');
    expect(link.textContent).toContain('Clients actifs');
  });

  it('is plain text otherwise, with its tone, hint and gauge', () => {
    const fixture = create({
      id: 'o', label: 'Reste à encaisser', icon: 'hourglass_top', value: 3, tone: 'warning',
      hint: '1 facture en retard', alert: true, progress: 40, link: null
    });
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('.kpi')?.classList).toContain('tone-warning');
    expect(element.querySelector('.kpi-hint.alert')?.textContent).toContain('1 facture en retard');
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40');
  });
});
