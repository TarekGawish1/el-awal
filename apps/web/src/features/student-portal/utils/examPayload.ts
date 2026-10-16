import { uploadFileResilient } from '@/features/content/api/content.api';
import { formatEssayAnswer } from '@/features/assessments/utils/answer-parser';

export async function uploadAnswerAttachment(
  file: File | null,
  onProgress?: (p: number) => void
): Promise<string | undefined> {
  if (!file) return undefined;
  const res = await uploadFileResilient(
    file,
    'homework-submissions',
    onProgress
  );
  return res.fileUrl;
}

export async function buildExamSubmitPayload(
  answers: Record<string, string>,
  essayImages: Record<string, { file: File; previewUrl: string }>,
  attachmentFile: File | null,
  onAttachmentProgress?: (p: number) => void
) {
  const finalAnswers: Record<string, string> = { ...answers };

  for (const [questionId, imgData] of Object.entries(essayImages)) {
    if (imgData?.file) {
      try {
        const res = await uploadFileResilient(
          imgData.file,
          'homework-submissions'
        );
        finalAnswers[questionId] = formatEssayAnswer(
          finalAnswers[questionId],
          res.fileUrl
        );
      } catch (err) {
        console.error('Error uploading essay image for question', questionId, err);
        throw new Error(
          'فشل رفع صورة إجابة أحد الأسئلة المقالية. يرجى المحاولة مرة أخرى.'
        );
      }
    }
  }

  const formattedAnswers = Object.entries(finalAnswers).map(([qId, val]) => ({
    questionId: qId,
    answerGiven: val,
  }));
  const attachmentUrl = await uploadAnswerAttachment(
    attachmentFile,
    onAttachmentProgress
  );

  return {
    answers: formattedAnswers,
    ...(attachmentUrl ? { attachmentUrl } : {}),
  };
}
