import { describe, it, expect, beforeEach } from 'vitest';
import {
  offlineDb,
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

  it('throws error when recording offline payment for a booklet belonging to a different grade level', async () => {
    // Put student in 1st secondary
    const student = {
      id: 'stu-grade-test-1',
      fullName: 'طالب أولى ثانوي',
      gradeLevel: 'الصف الأول الثانوي',
      studentCode: 'STU-G1',
      qrCodeToken: 'qr-g1',
      user: { id: 'stu-grade-test-1', fullName: 'طالب أولى ثانوي', isActive: true },
    };
    await offlineDb.bulkPutStudents([student as any]);

    // Put booklet for 3rd secondary
    const booklet = {
      id: 'b-grade-3',
      title: 'مذكرة كيمياء تالتة ثانوي',
      price: 100,
      gradeLevel: 'الصف الثالث الثانوي',
      stockCount: 10,
      salesCount: 0,
      totalRevenue: 0,
      isActive: true,
    };
    await putBooklet(booklet as any);

    await expect(
      recordBookletPaymentOffline({
        studentId: 'stu-grade-test-1',
        bookletId: 'b-grade-3',
        amountPaid: 100,
      }),
    ).rejects.toThrow('INVALID_BOOKLET_FOR_STUDENT');
  });

  it('filters booklets strictly by student grade and enrolled groups with overloaded signatures', async () => {
    const booklets = [
      {
        id: 'b-g10-general',
        title: 'مذكرة عامة أولى ثانوي',
        gradeLevel: 'الصف الأول الثانوي',
        groupId: null,
        price: 50,
        isActive: true,
      },
      {
        id: 'b-g10-groupA',
        title: 'مذكرة مجموعة أ أولى ثانوي',
        gradeLevel: 'الصف الأول الثانوي',
        groupId: 'grp-A',
        price: 60,
        isActive: true,
      },
      {
        id: 'b-g10-groupB',
        title: 'مذكرة مجموعة ب أولى ثانوي',
        gradeLevel: 'الصف الأول الثانوي',
        groupId: 'grp-B',
        price: 60,
        isActive: true,
      },
      {
        id: 'b-g12-general',
        title: 'مذكرة تالتة ثانوي',
        gradeLevel: 'الصف الثالث الثانوي',
        groupId: null,
        price: 100,
        isActive: true,
      },
    ];

    await bulkPutBooklets(booklets as any);

    // Query for Grade 10 student enrolled in group 'grp-A'
    const studentABooklets = await getBookletsOffline('الصف الأول الثانوي', ['grp-A']);
    expect(studentABooklets).toHaveLength(2);
    expect(studentABooklets.map((b) => b.id)).toEqual(
      expect.arrayContaining(['b-g10-general', 'b-g10-groupA']),
    );
    expect(studentABooklets.map((b) => b.id)).not.toContain('b-g10-groupB');
    expect(studentABooklets.map((b) => b.id)).not.toContain('b-g12-general');

    // Query for Grade 10 student with no specific group (only general booklets)
    const studentGeneralBooklets = await getBookletsOffline('الصف الأول الثانوي', []);
    expect(studentGeneralBooklets).toHaveLength(1);
    expect(studentGeneralBooklets[0].id).toBe('b-g10-general');
  });

  it('enqueues outbox mutation when recording booklet payment offline', async () => {
    const student = {
      id: 'stu-outbox-1',
      fullName: 'طالب أوت بوكس',
      gradeLevel: 'الصف الأول الثانوي',
      groupId: 'grp-A',
      user: { id: 'stu-outbox-1', fullName: 'طالب أوت بوكس', isActive: true },
    };
    await offlineDb.bulkPutStudents([student as any]);

    const booklet = {
      id: 'b-outbox-1',
      title: 'مذكرة مراجعة نهائية',
      price: 75,
      gradeLevel: 'الصف الأول الثانوي',
      groupId: null,
      stockCount: 20,
      isActive: true,
    };
    await putBooklet(booklet as any);

    await recordBookletPaymentOffline({
      studentId: 'stu-outbox-1',
      bookletId: 'b-outbox-1',
      amountPaid: 75,
      receiptNumber: 'REC-OUTBOX-01',
    });

    const pending = await offlineDb.getPendingMutations();
    const mutation = pending.find(
      (m) => m.domain === 'finance' && m.payload?.bookletId === 'b-outbox-1',
    );

    expect(mutation).toBeDefined();
    expect(mutation?.payload?.paymentType).toBe('BOOKLET');
    expect(mutation?.payload?.studentId).toBe('stu-outbox-1');
    expect(mutation?.payload?.amountPaid).toBe(75);
  });
});
