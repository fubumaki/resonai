/**
 * Generate a Codex Cloud manifest of research and governance documents.
 *
 * Usage:
 *   pnpm codex:manifest [--out <file>] [--filter <glob>]
 *
 * Wrap glob patterns in quotes when invoking from a shell to avoid premature
 * expansion (for example: `pnpm codex:manifest --filter "docs/**"`).
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import fg from "fast-glob";

type ManifestRecord = {
  absolutePath: string;
  relativePath: string;
  mtime: string;
  size: number;
  docType: string;
};

type CliOptions = {
  outPath?: string;
  filter?: string;
};

const ROOT_DIR = process.cwd();
const SEARCH_PATTERNS = [
  "docs/**/*",
  "reports/**/*",
  "flow/**/*",
  "labs/**/*",
  "coach/**/*",
  "*.md",
  "*.txt",
];

const DIRECTORY_HINTS: Array<{ prefix: string; docType: string }> = [
  { prefix: "docs/research-summaries", docType: "research" },
  { prefix: "docs/research-synthesis", docType: "research" },
  { prefix: "docs/design-guidelines", docType: "design" },
  { prefix: "docs/audit", docType: "audit" },
  { prefix: "docs/technical", docType: "technical" },
  { prefix: "docs", docType: "documentation" },
  { prefix: "reports", docType: "report" },
  { prefix: "flow", docType: "workflow" },
  { prefix: "labs", docType: "experiment" },
  { prefix: "coach", docType: "coaching" },
];

const KEYWORD_HINTS: Array<{ pattern: RegExp; docType: string }> = [
  { pattern: /runbook/, docType: "runbook" },
  { pattern: /playbook/, docType: "playbook" },
  { pattern: /roadmap|backlog|vision|strategy|plan|milestone/, docType: "roadmap" },
  { pattern: /audit|a11y|privacy|security|compliance|risk/, docType: "audit" },
  { pattern: /design|ux|ui|figma|style/, docType: "design" },
  { pattern: /research|study|discovery|analysis/, docType: "research" },
  { pattern: /summary|report|synthesis|review|retrospective/, docType: "report" },
  { pattern: /flow|journey|workflow/, docType: "workflow" },
  { pattern: /policy|standard|procedure/, docType: "policy" },
  { pattern: /qa|quality|test|testing/, docType: "qa" },
  { pattern: /changelog/, docType: "changelog" },
  { pattern: /readme|getting-started|introduction/, docType: "guide" },
  { pattern: /coach/, docType: "coaching" },
  { pattern: /lab|experiment/, docType: "experiment" },
];

function printUsage(): void {
  process.stderr.write(
    "Usage: pnpm codex:manifest [--out <file>] [--filter <glob>]" + "\n",
  );
}

function resolveOutputPath(value: string): string {
  if (!value) {
    throw new Error("Missing value for --out");
  }
  return path.isAbsolute(value) ? value : path.resolve(ROOT_DIR, value);
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected value after --out");
      }
      options.outPath = resolveOutputPath(value);
      index += 1;
      continue;
    }

    if (arg === "--filter") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected value after --filter");
      }
      options.filter = value;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function inferDocType(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();

  for (const { prefix, docType } of DIRECTORY_HINTS) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return docType;
    }
  }

  for (const { pattern, docType } of KEYWORD_HINTS) {
    if (pattern.test(normalized)) {
      return docType;
    }
  }

  return "general";
}

async function collectCandidateFiles(filter?: string): Promise<string[]> {
  const matches = await fg(SEARCH_PATTERNS, {
    cwd: ROOT_DIR,
    onlyFiles: true,
    absolute: true,
    dot: true,
    followSymbolicLinks: false,
    unique: true,
  });

  if (!filter) {
    return matches;
  }

  const filteredMatches = await fg(filter, {
    cwd: ROOT_DIR,
    onlyFiles: true,
    absolute: true,
    dot: true,
    followSymbolicLinks: false,
    unique: true,
  });
  const allowed = new Set(filteredMatches.map((file) => path.resolve(file)));

  return matches.filter((file) => allowed.has(path.resolve(file)));
}

async function buildManifestRecords(files: string[]): Promise<ManifestRecord[]> {
  const records: ManifestRecord[] = [];

  for (const absolutePath of files) {
    const stats = await fs.stat(absolutePath);
    const relativePath = path
      .relative(ROOT_DIR, absolutePath)
      .split(path.sep)
      .join("/");

    records.push({
      absolutePath,
      relativePath,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      docType: inferDocType(relativePath),
    });
  }

  records.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return records;
}

async function writeOutput(records: ManifestRecord[], outPath?: string): Promise<void> {
  const lines = records.map((record) => JSON.stringify(record));
  const output = lines.join("\n") + (lines.length > 0 ? "\n" : "");

  if (!outPath) {
    process.stdout.write(output);
    return;
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, output, "utf8");
}

async function main(): Promise<void> {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const files = await collectCandidateFiles(options.filter);
    const records = await buildManifestRecords(files);
    await writeOutput(records, options.outPath);
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
    }
    printUsage();
    process.exit(1);
  }
}

void main();
