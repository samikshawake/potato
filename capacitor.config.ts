import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cashcompass.finance',
  appName: 'CashCompass',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: false, // Strict 100% offline air-gapped financial privacy
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    buildOptions: {
      keystorePath: undefined,
      releaseType: 'APK',
    },
  },
};

export default config;
