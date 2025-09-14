"use client";
import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const showToast = (msg: string, action?: { label: string; onClick: () => void }) => {
      const host = document.getElementById("toasts");
      if (!host) return;
      const el = document.createElement("div");
      el.className = "toast";
      const btn = action ? `<button id="sw-act" class="button" style="margin-left:8px">${action.label}</button>` : "";
      el.innerHTML = `<span>${msg}</span>${btn}`;
      host.appendChild(el);
      if (action) {
        el.querySelector<HTMLButtonElement>("#sw-act")?.addEventListener("click", () => {
          action.onClick();
          el.remove();
        });
      }
      setTimeout(() => { if (!action) el.remove(); }, 4000);
    };

    navigator.serviceWorker.register("/sw.js").then(reg => {
      // An updated SW is found
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showToast("Update available", { label: "Reload", onClick: () => location.reload() });
          }
        });
      });

      // Manual check on load
      reg.update().catch(() => {});
    }).catch(() => { /* ignore */ });
  }, []);

  return null;
}