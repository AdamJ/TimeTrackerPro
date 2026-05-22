import { Theme, ThemePanel } from '@radix-ui/themes';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@radix-ui/themes/styles.css';
import './index.css';

if (import.meta.env.VITE_IOS_BUILD === "true") {
  document.body.classList.add("ios-build");
}

createRoot(document.getElementById('root')!).render(
  <Theme accentColor="blue" grayColor="slate" radius="full">
    <App />
    {/* <ThemePanel /> */}
  </Theme>
);
