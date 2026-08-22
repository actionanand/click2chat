import { Component, computed, input } from '@angular/core';

const ICON_PATHS: Readonly<Record<string, string>> = {
  check: 'M20 6 9 17l-5-5',
  'chevron-down': 'm6 9 6 6 6-6',
  clipboard:
    'M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3 M9 3h6v4H9z',
  close: 'M18 6 6 18M6 6l12 12',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5 M12 7v5l3 2',
  message: 'M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A7 7 0 0 1 3 12a9 9 0 0 1 18 0z',
  moon: 'M20.5 14.1A8 8 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14z',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 13 13 0 0 0 2.8.7 2 2 0 0 1 1.8 2.1z',
  'phone-incoming':
    'M15.1 4.9 19 9m0-4v4h-4 M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 13 13 0 0 0 2.8.7 2 2 0 0 1 1.8 2.1z',
  'phone-missed':
    'm16 2 6 6m0-6-6 6 M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 13 13 0 0 0 2.8.7 2 2 0 0 1 1.8 2.1z',
  'phone-outgoing':
    'm15 9 4-4m-4-1h5v5 M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 13 13 0 0 0 2.8.7 2 2 0 0 1 1.8 2.1z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7L20 19m0-5v5h-5 M4 13a8 8 0 0 1 2.3-5.7L4 5m0 5V5h5',
  search: 'm21 21-4.4-4.4 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  smartphone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2',
  sun: 'M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  system: 'M4 4h16v11H4z M8 20h8m-4-5v5',
};

@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path [attr.d]="path()"></path>
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
      place-items: center;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.9;
    }
  `,
})
export class AppIcon {
  readonly name = input('shield');
  readonly path = computed(() => ICON_PATHS[this.name()] ?? ICON_PATHS['shield']);
}
