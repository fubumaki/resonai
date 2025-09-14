import { Page } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for coach system to be ready
   */
  async waitForCoachReady(): Promise<void> {
    await this.page.waitForFunction(() => {
      return typeof window.__coachEmits !== 'undefined' || 
             document.querySelector('[data-testid="coach-ready"]') !== null;
    }, { timeout: 10000 });
  }

  /**
   * Get coach debug state
   */
  async getCoachDebugState(): Promise<any> {
    return await this.page.evaluate(() => {
      if (typeof window.__coachEmits !== 'undefined') {
        return {
          emissions: window.__coachEmits,
          thresholds: window.__prosodyThresholds,
          canSimulate: typeof window.__coachSimulate !== 'undefined'
        };
      }
      return null;
    });
  }

  /**
   * Simulate coach event
   */
  async simulateCoachEvent(eventType: string, data: any): Promise<void> {
    await this.page.evaluate(({ eventType, data }) => {
      if (window.__coachSimulate) {
        window.__coachSimulate(eventType, data);
      }
    }, { eventType, data });
  }

  /**
   * Clear coach emissions
   */
  async clearCoachEmissions(): Promise<void> {
    await this.page.evaluate(() => {
      if (typeof window.__coachEmits !== 'undefined') {
        window.__coachEmits = [];
      }
    });
  }

  /**
   * Wait for specific hint to appear
   */
  async waitForHint(hintId: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForFunction((hintId) => {
        if (typeof window.__coachEmits !== 'undefined') {
          return window.__coachEmits.some((emit: any) => emit.hintId === hintId);
        }
        return false;
      }, hintId, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all hints emitted
   */
  async getHints(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return window.__coachEmits || [];
    });
  }

  /**
   * Check if isolation is working
   */
  async isIsolated(): Promise<boolean> {
    return await this.page.evaluate(() => window.crossOriginIsolated);
  }

  /**
   * Get network requests made during test
   */
  async getNetworkRequests(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return window.__networkRequests || [];
    });
  }

  /**
   * Start monitoring network requests
   */
  async startNetworkMonitoring(): Promise<void> {
    await this.page.evaluate(() => {
      window.__networkRequests = [];
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        window.__networkRequests.push({
          url: String(args[0]),
          method: 'GET',
          timestamp: Date.now()
        });
        return originalFetch.apply(this, args);
      };
    });
  }

  /**
   * Stop monitoring network requests
   */
  async stopNetworkMonitoring(): Promise<void> {
    await this.page.evaluate(() => {
      if ((window as any).__originalFetch) {
        window.fetch = (window as any).__originalFetch;
        delete (window as any).__originalFetch;
      }
    });
  }

  /**
   * Take screenshot with timestamp
   */
  async takeTimestampedScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for audio context to be ready
   */
  async waitForAudioContext(): Promise<void> {
    await this.page.waitForFunction(() => {
      return typeof window.AudioContext !== 'undefined' || 
             typeof (window as any).webkitAudioContext !== 'undefined';
    }, { timeout: 10000 });
  }

  /**
   * Check if worklets are loaded
   */
  async areWorkletsLoaded(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.querySelector('script[src*="worklet"]') !== null ||
             document.querySelector('script[src*="wasm"]') !== null;
    });
  }
}

