import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scaffoldDir = resolve(__dirname, '..', 'scaffold');

export async function init(name) {
  const projectName = name || 'my-presentation';
  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  console.log(`Scaffolding "${projectName}"...`);

  // Create directories
  mkdirSync(targetDir, { recursive: true });
  mkdirSync(join(targetDir, 'public', 'assets', 'bg'), { recursive: true });
  mkdirSync(join(targetDir, 'public', 'assets', 'images'), { recursive: true });
  mkdirSync(join(targetDir, 'public', 'assets', 'videos'), { recursive: true });
  mkdirSync(join(targetDir, '.github', 'workflows'), { recursive: true });

  // Copy slides.md
  copyFileSync(join(scaffoldDir, 'slides.md'), join(targetDir, 'slides.md'));

  // Copy config
  copyFileSync(
    join(scaffoldDir, 'lets-talk-about.config.js'),
    join(targetDir, 'lets-talk-about.config.js'),
  );

  // Process package.json template
  const pkgTemplate = readFileSync(join(scaffoldDir, 'package.json.tmpl'), 'utf-8');
  writeFileSync(join(targetDir, 'package.json'), pkgTemplate.replace(/\{\{name\}\}/g, projectName));

  // Copy gitignore
  copyFileSync(join(scaffoldDir, 'gitignore'), join(targetDir, '.gitignore'));

  // Copy deploy workflow
  copyFileSync(
    join(scaffoldDir, 'github', 'workflows', 'deploy.yml'),
    join(targetDir, '.github', 'workflows', 'deploy.yml'),
  );

  // Create placeholder index.html
  writeFileSync(
    join(targetDir, 'index.html'),
    '<!DOCTYPE html><html><head></head><body></body></html>\n',
  );

  // Create .keep files
  writeFileSync(join(targetDir, 'public', 'assets', 'images', '.keep'), '');
  writeFileSync(join(targetDir, 'public', 'assets', 'videos', '.keep'), '');

  console.log(`\nDone! To get started:\n`);
  console.log(`  cd ${projectName}`);
  console.log(`  npm install`);
  console.log(`  npx lets-talk-about dev\n`);
}
