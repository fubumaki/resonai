import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

type RawKeyTask = Record<string, unknown>;

type TaskOverlapStatus =
  | { status: "new" }
  | { status: "match"; line: number; similarity: number; title: string }
  | { status: "needs_review"; line: number; similarity: number; title: string };

type KeyTask = {
  title: string;
  priority: string;
  theme: string;
  summary?: string;
  notes?: string;
  sourceFile: string;
  overlap: TaskOverlapStatus;
  extra: Record<string, unknown>;
};

type ExistingTask = {
  title: string;
  normalized: string;
  line: number;
};

const ROOT = process.cwd();
const RESEARCH_SUMMARIES_DIR = path.join(ROOT, "docs", "research-summaries");
const OUTPUT_DIR = path.join(ROOT, "docs", "research-synthesis");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "master-backlog.md");
const TASKS_FILE = path.join(ROOT, "TASKS.md");

const PRIORITY_ORDER = [
  "P0",
  "P0.5",
  "P0.6",
  "P1",
  "P1.5",
  "P2",
  "P3",
  "P4",
];

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/\((done|wip|blocked)\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

async function loadExistingTasks(): Promise<ExistingTask[]> {
  let content: string;
  try {
    content = await fs.readFile(TASKS_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const lines = content.split(/\r?\n/);
  const tasks: ExistingTask[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^-\s+\[[^\]]+\]\s*(.+)$/);
    if (match) {
      const title = match[1].trim();
      const cleanedTitle = title.replace(/\s*\(done\)$/i, "");
      tasks.push({
        title,
        normalized: normalizeForComparison(cleanedTitle),
        line: index + 1,
      });
    }
  }

  return tasks;
}

function detectOverlap(title: string, existing: ExistingTask[]): TaskOverlapStatus {
  if (existing.length === 0) {
    return { status: "new" };
  }

  const normalized = normalizeForComparison(title);
  let best: ExistingTask | undefined;
  let bestScore = 0;

  for (const task of existing) {
    if (!task.normalized) continue;
    const score = similarityScore(normalized, task.normalized);
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }

  if (!best) {
    return { status: "new" };
  }

  if (bestScore >= 0.85) {
    return {
      status: "match",
      line: best.line,
      similarity: bestScore,
      title: best.title,
    };
  }

  if (bestScore >= 0.65) {
    return {
      status: "needs_review",
      line: best.line,
      similarity: bestScore,
      title: best.title,
    };
  }

  return { status: "new" };
}

function parseFrontMatter(markdown: string): RawKeyTask[] | undefined {
  const frontMatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!frontMatterMatch) {
    return undefined;
  }

  try {
    const data = parseYaml(frontMatterMatch[1]) as Record<string, unknown>;
    if (!data || typeof data !== "object") {
      return undefined;
    }
    const tasks = (data.key_tasks ?? data.keyTasks) as unknown;
    if (Array.isArray(tasks)) {
      return tasks as RawKeyTask[];
    }
  } catch (error) {
    console.warn("Failed to parse front matter", error);
  }

  return undefined;
}

function parseKeyTasksFromCodeBlocks(markdown: string): RawKeyTask[] {
  const results: RawKeyTask[] = [];
  const regex = /```(json|yaml|yml)\s+key_tasks\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const [, lang, block] = match;
    try {
      if (lang.toLowerCase() === "json") {
        const parsed = JSON.parse(block) as unknown;
        if (Array.isArray(parsed)) {
          results.push(...(parsed as RawKeyTask[]));
        }
      } else {
        const parsed = parseYaml(block) as unknown;
        if (Array.isArray(parsed)) {
          results.push(...(parsed as RawKeyTask[]));
        }
      }
    } catch (error) {
      console.warn(`Failed to parse key_tasks code block (${lang})`, error);
    }
  }

  return results;
}

function ensureString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function toKeyTask(
  raw: RawKeyTask,
  sourceFile: string,
  existingTasks: ExistingTask[],
): KeyTask | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const title = ensureString(raw.title) ?? ensureString((raw as Record<string, unknown>).name);
  if (!title) {
    return undefined;
  }

  const priority = ensureString(raw.priority) ?? "Unspecified";
  const theme = ensureString(raw.theme) ?? "General";
  const summary = ensureString(raw.summary ?? raw.description);
  const notes = ensureString(raw.notes ?? raw.rationale);

  const { title: _ignoredTitle, priority: _ignoredPriority, theme: _ignoredTheme, summary: _ignoredSummary, notes: _ignoredNotes, description: _ignoredDescription, rationale: _ignoredRationale, ...rest } = raw;

  const extra = Object.fromEntries(
    Object.entries(rest).filter(([key, value]) => value !== undefined),
  );

  const overlap = detectOverlap(title, existingTasks);

  return {
    title,
    priority,
    theme,
    summary,
    notes,
    sourceFile,
    overlap,
    extra,
  };
}

async function collectKeyTasks(existingTasks: ExistingTask[]): Promise<KeyTask[]> {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(RESEARCH_SUMMARIES_DIR, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const tasks: KeyTask[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const filePath = path.join(RESEARCH_SUMMARIES_DIR, entry.name);
    const content = await fs.readFile(filePath, "utf8");

    const rawTasks: RawKeyTask[] = [];

    const fromFrontMatter = parseFrontMatter(content);
    if (fromFrontMatter) {
      rawTasks.push(...fromFrontMatter);
    }

    rawTasks.push(...parseKeyTasksFromCodeBlocks(content));

    if (rawTasks.length === 0) {
      continue;
    }

    for (const raw of rawTasks) {
      const parsed = toKeyTask(raw, path.relative(ROOT, filePath), existingTasks);
      if (parsed) {
        tasks.push(parsed);
      }
    }
  }

  return tasks;
}

function getPriorityRank(priority: string): number {
  const normalized = priority.trim().toUpperCase();
  const index = PRIORITY_ORDER.indexOf(normalized);
  if (index >= 0) {
    return index;
  }

  const numericMatch = normalized.match(/^P?([0-9]+(?:\.[0-9]+)?)$/);
  if (numericMatch) {
    return PRIORITY_ORDER.length + parseFloat(numericMatch[1]);
  }

  return PRIORITY_ORDER.length + 100;
}

function formatOverlap(overlap: TaskOverlapStatus): string {
  if (overlap.status === "new") {
    return "new";
  }

  const percentage = Math.round(overlap.similarity * 100);
  if (overlap.status === "match") {
    return `matches TASKS.md line ${overlap.line} (${percentage}% similar to "${overlap.title}")`;
  }

  return `needs review — closest TASKS.md line ${overlap.line} (${percentage}% similar to "${overlap.title}")`;
}

function formatExtraDetails(extra: Record<string, unknown>): string[] {
  return Object.entries(extra).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: ${value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(", ")}`;
    }
    if (typeof value === "object" && value !== null) {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${String(value)}`;
  });
}

function groupTasks(tasks: KeyTask[]): string {
  const lines: string[] = [];

  lines.push("# Research Master Backlog");
  lines.push("");
  lines.push(
    "> **Contributor Notes:** Codex-Cloud prepares this backlog draft from `docs/research-summaries/`. After review, a human teammate updates `TASKS.md` manually so it remains the canonical source of truth.",
  );
  lines.push("");

  if (tasks.length === 0) {
    lines.push("_No key tasks found in research summaries._");
    lines.push("");
    return lines.join("\n");
  }

  const grouped = new Map<string, Map<string, KeyTask[]>>();

  for (const task of tasks) {
    const priorityKey = task.priority || "Unspecified";
    const themeKey = task.theme || "General";
    if (!grouped.has(priorityKey)) {
      grouped.set(priorityKey, new Map());
    }
    const themeMap = grouped.get(priorityKey)!;
    if (!themeMap.has(themeKey)) {
      themeMap.set(themeKey, []);
    }
    themeMap.get(themeKey)!.push(task);
  }

  const sortedPriorities = Array.from(grouped.keys()).sort((a, b) => {
    const rankDifference = getPriorityRank(a) - getPriorityRank(b);
    if (rankDifference !== 0) {
      return rankDifference;
    }
    return a.localeCompare(b);
  });

  for (const priority of sortedPriorities) {
    lines.push(`## Priority ${priority}`);
    const themeMap = grouped.get(priority)!;
    const themes = Array.from(themeMap.keys()).sort((a, b) => a.localeCompare(b));
    for (const theme of themes) {
      lines.push("");
      lines.push(`### Theme: ${theme}`);
      const tasksForTheme = themeMap.get(theme)!;
      tasksForTheme.sort((a, b) => a.title.localeCompare(b.title));
      for (const task of tasksForTheme) {
        const summaryPart = task.summary ? ` — ${task.summary}` : "";
        lines.push(`- **${task.title}**${summaryPart}`);
        lines.push(`  - Status: ${formatOverlap(task.overlap)}`);
        lines.push(`  - Source: ${task.sourceFile}`);
        if (task.notes) {
          lines.push(`  - Notes: ${task.notes}`);
        }
        const extraDetails = formatExtraDetails(task.extra);
        for (const detail of extraDetails) {
          lines.push(`  - ${detail}`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  const existingTasks = await loadExistingTasks();
  const keyTasks = await collectKeyTasks(existingTasks);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const backlogMarkdown = groupTasks(keyTasks);
  await fs.writeFile(OUTPUT_FILE, backlogMarkdown, "utf8");
  console.log(`Backlog written to ${path.relative(ROOT, OUTPUT_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
