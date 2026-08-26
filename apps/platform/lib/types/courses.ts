export interface CourseCatalogItem {
  id: string;
  teacherId: string;
  title: string;
  description: string | null;
  subject: string;
  gradeLevel: string;
  academicStage: string | null;
  academicYear: string;
  academicTerm: string;
  price: number;
  coverImageUrl: string | null;
  status: string;
  orderIndex: number;
  enforceSequentialLessons: boolean;
  hasCertificate: boolean;
  courseQuizId: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: {
    user: {
      fullName: string;
    };
  };
  _count: {
    modules: number;
    enrollments: number;
  };
}

export interface PaginatedCourseResponse {
  data: CourseCatalogItem[];
  meta: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}
