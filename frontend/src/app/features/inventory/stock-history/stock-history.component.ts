import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';

import { Product, stockLevel } from '../../../core/models/product.models';
import {
  STOCK_REASON_LABELS, STOCK_REASON_TONES, StockMovement, StockMovementReason, stockNoteLabel
} from '../../../core/models/stock.models';
import { AuthService } from '../../../core/services/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProductService } from '../../../core/services/product.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
  StockAdjustDialogComponent, StockAdjustDialogData
} from '../stock-adjust-dialog/stock-adjust-dialog.component';

/** Stock card of one product: current level and the history of its movements, the newest first. */
@Component({
  selector: 'app-stock-history',
  templateUrl: './stock-history.component.html',
  styleUrls: ['./stock-history.component.scss']
})
export class StockHistoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductService);
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly canAdjust = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);
  readonly columns = ['date', 'reason', 'change', 'after', 'detail', 'user'];
  readonly skeletonRows = [0, 1, 2, 3];

  productId: number | null = null;
  product: Product | null = null;
  productError: string | null = null;

  movements: StockMovement[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  historyLoading = true;
  historyError: string | null = null;

  get chipClass(): string {
    if (!this.product) {
      return '';
    }
    const level = stockLevel(this.product);
    return level === 'out' ? 'tone-danger' : level === 'low' ? 'tone-warning' : 'tone-success';
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.productError = 'Produit introuvable.';
      this.historyLoading = false;
      return;
    }
    this.productId = id;
    this.loadProduct();
    this.loadHistory();
  }

  loadProduct(): void {
    if (this.productId === null) {
      return;
    }
    this.productError = null;
    this.products.get(this.productId).subscribe({
      next: product => (this.product = product),
      error: (error: unknown) => {
        this.productError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Produit introuvable.'
          : extractErrorMessage(error, 'Impossible de charger le produit.');
      }
    });
  }

  loadHistory(): void {
    if (this.productId === null) {
      return;
    }
    this.historyLoading = true;
    this.historyError = null;
    this.inventory.history(this.productId, this.pageIndex, this.pageSize).subscribe({
      next: page => {
        this.movements = page.content;
        this.total = page.totalElements;
        this.historyLoading = false;
      },
      error: (error: unknown) => {
        this.historyLoading = false;
        this.historyError = extractErrorMessage(error, 'Impossible de charger l\'historique.');
      }
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadHistory();
  }

  reasonLabel(reason: StockMovementReason): string {
    return STOCK_REASON_LABELS[reason] ?? reason;
  }

  reasonTone(reason: StockMovementReason): string {
    return `tone-${STOCK_REASON_TONES[reason] ?? 'muted'}`;
  }

  noteLabel(note: string | null): string {
    return stockNoteLabel(note);
  }

  adjust(): void {
    if (!this.product) {
      return;
    }
    const product = this.product;
    this.dialog
      .open<StockAdjustDialogComponent, StockAdjustDialogData, StockMovement>(
        StockAdjustDialogComponent, { data: { product }, width: '480px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter((movement): movement is StockMovement => !!movement))
      .subscribe(movement => {
        this.snackBar.open(`Stock mis à jour : ${movement.quantityAfter}.`, 'OK', { duration: 4000 });
        this.pageIndex = 0;
        this.loadProduct();
        this.loadHistory();
      });
  }
}
