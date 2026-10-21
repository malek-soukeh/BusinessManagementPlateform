import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';

import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { SearchFieldComponent } from './components/search-field/search-field.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';
import { TableSkeletonComponent } from './components/table-skeleton/table-skeleton.component';
import { CountUpDirective } from './directives/count-up.directive';
import { frenchPaginatorIntl } from './french-paginator-intl';
import { MaterialModule } from './material.module';

const SHARED_DECLARATIONS = [
  ConfirmDialogComponent,
  CountUpDirective,
  EmptyStateComponent,
  PageHeaderComponent,
  SearchFieldComponent,
  SkeletonComponent,
  TableSkeletonComponent
];

/**
 * Imported by every feature module: common directives, reactive forms, Material and shared components.
 * The French paginator labels are provided here rather than in AppModule, so that Material stays out of
 * the initial bundle.
 */
@NgModule({
  declarations: SHARED_DECLARATIONS,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: frenchPaginatorIntl }],
  exports: [CommonModule, ReactiveFormsModule, MaterialModule, ...SHARED_DECLARATIONS]
})
export class SharedModule {}
