import { describe, it, expect } from 'vitest';
import { createAssessmentSchema, questionSchema } from '../types/assessments.schema';
import { QuestionType } from '../types/assessments.types';

describe('assessments.schema - Collection Bounds & Validation Security', () => {
  const baseValidQuestion = {
    questionText: 'ما هي عاصمة مصر؟',
    questionType: QuestionType.MULTIPLE_CHOICE,
    points: 5,
    displayOrder: 1,
    questionNumber: 1,
    optionsData: ['القاهرة', 'الإسكندرية', 'الجيزة'],
    correctAnswer: 'القاهرة',
  };

  it('validates a valid question schema', () => {
    const result = questionSchema.safeParse(baseValidQuestion);
    expect(result.success).toBe(true);
  });

  it('rejects multiple choice questions with fewer than 2 options', () => {
    const result = questionSchema.safeParse({
      ...baseValidQuestion,
      optionsData: ['القاهرة'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('يجب توفير خيارين على الأقل'))).toBe(true);
    }
  });

  it('enforces maximum collection limit on optionsData (max 20) preventing unbounded arrays', () => {
    const oversizedOptions = Array.from({ length: 25 }, (_, i) => `خيار رقم ${i + 1}`);
    const result = questionSchema.safeParse({
      ...baseValidQuestion,
      optionsData: oversizedOptions,
      correctAnswer: oversizedOptions[0],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('الخيارات لا يمكن أن تتجاوز 20 خياراً'))).toBe(true);
    }
  });

  it('enforces maximum collection limit on optionImages (max 20)', () => {
    const oversizedImages = Array.from({ length: 25 }, (_, i) => `https://example.com/img${i}.png`);
    const result = questionSchema.safeParse({
      ...baseValidQuestion,
      optionImages: oversizedImages,
    });
    expect(result.success).toBe(false);
  });

  it('enforces maximum collection limit on targetGroupIds (max 100)', () => {
    const oversizedGroups = Array.from({ length: 105 }, (_, i) => `group-uuid-${i}`);
    const result = createAssessmentSchema.safeParse({
      title: 'اختبار نصف الفصل',
      totalScore: 100,
      passingScore: 50,
      isAutoGraded: true,
      targetGroupIds: oversizedGroups,
      questions: [baseValidQuestion],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('الحد الأقصى للمجموعات المستهدفة هو 100'))).toBe(true);
    }
  });

  it('enforces maximum collection limit on questions (max 300) preventing memory exhaustion', () => {
    const oversizedQuestions = Array.from({ length: 305 }, (_, i) => ({
      ...baseValidQuestion,
      questionNumber: i + 1,
      displayOrder: i + 1,
    }));
    const result = createAssessmentSchema.safeParse({
      title: 'اختبار تجريبي ضخم',
      totalScore: 1000,
      passingScore: 500,
      isAutoGraded: true,
      questions: oversizedQuestions,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('الحد الأقصى لعدد الأسئلة هو 300 سؤال'))).toBe(true);
    }
  });

  it('rejects assessments where passingScore exceeds totalScore', () => {
    const result = createAssessmentSchema.safeParse({
      title: 'اختبار قصير',
      totalScore: 50,
      passingScore: 60,
      isAutoGraded: true,
      questions: [baseValidQuestion],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('درجة النجاح لا يمكن أن تكون أكبر من الدرجة الكلية'))).toBe(true);
    }
  });
});
