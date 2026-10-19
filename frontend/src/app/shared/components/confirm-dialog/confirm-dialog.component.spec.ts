import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SharedModule } from '../../shared.module';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let dialogRef: { close: jasmine.Spy };

  function create(data: ConfirmDialogData): ComponentFixture<ConfirmDialogComponent> {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.configureTestingModule({
      imports: [SharedModule, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the title, the message and the confirm label', () => {
    const fixture = create({ title: 'Désactiver', message: 'Êtes-vous sûr ?', confirmLabel: 'Oui, désactiver' });

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Désactiver');
    expect(text).toContain('Êtes-vous sûr ?');
    expect(fixture.nativeElement.querySelector('.confirm-button').textContent).toContain('Oui, désactiver');
  });

  it('closes with true when the user confirms', () => {
    const fixture = create({ title: 'T', message: 'M' });

    fixture.nativeElement.querySelector('.confirm-button').click();

    expect(fixture.nativeElement.querySelector('.confirm-button').textContent).toContain('Confirmer');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes with false when the user cancels', () => {
    const fixture = create({ title: 'T', message: 'M' });

    fixture.nativeElement.querySelector('.cancel-button').click();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});