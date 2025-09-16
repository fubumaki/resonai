import { Page } from '@playwright/test';

/**
 * Replaces getUserMedia with a deterministic, silent MediaStream so mic flows
 * can run in CI without real hardware. The patch is idempotent and guards for
 * browsers that expose prefixed AudioContext implementations.
 */
export async function useFakeMic(page: Page) {
  await page.addInitScript(() => {
    const globalAny = window as any;

    if (globalAny.__FAKE_MIC_PATCHED__) {
      return;
    }

    globalAny.__FAKE_MIC_PATCHED__ = true;

    const navAny = navigator as any;
    if (!navAny.mediaDevices) {
      navAny.mediaDevices = {};
    }

    const mediaDevices: MediaDevices = navAny.mediaDevices;
    const originalGetUserMedia = mediaDevices.getUserMedia?.bind(mediaDevices);

    const createSilentStream = () => {
      const AudioCtx =
        (globalAny.AudioContext as typeof AudioContext | undefined) ||
        (globalAny.webkitAudioContext as typeof AudioContext | undefined);

      if (AudioCtx) {
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        return dest.stream;
      }

      if (typeof globalAny.MediaStream === 'function') {
        return new globalAny.MediaStream();
      }

      return {
        getAudioTracks: () => [],
        getTracks: () => [],
      } as unknown as MediaStream;
    };

    mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      const audioRequested = !constraints || constraints.audio !== false;

      if (audioRequested) {
        const silent = createSilentStream();
        return silent;
      }

      if (originalGetUserMedia) {
        return originalGetUserMedia(constraints as MediaStreamConstraints);
      }

      throw new Error('getUserMedia is not available in this environment');
    };

    globalAny.__FAKE_MIC__ = true;
    globalAny.__ORIGINAL_GET_USER_MEDIA__ = originalGetUserMedia;
  });
}
