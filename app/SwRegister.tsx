"use client";
import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const showToast = (msg: string, action?: { label: string; onClick: () => void }) => {
      const host = document.getElementById('toasts');
      if (!host) return;
      const el = document.createElement('div');
      el.className = 'toast';
      const span = document.createElement('span');
      span.textContent = msg;
      el.appendChild(span);
      if (action) {
        const btn = document.createElement('button');
        btn.className = 'button ml-12';
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          action.onClick();
          el.remove();
        });
        el.appendChild(btn);
      }
      host.appendChild(el);
      if (!action) setTimeout(() => el.remove(), 4000);
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // An updated SW is found
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Update available', { label: 'Reload', onClick: () => location.reload() });
            }
          });
        });

        // Manual check on load
        reg.update().catch(() => {});
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
