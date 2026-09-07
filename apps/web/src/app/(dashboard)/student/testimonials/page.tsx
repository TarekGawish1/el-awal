'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareHeart, Star, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { testimonialsApi, TestimonialStatus } from '@/features/testimonials/api/testimonials.api';

const STATUS_DETAILS: Record<TestimonialStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  PENDING: { label: 'قيد المراجعة', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3 },
  APPROVED: { label: 'تم النشر', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'لم تتم الموافقة', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

export default function StudentTestimonialsPage() {
  const queryClient = useQueryClient();
  const { data: testimonial, isLoading } = useQuery({
    queryKey: ['my-testimonial'],
    queryFn: testimonialsApi.getMine,
  });
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (testimonial) {
      setContent(testimonial.content);
      setRating(testimonial.rating);
    }
  }, [testimonial]);

  const createMutation = useMutation({
    mutationFn: testimonialsApi.create,
    onSuccess: () => {
      toast.success('شكراً لرأيك! سيتم مراجعته قبل عرضه على الصفحة الرئيسية.');
      queryClient.invalidateQueries({ queryKey: ['my-testimonial'] });
    },
    onError: (error: Error) => toast.error(error.message || 'تعذر إرسال رأيك، حاول مرة أخرى.'),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (content.trim().length < 10) {
      toast.error('اكتب رأياً لا يقل عن 10 أحرف.');
      return;
    }
    createMutation.mutate({ content: content.trim(), rating });
  };

  const status = testimonial ? STATUS_DETAILS[testimonial.status] : null;
  const StatusIcon = status?.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12" dir="rtl">
      <div className="rounded-3xl bg-gradient-to-l from-primary-700 to-indigo-600 p-6 sm:p-8 text-white shadow-lg">
        <MessageSquareHeart className="w-9 h-9 mb-4 text-white/90" />
        <h1 className="text-2xl sm:text-3xl font-extrabold">شاركنا رأيك</h1>
        <p className="mt-2 text-sm sm:text-base text-white/85 leading-relaxed">
          تجربتك تساعد طلاباً آخرين. لن يظهر رأيك على الصفحة الرئيسية إلا بعد مراجعته من إدارة المنصة.
        </p>
      </div>

      {isLoading ? (
        <div className="h-72 rounded-2xl bg-white animate-pulse border border-slate-100" />
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-7 space-y-6">
          {testimonial && status && StatusIcon && (
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${status.className}`}>
              <StatusIcon className="w-5 h-5" />
              <span>حالة رأيك: {status.label}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-3">تقييمك للمنصة</label>
            <div className="flex gap-2" role="radiogroup" aria-label="تقييم المنصة">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={`${value} نجوم`}
                  aria-checked={rating === value}
                  role="radio"
                >
                  <Star className={`w-8 h-8 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between gap-3 mb-2">
              <label htmlFor="testimonial-content" className="font-bold text-slate-800">اكتب تجربتك</label>
              <span className="text-xs text-slate-400">{content.length}/1000</span>
            </div>
            <Textarea
              id="testimonial-content"
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, 1000))}
              placeholder="كيف ساعدتك منصة الأول في دراستك؟"
              minLength={10}
              maxLength={1000}
              required
              rows={7}
              className="resize-y leading-relaxed"
            />
          </div>

          <Button type="submit" size="lg" isLoading={createMutation.isPending} className="w-full sm:w-auto">
            {testimonial ? 'إرسال رأي جديد للمراجعة' : 'إرسال رأيي للمراجعة'}
          </Button>
        </form>
      )}
    </div>
  );
}
