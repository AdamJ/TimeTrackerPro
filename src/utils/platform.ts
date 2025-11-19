/**
 * Platform detection utility
 * Determines if the app is running in Electron or web browser
 */

export interface PlatformInfo {
  isElectron: boolean;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isWeb: boolean;
}

/**
 * Check if the app is running in Electron
 */
export function isElectron(): boolean {
  // Check if window.electronAPI exists (exposed by preload script)
  if (typeof window !== 'undefined' && window.electronAPI) {
    return true;
  }

  // Fallback: check user agent
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('electron');
  }

  return false;
}

/**
 * Get comprehensive platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const electron = isElectron();

  let isMac = false;
  let isWindows = false;
  let isLinux = false;

  if (electron && window.electronAPI) {
    // Use Electron's platform info
    isMac = window.electronAPI.platform.isMac;
    isWindows = window.electronAPI.platform.isWindows;
    isLinux = window.electronAPI.platform.isLinux;
  } else if (typeof navigator !== 'undefined') {
    // Use browser's platform info
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();

    isMac = platform.includes('mac') || userAgent.includes('macintosh');
    isWindows = platform.includes('win') || userAgent.includes('windows');
    isLinux = platform.includes('linux') && !userAgent.includes('android');
  }

  return {
    isElectron: electron,
    isMac,
    isWindows,
    isLinux,
    isWeb: !electron,
  };
}

/**
 * Get the Electron API if available
 */
export function getElectronAPI() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
}
