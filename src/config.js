import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const defaults = {
  slides: 'slides.md',
  styles: null,
  theme: {},
  layout: {},
  templates: {},
};

export async function loadConfig(root = process.cwd()) {
  const configPath = resolve(root, 'lets-talk-about.config.js');

  let userConfig = {};
  if (existsSync(configPath)) {
    const mod = await import(pathToFileURL(configPath).href);
    userConfig = mod.default || mod;
  }

  return { ...defaults, ...userConfig };
}
