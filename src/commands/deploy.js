import { resolve } from 'node:path';
import ghpages from 'gh-pages';

export async function deploy() {
  const distDir = resolve(process.cwd(), 'dist');

  console.log('Deploying dist/ to gh-pages branch...');

  return new Promise((res, rej) => {
    ghpages.publish(distDir, (err) => {
      if (err) {
        console.error('Deploy failed:', err.message);
        rej(err);
      } else {
        console.log('Deployed successfully to gh-pages!');
        res();
      }
    });
  });
}
