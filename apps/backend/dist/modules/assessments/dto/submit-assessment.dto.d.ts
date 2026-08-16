export declare class StudentAnswerItemDto {
    questionId: string;
    answerGiven: string;
}
export declare class SubmitAssessmentDto {
    answers: StudentAnswerItemDto[];
    attachmentUrl?: string;
}
