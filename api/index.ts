import type { Request, Response } from 'express';
import { createApiApp } from '../serverApp.ts';

let appPromise: ReturnType<typeof createApiApp> | null = null;

function normalizeVercelApiUrl(req: Request): void {
  const rawUrl = req.url || '/';
  const [pathname, rawQuery = ''] = rawUrl.split('?');
  const params = new URLSearchParams(rawQuery);
  const vercelPath = params.get('__vercel_path');

  if (vercelPath !== null) {
    params.delete('__vercel_path');
    const cleanSubpath = vercelPath.replace(/^\/+/, '');
    const qs = params.toString();
    req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`;
  } else if (pathname === '/api/index') {
    req.url = `/api/status${rawQuery ? `?${rawQuery}` : ''}`;
  }
}

export default async function handler(req: Request, res: Response) {
  normalizeVercelApiUrl(req);
  if (!appPromise) {
    appPromise = createApiApp();
  }
  const app = await appPromise;
  return app(req, res);
}
