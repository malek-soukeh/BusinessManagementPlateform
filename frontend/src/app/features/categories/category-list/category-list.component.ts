import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';

import { CategoryNode, buildCategoryTree } from '../../../core/models/category.models';
import { CategoryService } from '../../../core/services/category.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
  ConfirmDialogComponent, ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

export type CategoryLevel = '' | 'root' | 'sub';

/**
 * The API returns every category at once (no paging): the tree, the search, the filter
 * and the paging are done here.
 */
@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss']
})
export class CategoryListComponent implements OnInit, OnDestroy {
  private readonly categories = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly subscriptions = new Subscription();

  readonly columns = ['name', 'description', 'children', 'actions'];
  readonly search = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [0, 1, 2, 3, 4];

  level: CategoryLevel = '';
  query = '';
  pageIndex = 0;
  pageSize = 10;

  loading = true;
  errorMessage: string | null = null;
  /** Every category, as a tree. */
  nodes: CategoryNode[] = [];
  /** The categories matching the search and the filter. */
  filtered: CategoryNode[] = [];
  /** The current page of the filtered categories. */
  rows: CategoryNode[] = [];

  /** The tree indentation only makes sense when the whole tree is shown. */
  get showTree(): boolean {
    return this.query === '' && this.level === '';
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.search.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(query => {
          this.query = query.trim();
          this.pageIndex = 0;
          this.applyFilters();
        })
    );
    this.load();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.categories.list().subscribe({
      next: categories => {
        this.nodes = buildCategoryTree(categories);
        this.loading = false;
        this.applyFilters();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = extractErrorMessage(error, 'Impossible de charger les catégories.');
      }
    });
  }

  onLevelChange(level: CategoryLevel): void {
    this.level = level;
    this.pageIndex = 0;
    this.applyFilters();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }

  delete(node: CategoryNode): void {
    const data: ConfirmDialogData = {
      title: 'Supprimer la catégorie',
      message: `La catégorie « ${node.category.name} » sera définitivement supprimée. `
        + 'Une catégorie utilisée par des produits ne peut pas être supprimée.',
      confirmLabel: 'Supprimer',
      destructive: true
    };

    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(
        filter(confirmed => confirmed === true),
        switchMap(() => this.categories.delete(node.category.id))
      )
      .subscribe({
        next: () => {
          this.notify('Catégorie supprimée.');
          this.load();
        },
        error: (error: unknown) => this.notify(extractErrorMessage(error, 'Suppression impossible.'))
      });
  }

  trackById(_index: number, node: CategoryNode): number {
    return node.category.id;
  }

  private applyFilters(): void {
    const query = this.normalize(this.query);
    this.filtered = this.nodes.filter(node =>
      (this.level === '' || (this.level === 'root') === (node.depth === 0))
      && (query === '' || this.normalize(`${node.path} ${node.category.description ?? ''}`).includes(query)));

    // Back to the last page when the current one became empty (after a deletion for instance).
    const lastPage = Math.max(Math.ceil(this.filtered.length / this.pageSize) - 1, 0);
    this.pageIndex = Math.min(this.pageIndex, lastPage);
    const start = this.pageIndex * this.pageSize;
    this.rows = this.filtered.slice(start, start + this.pageSize);
  }

  /** Case and accent insensitive comparison: "electronique" finds "Électronique". */
  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 4000 });
  }
}
