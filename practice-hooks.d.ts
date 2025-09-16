export {};

declare global {
  interface PracticeHooksState {
    ready?: boolean;
    progress?: number;
    totalSteps?: number;
    announcementPrefix?: string;
  }

  interface Window {
    __practiceHooksState?: PracticeHooksState;
    __setPracticeReady?: (value: boolean) => void;
    __setPracticeProgress?: (
      value: number,
      options?: { totalSteps?: number; announcementPrefix?: string }
    ) => void;
    getPracticeHooksState?: () => PracticeHooksState;
    readInitialPracticeReady?: () => boolean | undefined;
    readInitialPracticeProgress?: () => number | undefined;
  }
}
