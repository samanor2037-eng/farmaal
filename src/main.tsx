import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Listen for PWA install prompt and save it globally
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
    // Dispatch a custom event to notify components that PWA install is available
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });
}

// Manually register the service worker if NOT running in Electron
const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
if (typeof window !== 'undefined' && !isElectron && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((reg) => {
        console.log('PWA Service Worker registered:', reg);
      })
      .catch((err) => {
        console.error('PWA Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
