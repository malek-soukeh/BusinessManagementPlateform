import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from './material.module';

/** Imported by every feature module: common directives, reactive forms and Material. */
@NgModule({
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  exports: [CommonModule, ReactiveFormsModule, MaterialModule]
})
export class SharedModule {}
