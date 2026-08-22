import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { DeviceCallHistoryEntry } from '../../core/models/app.models';
import {
  NativeIntegrationService,
  WhatsAppPackage,
} from '../../core/services/native-integration.service';
import { digitsOnly, displayPhone } from '../../core/utils/phone-number';
import { AppIcon } from '../../shared/components/app-icon';
import { CallConfirmation } from '../../shared/components/call-confirmation';
import { WhatsAppAppChooser } from '../../shared/components/whatsapp-app-chooser';
import { environment } from '../../../environments/environment';

interface CallGroup {
  readonly label: string;
  readonly calls: readonly DeviceCallHistoryEntry[];
}

@Component({
  selector: 'app-call-history',
  imports: [AppIcon, CallConfirmation, WhatsAppAppChooser],
  templateUrl: './call-history.html',
  styleUrl: './call-history.scss',
})
export class CallHistory {
  private readonly native = inject(NativeIntegrationService);
  private readonly document = inject(DOCUMENT);
  protected readonly supported = this.native.deviceCallHistorySupported();
  protected readonly calls = signal<readonly DeviceCallHistoryEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly callConfirmation = signal<DeviceCallHistoryEntry | null>(null);
  protected readonly appChoice = signal<{
    readonly number: string;
    readonly packages: readonly WhatsAppPackage[];
  } | null>(null);
  protected readonly groups = computed<readonly CallGroup[]>(() => {
    const grouped = new Map<string, DeviceCallHistoryEntry[]>();
    for (const call of this.calls().slice(0, environment.callHistoryLimit)) {
      const label = this.dayLabel(call.timestamp);
      grouped.set(label, [...(grouped.get(label) ?? []), call]);
    }
    return [...grouped].map(([label, calls]) => ({ label, calls }));
  });

  constructor() {
    afterNextRender(() => {
      if (this.supported) void this.loadCalls();
    });
  }

  protected async loadCalls(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.calls.set(await this.native.requestDeviceCallHistory());
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'Your recent calls could not be loaded.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected openChat(call: DeviceCallHistoryEntry): void {
    const number = digitsOnly(call.number);
    if (!number) return;
    const packages = this.native.availableWhatsAppApps();
    if (packages.length > 1) {
      this.appChoice.set({ number, packages });
      return;
    }
    if (packages.length === 1 && this.native.openWhatsAppIn(number, '', packages[0])) return;
    if (this.native.openWhatsApp(number, '')) return;
    this.document.defaultView?.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
  }

  protected confirmCall(call: DeviceCallHistoryEntry): void {
    if (this.canCall(call)) this.callConfirmation.set(call);
  }

  protected cancelCall(): void {
    this.callConfirmation.set(null);
  }

  protected call(): void {
    const call = this.callConfirmation();
    if (!call) return;
    const number = this.dialableNumber(call.number);
    this.callConfirmation.set(null);
    if (!number) return;
    if (this.native.openDialler(number)) return;
    this.document.defaultView?.location.assign(`tel:${number}`);
  }

  protected openIn(packageName: WhatsAppPackage): void {
    const choice = this.appChoice();
    if (!choice) return;
    this.appChoice.set(null);
    this.native.openWhatsAppIn(choice.number, '', packageName);
  }

  protected callIcon(call: DeviceCallHistoryEntry): string {
    if (call.type === 'outgoing') return 'phone-outgoing';
    if (['missed', 'rejected', 'blocked'].includes(call.type)) return 'phone-missed';
    return 'phone-incoming';
  }

  protected callTypeLabel(call: DeviceCallHistoryEntry): string {
    const labels: Readonly<Record<DeviceCallHistoryEntry['type'], string>> = {
      incoming: 'Incoming',
      outgoing: 'Outgoing',
      missed: 'Missed',
      rejected: 'Rejected',
      blocked: 'Blocked',
      voicemail: 'Voicemail',
      unknown: 'Call',
    };
    return labels[call.type];
  }

  protected callTime(timestamp: number): string {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
      new Date(timestamp),
    );
  }

  protected duration(seconds: number): string {
    if (seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  protected displayName(call: DeviceCallHistoryEntry): string {
    return call.cachedName.trim() || displayPhone(call.number);
  }

  protected displayNumber(call: DeviceCallHistoryEntry): string {
    return call.cachedName.trim() ? displayPhone(call.number) : '';
  }

  protected canMessage(call: DeviceCallHistoryEntry): boolean {
    return digitsOnly(call.number).length >= 7;
  }

  protected canCall(call: DeviceCallHistoryEntry): boolean {
    return digitsOnly(call.number).length >= 3;
  }

  protected confirmationNumber(call: DeviceCallHistoryEntry): string {
    return displayPhone(call.number);
  }

  private dayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startCall = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const daysAgo = Math.round((startToday - startCall) / 86_400_000);
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  private dialableNumber(number: string): string {
    const sanitized = number.trim().replace(/[^\d+*#,;]/g, '');
    return sanitized.startsWith('+')
      ? `+${sanitized.slice(1).replace(/\+/g, '')}`
      : sanitized.replace(/\+/g, '');
  }
}
