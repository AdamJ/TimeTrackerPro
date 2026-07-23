import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installTauriElectronApiShim } from "@/lib/tauriElectronApiShim";

installTauriElectronApiShim();

createRoot(document.getElementById('root')!).render(<App />);
