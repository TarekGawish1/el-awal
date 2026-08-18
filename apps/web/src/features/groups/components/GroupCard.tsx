import Link from 'next/link';
import { Users, CalendarDays, ChevronLeft, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Group } from '../types/groups.types';

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const locations = Array.from(new Set(group.schedules?.map(s => s.location).filter(Boolean)));

  return (
    <Link href={`/teacher/groups/${group.id}`} className="block">
      <Card className="hover:border-primary/50 transition-colors h-full flex flex-col cursor-pointer">
        <div className="p-5 flex-1">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{group.name}</h3>
            <Badge variant={group.status === 'ACTIVE' ? 'success' : 'default'} className="shrink-0 mr-2">
              {group.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
            </Badge>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-slate-700 font-semibold">{group.gradeLevel}</span>
              {group.academicYear && (
                <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  {group.academicYear}
                </span>
              )}
              {group.academicTerm && (
                <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                  {group.academicTerm === 'SECOND_TERM' ? 'ترم ثانٍ' : 'ترم أول'}
                </span>
              )}
            </div>
            {locations.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 w-fit">
                <MapPin className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                <span className="truncate">{locations.join(' • ')}</span>
              </div>
            )}
            {group.description && (
              <p className="text-sm text-slate-600 line-clamp-2">{group.description}</p>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
          <div className="flex space-x-4 space-x-reverse">
            <div className="flex items-center">
              <Users className="w-4 h-4 ml-1.5 text-slate-400" />
              <span>{group._count?.enrollments || 0} / {group.maxCapacity || '∞'} طالب</span>
            </div>
            {group._count?.schedules ? (
              <div className="flex items-center">
                <CalendarDays className="w-4 h-4 ml-1.5 text-slate-400" />
                <span>{group._count.schedules} مواعيد</span>
              </div>
            ) : null}
          </div>
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </div>
      </Card>
    </Link>
  );
}
