import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorIntl } from '@angular/material/paginator';

import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';
import { CountUpDirective } from './directives/count-up.directive';
import { frenchPaginatorIntl } from './french-paginator-intl';
import { MaterialModule } from './material.module';

/**
 * Imported by every feature module: common directives, reactive forms, Material and shared components.
 * The French paginator labels are provided here rather than in AppModule, so that Material stays out of
 * the initial bundle.
 */
@NgModule({
  declarations: [ConfirmDialogComponent, SkeletonComponent, CountUpDirective],
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: frenchPaginatorIntl }],
  exports: [
    CommonModule, ReactiveFormsModule, MaterialModule, ConfirmDialogComponent, SkeletonComponent, CountUpDirective
  ]
})
export class SharedModule {}
