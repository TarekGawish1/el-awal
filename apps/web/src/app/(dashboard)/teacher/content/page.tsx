import { Metadata } from 'next';
import { ContentContainer } from '@/features/content/components/ContentContainer';

export const metadata: Metadata = {
  title: 'المحتوى التعليمي | منصة الأول',
  description: 'إدارة المحتوى والملفات التعليمية',
};

export default function ContentPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ContentContainer />
    </div>
  );
}
