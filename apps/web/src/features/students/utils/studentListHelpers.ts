import { AcademicStatus, StudentListItem } from '../types/students.types';

export const STAGE_GRADES_MAP: Record<string, string[]> = {
  'المرحلة الابتدائية': [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  'المرحلة الإعدادية': [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  'المرحلة الثانوية': [
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
};

export const getStageName = (gradeLevel?: string, academicStage?: string) => {
  if (academicStage === 'PRIMARY' || gradeLevel?.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (academicStage === 'PREPARATORY' || academicStage === 'MIDDLE' || gradeLevel?.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (academicStage === 'SECONDARY' || gradeLevel?.includes('الثانوي')) return 'المرحلة الثانوية';
  return 'أخرى';
};

export const getStatusColor = (status: AcademicStatus | string) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'LEFT':
      return 'warning';
    case 'GRADUATED':
      return 'info';
    case 'DROPPED_OUT':
      return 'warning';
    case 'SUSPENDED':
      return 'error';
    default:
      return 'default';
  }
};

export const getStatusText = (status: AcademicStatus | string) => {
  switch (status) {
    case 'ACTIVE':
      return 'نشط';
    case 'LEFT':
      return 'غادر السنتر';
    case 'GRADUATED':
      return 'خريج';
    case 'DROPPED_OUT':
      return 'منسحب';
    case 'SUSPENDED':
      return 'موقوف';
    case 'ARCHIVED':
      return 'مؤرشف';
    default:
      return status;
  }
};

export interface StudentFilterCriteria {
  searchTerm: string;
  selectedStages: string[];
  selectedGrades: string[];
  selectedGroups: string[];
  selectedYears: string[];
  selectedTerms: string[];
  groupMap: Map<string, any>;
}

export function filterStudentsList(
  students: StudentListItem[] | undefined,
  criteria: StudentFilterCriteria
): StudentListItem[] {
  if (!students) return [];
  const {
    searchTerm,
    selectedStages,
    selectedGrades,
    selectedGroups,
    selectedYears,
    selectedTerms,
    groupMap,
  } = criteria;

  const q = searchTerm.trim().toLowerCase();

  return students.filter((student) => {
    // 1. Search filter
    const matchesSearch =
      !q ||
      student.user.fullName.toLowerCase().includes(q) ||
      student.studentCode.toLowerCase().includes(q) ||
      (student.user.phone && student.user.phone.includes(q)) ||
      (student.gradeLevel && student.gradeLevel.toLowerCase().includes(q)) ||
      (student.groupEnrollments &&
        student.groupEnrollments.some((e) => e.group.name.toLowerCase().includes(q)));

    // 2. Stage filter
    const stage = getStageName(student.gradeLevel, student.academicStage);
    const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);

    // 3. Grade filter
    const matchesGrade =
      selectedGrades.length === 0 ||
      (student.gradeLevel && selectedGrades.includes(student.gradeLevel));

    // 4. Group filter
    const isUnassigned = !student.groupEnrollments || student.groupEnrollments.length === 0;
    const matchesGroup =
      selectedGroups.length === 0 ||
      (selectedGroups.includes('UNASSIGNED') && isUnassigned) ||
      (student.groupEnrollments &&
        student.groupEnrollments.some((e) => selectedGroups.includes(e.group.id)));

    // 5. Academic Year filter
    const matchesYear =
      selectedYears.length === 0 ||
      isUnassigned ||
      (student.groupEnrollments &&
        student.groupEnrollments.some((e) => {
          const groupInfo = groupMap.get(e.group.id);
          return groupInfo?.academicYear && selectedYears.includes(groupInfo.academicYear);
        }));

    // 6. Academic Term filter
    const matchesTerm =
      selectedTerms.length === 0 ||
      isUnassigned ||
      (student.groupEnrollments &&
        student.groupEnrollments.some((e) => {
          const groupInfo = groupMap.get(e.group.id);
          return groupInfo?.academicTerm && selectedTerms.includes(groupInfo.academicTerm);
        }));

    return matchesSearch && matchesStage && matchesGrade && matchesGroup && matchesYear && matchesTerm;
  });
}
