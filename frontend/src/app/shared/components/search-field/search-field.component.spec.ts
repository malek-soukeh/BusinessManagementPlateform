import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { SharedModule } from '../../shared.module';

@Component({
  template: `
    <input id="other" />
    <app-search-field [formControl]="search" placeholder="Nom ou référence"></app-search-field>
  `
})
class HostComponent {
  readonly search = new FormControl('', { nonNullable: true });
}

describe('SearchFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const input = () => fixture.nativeElement.querySelector('app-search-field input') as HTMLInputElement;
  const clearButton = () => fixture.nativeElement.querySelector('.clear') as HTMLButtonElement | null;

  function press(key: string, target: EventTarget = document.body): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [HostComponent], imports: [SharedModule] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('works like an input bound to a form control', () => {
    input().value = 'lap';
    input().dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.search.value).toBe('lap');

    fixture.componentInstance.search.setValue('ord');
    fixture.detectChanges();

    expect(input().value).toBe('ord');
    expect(input().getAttribute('aria-label')).toBe('Nom ou référence');
  });

  it('shows a clear button once there is text, and clears', () => {
    expect(clearButton()).toBeNull();

    fixture.componentInstance.search.setValue('lap');
    fixture.detectChanges();
    clearButton()?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.search.value).toBe('');
    expect(clearButton()).toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it('clears with the Escape key', () => {
    fixture.componentInstance.search.setValue('lap');
    fixture.detectChanges();

    press('Escape', input());

    expect(fixture.componentInstance.search.value).toBe('');
  });

  it('is focused by the "/" key, and shows the shortcut until then', () => {
    expect(fixture.nativeElement.querySelector('.shortcut')).not.toBeNull();

    const event = press('/');

    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(input());
  });

  it('lets "/" be typed in another field', () => {
    const other = fixture.nativeElement.querySelector('#other') as HTMLInputElement;
    other.focus();

    const event = press('/', other);

    expect(event.defaultPrevented).toBeFalse();
    expect(document.activeElement).toBe(other);
  });

  it('follows the disabled state of the control', () => {
    fixture.componentInstance.search.disable();
    fixture.detectChanges();

    expect(input().disabled).toBeTrue();
    press('/');
    expect(document.activeElement).not.toBe(input());
  });
});
