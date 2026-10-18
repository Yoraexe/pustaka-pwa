import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
  url: 'libsql://pustaka-pwa-yoraexe.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIzMzU3MDQsImlkIjoiMDFhMTRmODYtOGYwMS03MTY3LWI3YzctNjFiODVjYWVlMDBiIiwia2lkIjoiangzdDllNl9CTGZYRmNod1BZbFNFV3J2YzBNZnd1SW5CZ0xCT1hKcGdFbyIsInJpZCI6ImZkODY2ZmU4LTIzN2EtNDVlOS1iNDA4LWM0NGI2ZjgwN2U0MiJ9.XAiHRC1Op5R_kINvNGS3jJxgNLCylqFK_t89eohmBfHBPpOxgVtOzMpTK22nq1-RF9C5FgwD4O8KK56-60ZzAQ'
});

async function run() {
  const hash = bcrypt.hashSync('admin123', 10);
  console.log('Generated hash for admin123:', hash);
  console.log('Local verify:', bcrypt.compareSync('admin123', hash));
  
  const res = await client.execute({
    sql: 'UPDATE users SET password_hash = ? WHERE identity_number = ?',
    args: [hash, 'ADMIN01']
  });
  console.log('Rows affected:', res.rowsAffected);

  const check = await client.execute("SELECT password_hash FROM users WHERE identity_number = 'ADMIN01'");
  console.log('Fetched from DB:', check.rows[0].password_hash);
  console.log('Remote verify with admin123:', bcrypt.compareSync('admin123', check.rows[0].password_hash));
}

run().catch(console.error);
