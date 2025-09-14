export {};
declare global {
  interface Window {
    showMicPrimer?: () => Promise<boolean>;
    __events?: any[];
  }
}
