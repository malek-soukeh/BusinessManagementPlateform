import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CategoryFormComponent } from './category-form/category-form.component';
import { CategoryListComponent } from './category-list/category-list.component';

const routes: Routes = [
  { path: '', component: CategoryListComponent },
  { path: 'new', component: CategoryFormComponent },
  { path: ':id/edit', component: CategoryFormComponent }
];

@NgModule({
  declarations: [CategoryListComponent, CategoryFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CategoriesModule {}
