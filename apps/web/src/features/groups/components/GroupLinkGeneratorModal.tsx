'use client';

import { useMemo, useState } from 'react';
import { X, Link2, Copy, Check, Search, GraduationCap, MessageCircle, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useGroups, useGenerateRegistrationLink } from '../hooks/useGroups';
import { STAGE_ORDER, STAGE_GRADES_MAP, getStageName } from '../utils/group-stages';
import { useAuthStore } from '@/features/auth/store/auth.store';

interface GroupLinkGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupLinkGeneratorModal({ isOpen, onClose }: GroupLinkGeneratorModalProps) {
  const { data: groups, isLoading } = useGroups();
  const { mutate: generateLink, data: link, isPending, reset } = useGenerateRegistrationLink();
  const teacherName = useAuthStore((state) => state.user?.fullName);

  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const stageOptions = useMemo(() => {
    const stages = new Set<string>();
    (groups || []).forEach((g) => stages.add(getStageName(g.gradeLevel)));
    return Array.from(stages)
      .sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b))
      .map((stage) => ({ label: stage, value: stage }));
  }, [groups]);

  const gradeOptions = useMemo(() => {
    if (!selectedStage) return [];
    const grades: string[] = [...(STAGE_GRADES_MAP[selectedStage] || [])];
    (groups || []).forEach((g) => {
      if (getStageName(g.gradeLevel) === selectedStage && g.gradeLevel && !grades.includes(g.gradeLevel)) {
        grades.push(g.gradeLevel);
      }
    });
    return grades.map((grade) => ({ label: grade, value: grade }));
  }, [selectedStage, groups]);

  const groupOptions = useMemo(() => {
    if (!selectedStage || !selectedGrade) return [];
    const q = searchQuery.trim().toLowerCase();
    return (groups || [])
      .filter(
        (g) =>
          getStageName(g.gradeLevel) === selectedStage &&
          g.gradeLevel === selectedGrade &&
          (!q || g.name.toLowerCase().includes(q)),
      )
      .map((g) => ({ label: g.name, value: g.id }));
  }, [groups, selectedStage, selectedGrade, searchQuery]);

  const handleStageChange = (value: string) => {
    setSelectedStage(value);
    setSelectedGrade('');
    setSelectedGroupId('');
    reset();
  };

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
    setSelectedGroupId('');
    reset();
  };

  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value);
    reset();
    if (value) {
      generateLink(value);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.registrationUrl);
      setCopied(true);
      toast.success('تم نسخ الرابط بنجاح ✅');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('تعذر نسخ الرابط، يرجى نسخه يدوياً');
    }
  };

  const handleWhatsAppShare = () => {
    if (!link) return;
    const teacher = teacherName || 'الأستاذ';
    const message = `أهلاً بكم يا شباب! ده رابط التسجيل المباشر لمجموعة ${link.groupName} مع ${teacher} على منصة الأول: ${link.registrationUrl}. يرجى الدخول وتسجيل بياناتك للانضمام فوراً.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    setSelectedStage('');
    setSelectedGrade('');
    setSelectedGroupId('');
    setSearchQuery('');
    setCopied(false);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="إنشاء رابط تسجيل للمجموعة"
    >
      <div
        className="relative bg-white rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-50 p-2.5 rounded-xl text-primary-600">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">إنشاء رابط تسجيل للمجموعة</h2>
              <p className="text-xs text-slate-500 mt-0.5">اختر المجموعة لإنشاء رابط تسجيل مباشر قابل للمشاركة</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100/80 hover:bg-slate-200 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cascading Filters */}
        <div className="space-y-4" data-testid="link-generator-filters">
          <Select
            id="link-stage"
            label="المرحلة الدراسية"
            value={selectedStage}
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={isLoading}
            options={[
              { label: '-- اختر المرحلة الدراسية --', value: '' },
              ...stageOptions,
            ]}
          />

          <Select
            id="link-grade"
            label="الصف الدراسي"
            value={selectedGrade}
            onChange={(e) => handleGradeChange(e.target.value)}
            disabled={!selectedStage || isLoading}
            options={[
              { label: selectedStage ? '-- اختر الصف الدراسي --' : '-- اختر المرحلة أولاً --', value: '' },
              ...gradeOptions,
            ]}
          />

          <Input
            id="link-group-search"
            placeholder="ابحث عن المجموعة بالاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!selectedGrade}
            startIcon={<Search className="h-4 w-4" />}
          />

          <Select
            id="link-group"
            label="اختر المجموعة الدراسية"
            value={selectedGroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            disabled={!selectedGrade || isLoading}
            options={[
              { label: selectedGrade ? '-- اختر المجموعة الدراسية --' : '-- اختر الصف أولاً --', value: '' },
              ...groupOptions,
            ]}
          />

          {!isLoading && selectedGrade && groupOptions.length === 0 && (
            <p className="text-xs text-slate-500 text-center bg-slate-50 rounded-xl py-3">
              لا توجد مجموعات مطابقة في هذا الصف
            </p>
          )}
        </div>

        {/* Generated Link Card */}
        {isPending && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري إنشاء رابط التسجيل...</span>
          </div>
        )}

        {link && !isPending && (
          <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/40 p-4 space-y-3 animate-in fade-in-50 duration-200" data-testid="generated-link-card">
            <div className="flex items-center justify-between border-b border-primary-100 pb-2.5">
              <div className="flex items-center gap-2 text-primary-900 font-extrabold text-sm">
                <GraduationCap className="h-5 w-5 text-primary-600" />
                <span>{link.groupName}</span>
              </div>
              <span className="text-[11px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                رابط جاهز للمشاركة
              </span>
            </div>

            <div className="bg-white rounded-xl p-3 border border-primary-100">
              <p className="text-[11px] font-semibold text-neutral-500 mb-1">رابط التسجيل المباشر</p>
              <p className="font-mono text-xs text-primary-800 break-all" dir="ltr" data-testid="generated-link-url">
                {link.registrationUrl}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleCopy}
                className="w-full text-sm font-bold"
                aria-label="نسخ الرابط"
              >
                {copied ? <Check className="w-4 h-4 ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
                <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsAppShare}
                className="w-full text-sm font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                aria-label="مشاركة عبر واتساب"
              >
                <MessageCircle className="w-4 h-4 ml-2" />
                <span>مشاركة عبر واتساب</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary-500" />
              <span>
                أي طالب يفتح هذا الرابط سيمكنه إدخال بياناته والانضمام للمجموعة مباشرة بدون موافقة مسبقة.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
