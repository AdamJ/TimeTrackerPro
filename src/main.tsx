import { Theme, ThemePanel } from '@radix-ui/themes';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@radix-ui/themes/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <Theme accentColor="orange" grayColor="slate" radius="full">
    <App />
    {/* <ThemePanel /> */}
  </Theme>
);
