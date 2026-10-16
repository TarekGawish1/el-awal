export interface BuildLessonPayloadOptions {
  title: string;
  description: string;
  summary: string;
  lessonType: string;
  isFreePreview: boolean;
  videoDurationSeconds: number | string;
  bunnyVideoId?: string;
  videoEmbedUrl?: string;
  backgroundUploadTask?: { videoId?: string; embedUrl?: string };
  streamAuth?: { videoId?: string; embedUrl?: string };
  lessonQuizId?: string;
  lessonHomeworkId?: string;
  stagedAttachments?: any[];
  isEditingEffective?: boolean;
}

export function buildLessonPayload({
  title,
  description,
  summary,
  lessonType,
  isFreePreview,
  videoDurationSeconds,
  bunnyVideoId,
  videoEmbedUrl,
  backgroundUploadTask,
  streamAuth,
  lessonQuizId,
  lessonHomeworkId,
  stagedAttachments = [],
  isEditingEffective = false,
}: BuildLessonPayloadOptions) {
  const isDirectBunnyId = (id?: string) =>
    !!id && !id.startsWith("http") && !id.includes("/") && id.length > 10;

  const effectiveVideoId =
    (isDirectBunnyId(bunnyVideoId) ? bunnyVideoId : undefined) ||
    backgroundUploadTask?.videoId ||
    streamAuth?.videoId;

  const isBunnyUrl = (u?: string) =>
    !!u &&
    (u.includes("iframe.mediadelivery.net") ||
      u.includes("video.bunnycdn.com") ||
      u.startsWith("bunny:"));

  const rawContentCandidate =
    (!(videoEmbedUrl && isBunnyUrl(videoEmbedUrl)) ? videoEmbedUrl : undefined) ||
    (!(backgroundUploadTask?.embedUrl && isBunnyUrl(backgroundUploadTask.embedUrl))
      ? backgroundUploadTask?.embedUrl
      : undefined) ||
    (!(streamAuth?.embedUrl && isBunnyUrl(streamAuth.embedUrl))
      ? streamAuth?.embedUrl
      : undefined);

  const effectiveContentUrl = effectiveVideoId ? undefined : rawContentCandidate;

  const payload: any = {
    title: title.trim(),
    description: description.trim() || undefined,
    summary: summary.trim() || undefined,
    lessonType,
    bunnyVideoId: effectiveVideoId,
    contentUrl: effectiveContentUrl,
    videoDurationSeconds: Number(videoDurationSeconds) || 1800,
    isPreview: isFreePreview,
    ...(lessonQuizId ? { quizId: lessonQuizId } : { quizId: null }),
    ...(lessonHomeworkId ? { homeworkId: lessonHomeworkId } : { homeworkId: null }),
    ...(stagedAttachments.length > 0 && !isEditingEffective
      ? { attachments: stagedAttachments }
      : {}),
  };

  return {
    payload,
    effectiveVideoId,
    effectiveContentUrl,
    stagedAttachments,
  };
}
