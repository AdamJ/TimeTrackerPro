import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adamjolicoeur.timetraked',
  appName: 'Timetraked',
  webDir: 'dist',

  ios: {
    // Respect safe-area insets (notch, home indicator) automatically
    contentInset: 'always',
    // Match the app's background so there is no flash during launch
    backgroundColor: '#ffffff',
    // Prevent the WKWebView itself from scrolling — the app manages scroll internally
    scrollEnabled: false,
    // Restricts navigation to the app bundle; blocks accidental external loads
    limitsNavigationsToAppBoundDomains: true
  },

  experimental: {
    ios: {
      spm: {
        // iOS 26 requires PackageDescription 6.2; without this cap sync defaults to 5.9
        swiftToolsVersion: '6.2'
      }
    }
  },

  plugins: {
    Keyboard: {
      // Shrink the body when the keyboard appears so fixed-bottom UI (MobileNav,
      // bottom sheets) moves up with the keyboard automatically.
      resize: 'body',
      style: 'default',
      resizeOnFullScreen: true
    }
  }
};

export default config;
