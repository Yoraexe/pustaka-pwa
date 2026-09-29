const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../pustaka.db');
const db = new Database(dbPath);

const columns = db.prepare("PRAGMA table_info(loans)").all();
console.log('Existing columns in loans:', columns.map(c => c.name));

if (!columns.some(c => c.name === 'reservation_code')) {
  db.exec('ALTER TABLE loans ADD COLUMN reservation_code TEXT;');
  console.log('✅ Added reservation_code column');
} else {
  console.log('ℹ️ reservation_code column already exists');
}

if (!columns.some(c => c.name === 'reserved_until')) {
  db.exec('ALTER TABLE loans ADD COLUMN reserved_until TEXT;');
  console.log('✅ Added reserved_until column');
} else {
  console.log('ℹ️ reserved_until column already exists');
}

db.close();
console.log('🎉 Migration completed successfully.');
