import { Theme, ThemePanel } from '@radix-ui/themes';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import "@radix-ui/themes/styles.css";

createRoot(document.getElementById("root")!).render(
  <Theme>
    <App />
    {/* <ThemePanel /> */}
  </Theme>
);
