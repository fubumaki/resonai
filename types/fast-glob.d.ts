declare module "fast-glob" {
  export type FastGlobOptions = {
    cwd?: string;
    onlyFiles?: boolean;
    absolute?: boolean;
    dot?: boolean;
    followSymbolicLinks?: boolean;
    unique?: boolean;
    suppressErrors?: boolean;
    throwErrorOnBrokenSymbolicLink?: boolean;
    stats?: boolean;
    objectMode?: boolean;
    deep?: number;
    ignore?: readonly string[];
    markDirectories?: boolean;
    braceExpansion?: boolean;
    caseSensitiveMatch?: boolean;
    extglob?: boolean;
    globstar?: boolean;
    [key: string]: unknown;
  };

  export type FastGlobPattern = string | readonly string[];

  export default function fastGlob(
    source: FastGlobPattern,
    options?: FastGlobOptions,
  ): Promise<string[]>;

  export function sync(
    source: FastGlobPattern,
    options?: FastGlobOptions,
  ): string[];
}
