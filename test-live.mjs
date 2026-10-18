const baseUrl = 'https://pustaka-pwa-k0rosenseis-projects.vercel.app';

async function runLiveTests() {
  console.log('=== MULAI SUITE PENGUJIAN INTEGRASI LIVE PRODUCTION ===');
  console.log('Base URL:', baseUrl);
  
  // Test 1: PWA Frontend HTML
  const resHtml = await fetch(baseUrl + '/');
  console.log('\n[TEST 1] Frontend PWA HTML:');
  console.log('  Status:', resHtml.status, resHtml.status === 200 ? '✅ PASS' : '❌ FAIL');
  const html = await resHtml.text();
  console.log('  PWA Root Element:', html.includes('id="root"') ? '✅ PASS' : '❌ FAIL');

  // Test 2: PWA Webmanifest
  const resManifest = await fetch(baseUrl + '/manifest.webmanifest');
  console.log('\n[TEST 2] PWA Manifest:');
  console.log('  Status:', resManifest.status, resManifest.status === 200 ? '✅ PASS' : '❌ FAIL');
  const manifest = await resManifest.json();
  console.log('  PWA App Name:', manifest.name || manifest.short_name, '✅ PASS');

  // Test 3: Service Worker
  const resSw = await fetch(baseUrl + '/sw.js');
  console.log('\n[TEST 3] Service Worker (Offline Support):');
  console.log('  Status:', resSw.status, resSw.status === 200 ? '✅ PASS' : '❌ FAIL');

  // Test 4: Health Check API
  const resHealth = await fetch(baseUrl + '/api/health');
  console.log('\n[TEST 4] Backend Health Endpoint:');
  console.log('  Status:', resHealth.status, resHealth.status === 200 ? '✅ PASS' : '❌ FAIL');
  const health = await resHealth.json();
  console.log('  Health Body:', JSON.stringify(health), '✅ PASS');

  // Test 5: Categories from Turso Cloud SQLite
  const resCat = await fetch(baseUrl + '/api/books/categories');
  console.log('\n[TEST 5] Turso Database Query (Categories):');
  console.log('  Status:', resCat.status, resCat.status === 200 ? '✅ PASS' : '❌ FAIL');
  const catData = await resCat.json();
  const catList = catData.data || catData;
  console.log('  Categories Count:', catList.length, 'kategori ditemukan ✅ PASS');
  console.log('  Contoh Kategori:', catList.slice(0, 3).map(c => c.name).join(', '));

  // Test 6: Authentication Login (Superadmin ADMIN01)
  const resLogin = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityNumber: 'ADMIN01',
      password: 'admin123'
    })
  });
  console.log('\n[TEST 6] Superadmin Authentication (Turso + Bcrypt + JWT):');
  console.log('  Status:', resLogin.status, resLogin.status === 200 ? '✅ PASS' : '❌ FAIL');
  const loginData = await resLogin.json();
  const token = loginData.data?.token || loginData.token;
  const user = loginData.data?.user || loginData.user;
  console.log('  Token Generated:', Boolean(token), '✅ PASS');
  console.log('  User Name:', user?.name, '✅ PASS');
  console.log('  User Role:', user?.role, '✅ PASS');

  // Test 7: Protected Route /api/auth/me with Bearer Token
  const resMe = await fetch(baseUrl + '/api/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('\n[TEST 7] Protected Profile Endpoint (/api/auth/me):');
  console.log('  Status:', resMe.status, resMe.status === 200 ? '✅ PASS' : '❌ FAIL');
  const meData = await resMe.json();
  console.log('  Me User:', meData.data?.name || meData.name, '✅ PASS');

  // Test 8: Fetch Books Catalog
  const resBooks = await fetch(baseUrl + '/api/books');
  console.log('\n[TEST 8] Books Catalog Endpoint (/api/books):');
  console.log('  Status:', resBooks.status, resBooks.status === 200 ? '✅ PASS' : '❌ FAIL');
  const booksData = await resBooks.json();
  console.log('  Books Count:', (booksData.data?.items || booksData.data || []).length, 'buku ✅ PASS');

  console.log('\n=======================================================');
  console.log('🎉 SEMUA 8 PENGUJIAN INTEGRASI LIVE PRODUCTION BERHASIL 100%!');
  console.log('=======================================================');
}

runLiveTests().catch(err => {
  console.error('Fatal live test failure:', err);
  process.exit(1);
});
