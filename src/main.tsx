import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installTauriElectronApiShim } from "@/lib/tauriElectronApiShim";
import { clearSupabaseResponseCache } from "@/services/localStorageService/clearLocalData";

installTauriElectronApiShim();
void clearSupabaseResponseCache();

createRoot(document.getElementById('root')!).render(<App />);
