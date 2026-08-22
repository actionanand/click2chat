import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { AppIcon } from './app-icon';

@Component({
  selector: 'app-call-confirmation',
  imports: [AppIcon],
  templateUrl: './call-confirmation.html',
  styleUrl: './call-confirmation.scss',
})
export class CallConfirmation {
  readonly contactName = input.required<string>();
  readonly phoneNumber = input.required<string>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      this.cancelButton().nativeElement.focus({ preventScroll: true });
    });
  }

  protected cancel(event?: Event): void {
    event?.preventDefault();
    this.dialog().nativeElement.close();
    this.cancelled.emit();
  }

  protected confirm(): void {
    this.dialog().nativeElement.close();
    this.confirmed.emit();
  }
}
