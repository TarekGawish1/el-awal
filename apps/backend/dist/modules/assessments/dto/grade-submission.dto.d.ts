export declare class ManualQuestionGradeDto {
    questionId: string;
    pointsEarned: number;
    teacherFeedback?: string;
}
export declare class GradeSubmissionDto {
    feedback?: string;
    manualGrades: ManualQuestionGradeDto[];
}
