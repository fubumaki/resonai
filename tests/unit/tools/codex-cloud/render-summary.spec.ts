import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  collectSources,
  renderSummaryFromFile,
  renderSummaryMarkdown,
  type Manifest,
} from '@/tools/codex-cloud/render-summary';

function extractFrontMatter(markdown: string): Record<string, unknown> {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('Front matter not found in markdown output');
  }
  return parseYaml(match[1]) as Record<string, unknown>;
}

describe('collectSources', () => {
  it('includes metadata nested within sections', () => {
    const manifest: Manifest = {
      title: 'Nested metadata summary',
      sections: [
        {
          metadata: {
            summary: 'Section-level synopsis',
          },
        },
      ],
    };

    const metadata = collectSources(manifest);
    expect(metadata).toEqual([
      { summary: 'Section-level synopsis' },
    ]);
  });
});

describe('renderSummary CLI integration', () => {
  it('writes section metadata fields into front matter', async () => {
    const manifest: Manifest = {
      title: 'CLI Manifest Sample',
      slug: 'cli-manifest-sample',
      sections: [
        {
          metadata: {
            summary: 'Sourced from section metadata',
            key_tasks: [
              { title: 'Task A', priority: 'P1', theme: 'core' },
              { title: 'Task B', priority: 'P2' },
            ],
          },
          records: [
            {
              metadata: {
                key_findings: ['Finding 1'],
              },
            },
          ],
        },
      ],
    };

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'render-summary-test-'));
    const manifestPath = path.join(tempDir, 'manifest.json');
    const outputPath = path.join(tempDir, 'summary.md');

    try {
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      const markdown = await renderSummaryFromFile(manifestPath, outputPath);
      const written = await fs.readFile(outputPath, 'utf8');

      expect(markdown).toBe(written);

      const frontMatter = extractFrontMatter(markdown);
      expect(frontMatter.summary).toBe('Sourced from section metadata');
      expect(frontMatter.key_tasks).toEqual([
        { title: 'Task A', priority: 'P1', theme: 'core' },
        { title: 'Task B', priority: 'P2' },
      ]);
      expect(frontMatter.key_findings).toEqual(['Finding 1']);
      expect(frontMatter.title).toBe('CLI Manifest Sample');
      expect(frontMatter.slug).toBe('cli-manifest-sample');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('renderSummaryMarkdown', () => {
  it('prefers metadata provided by sections when top-level metadata is absent', () => {
    const manifest: Manifest = {
      title: 'Section Derived Summary',
      sections: [
        {
          metadata: {
            summary: 'Derived from nested metadata',
            key_tasks: [{ title: 'Nested Task' }],
          },
        },
      ],
    };

    const markdown = renderSummaryMarkdown(manifest);
    const frontMatter = extractFrontMatter(markdown);

    expect(frontMatter.summary).toBe('Derived from nested metadata');
    expect(frontMatter.key_tasks).toEqual([{ title: 'Nested Task' }]);
  });
});
