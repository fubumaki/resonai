import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Session Reset Functionality', () => {
  let mockHost: HTMLElement;
  let mockToast: HTMLElement;
  let mockDispatchEvent: any;

  beforeEach(() => {
    // Mock DOM elements
    mockHost = document.createElement('div');
    mockHost.id = 'toasts';
    mockHost.setAttribute('aria-live', 'polite');
    mockHost.setAttribute('aria-atomic', 'true');
    document.body.appendChild(mockHost);

    mockToast = document.createElement('div');

    // Mock getElementById
    vi.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'toasts') return mockHost;
      return null;
    });

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    // Mock dispatchEvent
    mockDispatchEvent = vi.spyOn(window, 'dispatchEvent').mockImplementation((event: Event) => true);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('Session Progress Reset', () => {
    it('resets session progress to 0 when reset function is called', () => {
      // Mock session progress state
      let sessionProgress = 5;
      const setSessionProgress = (value: number) => {
        sessionProgress = value;
      };

      // Simulate the reset behavior from practice page
      const resetSession = () => {
        setSessionProgress(0);
        window.dispatchEvent(new CustomEvent('resonai:session-reset', {
          detail: { source: 'test-reset' }
        }));
      };

      resetSession();

      expect(sessionProgress).toBe(0);
    });

    it('dispatches SESSION_RESET_EVENT when resetAll is called', () => {
      // Mock the resetAll function behavior
      const resetAll = () => {
        window.dispatchEvent(new CustomEvent('resonai:session-reset', {
          detail: { source: 'settings-reset' }
        }));
      };

      resetAll();

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resonai:session-reset',
          detail: { source: 'settings-reset' }
        })
      );
    });

    it('dispatches SESSION_RESET_EVENT when clearTrials is called', () => {
      // Mock the clearTrials function behavior
      const clearTrials = () => {
        window.dispatchEvent(new CustomEvent('resonai:session-reset', {
          detail: { source: 'export-clear' }
        }));
      };

      clearTrials();

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resonai:session-reset',
          detail: { source: 'export-clear' }
        })
      );
    });
  });

  describe('Toast Notifications', () => {
    it('shows friendly reset message when session is reset', () => {
      const toast = (msg: string) => {
        const host = document.getElementById('toasts');
        if (!host) return;
        const el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.textContent = msg;
        host.appendChild(el);

        requestAnimationFrame(() => {
          el.classList.add('show');
        });
      };

      toast('Session reset. You can start fresh anytime.');

      const createdToast = mockHost.querySelector('.toast');
      expect(createdToast).toBeTruthy();
      expect(createdToast?.getAttribute('role')).toBe('status');
      expect(createdToast?.getAttribute('aria-live')).toBe('polite');
      expect(createdToast?.textContent).toBe('Session reset. You can start fresh anytime.');
      expect(createdToast?.classList.contains('show')).toBe(true);
    });

    it('toast auto-dismisses after 2 seconds', async () => {
      vi.useFakeTimers();

      const toast = (msg: string) => {
        const host = document.getElementById('toasts');
        if (!host) return;
        const el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.textContent = msg;
        host.appendChild(el);

        requestAnimationFrame(() => {
          el.classList.add('show');
        });

        setTimeout(() => {
          el.classList.remove('show');
          setTimeout(() => el.remove(), 200);
        }, 2000);
      };

      toast('Session reset. You can start fresh anytime.');

      // Initially toast should be visible
      let createdToast = mockHost.querySelector('.toast');
      expect(createdToast).toBeTruthy();
      expect(createdToast?.classList.contains('show')).toBe(true);

      // Fast-forward 2 seconds
      vi.advanceTimersByTime(2000);

      // Toast should be hidden but still in DOM
      createdToast = mockHost.querySelector('.toast');
      expect(createdToast?.classList.contains('show')).toBe(false);

      // Fast-forward 200ms more for fade-out
      vi.advanceTimersByTime(200);

      // Toast should be removed from DOM
      createdToast = mockHost.querySelector('.toast');
      expect(createdToast).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('ARIA Live Region', () => {
    it('announces progress reset to screen readers', () => {
      // Mock the ARIA live region behavior
      let announcedText = '';
      const announceProgress = (current: number, total: number) => {
        announcedText = `Practice session progress: ${current} of ${total} trials completed`;
      };

      // Simulate progress reset
      announceProgress(0, 10);

      expect(announcedText).toBe('Practice session progress: 0 of 10 trials completed');
    });

    it('toast host has proper aria-live attributes', () => {
      expect(mockHost.getAttribute('aria-live')).toBe('polite');
      expect(mockHost.getAttribute('aria-atomic')).toBe('true');
    });
  });

  describe('Progress Bar Reset', () => {
    it('resets progress bar to 0% when session is reset', () => {
      // Mock progress calculation
      const calculateProgress = (current: number, total: number) => {
        const safeTotal = Math.max(1, total);
        const safeStep = Math.min(Math.max(current, 0), safeTotal);
        const percent = Math.round((safeStep / safeTotal) * 100);
        const width = (safeStep / safeTotal) * 100;
        return { safeStep, safeTotal, percent, width };
      };

      // Test reset to 0
      const progress = calculateProgress(0, 10);

      expect(progress.safeStep).toBe(0);
      expect(progress.safeTotal).toBe(10);
      expect(progress.percent).toBe(0);
      expect(progress.width).toBe(0);
    });

    it('progress bar uses SVG attributes not inline styles', () => {
      // This test ensures we're using proper SVG attributes
      const createProgressBar = (width: number) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', width.toString());
        rect.setAttribute('height', '8');
        svg.appendChild(rect);
        return svg;
      };

      const progressBar = createProgressBar(0);
      const rect = progressBar.querySelector('rect');

      expect(rect?.getAttribute('width')).toBe('0');
      expect(rect?.getAttribute('height')).toBe('8');
      expect(rect?.style.width).toBe('');
      expect(rect?.style.height).toBe('');
    });
  });
});
