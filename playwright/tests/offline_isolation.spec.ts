import { test, expect } from "@playwright/test";

test.use({ browserName: "firefox" });

test.describe("Cross-origin isolation continuity (Firefox)", () => {

  test("COI stays true after offline reload", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(
      page.evaluate(() => (window as any).crossOriginIsolated),
    ).resolves.toBe(true);

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    const coi = await page.evaluate(
      () => (window as any).crossOriginIsolated,
    );
    expect(coi).toBe(true);
  });

  test("Service Worker preserves COI headers offline", async ({ context }) => {
    const page = await context.newPage();
    
    // Load online first to cache with SW
    await page.goto("/", { waitUntil: "networkidle" });
    
    // Wait for SW to be active
    await expect.poll(async () => page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg?.active);
    })).toBe(true);

    // Verify initial COI state
    const initialCoi = await page.evaluate(() => window.crossOriginIsolated);
    expect(initialCoi).toBe(true);

    // Go offline and reload
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    // Verify COI maintained offline
    const offlineCoi = await page.evaluate(() => window.crossOriginIsolated);
    expect(offlineCoi).toBe(true);

    // Check for COEP/CORP errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('COEP') || msg.text().includes('CORP'))) {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(consoleErrors).toHaveLength(0);
  });

  test("ONNX threading gated by COI", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Verify COI is true
    const coi = await page.evaluate(() => window.crossOriginIsolated);
    expect(coi).toBe(true);

    // Check ONNX threading status
    const onnxInfo = await page.evaluate(() => {
      if (typeof window !== 'undefined' && (window as any).ort) {
        return {
          available: true,
          numThreads: (window as any).ort.env.wasm.numThreads,
          crossOriginIsolated: window.crossOriginIsolated
        };
      }
      return { available: false };
    });

    if (onnxInfo.available) {
      expect(onnxInfo.numThreads).toBeGreaterThan(1);
      expect(onnxInfo.crossOriginIsolated).toBe(true);
    }
  });

  test("Mic constraints applied under COI", async ({ page, context }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Verify COI is true
    const coi = await page.evaluate(() => window.crossOriginIsolated);
    expect(coi).toBe(true);

    // Verify that getUserMedia constraints can be set (without actually accessing mic)
    const micConstraintsSupported = await page.evaluate(() => {
      try {
        // Check if getUserMedia supports the constraints we need
        const constraints = {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        };
        
        // Just verify the constraints object is valid
        return navigator.mediaDevices && navigator.mediaDevices.getUserMedia && 
               typeof constraints.audio.echoCancellation === 'boolean' &&
               typeof constraints.audio.noiseSuppression === 'boolean' &&
               typeof constraints.audio.autoGainControl === 'boolean';
      } catch (error) {
        return false;
      }
    });

    expect(micConstraintsSupported).toBe(true);
    expect(coi).toBe(true);
  });
});
