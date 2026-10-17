import { BookletEntity, PaymentEntity, IOfflineDatabase } from '../types';

export class BookletsRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryBooklets() {
    return this.db.core.memoryBooklets;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }
  private getPaymentsOffline(options?: any) {
    return this.db.getPaymentsOffline(options);
  }
  private getPendingMutations() {
    return this.db.getPendingMutations();
  }
  private getStudentByIdOffline(id: string | number) {
    return this.db.getStudentByIdOffline(id);
  }
  private putPayment(payment: PaymentEntity) {
    return this.db.putPayment(payment);
  }
  private enqueueMutation(mutation: any) {
    return this.db.enqueueMutation(mutation);
  }

  public async bulkPutBooklets(booklets: BookletEntity[]): Promise<void> {
    booklets.forEach((b) => {
      const existing = this.memoryBooklets.get(b.id) || {};
      this.memoryBooklets.set(b.id, { ...existing, ...b, updatedAt: Date.now() });
    });
    if (!this.isSupported() || booklets.length === 0) return;
    try {
      const { store } = await this.getStore('booklets', 'readwrite');
      for (const b of booklets) {
        store.put(b);
      }
    } catch {}
  }


  public async putBooklet(booklet: BookletEntity): Promise<void> {
    const existing = this.memoryBooklets.get(booklet.id) || {};
    this.memoryBooklets.set(booklet.id, { ...existing, ...booklet, updatedAt: Date.now() });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('booklets', 'readwrite');
      store.put(booklet);
    } catch {}
  }


  public async removeBooklet(id: string): Promise<void> {
    this.memoryBooklets.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('booklets', 'readwrite');
      store.delete(id);
    } catch {}
  }


  public async getBookletsOffline(
    gradeLevelOrFilter?:
      | string
      | {
          gradeLevel?: string;
          groupId?: string;
          groupIds?: string[];
          isActive?: boolean;
        },
    groupIdsArg?: string[],
  ): Promise<BookletEntity[]> {
    let list: BookletEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memoryBooklets.values());
    } else {
      try {
        const { store } = await this.getStore('booklets', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memoryBooklets.values()));
          req.onerror = () => resolve(Array.from(this.memoryBooklets.values()));
        });
      } catch {
        list = Array.from(this.memoryBooklets.values());
      }
    }

    if (typeof gradeLevelOrFilter === 'string') {
      const grade = gradeLevelOrFilter;
      const groupIds = groupIdsArg || [];
      return list.filter((b) => {
        if (b.isActive === false) return false;
        if (grade && b.gradeLevel && b.gradeLevel !== grade) return false;
        if (b.groupId) {
          if (!groupIds.includes(b.groupId)) return false;
        }
        return true;
      });
    }

    const filter = gradeLevelOrFilter;
    if (!filter) return list;

    return list.filter((b) => {
      if (filter.isActive !== undefined && b.isActive !== filter.isActive) return false;
      if (filter.gradeLevel && b.gradeLevel && b.gradeLevel !== filter.gradeLevel) return false;
      if (filter.groupIds !== undefined) {
        if (b.groupId && !filter.groupIds.includes(b.groupId)) return false;
      } else if (filter.groupId) {
        if (b.groupId !== filter.groupId) return false;
      }
      return true;
    });
  }


  public async getBookletByIdOffline(id: string): Promise<BookletEntity | null> {
    const cleanId = String(id).trim();
    if (!this.isSupported()) {
      return this.memoryBooklets.get(cleanId) || null;
    }
    try {
      const { store } = await this.getStore('booklets', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(cleanId);
        req.onsuccess = () => resolve(req.result || this.memoryBooklets.get(cleanId) || null);
        req.onerror = () => resolve(this.memoryBooklets.get(cleanId) || null);
      });
    } catch {
      return this.memoryBooklets.get(cleanId) || null;
    }
  }


  public async isBookletPaymentRecordedOffline(
    studentId: string,
    bookletId: string,
  ): Promise<{ isRecorded: boolean; existingPayment?: any }> {
    const cleanStudentId = String(studentId).trim();
    const cleanBookletId = String(bookletId).trim();

    // 1. Check local payments store
    const localPayments = await this.getPaymentsOffline({ studentId: cleanStudentId });
    const matchingLocal = localPayments.find(
      (p) =>
        p.paymentType === 'BOOKLET' &&
        p.bookletId === cleanBookletId &&
        (p.paymentStatus === 'PAID' || Number(p.amountPaid) > 0),
    );

    if (matchingLocal) {
      return { isRecorded: true, existingPayment: matchingLocal };
    }

    // 2. Check pending outbox mutations
    const pendingMutations = await this.getPendingMutations();
    const matchingMutation = pendingMutations.find(
      (m) =>
        m.payload &&
        (m.payload.paymentType === 'BOOKLET' || m.payload.bookletId) &&
        m.payload.studentId === cleanStudentId &&
        m.payload.bookletId === cleanBookletId,
    );

    if (matchingMutation) {
      return { isRecorded: true, existingPayment: matchingMutation.payload };
    }

    return { isRecorded: false };
  }


  public async recordBookletPaymentOffline(params: {
    studentId: string;
    bookletId: string;
    amountPaid: number;
    amountExpected?: number;
    groupId?: string;
    notes?: string;
    receiptNumber?: string;
    paymentMethod?: string;
  }): Promise<PaymentEntity> {
    // Duplicate guard: check if this booklet payment is already recorded or queued
    const { isRecorded } = await this.isBookletPaymentRecordedOffline(params.studentId, params.bookletId);
    if (isRecorded) {
      throw new Error('DUPLICATE_PAYMENT: تم تسجيل سداد هذه المذكرة مسبقاً لهذا الطالب');
    }

    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;
    const paymentId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `pay-bkt-${crypto.randomUUID()}`
      : `pay-bkt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const booklet = await this.getBookletByIdOffline(params.bookletId);
    const student = await this.getStudentByIdOffline(params.studentId);

    if (student?.gradeLevel && booklet?.gradeLevel && student.gradeLevel !== booklet.gradeLevel) {
      throw new Error(
        `INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب (${booklet.gradeLevel} != ${student.gradeLevel})`,
      );
    }

    if (booklet?.groupId) {
      const studentGroupId = student?.groupId || (student as any)?.initialGroupId;
      const studentGroupIds = (student as any)?.groupIds || (studentGroupId ? [studentGroupId] : []);
      if (studentGroupIds.length > 0 && !studentGroupIds.includes(booklet.groupId)) {
        throw new Error(
          'INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب',
        );
      }
    }

    const expected = params.amountExpected ?? (booklet ? Number(booklet.price) : params.amountPaid);

    const paymentRecord: PaymentEntity = {
      id: paymentId,
      studentId: params.studentId,
      groupId: params.groupId || booklet?.groupId || null,
      periodYear,
      periodMonth,
      paymentType: 'BOOKLET',
      bookletId: params.bookletId,
      booklet: booklet ? { id: booklet.id, title: booklet.title, price: booklet.price } : null,
      amountPaid: params.amountPaid,
      amountExpected: expected,
      paymentStatus: 'PAID',
      paymentMethod: params.paymentMethod || 'CASH',
      currency: 'EGP',
      receiptNumber: params.receiptNumber || `REC-BKT-${Date.now().toString().slice(-6)}`,
      notes: params.notes || (booklet ? `سداد مذكرة: ${booklet.title}` : 'سداد قيمة مذكرة'),
      recordedById: 'offline-teacher',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 1. Put payment in offline payments store
    await this.putPayment(paymentRecord);

    // 2. Decrement booklet stock locally if tracked
    if (booklet && booklet.stockCount !== null && booklet.stockCount !== undefined && booklet.stockCount > 0) {
      const updatedBooklet = {
        ...booklet,
        stockCount: booklet.stockCount - 1,
        salesCount: (booklet.salesCount || 0) + 1,
        totalRevenue: (booklet.totalRevenue || 0) + params.amountPaid,
      };
      await this.putBooklet(updatedBooklet);
    }

    // 3. Enqueue Outbox Mutation for upstream sync
    await this.enqueueMutation({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mut-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      domain: 'finance',
      endpoint: '/subscriptions/payment',
      method: 'POST',
      payload: {
        type: 'CREATE_PAYMENT',
        studentId: params.studentId,
        groupId: params.groupId || booklet?.groupId || null,
        bookletId: params.bookletId,
        paymentType: 'BOOKLET',
        periodYear,
        periodMonth,
        amount: params.amountPaid,
        amountPaid: params.amountPaid,
        amountExpected: expected,
        paymentMethod: params.paymentMethod || 'CASH',
        receiptNumber: paymentRecord.receiptNumber,
        notes: paymentRecord.notes,
        collectedAt: now.toISOString(),
      },
      optimisticId: paymentId,
      status: 'PENDING',
      retryCount: 0,
      clientTimestamp: Date.now(),
    });

    return paymentRecord;
  }

  // ==========================================
  // Outbox Mutations Operations
  // ==========================================


  public async revertBookletPaymentEffectsOffline(bookletId: string, amountPaid: number): Promise<void> {
    const booklet = await this.getBookletByIdOffline(bookletId);
    if (!booklet) return;

    const updatedBooklet: BookletEntity = {
      ...booklet,
      stockCount:
        booklet.stockCount !== null && booklet.stockCount !== undefined
          ? booklet.stockCount + 1
          : booklet.stockCount,
      salesCount: Math.max(0, (booklet.salesCount || 0) - 1),
      totalRevenue: Math.max(0, (booklet.totalRevenue || 0) - Number(amountPaid || 0)),
    };

    await this.putBooklet(updatedBooklet);
  }

  /**
   * Fully reverts all local side-effects of a payment record being deleted:
   * removes it from the payments store, removes it from the owning student's
   * embedded paymentRecords array, and reverses booklet stock/revenue counters
   * when applicable. Returns the removed payment entity (or null if not found).
   */
}
