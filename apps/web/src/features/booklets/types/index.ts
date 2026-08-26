export interface Booklet {
  id: string;
  title: string;
  price: number;
  gradeLevel: string;
  groupId?: string | null;
  teacherProfileId?: string;
  academicYear?: string;
  academicTerm?: string;
  stockCount?: number | null;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  salesCount?: number;
  totalRevenue?: number;
  group?: {
    id: string;
    name: string;
    gradeLevel?: string;
  } | null;
  payments?: Array<{
    id: string;
    studentId: string;
    studentName?: string;
    amountPaid: number;
    receiptNumber?: string;
    createdAt: string | Date;
  }>;
}

export interface CreateBookletInput {
  title: string;
  price: number;
  gradeLevel: string;
  groupId?: string | null;
  stockCount?: number | null;
  academicYear?: string;
  academicTerm?: string;
}

export interface UpdateBookletInput {
  title?: string;
  price?: number;
  gradeLevel?: string;
  groupId?: string | null;
  stockCount?: number | null;
  isActive?: boolean;
}
