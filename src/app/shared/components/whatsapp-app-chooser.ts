import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, Component, ElementRef, input, output, viewChildren } from '@angular/core';
import { WhatsAppPackage } from '../../core/services/native-integration.service';
import { AppIcon } from './app-icon';

@Component({
  selector: 'app-whatsapp-app-chooser',
  imports: [AppIcon, NgOptimizedImage],
  templateUrl: './whatsapp-app-chooser.html',
  styleUrl: './whatsapp-app-chooser.scss',
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class WhatsAppAppChooser {
  readonly packages = input.required<readonly WhatsAppPackage[]>();
  readonly chosen = output<WhatsAppPackage>();
  readonly closed = output<void>();
  private readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');

  constructor() {
    afterNextRender(() => this.optionButtons()[0]?.nativeElement.focus());
  }

  protected appName(packageName: WhatsAppPackage): string {
    return packageName === 'com.whatsapp.w4b' ? 'WhatsApp Business' : 'WhatsApp';
  }

  protected appIcon(packageName: WhatsAppPackage): string {
    return packageName === 'com.whatsapp.w4b' ? 'whatsapp-business.png' : 'whatsapp.png';
  }
}
