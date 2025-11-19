// Minimal test to verify electron module loading
console.log('Testing electron module loading...');

try {
  const electron = require('electron');
  console.log('✓ require("electron") succeeded');
  console.log('Type of electron:', typeof electron);
  console.log('electron keys:', Object.keys(electron).slice(0, 10));

  if (electron.app) {
    console.log('✓ electron.app exists:', typeof electron.app);
  } else {
    console.log('✗ electron.app is undefined!');
  }

  if (electron.BrowserWindow) {
    console.log('✓ electron.BrowserWindow exists:', typeof electron.BrowserWindow);
  } else {
    console.log('✗ electron.BrowserWindow is undefined!');
  }
} catch (error) {
  console.error('✗ Error requiring electron:', error.message);
}
