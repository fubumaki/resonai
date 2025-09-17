import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { renderSummariesFromManifests } from '@/tools/codex-cloud/render-summaries';
import { renderSummaryMarkdown, type Manifest } from '@/tools/codex-cloud/render-summary';

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'render-summaries-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  const dirs = tempDirs.splice(0);
  await Promise.all(dirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function buildManifest(slug: string): Manifest {
  return {
    slug,
    title: `${slug} title`,
    metadata: {
      slug,
      title: `${slug} title`,
      summary: `${slug} summary`,
    },
  };
}

describe('renderSummariesFromManifests', () => {
  it('writes markdown files for each manifest', async () => {
    const outDir = await createTempDir();
    const manifest = buildManifest('alpha');

    const results = await renderSummariesFromManifests([manifest], {
      outDir,
    });

    expect(results).toHaveLength(1);

    const outputPath = path.join(outDir, 'alpha.md');
    const content = await fs.readFile(outputPath, 'utf8');
    expect(content).toEqual(renderSummaryMarkdown(manifest));
    expect(results[0]?.slug).toBe('alpha');
    expect(results[0]?.relativePath.replace(/\\/g, '/')).toMatch(/alpha\.md$/);
  });

  it('respects dry-run mode by not writing to disk', async () => {
    const outDir = await createTempDir();
    const manifest = buildManifest('beta');
    const targetFile = path.join(outDir, 'beta.md');

    const results = await renderSummariesFromManifests([manifest], {
      outDir,
      dryRun: true,
    });

    expect(results).toHaveLength(1);
    await expect(fs.access(targetFile)).rejects.toThrow();
  });

  it('prevents overwriting existing summaries unless overwrite is set', async () => {
    const outDir = await createTempDir();
    const targetFile = path.join(outDir, 'gamma.md');
    await fs.writeFile(targetFile, 'original');

    const manifest = buildManifest('gamma');

    await expect(
      renderSummariesFromManifests([manifest], {
        outDir,
      }),
    ).rejects.toThrow(/already exists/);
  });

  it('allows overwriting existing summaries when requested', async () => {
    const outDir = await createTempDir();
    const targetFile = path.join(outDir, 'delta.md');
    await fs.writeFile(targetFile, 'original');

    const manifest = buildManifest('delta');

    const results = await renderSummariesFromManifests([manifest], {
      outDir,
      overwrite: true,
    });

    const content = await fs.readFile(targetFile, 'utf8');
    expect(content).toEqual(renderSummaryMarkdown(manifest));
    expect(results[0]?.slug).toBe('delta');
  });

  it('creates nested directories for slugs that include path separators', async () => {
    const outDir = await createTempDir();
    const manifest = buildManifest('nested/path');

    const results = await renderSummariesFromManifests([manifest], {
      outDir,
    });

    const nestedFile = path.join(outDir, 'nested', 'path.md');
    const content = await fs.readFile(nestedFile, 'utf8');
    expect(content).toEqual(renderSummaryMarkdown(manifest));
    expect(results[0]?.slug).toBe('nested/path');
    expect(results[0]?.relativePath.replace(/\\/g, '/')).toMatch(/nested\/path\.md$/);
  });

  it('rejects slugs that attempt directory traversal', async () => {
    const outDir = await createTempDir();
    const manifest = buildManifest('../escape');

    await expect(
      renderSummariesFromManifests([manifest], {
        outDir,
      }),
    ).rejects.toThrow(/disallowed segment|resolved outside/);
  });

  it('rejects slugs with unsupported characters', async () => {
    const outDir = await createTempDir();
    const manifest = buildManifest('bad slug');

    await expect(
      renderSummariesFromManifests([manifest], {
        outDir,
      }),
    ).rejects.toThrow(/unsupported characters/);
  });

  it('errors when duplicate slugs are provided', async () => {
    const outDir = await createTempDir();
    const manifest = buildManifest('duplicate');

    await expect(
      renderSummariesFromManifests([manifest, manifest], {
        outDir,
      }),
    ).rejects.toThrow(/Duplicate slug/);
  });
});
