import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  identityNumber: text('identity_number').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN'] }).notNull().default('STUDENT'),
  className: text('class_name'),
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

const client = createClient({
  url: 'libsql://pustaka-pwa-yoraexe.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIzMzU3MDQsImlkIjoiMDFhMTRmODYtOGYwMS03MTY3LWI3YzctNjFiODVjYWVlMDBiIiwia2lkIjoiangzdDllNl9CTGZYRmNod1BZbFNFV3J2YzBNZnd1SW5CZ0xCT1hKcGdFbyIsInJpZCI6ImZkODY2ZmU4LTIzN2EtNDVlOS1iNDA4LWM0NGI2ZjgwN2U0MiJ9.XAiHRC1Op5R_kINvNGS3jJxgNLCylqFK_t89eohmBfHBPpOxgVtOzMpTK22nq1-RF9C5FgwD4O8KK56-60ZzAQ'
});

const db = drizzle(client, { schema: { users } });

async function run() {
  const records = await db.select().from(users).where(eq(users.identityNumber, 'ADMIN01')).limit(1);
  console.log('Records returned count:', records.length);
  if (records.length > 0) {
    const raw = records[0];
    console.log('Record object keys:', Object.keys(raw));
    console.log('identityNumber:', raw.identityNumber);
    console.log('isActive:', raw.isActive);
    console.log('passwordHash:', raw.passwordHash);
    const match = await bcrypt.compare('admin123', raw.passwordHash);
    console.log('Bcrypt compare match:', match);
  }
}

run().catch(console.error);
