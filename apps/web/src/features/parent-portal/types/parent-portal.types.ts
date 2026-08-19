export interface LinkedStudent {
  id: string;
  studentCode?: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gradeLevel: string;
  academicStage?: string | null;
  activeGroups: Array<{ id: string; name: string; gradeLevel: string }>;
}

export interface LinkedStudentRecord {
  linkId: string;
  relationshipType: string;
  student: LinkedStudent;
}
