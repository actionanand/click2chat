import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { DeviceCallHistoryEntry, DeviceCallType } from '../models/app.models';

export type WhatsAppPackage = 'com.whatsapp' | 'com.whatsapp.w4b';

interface Click2ChatNativeBridge {
  readClipboard(): string;
  availableWhatsAppApps(): string;
  openDialler(number: string): void;
  openWhatsApp(number: string, message: string): void;
  openWhatsAppIn(number: string, message: string, packageName: string): void;
  deviceCallHistorySupported(): boolean;
  deviceCallHistoryPermissionGranted(): boolean;
  shouldShowCallHistoryPermissionRationale(): boolean;
  requestDeviceCallHistory(): void;
}

interface NativeWindow extends Window {
  Click2ChatNative?: Click2ChatNativeBridge;
}

@Injectable({ providedIn: 'root' })
export class NativeIntegrationService {
  private readonly document = inject(DOCUMENT);

  readClipboard(): string {
    return this.bridge()?.readClipboard().trim() ?? '';
  }

  availableWhatsAppApps(): readonly WhatsAppPackage[] {
    const value = this.bridge()?.availableWhatsAppApps();
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (entry): entry is WhatsAppPackage =>
          entry === 'com.whatsapp' || entry === 'com.whatsapp.w4b',
      );
    } catch {
      return [];
    }
  }

  openWhatsApp(number: string, message: string): boolean {
    const bridge = this.bridge();
    if (!bridge) return false;
    bridge.openWhatsApp(number, message);
    return true;
  }

  openDialler(number: string): boolean {
    const bridge = this.bridge();
    if (!bridge) return false;
    bridge.openDialler(number);
    return true;
  }

  openWhatsAppIn(number: string, message: string, packageName: WhatsAppPackage): boolean {
    const bridge = this.bridge();
    if (!bridge) return false;
    bridge.openWhatsAppIn(number, message, packageName);
    return true;
  }

  deviceCallHistorySupported(): boolean {
    return this.bridge()?.deviceCallHistorySupported() ?? false;
  }

  deviceCallHistoryPermissionGranted(): boolean {
    return this.bridge()?.deviceCallHistoryPermissionGranted() ?? false;
  }

  shouldShowCallHistoryPermissionRationale(): boolean {
    return this.bridge()?.shouldShowCallHistoryPermissionRationale() ?? false;
  }

  requestDeviceCallHistory(): Promise<readonly DeviceCallHistoryEntry[]> {
    const bridge = this.bridge();
    if (!bridge) {
      return Promise.reject(new Error('Call history is available in the Android app.'));
    }
    return this.waitForNativeResult('call-history', () => bridge.requestDeviceCallHistory()).then(
      (value) => this.parseCallHistory(value),
    );
  }

  private bridge(): Click2ChatNativeBridge | undefined {
    return (this.document.defaultView as NativeWindow | null)?.Click2ChatNative;
  }

  private waitForNativeResult(action: string, start: () => void): Promise<string> {
    const nativeWindow = this.document.defaultView;
    if (!nativeWindow) return Promise.reject(new Error('The Android bridge is unavailable.'));
    return new Promise<string>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const finish = (success: boolean, data: string, message: string): void => {
        if (timeout) globalThis.clearTimeout(timeout);
        nativeWindow.removeEventListener('click2chat-native-result', handleResult);
        if (success) resolve(data);
        else reject(new Error(message));
      };
      const handleResult = (event: Event): void => {
        const detail = (
          event as CustomEvent<{
            action: string;
            success: boolean;
            data?: string;
            message?: string;
          }>
        ).detail;
        if (detail.action !== action) return;
        finish(detail.success, detail.data ?? '', detail.message || 'The request failed.');
      };
      nativeWindow.addEventListener('click2chat-native-result', handleResult);
      timeout = globalThis.setTimeout(
        () => finish(false, '', 'The Android request timed out.'),
        60_000,
      );
      try {
        start();
      } catch (error: unknown) {
        finish(false, '', error instanceof Error ? error.message : 'The request could not start.');
      }
    });
  }

  private parseCallHistory(value: string): readonly DeviceCallHistoryEntry[] {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((entry): readonly DeviceCallHistoryEntry[] => {
        if (!this.isRecord(entry)) return [];
        const timestamp = this.numberValue(entry['timestamp']);
        return [
          {
            id: String(entry['id'] ?? `${timestamp}-${String(entry['number'] ?? '')}`),
            number: String(entry['number'] ?? ''),
            cachedName: String(entry['cachedName'] ?? ''),
            type: this.callType(entry['type']),
            timestamp,
            durationSeconds: this.numberValue(entry['durationSeconds']),
          },
        ];
      });
    } catch {
      return [];
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private numberValue(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private callType(value: unknown): DeviceCallType {
    const types: readonly DeviceCallType[] = [
      'incoming',
      'outgoing',
      'missed',
      'rejected',
      'blocked',
      'voicemail',
      'unknown',
    ];
    return types.includes(value as DeviceCallType) ? (value as DeviceCallType) : 'unknown';
  }
}
