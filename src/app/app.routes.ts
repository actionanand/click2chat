import { Routes } from '@angular/router';
import { environment } from '../environments/environment';

const directChatRoute = {
  title: 'Start a WhatsApp chat · Click2Chat',
  loadComponent: () =>
    import('./features/direct-chat/direct-chat').then((module) => module.DirectChat),
};

export const routes: Routes = environment.enableCallHistory
  ? [
      {
        path: '',
        title: 'Recent calls · Click2Chat',
        loadComponent: () =>
          import('./features/call-history/call-history').then((module) => module.CallHistory),
      },
      { path: 'new-chat', ...directChatRoute },
      { path: '**', redirectTo: '' },
    ]
  : [
      { path: '', ...directChatRoute },
      { path: 'new-chat', redirectTo: '', pathMatch: 'full' },
      { path: '**', redirectTo: '' },
    ];
