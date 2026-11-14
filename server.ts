import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiApp } from './serverApp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, 'dist');
const isProd =
  process.env.NODE_ENV === 'production' ||
  (process.env.npm_lifecycle_event === 'start' && fs.existsSync(distPath));
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = await createApiApp();

  if (!isProd && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`STEKOM Campus Event Management server running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
    });
  }

  return app;
}

const appPromise = startServer().catch((err) => {
  console.error('Server failed to start:', err);
  throw err;
});

export default appPromise;
