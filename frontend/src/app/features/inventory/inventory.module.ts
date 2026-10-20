import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { InventoryListComponent } from './inventory-list/inventory-list.component';
import { StockAdjustDialogComponent } from './stock-adjust-dialog/stock-adjust-dialog.component';
import { StockHistoryComponent } from './stock-history/stock-history.component';

/** Every role reads the stock; the adjustment is only offered to ADMIN and MANAGER, as the API decides. */
const routes: Routes = [
  { path: '', component: InventoryListComponent },
  { path: ':id', component: StockHistoryComponent }
];

@NgModule({
  declarations: [InventoryListComponent, StockHistoryComponent, StockAdjustDialogComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class InventoryModule {}
