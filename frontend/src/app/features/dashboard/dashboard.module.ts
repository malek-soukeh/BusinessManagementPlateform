import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';

import { SharedModule } from '../../shared/shared.module';
import { DashboardComponent } from './dashboard.component';
import { KpiCardComponent } from './kpi-card/kpi-card.component';

const routes: Routes = [{ path: '', component: DashboardComponent }];

/** Chart.js is only imported here: it stays out of the initial bundle. */
@NgModule({
  declarations: [DashboardComponent, KpiCardComponent],
  imports: [SharedModule, NgChartsModule, RouterModule.forChild(routes)]
})
export class DashboardModule {}
