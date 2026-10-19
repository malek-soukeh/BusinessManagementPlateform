import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { Component, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { COUNT_UP_DURATION, CountUpDirective } from './count-up.directive';

registerLocaleData(localeFr);

@Component({
  template: '<span [appCountUp]="value" [decimals]="decimals" [suffix]="suffix"></span>'
})
class HostComponent {
  value: number | null = 1234.5;
  decimals = 3;
  suffix = ' TND';
}

describe('CountUpDirective', () => {
  function create(duration: number): ComponentFixture<HostComponent> {
    TestBed.configureTestingModule({
      declarations: [HostComponent, CountUpDirective],
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: COUNT_UP_DURATION, useValue: duration }
      ]
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: ComponentFixture<HostComponent>) =>
    (fixture.nativeElement.querySelector('span').textContent as string).replace(/\s/g, ' ');

  it('shows the formatted value at once when animations are off', () => {
    const fixture = create(0);

    expect(text(fixture)).toBe('1 234,500 TND');
  });

  it('treats a missing value as zero', () => {
    const fixture = create(0);
    fixture.componentInstance.value = null;
    fixture.detectChanges();

    expect(text(fixture)).toBe('0,000 TND');
  });

  it('ends on the exact value after the animation', fakeAsync(() => {
    let now = 0;
    const callbacks: FrameRequestCallback[] = [];
    spyOn(performance, 'now').and.callFake(() => now);
    spyOn(window, 'requestAnimationFrame').and.callFake(callback => callbacks.push(callback));

    const fixture = create(100);
    now = 50;
    callbacks.shift()?.(now);
    expect(text(fixture)).not.toBe('1 234,500 TND');

    now = 100;
    callbacks.shift()?.(now);
    tick();
    expect(text(fixture)).toBe('1 234,500 TND');
    expect(callbacks.length).toBe(0);
  }));
});
