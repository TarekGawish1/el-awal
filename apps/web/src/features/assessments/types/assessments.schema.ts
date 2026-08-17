import { z } from 'zod';
import { QuestionType } from './assessments.types';

export const questionSchema = z.object({
  questionText: z.string().min(2, 'نص السؤال مطلوب ويجب أن يكون حرفين على الأقل'),
  questionType: z.nativeEnum(QuestionType),
  points: z.coerce.number().min(0.5, 'يجب أن تكون الدرجة 0.5 على الأقل'),
  explanation: z.string().optional(),
  displayOrder: z.number().int(),
  questionNumber: z.number().int(),
  optionsData: z.array(z.string().min(1, 'الخيار لا يمكن أن يكون فارغاً')).optional(),
  correctAnswer: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.questionType === QuestionType.MULTIPLE_CHOICE) {
    if (!data.optionsData || data.optionsData.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يجب توفير خيارين على الأقل',
        path: ['optionsData'],
      });
    }
    if (!data.correctAnswer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يجب تحديد الإجابة الصحيحة',
        path: ['correctAnswer'],
      });
    } else if (data.optionsData && !data.optionsData.includes(data.correctAnswer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'الإجابة الصحيحة يجب أن تكون ضمن الخيارات',
        path: ['correctAnswer'],
      });
    }
  }

  if (data.questionType === QuestionType.TRUE_FALSE) {
    if (!data.correctAnswer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يجب تحديد الإجابة الصحيحة (صح أم خطأ)',
        path: ['correctAnswer'],
      });
    }
  }
});

export const createAssessmentSchema = z.object({
  groupId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  title: z.string().min(3, 'عنوان الاختبار مطلوب ويجب أن يكون 3 أحرف على الأقل'),
  description: z.string().optional(),
  passingScore: z.coerce.number().min(0, 'درجة النجاح يجب أن تكون 0 على الأقل'),
  dueDate: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().min(1, 'المدة يجب أن تكون دقيقة واحدة على الأقل').optional().nullable(),
  isAutoGraded: z.boolean(),
  questions: z.array(questionSchema).min(1, 'يجب إضافة سؤال واحد على الأقل'),
}).superRefine((data, ctx) => {
  const totalScore = data.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  if (data.passingScore > totalScore) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'درجة النجاح لا يمكن أن تكون أكبر من الدرجة الكلية',
      path: ['passingScore'],
    });
  }
});

export type CreateAssessmentFormData = z.infer<typeof createAssessmentSchema>;
export type QuestionFormData = z.infer<typeof questionSchema>;
