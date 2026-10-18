/**
 * @file api/index.ts
 * @description Vercel Serverless Function entry point untuk Express API Pustaka Sekolah.
 * @layer Infrastructure Entry Point (Vercel)
 */

import { createApp } from '../src/server/app.js';

const app = createApp();

export default app;
