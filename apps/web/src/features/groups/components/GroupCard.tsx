import Link from 'next/link';
import { Users, CalendarDays, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Group } from '../types/groups.types';

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
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
            <p className="text-sm text-slate-500 font-medium">{group.gradeLevel}</p>
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
