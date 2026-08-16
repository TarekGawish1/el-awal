import { AssessmentType } from '@prisma/client';
import { CreateQuestionDto } from './create-question.dto';
export declare class CreateAssessmentDto {
    title: string;
    description?: string;
    type: AssessmentType;
    totalScore: number;
    passingScore?: number;
    durationMinutes?: number;
    dueDate?: string;
    groupId?: string;
    courseId?: string;
    lessonId?: string;
    isPublished?: boolean;
    questions: CreateQuestionDto[];
}
