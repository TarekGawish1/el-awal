import { PaymentEntity, StudentEntity, IOfflineDatabase } from '../types';

export class PaymentsRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryPayments() {
    return this.db.core.memoryPayments;
  }
  private get memoryStudents() {
    return this.db.core.memoryStudents;
  }
  private get memoryOutbox() {
    return this.db.core.memoryOutbox;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }
  private getPendingMutations() {
    return this.db.getPendingMutations();
  }
  private getPendingEntityIds() {
    return this.db.getPendingEntityIds();
  }
  private revertBookletPaymentEffectsOffline(bookletId: string, amountPaid: number) {
    return this.db.revertBookletPaymentEffectsOffline(bookletId, amountPaid);
  }

  public async bulkPutPayments(payments: PaymentEntity[]): Promise<void> {
    const pendingIds = await this.getPendingEntityIds();
    payments.forEach((p) => {
      if (!pendingIds.has(p.id)) this.memoryPayments.set(p.id, p);
    });
    if (!this.isSupported() || payments.length === 0) return;
    try {
      const { store } = await this.getStore('payments', 'readwrite');
      for (const p of payments) {
        if (!pendingIds.has(p.id)) store.put(p);
      }
    } catch {}
  }


  public async getPaymentsOffline(options?: {
    groupId?: string;
    studentId?: string;
    year?: number;
    month?: number;
  }): Promise<PaymentEntity[]> {
    if (!(await this.db.isUserAuthorizedForOfflineData())) {
      return [];
    }

    let list: PaymentEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memoryPayments.values());
    } else {
      try {
        const { store } = await this.getStore('payments', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memoryPayments.values()));
          req.onerror = () => resolve(Array.from(this.memoryPayments.values()));
        });
      } catch {
        list = Array.from(this.memoryPayments.values());
      }
    }

    if (!options) return list;

    return list.filter((p) => {
      if (options.groupId && p.groupId !== options.groupId) return false;
      if (options.studentId && p.studentId !== options.studentId) return false;
      if (options.year && p.periodYear !== options.year) return false;
      if (options.month && p.periodMonth !== options.month) return false;
      return true;
    });
  }

  public async putPayment(payment: PaymentEntity): Promise<void> {
    this.memoryPayments.set(payment.id, payment);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('payments', 'readwrite');
      store.put(payment);
    } catch {}
  }


  public async isPaymentRecordedOffline(
    studentId: string,
    groupId: string | null | undefined,
    year: number,
    month: number,
  ): Promise<{ isRecorded: boolean; existingPayment?: any }> {
    const cleanStudentId = String(studentId).trim();
    const cleanGroupId = groupId ? String(groupId).trim() : null;

    // 1. Check local payments store
    const localPayments = await this.getPaymentsOffline({
      studentId: cleanStudentId,
      year,
      month,
    });

    const matchingLocal = localPayments.find((p) => {
      if (cleanGroupId && p.groupId && p.groupId !== cleanGroupId) return false;
      return p.paymentStatus === 'PAID' || Number(p.amountPaid) > 0;
    });

    if (matchingLocal) {
      return { isRecorded: true, existingPayment: matchingLocal };
    }

    // 2. Check pending outbox mutations
    const pending = await this.getPendingMutations();
    const matchingMutation = pending.find((m) => {
      if (m.domain !== 'finance') return false;
      const p = m.payload || {};
      if (String(p.studentId || '').trim() !== cleanStudentId) return false;
      if (Number(p.periodYear) !== Number(year) || Number(p.periodMonth) !== Number(month)) return false;
      if (cleanGroupId && p.groupId && String(p.groupId).trim() !== cleanGroupId) return false;
      return true;
    });

    if (matchingMutation) {
      return { isRecorded: true, existingPayment: matchingMutation.payload };
    }

    return { isRecorded: false };
  }

  /**
   * Optimistically updates student record and roster cache to mark the student as PAID for the current period.
   */

  public async markStudentPaidOffline(
    studentId: string,
    paymentRecord: Partial<PaymentEntity>,
  ): Promise<void> {
    const cleanId = String(studentId).trim();
    const student = this.memoryStudents.get(cleanId);
    if (student) {
      student.academicStatus = 'ACTIVE';
      student.paymentRecords = student.paymentRecords || [];
      student.paymentRecords.push({
        id: paymentRecord.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`),
        periodYear: paymentRecord.periodYear,
        periodMonth: paymentRecord.periodMonth,
        amountPaid: paymentRecord.amountPaid,
        paymentStatus: 'PAID',
        paymentMethod: paymentRecord.paymentMethod || 'CASH',
        createdAt: paymentRecord.createdAt || new Date().toISOString(),
      });
      this.memoryStudents.set(cleanId, { ...student });
    }

    if (!this.isSupported()) return;

    try {
      const { store } = await this.getStore('students', 'readwrite');
      const getReq = store.get(cleanId);
      getReq.onsuccess = () => {
        const s = getReq.result as StudentEntity;
        if (s) {
          s.academicStatus = 'ACTIVE';
          s.paymentRecords = s.paymentRecords || [];
          s.paymentRecords.push({
            id: paymentRecord.id || `pay-${Date.now()}`,
            periodYear: paymentRecord.periodYear,
            periodMonth: paymentRecord.periodMonth,
            amountPaid: paymentRecord.amountPaid,
            paymentStatus: 'PAID',
            paymentMethod: paymentRecord.paymentMethod || 'CASH',
            createdAt: paymentRecord.createdAt || new Date().toISOString(),
          });
          store.put(s);
        }
      };
    } catch (e) {
      console.warn('Failed to markStudentPaidOffline in IndexedDB:', e);
    }
  }

  /**
   * Removes a single payment entry (matching by id) from a student's embedded
   * paymentRecords array, effectively reverting them to "unpaid" for that record's period/booklet.
   */

  public async removePaymentRecordFromStudent(studentId: string, paymentId: string): Promise<void> {
    const cleanStudentId = String(studentId).trim();
    const student = this.memoryStudents.get(cleanStudentId);
    if (student && Array.isArray(student.paymentRecords)) {
      student.paymentRecords = student.paymentRecords.filter((p: any) => p.id !== paymentId);
      this.memoryStudents.set(cleanStudentId, { ...student });
    }

    if (!this.isSupported()) return;

    try {
      const { store } = await this.getStore('students', 'readwrite');
      const getReq = store.get(cleanStudentId);
      getReq.onsuccess = () => {
        const s = getReq.result as StudentEntity;
        if (s && Array.isArray(s.paymentRecords)) {
          s.paymentRecords = s.paymentRecords.filter((p: any) => p.id !== paymentId);
          store.put(s);
        }
      };
    } catch (e) {
      console.warn('Failed to removePaymentRecordFromStudent in IndexedDB:', e);
    }
  }

  /**
   * Fetches a single payment record by id from the offline payments store.
   */

  public async getPaymentByIdOffline(id: string): Promise<PaymentEntity | null> {
    const cleanId = String(id).trim();
    if (!this.isSupported()) {
      return this.memoryPayments.get(cleanId) || null;
    }
    try {
      const { store } = await this.getStore('payments', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(cleanId);
        req.onsuccess = () => resolve(req.result || this.memoryPayments.get(cleanId) || null);
        req.onerror = () => resolve(this.memoryPayments.get(cleanId) || null);
      });
    } catch {
      return this.memoryPayments.get(cleanId) || null;
    }
  }

  /**
   * Removes a payment record from the local payments store (memory + IndexedDB).
   */

  public async removePayment(id: string): Promise<void> {
    const cleanId = String(id).trim();
    this.memoryPayments.delete(cleanId);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('payments', 'readwrite');
      store.delete(cleanId);
    } catch {}
  }

  /**
   * Reverses the local stock/revenue side-effects that were applied when a booklet
   * payment was originally recorded offline (used when deleting/undoing that payment).
   */

  public async deletePaymentLocally(paymentId: string): Promise<PaymentEntity | null> {
    const cleanId = String(paymentId).trim();
    const payment = await this.getPaymentByIdOffline(cleanId);
    if (!payment) return null;

    await this.removePayment(cleanId);

    if (payment.studentId) {
      await this.removePaymentRecordFromStudent(payment.studentId, cleanId);
    }

    if (payment.paymentType === 'BOOKLET' && payment.bookletId) {
      await this.revertBookletPaymentEffectsOffline(payment.bookletId, Number(payment.amountPaid || 0));
    }

    return payment;
  }

  // ==========================================
  // Session Reports & Attendance Operations
  // ==========================================

}
