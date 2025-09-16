export {};
declare global {
  interface Window {
    showMicPrimer?: () => Promise<boolean>;
    __events?: any[];
    __resetSessionProgress?: () => void;
    __getSessionProgress?: () => import('../../src/sessionProgress').SessionProgressEvent[];
    __trackSessionProgress?: (
      stepCount: number,
      totalSteps: number
    ) => import('../../src/sessionProgress').SessionProgressEvent;
  }
}
