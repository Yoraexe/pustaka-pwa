/**
 * @file api/index.ts
 * @description Vercel Serverless Function entry point untuk Express API Pustaka Sekolah.
 * @layer Infrastructure Entry Point (Vercel)
 */

import type { Request, Response } from 'express';

let appInstance: any = null;
let initPromise: Promise<any> | null = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (!initPromise) {
    initPromise = (async () => {
      const { createApp } = await import('../src/server/app.js');
      appInstance = createApp();
      return appInstance;
    })();
  }
  return initPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('❌ [Vercel Serverless Function Error]:', err);
    return res.status(500).json({
      status: 'error',
      code: 'SERVERLESS_INIT_ERROR',
      message: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
      envStatus: {
        nodeEnv: process.env.NODE_ENV,
        hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
        hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
        hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
        hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasJwtSecret: Boolean(process.env.JWT_SECRET)
      }
    });
  }
}
