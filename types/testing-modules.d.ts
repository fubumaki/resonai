declare module "@axe-core/playwright" {
  interface AxeBuilderOptions {
    page?: unknown;
  }

  export default class AxeBuilder {
    constructor(options?: AxeBuilderOptions);
    analyze(): Promise<{ violations: unknown[] }>;
  }
}

declare module "@testing-library/react" {
  export const render: (...args: any[]) => any;
  export const screen: Record<string, any>;
  export const fireEvent: any;
  const testingLibraryReact: {
    render: typeof render;
    screen: typeof screen;
    fireEvent: typeof fireEvent;
  };
  export default testingLibraryReact;
}
