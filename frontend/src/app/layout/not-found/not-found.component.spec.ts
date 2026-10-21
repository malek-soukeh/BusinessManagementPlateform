import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { SharedModule } from '../../shared/shared.module';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let location: { back: jasmine.Spy };

  function create() {
    location = { back: jasmine.createSpy('back') };
    TestBed.configureTestingModule({
      declarations: [NotFoundComponent],
      imports: [SharedModule, RouterTestingModule],
      providers: [{ provide: Location, useValue: location }]
    });
    spyOnProperty(TestBed.inject(Router), 'url').and.returnValue('/commandes-inconnues');
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('says the page does not exist and shows the address', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Page introuvable');
    expect(element.querySelector('code')?.textContent).toBe('/commandes-inconnues');
  });

  it('leads back to the dashboard', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/dashboard');
  });

  it('goes back to the previous page', () => {
    const fixture = create();

    fixture.nativeElement.querySelector('#back-button').click();

    expect(location.back).toHaveBeenCalled();
  });
});
