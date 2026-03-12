import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHTML } from './compiler.js';
import { loadConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

const VIRTUAL_MODULE_ID = '/@lets-talk-about/client';
const CLIENT_ENTRY = resolve(__dirname, 'client', 'entry.js');

export default function letsTalkAbout(userOpts = {}) {
  let config;
  let root;

  return {
    name: 'lets-talk-about',

    async configResolved(resolvedConfig) {
      root = resolvedConfig.root;
      // Allow Vite to serve files from the package directory
      resolvedConfig.server.fs.allow.push(PKG_ROOT);
      config = await loadConfig(root);
      config = { ...config, ...userOpts };
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        // Resolve to the actual file so Vite can resolve relative imports
        return CLIENT_ENTRY;
      }
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/' && req.url !== '/index.html') {
          return next();
        }

        try {
          const slidesPath = resolve(root, config.slides);
          const source = readFileSync(slidesPath, 'utf-8');
          let html = buildHTML(source, config);

          // Let Vite inject HMR client and process the HTML
          html = await server.transformIndexHtml(req.url, html);

          res.setHeader('Content-Type', 'text/html');
          res.statusCode = 200;
          res.end(html);
        } catch (e) {
          server.ssrFixStacktrace(e);
          next(e);
        }
      });
    },

    handleHotUpdate({ file, server }) {
      const slidesPath = resolve(root, config.slides);
      const customStyles = config.styles ? resolve(root, config.styles) : null;

      if (file === slidesPath || file === customStyles) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // For production build, replace the placeholder index.html
        if (ctx.server) return; // skip in dev — handled by middleware

        const slidesPath = resolve(root, config.slides);
        const source = readFileSync(slidesPath, 'utf-8');
        return buildHTML(source, config);
      },
    },
  };
}
