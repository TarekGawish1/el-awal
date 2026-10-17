import { z } from 'zod';

export const paymentSchema = z.object({
  studentId: z.string().min(1, 'يجب اختيار الطالب'),
  bookletId: z.string().optional(),
  amountPaid: z.number().min(0, 'المبلغ يجب أن يكون 0 أو أكثر'),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
