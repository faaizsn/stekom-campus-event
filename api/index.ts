import type { Request, Response } from 'express';
import { createApiApp } from '../serverApp.ts';

let appPromise: ReturnType<typeof createApiApp> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!appPromise) {
    appPromise = createApiApp();
  }
  const app = await appPromise;
  return app(req, res);
}
