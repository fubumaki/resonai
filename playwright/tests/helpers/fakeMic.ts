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

    const ensureSsotAudioContext = () => {
      const root = globalAny.__SSOT = globalAny.__SSOT || {};
      const audio = root.audio_latency = root.audio_latency || {};
      const context = audio.audio_context = audio.audio_context || {};
      return context as Record<string, unknown>;
    };

    const assignLatencyHint = (
      hint: number | string | null | undefined,
    ): boolean => {
      const context = ensureSsotAudioContext();
      if (hint === undefined) {
        if (!('latencyHint' in context)) {
          context.latencyHint = null;
        }
        return false;
      }

      context.latencyHint = hint === null ? null : hint;
      return hint !== null;
    };

    if (!globalAny.__practiceAudioLatencyReporter__) {
      globalAny.__practiceAudioLatencyReporter__ = true;

      const previousHandler = globalAny.__practiceAudioLatencyDidChange;
      globalAny.__practiceAudioLatencyDidChange = (hint: number | string | null) => {
        assignLatencyHint(hint);
        if (typeof previousHandler === 'function') {
          try {
            previousHandler(hint);
          } catch {
            // ignore downstream errors
          }
        }
      };

      let attempts = 0;
      const maxAttempts = 300;
      const poll = () => {
        attempts += 1;
        const probe = globalAny.__practiceAudioProbe;
        let hint: number | string | null | undefined;
        if (probe) {
          if (typeof probe === 'function') {
            hint = probe();
          } else if (typeof probe.getLatencyHint === 'function') {
            hint = probe.getLatencyHint();
          } else if (probe.audio_latency?.audio_context) {
            hint = probe.audio_latency.audio_context.latencyHint;
          } else {
            hint = (probe as any).latencyHint;
          }
        }

        if (assignLatencyHint(hint)) {
          return;
        }

        if (attempts < maxAttempts) {
          window.setTimeout(poll, 100);
        }
      };

      poll();
    }

    globalAny.__FAKE_MIC__ = true;
    globalAny.__ORIGINAL_GET_USER_MEDIA__ = originalGetUserMedia;
  });
}
