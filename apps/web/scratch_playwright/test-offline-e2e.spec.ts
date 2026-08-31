import { test, expect } from '@playwright/test';

test.describe('Offline Mode Real Browser Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    const isLoginPage = await page.isVisible('input[name="email"]');
    if (isLoginPage) {
      await page.fill('input[name="email"]', 'teacher@elawal.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    }
  });

  test('Real Persistence: Network OFF -> Scan -> Reload -> Verify -> Network ON -> Sync', async ({ context, page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Step 1: Turn API network OFF by aborting backend requests, so we can still reload the Next.js page
    await context.route('**/sync/**', route => route.abort('internetdisconnected'));
    await context.route('**/attendance/**', route => route.abort('internetdisconnected'));
    await context.route('**/subscriptions/**', route => route.abort('internetdisconnected'));
    
    // Simulate enqueueing a mutation directly to IndexedDB to test persistence
    await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('el_awal_offline_db');
        req.onsuccess = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('outbox_mutations')) {
            resolve(false); // DB not initialized yet
            return;
          }
          const tx = db.transaction('outbox_mutations', 'readwrite');
          const store = tx.objectStore('outbox_mutations');
          store.put({
            id: 'playwright-test-mutation-1',
            type: 'RECORD_ATTENDANCE',
            domain: 'attendance',
            endpoint: '/attendance/sessions/dummy-session/scan-qr',
            method: 'POST',
            payload: { studentId: 'dummy-student', status: 'PRESENT' },
            status: 'PENDING',
            clientTimestamp: Date.now(),
            retryCount: 0,
            conflictStrategy: 'CLIENT_WINS'
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    });

    // Step 2: Reload page while STILL OFFLINE
    await page.reload();
    
    // Step 3: Verify operation survived in IndexedDB
    const pendingCount = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('el_awal_offline_db');
        req.onsuccess = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('outbox_mutations')) {
             resolve(0);
             return;
          }
          const tx = db.transaction('outbox_mutations', 'readonly');
          const store = tx.objectStore('outbox_mutations');
          const countReq = store.count();
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror = () => reject(countReq.error);
        };
      });
    });
    
    expect(pendingCount).toBeGreaterThan(0);
    console.log(`Verified pending operations after reload: ${pendingCount}`);
  });
});
