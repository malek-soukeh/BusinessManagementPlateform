import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { catchError, filter, of, switchMap, tap } from 'rxjs';

import {
  INVOICEABLE_ORDER_STATUSES, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES, InvoiceSummary
} from '../../../core/models/invoice.models';
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_TONES, ORDER_TRANSITIONS, Order, OrderStatus
} from '../../../core/models/order.models';
import { AuthService } from '../../../core/services/auth.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { OrderService } from '../../../core/services/order.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
  ConfirmDialogComponent, ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/** The normal path of an order; a cancelled order leaves it. */
const WORKFLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

const ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: '',
  CONFIRMED: 'Confirmer',
  SHIPPED: 'Marquer expédiée',
  DELIVERED: 'Marquer livrée',
  CANCELLED: 'Annuler la commande'
};

const ACTION_ICONS: Record<OrderStatus, string> = {
  PENDING: '',
  CONFIRMED: 'check_circle',
  SHIPPED: 'local_shipping',
  DELIVERED: 'inventory',
  CANCELLED: 'cancel'
};

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly invoices = inject(InvoiceService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Only administrators and managers move an order or modify it (the API refuses the others). */
  readonly canManage = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);
  readonly workflow = WORKFLOW;
  readonly columns = ['product', 'quantity', 'unitPrice', 'subtotal'];

  orderId: number | null = null;
  order: Order | null = null;
  loading = true;
  loadError: string | null = null;
  /** A status change is being saved. */
  busy = false;
  actionError: string | null = null;
  /** The invoice of the order, null when it has none; undefined while it is being looked for. */
  invoice: InvoiceSummary | null | undefined = undefined;

  /** The moves offered to the user: those of the API workflow, for the roles allowed to make them. */
  get actions(): OrderStatus[] {
    return this.order && this.canManage ? ORDER_TRANSITIONS[this.order.status] : [];
  }

  get canEdit(): boolean {
    return this.canManage && this.order?.status === 'PENDING';
  }

  /** A confirmed, shipped or delivered order without invoice can be invoiced by an administrator or a manager. */
  get canInvoice(): boolean {
    return this.canManage && this.invoice === null && this.isInvoiceable;
  }

  get isInvoiceable(): boolean {
    return this.order !== null && INVOICEABLE_ORDER_STATUSES.includes(this.order.status);
  }

  get itemCount(): number {
    return this.order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.loading = false;
      this.loadError = 'Commande introuvable.';
      return;
    }
    this.orderId = id;
    this.load();
  }

  load(): void {
    if (this.orderId === null) {
      return;
    }
    this.loading = true;
    this.loadError = null;
    this.orders.get(this.orderId).subscribe({
      next: order => {
        this.order = order;
        this.loading = false;
        this.findInvoice(order);
      },
      error: (error: unknown) => {
        this.loading = false;
        // The API answers 404 as well when an employee opens an order he did not create.
        this.loadError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Commande introuvable.'
          : extractErrorMessage(error, 'Impossible de charger la commande.');
      }
    });
  }

  invoiceLabel(invoice: InvoiceSummary): string {
    return INVOICE_STATUS_LABELS[invoice.status];
  }

  invoiceTone(invoice: InvoiceSummary): string {
    return `tone-${INVOICE_STATUS_TONES[invoice.status]}`;
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  statusTone(status: OrderStatus): string {
    return `tone-${ORDER_STATUS_TONES[status]}`;
  }

  actionLabel(status: OrderStatus): string {
    return ACTION_LABELS[status];
  }

  actionIcon(status: OrderStatus): string {
    return ACTION_ICONS[status];
  }

  /** A step of the workflow already reached by the order. */
  isDone(step: OrderStatus): boolean {
    if (!this.order || this.order.status === 'CANCELLED') {
      return false;
    }
    return WORKFLOW.indexOf(step) <= WORKFLOW.indexOf(this.order.status);
  }

  changeStatus(target: OrderStatus): void {
    const order = this.order;
    if (!order) {
      return;
    }

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: this.confirmation(order, target)
      })
      .afterClosed()
      .pipe(
        filter(confirmed => confirmed === true),
        tap(() => {
          this.busy = true;
          this.actionError = null;
        }),
        switchMap(() => this.orders.changeStatus(order.id, target))
      )
      .subscribe({
        next: updated => {
          this.busy = false;
          this.order = updated;
          this.findInvoice(updated);
          this.snackBar.open(`Commande ${updated.orderNumber} : ${this.statusLabel(updated.status).toLowerCase()}.`,
            'OK', { duration: 4000 });
        },
        error: (error: unknown) => {
          this.busy = false;
          this.actionError = extractErrorMessage(error, 'Changement de statut impossible.');
        }
      });
  }

  /** A pending order has no invoice yet: the search is only made once it can have one. */
  private findInvoice(order: Order): void {
    if (order.status === 'PENDING') {
      this.invoice = null;
      return;
    }
    this.invoice = undefined;
    this.invoices.findByOrder(order.id, order.orderNumber)
      .pipe(catchError(() => of(null)))
      .subscribe(invoice => (this.invoice = invoice));
  }

  private confirmation(order: Order, target: OrderStatus): ConfirmDialogData {
    switch (target) {
      case 'CONFIRMED':
        return {
          title: 'Confirmer la commande',
          message: `Le stock des ${order.items.length} produit(s) de la commande ${order.orderNumber} `
            + 'sera décrémenté. La commande ne pourra plus être modifiée.',
          confirmLabel: 'Confirmer'
        };
      case 'SHIPPED':
        return { title: 'Expédier la commande', message: `Marquer ${order.orderNumber} comme expédiée ?`, confirmLabel: 'Marquer expédiée' };
      case 'DELIVERED':
        return { title: 'Livrer la commande', message: `Marquer ${order.orderNumber} comme livrée ?`, confirmLabel: 'Marquer livrée' };
      default:
        return {
          title: 'Annuler la commande',
          message: order.status === 'CONFIRMED'
            ? `La commande ${order.orderNumber} sera annulée et son stock restitué. `
              + 'C\'est impossible tant qu\'elle a une facture active. Cette action est définitive.'
            : `La commande ${order.orderNumber} sera annulée. Cette action est définitive.`,
          confirmLabel: 'Annuler la commande',
          destructive: true
        };
    }
  }
}
