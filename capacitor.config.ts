import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.actionanand.click2chat.app',
  appName: 'Click2Chat',
  webDir: 'dist/click2chat/browser',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#0d1713' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1600,
      backgroundColor: '#0d1713',
      showSpinner: false,
    },
  },
};

export default config;
