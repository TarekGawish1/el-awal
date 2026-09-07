'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Edit3, MessageSquareHeart, RefreshCw, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { testimonialsApi, Testimonial, TestimonialStatus } from '@/features/testimonials/api/testimonials.api';

const statusLabel: Record<TestimonialStatus, string> = {
  PENDING: 'قيد المراجعة',
  APPROVED: 'منشور',
  REJECTED: 'مرفوض',
};

export default function TeacherTestimonialsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | TestimonialStatus>('PENDING');
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const { data: testimonials = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['testimonials'],
    queryFn: testimonialsApi.getAll,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; content?: string; rating?: number; status?: TestimonialStatus }) => testimonialsApi.update(id, payload),
    onSuccess: () => {
      toast.success('تم حفظ التعديلات.');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['public-testimonials'] });
    },
    onError: (error: Error) => toast.error(error.message || 'تعذر حفظ التعديلات.'),
  });
  const filtered = useMemo(() => filter === 'ALL' ? testimonials : testimonials.filter((item) => item.status === filter), [filter, testimonials]);
  const pendingCount = testimonials.filter((item) => item.status === 'PENDING').length;

  const saveEdit = () => {
    if (!editing || editing.content.trim().length < 10) {
      toast.error('يجب أن يكون النص 10 أحرف على الأقل.');
      return;
    }
    updateMutation.mutate({ id: editing.id, content: editing.content.trim(), rating: editing.rating });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3"><MessageSquareHeart className="text-primary-600" /> آراء الطلاب</h1>
          <p className="text-slate-500 mt-2">راجع آراء الطلاب وعدّلها أو وافق على عرضها في الصفحة الرئيسية.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} isLoading={isFetching} className="gap-2"><RefreshCw className="w-4 h-4" />تحديث</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors ${filter === status ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {status === 'PENDING' ? `قيد المراجعة (${pendingCount})` : status === 'ALL' ? 'الكل' : statusLabel[status]}
          </button>
        ))}
      </div>

      {isLoading ? <div className="h-96 bg-white rounded-2xl animate-pulse" /> : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500">لا توجد آراء ضمن هذا التصنيف.</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((testimonial) => (
            <article key={testimonial.id} className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-slate-900">{testimonial.fullName || testimonial.firstName}</h2>
                  <p className="text-sm text-slate-500 mt-1">{testimonial.gradeLevel || 'المرحلة الدراسية غير محددة'} · {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(testimonial.createdAt))}</p>
                </div>
                <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${testimonial.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : testimonial.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{statusLabel[testimonial.status]}</span>
              </div>
              <div className="flex gap-1 mt-4">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`w-4 h-4 ${index < testimonial.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div>
              <p className="mt-3 text-slate-700 leading-8 whitespace-pre-wrap">{testimonial.content}</p>
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...testimonial })}><Edit3 className="w-4 h-4" />تعديل</Button>
                <Button size="sm" onClick={() => updateMutation.mutate({ id: testimonial.id, status: 'APPROVED' })} isLoading={updateMutation.isPending}><Check className="w-4 h-4" />قبول ونشر</Button>
                <Button size="sm" variant="danger" onClick={() => updateMutation.mutate({ id: testimonial.id, status: 'REJECTED' })} isLoading={updateMutation.isPending}><X className="w-4 h-4" />رفض</Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="تعديل رأي الطالب">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-5">
            <div className="flex justify-between items-center"><h2 className="font-extrabold text-lg">تعديل رأي {editing.fullName || editing.firstName}</h2><button type="button" onClick={() => setEditing(null)} aria-label="إغلاق"><X className="w-5 h-5" /></button></div>
            <div><label className="font-bold text-sm block mb-2">التقييم</label><div className="flex gap-1">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" onClick={() => setEditing({ ...editing, rating })}><Star className={`w-7 h-7 ${rating <= editing.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} /></button>)}</div></div>
            <Textarea value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value.slice(0, 1000) })} rows={7} maxLength={1000} />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={saveEdit} isLoading={updateMutation.isPending}>حفظ التعديل</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
