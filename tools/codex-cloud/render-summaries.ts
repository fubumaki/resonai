import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildFrontMatter, renderSummaryMarkdown, type Manifest } from "./render-summary";

export type BatchRenderOptions = {
  outDir: string;
  dryRun?: boolean;
  overwrite?: boolean;
};

export type RenderedSummary = {
  slug: string;
  markdown: string;
  outputPath: string;
};

const DEFAULT_OUT_DIR = path.resolve("docs", "research-summaries");

const HELP_TEXT = `Batch render Codex Cloud research summaries into Markdown.

Usage:
  tsx tools/codex-cloud/render-summaries.ts --input <manifest.json> [options]

Recommended workflow:
  pnpm codex:render-batch <manifest.json>

Options:
  --input <path>      Path to JSON file containing an array of manifest entries.
  --out-dir <path>    Directory to write Markdown summaries. Defaults to docs/research-summaries.
  --dry-run           Print the target filenames without writing any files.
  --overwrite         Allow overwriting existing Markdown summaries.
  --help              Show this help message.`;

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.access(candidate);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function extractSlug(manifest: Manifest, frontMatter: Record<string, unknown>, index: number): string {
  const candidate = frontMatter.slug ?? manifest.slug;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  throw new Error(`Manifest at index ${index} is missing a slug.`);
}

function assertManifest(value: unknown, index: number): asserts value is Manifest {
  if (!value || typeof value !== "object") {
    throw new Error(`Expected manifest entry at index ${index} to be an object.`);
  }
}

export async function renderSummariesFromManifests(
  manifests: Manifest[],
  options: BatchRenderOptions,
): Promise<RenderedSummary[]> {
  const { dryRun = false, overwrite = false } = options;
  const outDir = path.resolve(options.outDir);
  const seenSlugs = new Set<string>();
  const results: RenderedSummary[] = [];

  for (let index = 0; index < manifests.length; index += 1) {
    const manifest = manifests[index];
    assertManifest(manifest, index);

    const frontMatter = buildFrontMatter(manifest);
    const slug = extractSlug(manifest, frontMatter, index);

    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate slug detected: ${slug}`);
    }
    seenSlugs.add(slug);

    const outputPath = path.join(outDir, `${slug}.md`);

    if (!overwrite && (await pathExists(outputPath))) {
      throw new Error(
        `Output file already exists at ${outputPath}. Pass --overwrite to replace it.`,
      );
    }

    const markdown = renderSummaryMarkdown(manifest);
    results.push({ slug, markdown, outputPath });
  }

  if (dryRun) {
    return results;
  }

  await fs.mkdir(outDir, { recursive: true });
  await Promise.all(
    results.map(async ({ outputPath, markdown }) => {
      await fs.writeFile(outputPath, markdown, "utf8");
    }),
  );

  return results;
}

export async function renderSummariesFromFile(
  manifestListPath: string,
  options: BatchRenderOptions,
): Promise<RenderedSummary[]> {
  const absoluteInputPath = path.resolve(manifestListPath);
  let raw: string;

  try {
    raw = await fs.readFile(absoluteInputPath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read manifest list at ${absoluteInputPath}: ${(error as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(
      `Failed to parse manifest list at ${absoluteInputPath}: ${(error as Error).message}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected manifest list at ${absoluteInputPath} to be an array.`);
  }

  return renderSummariesFromManifests(parsed as Manifest[], options);
}

type ParsedArgs = {
  input?: string;
  outDir?: string;
  dryRun: boolean;
  overwrite: boolean;
  help: boolean;
  errors: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const parsed: ParsedArgs = {
    dryRun: false,
    overwrite: false,
    help: false,
    errors: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--overwrite":
        parsed.overwrite = true;
        break;
      case "--input": {
        const value = args[index + 1];
        if (!value || value.startsWith("--")) {
          parsed.errors.push("--input requires a file path.");
        } else {
          parsed.input = value;
          index += 1;
        }
        break;
      }
      case "--out-dir": {
        const value = args[index + 1];
        if (!value || value.startsWith("--")) {
          parsed.errors.push("--out-dir requires a directory path.");
        } else {
          parsed.outDir = value;
          index += 1;
        }
        break;
      }
      default:
        parsed.errors.push(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

async function runCli(): Promise<void> {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    console.log(HELP_TEXT);
    return;
  }

  if (!parsed.input) {
    parsed.errors.push("Missing required --input <manifest.json> argument.");
  }

  if (parsed.errors.length > 0) {
    for (const message of parsed.errors) {
      console.error(message);
    }
    console.error("");
    console.error(HELP_TEXT);
    process.exitCode = 1;
    return;
  }

  const outDir = parsed.outDir ? path.resolve(parsed.outDir) : DEFAULT_OUT_DIR;

  try {
    const results = await renderSummariesFromFile(parsed.input!, {
      outDir,
      dryRun: parsed.dryRun,
      overwrite: parsed.overwrite,
    });

    for (const result of results) {
      if (parsed.dryRun) {
        console.log(`Would write ${result.outputPath}`);
      } else {
        console.log(`Wrote ${result.outputPath}`);
      }
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli();
}
