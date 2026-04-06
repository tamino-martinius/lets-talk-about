import { resolve } from 'node:path';
import { createServer } from 'vite';
import { loadConfig } from '../config.js';
import letsTalkAbout from '../plugin.js';

export async function dev(opts) {
  const root = process.cwd();
  const config = await loadConfig(root);

  const server = await createServer({
    root,
    server: {
      port: parseInt(opts.port, 10),
      open: true,
    },
    plugins: [letsTalkAbout(config)],
    // Resolve the package's client files
    resolve: {
      alias: {
        'lets-talk-about/client/slides': resolve(
          new URL('..', import.meta.url).pathname,
          'client',
          'slides.js',
        ),
      },
    },
  });

  await server.listen();
  server.printUrls();
}
