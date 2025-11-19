console.log('=== Testing electron require ===');

try {
  const electron = require('electron');
  console.log('Type:', typeof electron);
  console.log('Is string:', typeof electron === 'string');

  if (typeof electron === 'object') {
    console.log('Keys:', Object.keys(electron).slice(0, 20));
    console.log('Has app:', !!electron.app);
    console.log('Has BrowserWindow:', !!electron.BrowserWindow);
  } else {
    console.log('Value:', electron);
  }
} catch (error) {
  console.error('Error:', error.message);
}
