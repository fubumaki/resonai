import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { stringify as stringifyYaml } from "yaml";

type MetadataRecord = Record<string, unknown>;

type ManifestNode = {
  metadata?: MetadataRecord | null;
  sections?: ManifestNode[];
  sources?: ManifestNode[];
  records?: ManifestNode[];
  items?: ManifestNode[];
  children?: ManifestNode[];
  nodes?: ManifestNode[];
  blocks?: ManifestNode[];
  entries?: ManifestNode[];
  steps?: ManifestNode[];
  parts?: ManifestNode[];
  [key: string]: unknown;
};

export type Manifest = ManifestNode & {
  title?: string;
  slug?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const CHILD_NODE_KEYS = [
  "sources",
  "sections",
  "records",
  "items",
  "children",
  "nodes",
  "blocks",
  "entries",
  "steps",
  "parts",
] as const;

function isManifestNode(value: unknown): value is ManifestNode {
  if (!isObject(value)) {
    return false;
  }

  if ("metadata" in value && isObject((value as ManifestNode).metadata)) {
    return true;
  }

  const candidate = value as Record<string, unknown>;
  return CHILD_NODE_KEYS.some((key) => Array.isArray(candidate[key]));
}

function isMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

export function collectSources(manifest: ManifestNode): MetadataRecord[] {
  const queue: ManifestNode[] = [];
  const metadataRecords: MetadataRecord[] = [];

  if (!isManifestNode(manifest)) {
    return metadataRecords;
  }

  queue.push(manifest);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (isObject(current.metadata)) {
      metadataRecords.push(current.metadata);
    }

    for (const key of CHILD_NODE_KEYS) {
      const value = current[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isManifestNode(item)) {
            queue.push(item);
          }
        }
      }
    }
  }

  return metadataRecords;
}

export function buildFrontMatter(manifest: Manifest): Record<string, unknown> {
  const frontMatter: Record<string, unknown> = {};
  const metadataRecords = collectSources(manifest);

  for (const record of metadataRecords) {
    if (!isObject(record)) continue;

    for (const [key, value] of Object.entries(record)) {
      if (!isMeaningfulValue(value)) continue;

      if (!(key in frontMatter)) {
        frontMatter[key] = value;
        continue;
      }

      const existing = frontMatter[key];

      if (Array.isArray(existing) && Array.isArray(value)) {
        frontMatter[key] = existing.concat(value);
      } else if (isObject(existing) && isObject(value)) {
        frontMatter[key] = { ...existing, ...value };
      }
    }
  }

  if (!("title" in frontMatter) && typeof manifest.title === "string" && manifest.title.trim()) {
    frontMatter.title = manifest.title.trim();
  }

  if (!("slug" in frontMatter) && typeof manifest.slug === "string" && manifest.slug.trim()) {
    frontMatter.slug = manifest.slug.trim();
  }

  return frontMatter;
}

export function renderSummaryMarkdown(manifest: Manifest): string {
  const frontMatter = buildFrontMatter(manifest);
  const yaml = stringifyYaml(frontMatter, { lineWidth: 0 }).trimEnd();
  const frontMatterBlock = `---\n${yaml}\n---`;

  const title = typeof manifest.title === "string" && manifest.title.trim()
    ? manifest.title.trim()
    : typeof frontMatter.title === "string"
      ? (frontMatter.title as string)
      : undefined;

  const bodyLines: string[] = [];
  if (title) {
    bodyLines.push(`# ${title}`);
    bodyLines.push("");
  }

  return `${frontMatterBlock}\n\n${bodyLines.join("\n")}`.trimEnd() + "\n";
}

export async function renderSummaryFromFile(
  manifestPath: string,
  outputPath?: string,
): Promise<string> {
  const absoluteManifestPath = path.resolve(manifestPath);
  const raw = await fs.readFile(absoluteManifestPath, "utf8");
  let manifest: Manifest;

  try {
    manifest = JSON.parse(raw) as Manifest;
  } catch (error) {
    throw new Error(`Failed to parse manifest at ${absoluteManifestPath}: ${(error as Error).message}`);
  }

  const markdown = renderSummaryMarkdown(manifest);

  if (outputPath) {
    const absoluteOutputPath = path.resolve(outputPath);
    await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await fs.writeFile(absoluteOutputPath, markdown, "utf8");
  }

  return markdown;
}

async function runCli(): Promise<void> {
  const [, , manifestPath, outputPath] = process.argv;

  if (!manifestPath) {
    console.error("Usage: tsx tools/codex-cloud/render-summary.ts <manifest> [output]");
    process.exitCode = 1;
    return;
  }

  try {
    const markdown = await renderSummaryFromFile(manifestPath, outputPath);
    if (!outputPath) {
      process.stdout.write(markdown);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli();
}
