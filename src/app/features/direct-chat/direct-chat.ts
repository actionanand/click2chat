import { DOCUMENT } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { form, FormField, maxLength, pattern, required, validate } from '@angular/forms/signals';
import { countryNameForCallingCode, SORTED_COUNTRY_CODES } from '../../core/data/country-codes';
import {
  NativeIntegrationService,
  WhatsAppPackage,
} from '../../core/services/native-integration.service';
import { buildWhatsAppUrl, digitsOnly, normalizePhone } from '../../core/utils/phone-number';
import { AppIcon } from '../../shared/components/app-icon';
import { SelectPicker, SelectPickerOption } from '../../shared/components/select-picker';
import { WhatsAppAppChooser } from '../../shared/components/whatsapp-app-chooser';

interface ChatModel {
  readonly country: string;
  readonly callingCode: string;
  readonly number: string;
  readonly message: string;
}

@Component({
  selector: 'app-direct-chat',
  imports: [AppIcon, FormField, SelectPicker, WhatsAppAppChooser],
  templateUrl: './direct-chat.html',
  styleUrl: './direct-chat.scss',
})
export class DirectChat {
  private readonly document = inject(DOCUMENT);
  private readonly native = inject(NativeIntegrationService);
  protected readonly attempted = signal(false);
  protected readonly notice = signal('');
  protected readonly appChoice = signal<{
    readonly number: string;
    readonly message: string;
    readonly packages: readonly WhatsAppPackage[];
  } | null>(null);
  protected readonly countryOptions: readonly SelectPickerOption[] = SORTED_COUNTRY_CODES.map(
    (country) => ({
      value: country.name,
      label: country.name,
      detail: country.callingCode ? `${country.iso} · ${country.callingCode}` : 'Enter any code',
    }),
  );
  protected readonly chatModel = signal<ChatModel>(this.initialModel());
  protected readonly chatForm = form(this.chatModel, (fields) => {
    required(fields.callingCode, { message: 'Enter a country calling code.' });
    pattern(fields.callingCode, /^\+\d{1,4}$/, { message: 'Use a code such as +91.' });
    required(fields.number, { message: 'Enter a mobile number.' });
    validate(fields.number, ({ value }) =>
      digitsOnly(value()).length >= 6
        ? undefined
        : { kind: 'phone-number', message: 'Enter at least 6 digits.' },
    );
    maxLength(fields.message, 4096, { message: 'Keep the message under 4,096 characters.' });
  });

  constructor() {
    effect(() => {
      const value = this.chatModel();
      const country = countryNameForCallingCode(value.callingCode, value.country);
      if (country === value.country) return;
      this.chatModel.update((current) => ({ ...current, country }));
      this.saveCountry(country);
    });
  }

  protected selectCountry(name: string): void {
    const country = SORTED_COUNTRY_CODES.find((entry) => entry.name === name);
    this.chatModel.update((value) => ({
      ...value,
      country: name,
      callingCode: country?.callingCode ?? '',
    }));
    this.saveCountry(name);
  }

  protected normalizeCallingCode(): void {
    const value = this.chatForm.callingCode().value().trim();
    if (value && !value.startsWith('+')) this.chatForm.callingCode().value.set(`+${value}`);
  }

  protected openChat(event: Event): void {
    event.preventDefault();
    this.attempted.set(true);
    this.notice.set('');
    const value = this.chatModel();
    const url = buildWhatsAppUrl(value.callingCode, value.number, value.message);
    if (!this.chatForm().valid() || !url) {
      this.chatForm().markAsTouched();
      if (this.chatForm.callingCode().invalid()) this.chatForm.callingCode().focusBoundControl();
      else this.chatForm.number().focusBoundControl();
      return;
    }
    const normalized = normalizePhone(value.callingCode, value.number).slice(1);
    const message = value.message.trim();
    const packages = this.native.availableWhatsAppApps();
    if (packages.length > 1) {
      this.appChoice.set({ number: normalized, message, packages });
      return;
    }
    if (packages.length === 1 && this.native.openWhatsAppIn(normalized, message, packages[0]))
      return;
    if (this.native.openWhatsApp(normalized, message)) return;
    this.document.defaultView?.open(url, '_blank', 'noopener,noreferrer');
  }

  protected openIn(packageName: WhatsAppPackage): void {
    const choice = this.appChoice();
    if (!choice) return;
    this.appChoice.set(null);
    this.native.openWhatsAppIn(choice.number, choice.message, packageName);
  }

  protected async pasteNumber(): Promise<void> {
    let value = this.native.readClipboard();
    if (!value) {
      try {
        value = (await this.document.defaultView?.navigator.clipboard.readText()) ?? '';
      } catch {
        this.notice.set('Clipboard access was blocked. You can type the number instead.');
        return;
      }
    }
    if (!value.trim()) {
      this.notice.set('The clipboard does not contain a phone number.');
      return;
    }
    this.chatForm.number().value.set(value.trim());
    this.notice.set('Phone number pasted.');
  }

  private initialModel(): ChatModel {
    let countryName = 'India';
    try {
      countryName =
        this.document.defaultView?.localStorage.getItem('click2chat-country') || countryName;
    } catch {
      // India is the safe default when browser storage is unavailable.
    }
    const country = SORTED_COUNTRY_CODES.find((entry) => entry.name === countryName);
    return {
      country: country?.name ?? 'India',
      callingCode: country ? country.callingCode : '+91',
      number: '',
      message: '',
    };
  }

  private saveCountry(country: string): void {
    try {
      this.document.defaultView?.localStorage.setItem('click2chat-country', country);
    } catch {
      // The selection remains active even if browser storage is unavailable.
    }
  }
}
