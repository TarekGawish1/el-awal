'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CreatorBadge } from '@/components/ui/CreatorBadge';
import { Group } from '../types/groups.types';

interface GroupCardProps {
  group: Group;
  onClick?: () => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  const isSecondTerm = group.academicTerm === 'SECOND_TERM';
  const termText = isSecondTerm ? 'ترم ثانٍ' : 'ترم أول';

  const cardContent = (
    <Card className="hover:border-primary-200 hover:shadow-md transition-all h-full flex flex-col group overflow-hidden bg-white border-slate-200">
      <div className="p-5 flex-1 flex flex-col">
        {/* Top: Status */}
        <div className="mb-3">
          <Badge variant={group.status === 'ACTIVE' ? 'success' : 'default'} className="font-medium text-[11px] px-2 py-0.5">
            {group.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
          </Badge>
        </div>
        
        {/* Middle: Title & Main Info */}
        <div className="space-y-1 mb-4 flex-1">
          <h3 className="font-bold text-lg text-slate-800 line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors">
            {group.name}
          </h3>
          <div className="text-sm font-medium text-slate-700">
            {group.gradeLevel || 'بدون صف'}
          </div>
          
          {/* Secondary Metadata */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-slate-500 font-medium">
            {group.academicYear && (
              <span>{group.academicYear}</span>
            )}
            {group.academicYear && group.academicTerm && (
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            )}
            {group.academicTerm && (
              <span>{termText}</span>
            )}
          </div>

          <CreatorBadge
            createdByName={(group as any).createdByName}
            updatedByName={(group as any).updatedByName}
            compact
            className="mt-2"
          />
        </div>

        {/* Bottom: Students & Action */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center text-sm font-medium text-slate-600">
            <Users className="w-4 h-4 ml-1.5 text-slate-400" />
            <span>{group._count?.enrollments || 0} طالب</span>
          </div>
          
          <div className="flex items-center text-sm font-bold text-primary-600 group-hover:text-primary-700 transition-colors">
            فتح المجموعة
            <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>
      </div>
    </Card>
  );

  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} className="block text-start focus:outline-none h-full outline-none">
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/teacher/groups/${group.id}`} className="block h-full outline-none">
      {cardContent}
    </Link>
  );
}
