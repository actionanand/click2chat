import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { AppIcon } from './app-icon';

export interface SelectPickerOption {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
  readonly icon?: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-select-picker',
  imports: [AppIcon],
  templateUrl: './select-picker.html',
  styleUrl: './select-picker.scss',
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class SelectPicker {
  readonly value = input('');
  readonly options = input.required<readonly SelectPickerOption[]>();
  readonly sheetTitle = input('Choose an option');
  readonly placeholder = input('Choose an option');
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly searchable = input(false);
  readonly valueChange = output<string>();
  protected readonly open = signal(false);
  protected readonly search = signal('');
  protected readonly selectedOption = computed(() =>
    this.options().find((option) => option.value === this.value()),
  );
  protected readonly filteredOptions = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    if (!query) return this.options();
    return this.options().filter((option) =>
      `${option.label} ${option.detail ?? ''}`.toLocaleLowerCase().includes(query),
    );
  });
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected openPicker(): void {
    this.search.set('');
    this.open.set(true);
    globalThis.setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
  }

  protected close(restoreFocus = true): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) globalThis.setTimeout(() => this.trigger()?.nativeElement.focus(), 0);
  }

  protected select(value: string): void {
    this.valueChange.emit(value);
    this.close();
  }

  protected updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
