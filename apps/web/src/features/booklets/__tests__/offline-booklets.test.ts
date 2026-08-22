import { describe, it, expect, beforeEach } from 'vitest';
import {
  bulkPutBooklets,
  putBooklet,
  getBookletsOffline,
  getBookletByIdOffline,
  removeBooklet,
  recordBookletPaymentOffline,
  isBookletPaymentRecordedOffline,
  wipeAllOfflineData,
} from '@/lib/offline/db';

describe('Offline Booklet Engine (IndexedDB & Memory Store)', () => {
  beforeEach(async () => {
    await wipeAllOfflineData();
  });

  it('can store and query booklets with grade and group filters', async () => {
    const mockBooklets = [
      {
        id: 'booklet-1',
        title: 'مذكرة الكيمياء العضوية',
        description: 'شرح وتدريبات',
        price: 80,
        gradeLevel: 'الصف الثالث الثانوي',
        groupId: 'grp-chem-1',
        stockCount: 50,
        salesCount: 10,
        totalRevenue: 800,
        isActive: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'booklet-2',
        title: 'مذكرة الفيزياء الحديثة',
        description: 'بنك أسئلة',
        price: 100,
        gradeLevel: 'الصف الأول الثانوي',
        groupId: null,
        stockCount: 30,
        salesCount: 5,
        totalRevenue: 500,
        isActive: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    await bulkPutBooklets(mockBooklets as any);

    const all = await getBookletsOffline();
    expect(all).toHaveLength(2);

    const byGrade = await getBookletsOffline({ gradeLevel: 'الصف الثالث الثانوي' });
    expect(byGrade).toHaveLength(1);
    expect(byGrade[0].title).toBe('مذكرة الكيمياء العضوية');

    const byGroup = await getBookletsOffline({ groupId: 'grp-chem-1' });
    expect(byGroup).toHaveLength(1);
  });

  it('can update single booklet and remove it', async () => {
    const booklet = {
      id: 'booklet-edit',
      title: 'مذكرة النحو',
      price: 50,
      gradeLevel: 'الصف الثاني الثانوي',
      stockCount: 20,
      salesCount: 0,
      totalRevenue: 0,
      isActive: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putBooklet(booklet as any);
    const fetched = await getBookletByIdOffline('booklet-edit');
    expect(fetched?.title).toBe('مذكرة النحو');

    // Update title
    await putBooklet({ ...booklet, title: 'مذكرة النحو المتقدم' } as any);
    const updated = await getBookletByIdOffline('booklet-edit');
    expect(updated?.title).toBe('مذكرة النحو المتقدم');

    // Remove
    await removeBooklet('booklet-edit');
    const afterDelete = await getBookletByIdOffline('booklet-edit');
    expect(afterDelete).toBeNull();
  });

  it('records offline booklet payment and decrements stock count', async () => {
    const booklet = {
      id: 'b-stock-1',
      title: 'مذكرة الأحياء',
      price: 60,
      gradeLevel: 'الصف الأول الثانوي',
      stockCount: 25,
      salesCount: 2,
      totalRevenue: 120,
      isActive: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putBooklet(booklet as any);

    // Initial check
    const isPaidBefore = await isBookletPaymentRecordedOffline('stu-1', 'b-stock-1');
    expect(isPaidBefore.isRecorded).toBe(false);

    // Record payment offline
    const record = await recordBookletPaymentOffline({
      studentId: 'stu-1',
      bookletId: 'b-stock-1',
      amountPaid: 60,
      receiptNumber: 'REC-001',
      notes: 'تسليم يدوي',
    });

    expect(record.paymentType).toBe('BOOKLET');
    expect(record.amountPaid).toBe(60);

    // Stock should be decremented and sales count incremented
    const updatedBooklet = await getBookletByIdOffline('b-stock-1');
    expect(updatedBooklet?.stockCount).toBe(24);
    expect(updatedBooklet?.salesCount).toBe(3);
    expect(updatedBooklet?.totalRevenue).toBe(180);

    // Check duplicate
    const isPaidAfter = await isBookletPaymentRecordedOffline('stu-1', 'b-stock-1');
    expect(isPaidAfter.isRecorded).toBe(true);
  });
});
