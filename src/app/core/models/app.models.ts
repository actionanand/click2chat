export type ThemePreference = 'system' | 'light' | 'dark';

export type DeviceCallType =
  'incoming' | 'outgoing' | 'missed' | 'rejected' | 'blocked' | 'voicemail' | 'unknown';

export interface DeviceCallHistoryEntry {
  readonly id: string;
  readonly number: string;
  readonly cachedName: string;
  readonly type: DeviceCallType;
  readonly timestamp: number;
  readonly durationSeconds: number;
}
