import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build as viteBuild } from 'vite';
import { loadConfig } from '../config.js';
import letsTalkAbout from '../plugin.js';

export async function build(opts) {
  const root = process.cwd();
  const config = await loadConfig(root);
  config.base = opts.base || config.base || '/';

  // Create a placeholder index.html for Vite to process
  const indexPath = resolve(root, 'index.html');
  writeFileSync(indexPath, '<!DOCTYPE html><html><head></head><body></body></html>');

  try {
    await viteBuild({
      root,
      base: config.base,
      plugins: [letsTalkAbout(config)],
      build: {
        outDir: 'dist',
        emptyOutDir: true,
      },
    });
    console.log('\nBuild complete. Output in dist/');
  } finally {
    // Clean up placeholder
    const { unlinkSync } = await import('node:fs');
    try {
      unlinkSync(indexPath);
    } catch {}
  }
}
