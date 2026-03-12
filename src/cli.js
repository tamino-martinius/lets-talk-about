import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

program
  .name('lets-talk-about')
  .description('Create beautiful slide presentations from Markdown.')
  .version(pkg.version);

program
  .command('init [name]')
  .description('Scaffold a new presentation project')
  .action(async (name) => {
    const { init } = await import('./commands/init.js');
    await init(name);
  });

program
  .command('dev')
  .description('Start the development server with hot reload')
  .option('-p, --port <port>', 'Port number', '3000')
  .action(async (opts) => {
    const { dev } = await import('./commands/dev.js');
    await dev(opts);
  });

program
  .command('build')
  .description('Build the presentation for production')
  .option('--base <path>', 'Base public path', '/')
  .action(async (opts) => {
    const { build } = await import('./commands/build.js');
    await build(opts);
  });

program
  .command('deploy')
  .description('Deploy the built presentation to GitHub Pages')
  .action(async () => {
    const { deploy } = await import('./commands/deploy.js');
    await deploy();
  });

program.parse();
