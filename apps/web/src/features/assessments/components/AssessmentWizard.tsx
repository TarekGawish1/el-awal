'use client';

import React from 'react';
import { FormProvider } from 'react-hook-form';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { useAssessmentWizard } from '../hooks/useAssessmentWizard';
import { WizardProgressStepper } from './wizard/WizardProgressStepper';
import { WizardStepBasicInfo } from './wizard/WizardStepBasicInfo';
import { WizardStepSettings } from './wizard/WizardStepSettings';
import { WizardStepQuestionBuilder } from './wizard/WizardStepQuestionBuilder';
import { WizardStepReview } from './wizard/WizardStepReview';

export function AssessmentWizard({
  type = 'EXAM',
}: {
  type?: 'EXAM' | 'ASSIGNMENT';
}) {
  const isOnline = useOnlineStatus();
  const wizard = useAssessmentWizard({ type });

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName={type === 'ASSIGNMENT' ? 'إنشاء واجب' : 'إنشاء اختبار'}
        description={
          type === 'ASSIGNMENT'
            ? 'إنشاء الواجبات وتوليد الأسئلة يتطلب اتصالاً نشطاً بالخادم.'
            : 'إنشاء الاختبارات وتوليد الأسئلة يتطلب اتصالاً نشطاً بالخادم.'
        }
        backHref="/teacher/dashboard"
      />
    );
  }

  return (
    <FormProvider {...wizard.methods}>
      <div className="max-w-4xl mx-auto pb-64">
        {/* Progress Stepper */}
        <WizardProgressStepper currentStep={wizard.currentStep} />

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
          {wizard.currentStep === 'metadata' && (
            <div className="p-6 sm:p-8 space-y-6">
              <WizardStepBasicInfo
                methods={wizard.methods}
                type={type}
                courseLinkScope={wizard.courseLinkScope}
                paramLessonTitle={wizard.paramLessonTitle}
                paramModuleName={wizard.paramModuleName}
                targetScope={wizard.targetScope}
                setTargetScope={wizard.setTargetScope}
                dueDateOption={wizard.dueDateOption}
                setDueDateOption={wizard.setDueDateOption}
                teacherCourses={wizard.teacherCourses}
                allGroups={wizard.allGroups}
                availableGroups={wizard.availableGroups}
              />

              <WizardStepSettings
                methods={wizard.methods}
                type={type}
                targetScope={wizard.targetScope}
                dueDateOption={wizard.dueDateOption}
                setDueDateOption={wizard.setDueDateOption}
                scheduleMode={wizard.scheduleMode}
                selectScheduleMode={wizard.selectScheduleMode}
                handleStartChange={wizard.handleStartChange}
                handleEndChange={wizard.handleEndChange}
                syncCloseFromDuration={wizard.syncCloseFromDuration}
                nowIso={wizard.nowIso}
                allGroups={wizard.allGroups}
                onNext={() => wizard.nextStep('questions')}
              />
            </div>
          )}

          {wizard.currentStep === 'questions' && (
            <WizardStepQuestionBuilder
              methods={wizard.methods}
              type={type}
              homeworkMode={wizard.homeworkMode}
              setHomeworkMode={wizard.setHomeworkMode}
              startPage={wizard.startPage}
              setStartPage={wizard.setStartPage}
              endPage={wizard.endPage}
              setEndPage={wizard.setEndPage}
              bookletImages={wizard.bookletImages}
              setBookletImages={wizard.setBookletImages}
              handleBookletImageUpload={wizard.handleBookletImageUpload}
              isUploadingBooklet={wizard.isUploadingBooklet}
              fields={wizard.fields}
              append={wizard.append}
              remove={wizard.remove}
              onPrev={() => wizard.setCurrentStep('metadata')}
              onNext={() => wizard.nextStep('review')}
            />
          )}

          {wizard.currentStep === 'review' && (
            <WizardStepReview
              methods={wizard.methods}
              type={type}
              homeworkMode={wizard.homeworkMode}
              startPage={wizard.startPage}
              endPage={wizard.endPage}
              bookletImages={wizard.bookletImages}
              fieldsCount={wizard.fields.length}
              isPending={wizard.isPending}
              onPrev={() => wizard.setCurrentStep('questions')}
              onSubmit={wizard.onSubmit}
            />
          )}
        </div>
      </div>
    </FormProvider>
  );
}

export default AssessmentWizard;
