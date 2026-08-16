import { QuestionType } from '@prisma/client';
export declare class CreateQuestionDto {
    questionNumber: number;
    questionText: string;
    questionType: QuestionType;
    optionsData?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
}
