import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SECTION_KEYS = ['summary', 'key_tasks', 'design_guidelines', 'technical_notes'] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

interface ManifestItem {
  index: number;
  record: Record<string, unknown>;
  slug: string;
  docPath: string;
}

interface DocumentExtraction {
  title?: string;
  sections: Partial<Record<SectionKey, string>>;
}

interface FrontmatterData {
  title: string;
  summary: string;
  key_tasks: string;
  design_guidelines: string;
  technical_notes: string;
}

const SECTION_FIELD_ALIASES: Record<SectionKey, string[]> = {
  summary: ['summary', 'overview', 'tldr', 'executivesummary'],
  key_tasks: ['key_tasks', 'keytasks', 'tasks', 'actionitems', 'prioritizedtasks'],
  design_guidelines: ['design_guidelines', 'designguidelines', 'guidelines', 'uxguidelines', 'designnotes'],
  technical_notes: ['technical_notes', 'technicalnotes', 'technotes', 'engineeringnotes', 'implementationnotes'],
};

const TITLE_ALIASES = ['title', 'name', 'heading', 'label'];
const MANIFEST_ENTRY_KEYS = ['summaries', 'entries', 'items', 'documents'];
const PRIORITY_LEVELS = new Set(['critical', 'high', 'medium', 'low']);

const lookupCache = new WeakMap<Record<string, unknown>, Map<string, unknown>>();

function sanitizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLookup(obj: Record<string, unknown>): Map<string, unknown> {
  const existing = lookupCache.get(obj);
  if (existing) {
    return existing;
  }
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(obj)) {
    const normalized = sanitizeKey(key);
    if (!map.has(normalized)) {
      map.set(normalized, value);
    }
  }
  lookupCache.set(obj, map);
  return map;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getValueFromObject(obj: Record<string, unknown>, keys: string[]): unknown {
  const lookup = getLookup(obj);
  for (const key of keys) {
    const normalized = sanitizeKey(key);
    if (!normalized) continue;
    if (lookup.has(normalized)) {
      return lookup.get(normalized);
    }
  }
  return undefined;
}

function normalizeFieldValue(input: unknown): string | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (typeof input === 'string') {
    const normalized = input.replace(/\r\n/g, '\n');
    return normalized.trim().length === 0 ? undefined : normalized;
  }
  if (Array.isArray(input)) {
    const parts = input
      .map(part => {
        if (typeof part === 'string') return part;
        if (part === null || part === undefined) return '';
        return String(part);
      })
      .map(part => part.replace(/\r\n/g, '\n'))
      .filter(part => part.trim().length > 0);
    if (parts.length === 0) return undefined;
    return parts.join('\n');
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }
  return undefined;
}

function collectSources(record: Record<string, unknown>): {
  directSources: Record<string, unknown>[];
  sectionSources: Record<string, unknown>[];
} {
  const directSources: Record<string, unknown>[] = [];
  const sectionSources: Record<string, unknown>[] = [];

  const seen = new Set<Record<string, unknown>>();
  const sectionSeen = new Set<Record<string, unknown>>();
  const queue: Record<string, unknown>[] = [];

  const pushDirect = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        pushDirect(item);
      }
      return;
    }
    if (isRecord(value) && !seen.has(value)) {
      seen.add(value);
      directSources.push(value);
      queue.push(value);
    }
  };

  const pushSection = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        pushSection(entry);
      }
      return;
    }
    if (isRecord(value) && !sectionSeen.has(value)) {
      sectionSeen.add(value);
      sectionSources.push(value);
    }
  };

  pushDirect(record);

  const METADATA_KEYS = ['metadata', 'meta', 'data', 'details'];
  const SECTION_KEY_CANDIDATES = ['sections', 'section'];

  while (queue.length > 0) {
    const source = queue.shift()!;
    for (const key of METADATA_KEYS) {
      const candidate = getValueFromObject(source, [key]);
      if (candidate !== undefined) {
        pushDirect(candidate);
      }
    }
    for (const sectionKey of SECTION_KEY_CANDIDATES) {
      const candidate = getValueFromObject(source, [sectionKey]);
      if (candidate !== undefined) {
        pushSection(candidate);
      }
    }
  }

  return { directSources, sectionSources };
}

function pickFromSources(sources: Record<string, unknown>[], keys: string[]): string | undefined {
  for (const source of sources) {
    const value = getValueFromObject(source, keys);
    const normalized = normalizeFieldValue(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }
  return undefined;
}

function slugToTitle(slug: string): string {
  return slug
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function trimLines(lines: string[]): string | undefined {
  if (lines.length === 0) {
    return undefined;
  }
  let start = 0;
  let end = lines.length - 1;
  while (start <= end && lines[start].trim() === '') start++;
  while (end >= start && lines[end].trim() === '') end--;
  if (start > end) {
    return undefined;
  }
  return lines.slice(start, end + 1).join('\n');
}

function canonicalSectionForHeading(heading: string): SectionKey | null {
  const normalized = heading.toLowerCase().replace(/[^a-z]/g, '');
  if (['summary', 'overview', 'executivesummary', 'tldr'].includes(normalized)) {
    return 'summary';
  }
  if (['keytasks', 'keytask', 'tasks', 'actionitems', 'prioritizedtasks'].includes(normalized)) {
    return 'key_tasks';
  }
  if (['designguidelines', 'designnotes', 'guidelines', 'uxguidelines'].includes(normalized)) {
    return 'design_guidelines';
  }
  if (['technicalnotes', 'technotes', 'engineeringnotes', 'implementationnotes'].includes(normalized)) {
    return 'technical_notes';
  }
  return null;
}

function parseDocument(markdown: string): DocumentExtraction {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const buffers: Record<SectionKey, string[]> = {
    summary: [],
    key_tasks: [],
    design_guidelines: [],
    technical_notes: [],
  };
  let currentKey: SectionKey | null = null;
  let title: string | undefined;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      if (level === 1) {
        if (!title) {
          title = headingText;
        }
        currentKey = null;
        continue;
      }
      const sectionKey = canonicalSectionForHeading(headingText);
      if (sectionKey) {
        currentKey = sectionKey;
        buffers[sectionKey] = [];
        continue;
      }
      if (currentKey) {
        buffers[currentKey].push(line);
        continue;
      }
      currentKey = null;
      continue;
    }
    if (currentKey) {
      buffers[currentKey].push(line);
    }
  }

  const sections: Partial<Record<SectionKey, string>> = {};
  for (const key of SECTION_KEYS) {
    const content = trimLines(buffers[key]);
    if (content !== undefined) {
      sections[key] = content;
    }
  }

  return { title, sections };
}

function normalizePriorityTags(text: string): string {
  if (!text) {
    return text;
  }
  const capitalize = (value: string) => {
    const lower = value.toLowerCase();
    if (!PRIORITY_LEVELS.has(lower)) return value;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  let output = text;

  output = output.replace(/\[(?:priority\s*[:\-–]\s*)?(critical|high|medium|low)\]/gi, (_match, level: string) => {
    return `[${capitalize(level)}]`;
  });

  output = output.replace(/priority\s*[:\-–]\s*(critical|high|medium|low)/gi, (_match, level: string) => {
    return `Priority: ${capitalize(level)}`;
  });

  output = output.replace(/\b(critical|high|medium|low)\s+priority\b/gi, (_match, level: string) => {
    return `${capitalize(level)} priority`;
  });

  return output;
}

function normalizeMultiline(value: string): string {
  if (!value) {
    return '';
  }
  const normalized = value.replace(/\r\n/g, '\n');
  const trimmed = trimLines(normalized.split('\n')) ?? '';
  return normalizePriorityTags(trimmed);
}

function normalizeTitle(value: string, fallback: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) {
    return fallback;
  }
  return normalizePriorityTags(cleaned);
}

function formatMultilineField(key: SectionKey, value: string): string {
  if (!value) {
    return `${key}: ""`;
  }
  const lines = value.split('\n').map(line => `  ${line}`);
  return `${key}: |\n${lines.join('\n')}`;
}

function escapeYamlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFrontmatter(data: FrontmatterData): string {
  const parts: string[] = ['---'];
  parts.push(`title: "${escapeYamlString(data.title)}"`);
  for (const key of SECTION_KEYS) {
    const value = data[key];
    parts.push(formatMultilineField(key, value));
  }
  parts.push('---', '');
  return parts.join('\n');
}

function parseManifestEntries(obj: unknown): ManifestItem[] {
  let entries: unknown[] | undefined;
  if (Array.isArray(obj)) {
    entries = obj;
  } else if (isRecord(obj)) {
    for (const key of MANIFEST_ENTRY_KEYS) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) {
        entries = candidate;
        break;
      }
    }
  }

  if (!entries) {
    throw new Error('Manifest must be an array or contain one of: summaries, entries, items, documents');
  }

  return entries.map((raw, index) => parseManifestEntry(raw, index));
}

function parseManifestEntry(raw: unknown, index: number): ManifestItem {
  if (!isRecord(raw)) {
    throw new Error(`Manifest entry at index ${index} must be an object`);
  }
  const slug = getValueFromObject(raw, ['slug', 'id']);
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    throw new Error(`Manifest entry at index ${index} is missing a slug`);
  }
  const docPath = getValueFromObject(raw, ['docpath', 'doc', 'document', 'source', 'path']);
  if (typeof docPath !== 'string' || docPath.trim().length === 0) {
    throw new Error(`Manifest entry "${slug}" is missing a document path`);
  }
  return {
    index,
    record: raw,
    slug: slug.trim(),
    docPath: docPath.trim(),
  };
}

async function renderEntry(item: ManifestItem, manifestDir: string, outputRoot: string): Promise<void> {
  const absoluteDocPath = path.isAbsolute(item.docPath)
    ? item.docPath
    : path.resolve(manifestDir, item.docPath);
  let docContent: string;
  try {
    docContent = await readFile(absoluteDocPath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read document for "${item.slug}" at ${absoluteDocPath}: ${message}`);
  }

  const extracted = parseDocument(docContent);
  const { directSources, sectionSources } = collectSources(item.record);

  const titleSource = pickFromSources(directSources, TITLE_ALIASES) ?? extracted.title ?? slugToTitle(item.slug);
  const summarySource =
    pickFromSources(sectionSources, SECTION_FIELD_ALIASES.summary) ??
    pickFromSources(directSources, SECTION_FIELD_ALIASES.summary) ??
    extracted.sections.summary ??
    '';
  const keyTasksSource =
    pickFromSources(sectionSources, SECTION_FIELD_ALIASES.key_tasks) ??
    pickFromSources(directSources, SECTION_FIELD_ALIASES.key_tasks) ??
    extracted.sections.key_tasks ??
    '';
  const designGuidelinesSource =
    pickFromSources(sectionSources, SECTION_FIELD_ALIASES.design_guidelines) ??
    pickFromSources(directSources, SECTION_FIELD_ALIASES.design_guidelines) ??
    extracted.sections.design_guidelines ??
    '';
  const technicalNotesSource =
    pickFromSources(sectionSources, SECTION_FIELD_ALIASES.technical_notes) ??
    pickFromSources(directSources, SECTION_FIELD_ALIASES.technical_notes) ??
    extracted.sections.technical_notes ??
    '';

  const frontmatter: FrontmatterData = {
    title: normalizeTitle(titleSource, slugToTitle(item.slug)),
    summary: normalizeMultiline(summarySource),
    key_tasks: normalizeMultiline(keyTasksSource),
    design_guidelines: normalizeMultiline(designGuidelinesSource),
    technical_notes: normalizeMultiline(technicalNotesSource),
  };

  const outputDir = path.resolve(outputRoot, 'docs/research-summaries');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${item.slug}.md`);
  await writeFile(outputPath, buildFrontmatter(frontmatter), 'utf8');
  const relativePath = path.relative(outputRoot, outputPath);
  console.log(`Rendered ${relativePath}`);
}

function parseArgs(argv: string[]): { inputPath: string } {
  let inputPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input' || arg === '-i') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing value for --input');
      }
      inputPath = next;
      i++;
    } else if (arg.startsWith('--input=')) {
      inputPath = arg.slice('--input='.length);
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith('-') && !inputPath) {
      inputPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!inputPath) {
    throw new Error('Usage: codex:render-summary --input <manifest.json>');
  }
  return { inputPath };
}

function printUsage() {
  console.log('Usage: pnpm codex:render-summary --input <manifest.json>');
}

async function main() {
  try {
    const { inputPath } = parseArgs(process.argv.slice(2));
    const resolvedManifestPath = path.resolve(process.cwd(), inputPath);
    const manifestContent = await readFile(resolvedManifestPath, 'utf8');
    let manifestData: unknown;
    try {
      manifestData = JSON.parse(manifestContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse manifest ${inputPath}: ${message}`);
    }

    const entries = parseManifestEntries(manifestData);
    if (entries.length === 0) {
      console.warn('No summaries found in manifest.');
      return;
    }

    const manifestDir = path.dirname(resolvedManifestPath);
    const outputRoot = process.cwd();
    for (const entry of entries) {
      await renderEntry(entry, manifestDir, outputRoot);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

void main();
