// The push service worker at the site's ROOT — a Vite plugin for an app that
// uses @xeplr/ui-account's "Notifications on this device".
//
//   // vite.config.js
//   import { xeplrPushWorker } from '@xeplr/ui-account/vite.js'
//   export default defineConfig({ plugins: [react(), xeplrPushWorker()] })
//
// Serves sw/xeplr-push-sw.js at /xeplr-push-sw.js in dev, and writes it there
// in the build. A service worker only covers the pages under its own path, so
// it must be at the root, not under /assets/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

var WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sw', 'xeplr-push-sw.js');
export var PUSH_WORKER_FILE = 'xeplr-push-sw.js';

export function xeplrPushWorker() {
  return {
    name: 'xeplr-push-worker',
    configureServer: function(server) {
      server.middlewares.use('/' + PUSH_WORKER_FILE, function(req, res) {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(fs.readFileSync(WORKER));
      });
    },
    generateBundle: function() {
      this.emitFile({ type: 'asset', fileName: PUSH_WORKER_FILE, source: fs.readFileSync(WORKER, 'utf8') });
    }
  };
}
