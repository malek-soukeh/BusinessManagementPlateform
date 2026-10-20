import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { StockMovement } from '../../../core/models/stock.models';
import { InventoryService } from '../../../core/services/inventory.service';
import { SharedModule } from '../../../shared/shared.module';
import { StockAdjustDialogComponent, StockAdjustDialogData } from './stock-adjust-dialog.component';

describe('StockAdjustDialogComponent', () => {
  const data: StockAdjustDialogData = { product: { id: 4, name: 'Portable Pro', reference: 'LAP-001', quantity: 5 } };
  const movement: StockMovement = {
    id: 1, productId: 4, productReference: 'LAP-001', productName: 'Portable Pro', quantityChange: -2,
    quantityAfter: 3, reason: 'MANUAL_ADJUSTMENT', orderId: null, note: 'Casse', createdBy: 'manager@techdistrib.tn',
    createdAt: '2026-10-20T10:00:00Z'
  };

  let inventory: jasmine.SpyObj<InventoryService>;
  let dialogRef: { close: jasmine.Spy };

  function create(): ComponentFixture<StockAdjustDialogComponent> {
    TestBed.configureTestingModule({
      declarations: [StockAdjustDialogComponent],
      imports: [SharedModule, NoopAnimationsModule],
      providers: [
        { provide: InventoryService, useValue: inventory },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    const fixture = TestBed.createComponent(StockAdjustDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['history', 'adjust']);
    dialogRef = { close: jasmine.createSpy('close') };
  });

  it('requires a quantity and a reason that is not blank', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.form.patchValue({ quantity: 2, note: '   ' });
    component.submit();
    fixture.detectChanges();

    expect(inventory.adjust).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Le motif est obligatoire.');
  });

  it('records an entry as a positive change', () => {
    inventory.adjust.and.returnValue(of({ ...movement, quantityChange: 3, quantityAfter: 8 }));
    const component = create().componentInstance;

    component.form.patchValue({ direction: 'IN', quantity: 3, note: ' Réception fournisseur ' });
    expect(component.quantityAfter).toBe(8);
    component.submit();

    expect(inventory.adjust).toHaveBeenCalledWith(4, { quantityChange: 3, note: 'Réception fournisseur' });
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ quantityAfter: 8 }));
  });

  it('records an exit as a negative change', () => {
    inventory.adjust.and.returnValue(of(movement));
    const component = create().componentInstance;

    component.form.patchValue({ direction: 'OUT', quantity: 2, note: 'Casse' });
    component.submit();

    expect(inventory.adjust).toHaveBeenCalledWith(4, { quantityChange: -2, note: 'Casse' });
    expect(dialogRef.close).toHaveBeenCalledWith(movement);
  });

  it('refuses an exit larger than the stock before calling the API', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.form.patchValue({ direction: 'OUT', quantity: 6, note: 'Inventaire' });
    fixture.detectChanges();

    expect(component.form.hasError('insufficient')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.preview').textContent).toContain('seulement 5 en stock');
    component.submit();
    expect(inventory.adjust).not.toHaveBeenCalled();
  });

  it('refuses a decimal quantity', () => {
    const component = create().componentInstance;

    component.form.patchValue({ quantity: 1.5 });

    expect(component.form.controls.quantity.hasError('integer')).toBeTrue();
  });

  it('shows the API refusal in French and stays open', () => {
    inventory.adjust.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Insufficient stock: available 1, requested change -2' }
    })));
    const fixture = create();

    fixture.componentInstance.form.patchValue({ direction: 'OUT', quantity: 2, note: 'Casse' });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error').textContent)
      .toContain('Stock insuffisant : 1 disponible(s), variation demandée -2.');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saving).toBeFalse();
  });
});
