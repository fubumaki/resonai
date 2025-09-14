import { Page } from '@playwright/test';

export async function useFakeMic(page: Page) {
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    // Provide a predictable, silent audio stream
    (navigator.mediaDevices as any).getUserMedia = async (_constraints: MediaStreamConstraints) => {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const dest = ctx.createMediaStreamDestination();
      return dest.stream; // valid MediaStream with an audio track
    };
    // Optional: mark for debugging
    (window as any).__FAKE_MIC__ = true;
  });
}
