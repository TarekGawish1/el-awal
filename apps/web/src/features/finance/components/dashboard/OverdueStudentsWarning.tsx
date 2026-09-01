import { AlertTriangle, CheckCircle2, History, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Defaulter {
  studentId: string;
  fullName: string;
  studentCode: string | null;
  monthlyFeeExpected: number;
  phone: string | null;
  parentPhone: string | null;
  gradeLevel: string;
}

interface OverdueStudentsProps {
  students: Defaulter[];
  groupId?: string;
  onOpenHistory: (studentId: string) => void;
  isLoading: boolean;
}

export function OverdueStudentsWarning({ students, groupId, onOpenHistory, isLoading }: OverdueStudentsProps) {
  if (!groupId) {
    return null; // Don't show anything if no group selected, keep it compact
  }

  if (isLoading) {
    return (
      <div className="h-20 bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-800">لا يوجد طلاب متأخرون عن السداد</h3>
            <p className="text-xs font-semibold text-emerald-600/80 mt-0.5">جميع طلاب المجموعة قاموا بالسداد بنجاح.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-rose-100 bg-rose-50/50 flex justify-between items-center">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-extrabold text-sm">الطلاب المتأخرين عن السداد ({students.length})</h3>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {students.map((student) => {
          const contactPhone = student.parentPhone || student.phone;
          
          return (
            <div key={student.studentId} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-800">{student.fullName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    مطلوب: {student.monthlyFeeExpected} ج.م
                  </span>
                  {student.studentCode && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {student.studentCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {contactPhone && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    onClick={() => window.open(`https://wa.me/2${contactPhone}`, '_blank')}
                  >
                    <MessageCircle className="w-3.5 h-3.5 ml-1.5" />
                    تذكير
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs bg-white"
                  onClick={() => onOpenHistory(student.studentId)}
                >
                  <History className="w-3.5 h-3.5 ml-1.5" />
                  عرض الطالب
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
