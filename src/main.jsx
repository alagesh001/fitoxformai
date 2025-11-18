import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/fitoxme/sw.js')
    .then(reg => console.log('✅ Service Worker registered:', reg.scope))
      .catch(err => console.error('❌ Service Worker registration failed:', err));
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Reload when a new SW takes control
    window.location.reload();
  });

  navigator.serviceWorker.ready.then(registration => {
    registration.addEventListener('updatefound', () => {
      const newSW = registration.installing;
      if (newSW) {
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Tell the new SW to activate immediately
            newSW.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });
  });
}