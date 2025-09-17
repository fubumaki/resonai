import fs from "fs/promises";
import path from "path";

type ParsedFrontMatter = {
  hasFrontMatter: boolean;
  data: Record<string, unknown> | null;
  bodyLines: string[];
  bodyStartLine: number;
  errors: string[];
};

type FrontMatterValidationResult = {
  errors: string[];
  hasValidSources: boolean;
};

const ROOT = process.cwd();
const RESEARCH_SUMMARIES_DIR = path.join(ROOT, "docs", "research-summaries");

type YamlParser = (input: string) => unknown;

type MaybeYamlModule = { parse?: (input: string) => unknown };

let yamlParserPromise: Promise<YamlParser> | null = null;

function loadYamlParser(): Promise<YamlParser> {
  if (!yamlParserPromise) {
    yamlParserPromise = import("yaml")
      .then((module) => {
        const candidate = module as MaybeYamlModule;
        const parse = candidate.parse;
        if (typeof parse === "function") {
          return (input: string) => parse(input);
        }
        throw new Error("Invalid 'yaml' module: missing parse function.");
      })
      .catch(() => {
        throw new Error(
          "Unable to locate a YAML parser. Install the 'yaml' package to validate research summaries.",
        );
      });
  }

  return yamlParserPromise;
}

async function parseYamlContent(text: string): Promise<unknown> {
  const parser = await loadYamlParser();
  return parser(text);
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(fullPath);
      files.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function toPosixRelative(filePath: string): string {
  const relative = path.relative(ROOT, filePath);
  return relative.split(path.sep).join("/");
}

async function parseFrontMatter(
  relativePath: string,
  content: string,
): Promise<ParsedFrontMatter> {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/);

  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
    errors.push(
      `${relativePath}:1: File is empty; expected YAML front matter with required metadata.`,
    );
    return {
      hasFrontMatter: false,
      data: null,
      bodyLines: [],
      bodyStartLine: 1,
      errors,
    };
  }

  if (lines[0]?.trim() !== "---") {
    errors.push(
      `${relativePath}:1: Missing YAML front matter opening delimiter '---'.`,
    );
    return {
      hasFrontMatter: false,
      data: null,
      bodyLines: lines,
      bodyStartLine: 1,
      errors,
    };
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    errors.push(
      `${relativePath}:1: Missing closing YAML front matter delimiter '---'.`,
    );
    return {
      hasFrontMatter: true,
      data: null,
      bodyLines: lines.slice(1),
      bodyStartLine: 2,
      errors,
    };
  }

  const frontMatterText = lines.slice(1, closingIndex).join("\n");
  let data: Record<string, unknown> | null = {};

  if (frontMatterText.trim().length === 0) {
    data = {};
  } else {
    try {
      const parsed = await parseYamlContent(frontMatterText);
      if (parsed === null) {
        data = {};
      } else if (typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      } else {
        errors.push(
          `${relativePath}:1: YAML front matter must be a mapping/object.`,
        );
        data = null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(
        `${relativePath}:1: Failed to parse YAML front matter: ${message}.`,
      );
      data = null;
    }
  }

  const bodyLines = lines.slice(closingIndex + 1);
  const bodyStartLine = closingIndex + 2;

  return {
    hasFrontMatter: true,
    data,
    bodyLines,
    bodyStartLine,
    errors,
  };
}

function validateEntryArray(
  relativePath: string,
  fieldName: string,
  value: unknown,
  required: boolean,
): string[] {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    if (required) {
      errors.push(
        `${relativePath}:1: '${fieldName}' is required and must be an array of objects with 'priority', 'description', and 'source'.`,
      );
    }
    return errors;
  }

  if (!Array.isArray(value)) {
    errors.push(
      `${relativePath}:1: '${fieldName}' must be an array of objects with 'priority', 'description', and 'source'.`,
    );
    return errors;
  }

  value.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      errors.push(
        `${relativePath}:1: '${fieldName}[${index}]' must be an object with 'priority', 'description', and 'source'.`,
      );
      return;
    }

    const record = entry as Record<string, unknown>;
    for (const key of ["priority", "description", "source"] as const) {
      const fieldValue = record[key];
      if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
        errors.push(
          `${relativePath}:1: '${fieldName}[${index}].${key}' must be a non-empty string.`,
        );
      }
    }
  });

  return errors;
}

function validateFrontMatter(
  relativePath: string,
  data: Record<string, unknown> | null,
): FrontMatterValidationResult {
  const errors: string[] = [];
  let hasValidSources = false;

  if (data === null) {
    return { errors, hasValidSources };
  }

  const title = data.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    errors.push(`${relativePath}:1: 'title' must be a non-empty string.`);
  }

  const summary = data.summary;
  if (typeof summary !== "string" || summary.trim().length === 0) {
    errors.push(`${relativePath}:1: 'summary' must be a non-empty string.`);
  }

  errors.push(
    ...validateEntryArray(relativePath, "key_tasks", data.key_tasks, true),
  );

  errors.push(
    ...validateEntryArray(
      relativePath,
      "design_guidelines",
      data.design_guidelines,
      false,
    ),
  );

  errors.push(
    ...validateEntryArray(
      relativePath,
      "technical_notes",
      data.technical_notes,
      false,
    ),
  );

  if ("sources" in data) {
    const { sources } = data;
    if (!Array.isArray(sources)) {
      errors.push(`${relativePath}:1: 'sources' must be an array of strings.`);
    } else {
      const invalidEntries: string[] = [];
      const normalizedSources = sources
        .map((entry, index) => {
          if (typeof entry !== "string" || entry.trim().length === 0) {
            invalidEntries.push(
              `${relativePath}:1: 'sources[${index}]' must be a non-empty string.`,
            );
            return null;
          }
          return entry.trim();
        })
        .filter((entry): entry is string => entry !== null);

      errors.push(...invalidEntries);
      if (invalidEntries.length === 0) {
        if (normalizedSources.length === 0) {
          errors.push(
            `${relativePath}:1: 'sources' must include at least one entry when provided.`,
          );
        } else {
          hasValidSources = true;
        }
      }
    }
  }

  return { errors, hasValidSources };
}

function computeLineNumber(
  text: string,
  index: number,
  bodyStartLine: number,
): number {
  let lineOffset = 0;
  for (let position = 0; position < index; position += 1) {
    if (text[position] === "\n") {
      lineOffset += 1;
    }
  }
  return bodyStartLine + lineOffset;
}

function validateCitationAttributes(
  attributes: string,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const attributePattern = /([a-zA-Z0-9_]+)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g;
  const values = new Map<string, string>();
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(attributes)) !== null) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
    values.set(name, value);
  }

  const requiredKeys = ["path", "line_range_start", "line_range_end"] as const;
  for (const key of requiredKeys) {
    if (!values.has(key)) {
      errors.push(`Missing '${key}' attribute.`);
    }
  }

  const startValue = values.get("line_range_start");
  const endValue = values.get("line_range_end");
  const pathValue = values.get("path");

  if (startValue !== undefined) {
    const parsed = Number.parseInt(startValue, 10);
    if (Number.isNaN(parsed)) {
      errors.push(`'line_range_start' must be an integer.`);
    }
  }

  if (endValue !== undefined) {
    const parsed = Number.parseInt(endValue, 10);
    if (Number.isNaN(parsed)) {
      errors.push(`'line_range_end' must be an integer.`);
    }
  }

  if (
    startValue !== undefined &&
    endValue !== undefined &&
    !Number.isNaN(Number.parseInt(startValue, 10)) &&
    !Number.isNaN(Number.parseInt(endValue, 10))
  ) {
    const startNum = Number.parseInt(startValue, 10);
    const endNum = Number.parseInt(endValue, 10);
    if (startNum > endNum) {
      errors.push(`'line_range_start' cannot be greater than 'line_range_end'.`);
    }
  }

  if (pathValue !== undefined && pathValue.trim().length === 0) {
    errors.push(`'path' attribute must be a non-empty string.`);
  }

  return { isValid: errors.length === 0, errors };
}

function validateCitations(
  relativePath: string,
  bodyLines: string[],
  bodyStartLine: number,
  hasValidSources: boolean,
): string[] {
  const bodyText = bodyLines.join("\n");
  const errors: string[] = [];
  const matches: Array<{
    start: number;
    end: number;
    line: number;
    attributes: string;
    isValid: boolean;
  }> = [];

  const citationPattern = /:codex-file-citation\[codex-file-citation\]\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(bodyText)) !== null) {
    const [fullMatch, attributes] = match;
    const start = match.index;
    const end = start + fullMatch.length;
    const line = computeLineNumber(bodyText, start, bodyStartLine);
    const validation = validateCitationAttributes(attributes);
    matches.push({ start, end, line, attributes, isValid: validation.isValid });

    if (!validation.isValid) {
      const { errors: attributeErrors } = validation;
      attributeErrors.forEach((message) => {
        errors.push(`${relativePath}:${line}: ${message}`);
      });
    }
  }

  const token = ":codex-file-citation";
  let searchIndex = bodyText.indexOf(token);
  while (searchIndex !== -1) {
    const inMatch = matches.some(
      ({ start, end }) => searchIndex >= start && searchIndex < end,
    );
    if (!inMatch) {
      const line = computeLineNumber(bodyText, searchIndex, bodyStartLine);
      errors.push(
        `${relativePath}:${line}: Found ':codex-file-citation' without a valid attribute block.`,
      );
    }
    searchIndex = bodyText.indexOf(token, searchIndex + token.length);
  }

  const hasValidCitation = matches.some(({ isValid }) => isValid);

  if (!hasValidCitation && !hasValidSources) {
    const line = bodyLines.length > 0 ? bodyStartLine : 1;
    errors.push(
      `${relativePath}:${line}: Missing codex file citation or non-empty 'sources' array.`,
    );
  }

  return errors;
}

async function main(): Promise<void> {
  const markdownFiles = await collectMarkdownFiles(RESEARCH_SUMMARIES_DIR);

  if (markdownFiles.length === 0) {
    console.log("No research summary files found. Nothing to validate.");
    return;
  }

  const allErrors: string[] = [];

  for (const filePath of markdownFiles) {
    const relativePath = toPosixRelative(filePath);
    const content = await fs.readFile(filePath, "utf8");
    const parsed = await parseFrontMatter(relativePath, content);
    allErrors.push(...parsed.errors);

    const frontMatterResult = validateFrontMatter(relativePath, parsed.data);
    allErrors.push(...frontMatterResult.errors);

    const citationErrors = validateCitations(
      relativePath,
      parsed.bodyLines,
      parsed.bodyStartLine,
      frontMatterResult.hasValidSources,
    );
    allErrors.push(...citationErrors);
  }

  if (allErrors.length > 0) {
    console.error("Research summary validation failed:");
    for (const error of allErrors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("All research summaries passed validation.");
}

main().catch((error) => {
  console.error("Unexpected error while validating research summaries:");
  console.error(error);
  process.exitCode = 1;
});

