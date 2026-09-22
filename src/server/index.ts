/**
 * @file src/server/index.ts
 * @description Entry point server HTTP.
 * @layer Infrastructure Entry Point
 */

import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`🚀 [Pustaka Sekolah API] Server berjalan di http://localhost:${config.PORT}`);
  console.log(`📚 Database: ${config.databaseFullPath}`);
  console.log(`📂 Uploads: ${config.uploadsFullPath}`);
});
