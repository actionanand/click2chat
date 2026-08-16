import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Recent calls · Click2Chat',
    loadComponent: () =>
      import('./features/call-history/call-history').then((module) => module.CallHistory),
  },
  {
    path: 'new-chat',
    title: 'New chat · Click2Chat',
    loadComponent: () =>
      import('./features/direct-chat/direct-chat').then((module) => module.DirectChat),
  },
  { path: '**', redirectTo: '' },
];
