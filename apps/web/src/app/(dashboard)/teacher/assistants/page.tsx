'use client';

import React from 'react';
import { AssistantsList } from '@/features/assistants/components/AssistantsList';
import { InviteAssistantForm } from '@/features/assistants/components/InviteAssistantForm';
import { ShieldCheck } from 'lucide-react';

export default function AssistantsManagementPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-100 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800">إدارة المساعدين وصلاحيات الوصول</h1>
        </div>
        <p className="text-neutral-500 font-medium mr-14">
          أضف مساعدين، حدد مهامهم، وتحكم بدقة في صلاحياتهم.
        </p>
      </div>

      {/* Invite Form */}
      <InviteAssistantForm />

      {/* Assistants List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
          المساعدين الحاليين
        </h2>
        <AssistantsList />
      </div>
    </div>
  );
}
