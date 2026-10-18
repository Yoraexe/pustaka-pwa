/**
 * @file src/client/services/offlineStorage.ts
 * @description Layanan penyimpanan luring mandiri (IndexedDB & Cache API) untuk dokumen e-book offline PWA.
 * @layer Client Storage Service
 */

const DB_NAME = 'pustaka_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'ebooks';

interface OfflineEbookRecord {
  id: number;
  title: string;
  blob: Blob;
  savedAt: string;
}

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Browser tidak mendukung IndexedDB.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const offlineStorage = {
  /**
   * Menyimpan dokumen PDF utuh ke IndexedDB & Cache API
   */
  async saveEbook(bookId: number, title: string, blob: Blob): Promise<void> {
    // 1. Simpan ke IndexedDB (Kapasitas besar & reliable di iOS Safari)
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: OfflineEbookRecord = {
        id: bookId,
        title,
        blob,
        savedAt: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // 2. Simpan juga ke Cache API sebagai layer redundansi PWA
    if ('caches' in window) {
      try {
        const cache = await caches.open('pustaka-offline-ebooks');
        const cacheKey = `/api/books/${bookId}/stream-pdf`;
        const response = new Response(blob, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(blob.size)
          }
        });
        await cache.put(cacheKey, response);
      } catch (err) {
        console.warn('Gagal menyimpan ke Cache Storage, data tetap aman di IndexedDB:', err);
      }
    }

    // 3. Simpan flag ke localStorage untuk update UI cepat
    localStorage.setItem(`offline_ebook_${bookId}`, 'true');
  },

  /**
   * Mengambil blob PDF dari IndexedDB atau Cache API saat offline
   */
  async getEbook(bookId: number): Promise<Blob | null> {
    // 1. Coba ambil dari IndexedDB
    try {
      const db = await openDatabase();
      const record = await new Promise<OfflineEbookRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(bookId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (record && record.blob) {
        return record.blob;
      }
    } catch (err) {
      console.warn('IndexedDB fetch error, mencoba Cache API:', err);
    }

    // 2. Fallback ke Cache API
    if ('caches' in window) {
      try {
        const cache = await caches.open('pustaka-offline-ebooks');
        const cacheKey = `/api/books/${bookId}/stream-pdf`;
        const res = await cache.match(cacheKey);
        if (res) {
          return await res.blob();
        }
      } catch (err) {
        console.warn('Cache API fetch error:', err);
      }
    }

    return null;
  },

  /**
   * Memeriksa apakah berkas e-book benar-benar tersimpan di IndexedDB atau Cache API
   * Memverifikasi blob riil untuk mencegah false positive jika browser melakukan storage eviction.
   */
  async isEbookSaved(bookId: number): Promise<boolean> {
    const blob = await this.getEbook(bookId);
    if (blob !== null) {
      localStorage.setItem(`offline_ebook_${bookId}`, 'true');
      return true;
    } else {
      localStorage.removeItem(`offline_ebook_${bookId}`);
      return false;
    }
  },

  /**
   * Menghapus buku dari penyimpanan lokal perangkat
   */
  async removeEbook(bookId: number): Promise<void> {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(bookId);
    } catch {
      // ignore
    }

    if ('caches' in window) {
      try {
        const cache = await caches.open('pustaka-offline-ebooks');
        await cache.delete(`/api/books/${bookId}/stream-pdf`);
      } catch {
        // ignore
      }
    }

    localStorage.removeItem(`offline_ebook_${bookId}`);
  },

  /**
   * Mengambil semua daftar metadata e-book yang tersimpan di IndexedDB perangkat
   */
  async getAllOfflineEbooks(): Promise<Array<{ id: number; title: string; savedAt: string; size: number }>> {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const records = (req.result as OfflineEbookRecord[]) || [];
          resolve(
            records.map(r => ({
              id: r.id,
              title: r.title,
              savedAt: r.savedAt,
              size: r.blob ? r.blob.size : 0
            }))
          );
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Gagal memuat daftar buku offline dari IndexedDB:', err);
      return [];
    }
  }
};
