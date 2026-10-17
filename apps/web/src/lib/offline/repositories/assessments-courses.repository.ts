import { AssessmentEntity, CourseEntity, OfflineAssessmentRecord, IOfflineDatabase } from '../types';

export class AssessmentsCoursesRepository {
  constructor(private db: IOfflineDatabase) {}

  private get memoryAssessments() {
    return this.db.core.memoryAssessments;
  }
  private get memoryCourses() {
    return this.db.core.memoryCourses;
  }
  private get memoryDrafts() {
    return this.db.core.memoryDrafts;
  }
  private isSupported() {
    return this.db.isSupported();
  }
  private getStore(storeName: string, mode: IDBTransactionMode) {
    return this.db.getStore(storeName, mode);
  }

  public async bulkPutAssessments(assessments: AssessmentEntity[]): Promise<void> {
    assessments.forEach((a) => this.memoryAssessments.set(a.id, a));
    if (!this.isSupported() || assessments.length === 0) return;
    try {
      const { store } = await this.getStore('assessments', 'readwrite');
      for (const a of assessments) {
        store.put(a);
      }
    } catch {}
  }


  public async removeAssessment(id: string): Promise<void> {
    this.memoryAssessments.delete(id);
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('assessments', 'readwrite');
      store.delete(id);
    } catch {}
  }


  public async bulkPutCourses(courses: CourseEntity[]): Promise<void> {
    courses.forEach((c) => this.memoryCourses.set(c.id, c));
    if (!this.isSupported() || courses.length === 0) return;
    try {
      const { store } = await this.getStore('courses', 'readwrite');
      for (const c of courses) {
        store.put(c);
      }
    } catch {}
  }

  // ==========================================
  // Offline Query Resolvers (Instant local reads)
  // ==========================================


  public async getAssessmentsOffline(isPublished?: boolean): Promise<AssessmentEntity[]> {
    let list: AssessmentEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memoryAssessments.values());
    } else {
      try {
        const { store } = await this.getStore('assessments', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memoryAssessments.values()));
          req.onerror = () => resolve(Array.from(this.memoryAssessments.values()));
        });
      } catch {
        list = Array.from(this.memoryAssessments.values());
      }
    }
    if (isPublished !== undefined) {
      return list.filter((a) => a.isPublished === isPublished);
    }
    return list;
  }


  public async getAssessmentByIdOffline(id: string): Promise<AssessmentEntity | null> {
    const all = await this.getAssessmentsOffline();
    return all.find((a) => a.id === id) || null;
  }

  public async getCoursesOffline(isPublished?: boolean): Promise<CourseEntity[]> {
    let list: CourseEntity[] = [];
    if (!this.isSupported()) {
      list = Array.from(this.memoryCourses.values());
    } else {
      try {
        const { store } = await this.getStore('courses', 'readonly');
        list = await new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || Array.from(this.memoryCourses.values()));
          req.onerror = () => resolve(Array.from(this.memoryCourses.values()));
        });
      } catch {
        list = Array.from(this.memoryCourses.values());
      }
    }
    if (isPublished !== undefined) {
      return list.filter((c) => c.isPublished === isPublished);
    }
    return list;
  }

  // ==========================================
  // Booklets & Study Notes Operations
  // ==========================================


  public async getCourseByIdOffline(id: string): Promise<CourseEntity | null> {
    const all = await this.getCoursesOffline();
    return all.find((c) => c.id === id) || null;
  }

  public async saveAssessmentDraft(draft: OfflineAssessmentRecord): Promise<void> {
    this.memoryDrafts.set(draft.assessmentId, { ...draft });
    if (!this.isSupported()) return;
    try {
      const { store } = await this.getStore('offline_assessments', 'readwrite');
      store.put(draft);
    } catch {}
  }


  public async getAssessmentDraft(assessmentId: string): Promise<OfflineAssessmentRecord | null> {
    if (!this.isSupported()) {
      return this.memoryDrafts.get(assessmentId) || null;
    }
    try {
      const { store } = await this.getStore('offline_assessments', 'readonly');
      return new Promise((resolve) => {
        const req = store.get(assessmentId);
        req.onsuccess = () => resolve(req.result || this.memoryDrafts.get(assessmentId) || null);
        req.onerror = () => resolve(this.memoryDrafts.get(assessmentId) || null);
      });
    } catch {
      return this.memoryDrafts.get(assessmentId) || null;
    }
  }

  // ==========================================
  // Sync Conflicts Operations
  // ==========================================

}
