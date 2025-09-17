import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { renderSummariesFromManifests } from '@/tools/codex-cloud/render-summaries';
import type { Manifest } from '@/tools/codex-cloud/render-summary';

function makeManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    title: 'Test Summary',
    slug: 'test-summary',
    ...overrides,
  };
}

describe('renderSummariesFromManifests', () => {
  const outDir = path.join(process.cwd(), 'tmp-render-summaries');

  it('rejects slugs containing path separators', async () => {
    const manifest = makeManifest({ slug: 'unsafe/slug' });

    await expect(
      renderSummariesFromManifests([manifest], { outDir, dryRun: true }),
    ).rejects.toThrow(/path separators/i);
  });

  it('rejects slugs that resolve outside the output directory', async () => {
    const manifest = makeManifest({ slug: '..' });

    await expect(
      renderSummariesFromManifests([manifest], { outDir, dryRun: true }),
    ).rejects.toThrow(/outside the output directory/i);
  });

  it('returns sanitized slug metadata for valid manifests', async () => {
    const manifest = makeManifest({ slug: 'valid-slug' });
    const results = await renderSummariesFromManifests([manifest], {
      outDir,
      dryRun: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      slug: 'valid-slug',
      outputPath: path.join(path.resolve(outDir), 'valid-slug.md'),
    });
  });
});
