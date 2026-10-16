"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { LessonAttachment } from "../types/courses.types";
import { useAddAttachment, useDeleteAttachment } from "../hooks/useCourses";
import { coursesApi } from "../api/courses.api";
import { uploadFileResilient } from "@/features/content/api/content.api";

export interface UseLessonAttachmentsProps {
  courseId: string;
  lesson?: any;
  isSubmittedRef: React.MutableRefObject<boolean>;
}

export function useLessonAttachments({
  courseId,
  lesson,
  isSubmittedRef,
}: UseLessonAttachmentsProps) {
  const addAttachmentMutation = useAddAttachment(courseId);
  const deleteAttachmentMutation = useDeleteAttachment(courseId);

  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [newAttachmentTitle, setNewAttachmentTitle] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newAttachmentKey, setNewAttachmentKey] = useState("");
  const [newAttachmentSize, setNewAttachmentSize] = useState<number | undefined>();
  const [newAttachmentType, setNewAttachmentType] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const attachmentsRef = useRef<LessonAttachment[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Clean up staged attachments if modal unmounts without submitting
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        for (const att of attachmentsRef.current) {
          if (att.id?.startsWith("staged-") && (att.fileKey || att.fileUrl)) {
            coursesApi.deleteUploadedFile(att.fileKey || att.fileUrl);
          }
        }
      }
    };
  }, [isSubmittedRef]);

  const handleUploadAttachmentFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("حجم الملف يجب ألا يتجاوز 25 ميجابايت");
      return;
    }

    try {
      setIsUploadingAttachment(true);
      setUploadProgress(0);

      const result = await uploadFileResilient(file, "attachments", (p) => {
        setUploadProgress(p);
      });

      setNewAttachmentUrl(result.fileUrl);
      setNewAttachmentKey(result.fileKey);
      setNewAttachmentSize(file.size);
      setNewAttachmentType(file.type || "file");

      if (!newAttachmentTitle) {
        setNewAttachmentTitle(file.name.replace(/\.[^/.]+$/, ""));
      }

      toast.success("تم رفع الملف بنجاح");
    } catch {
      toast.error("فشل رفع الملف، يرجى المحاولة مرة أخرى");
    } finally {
      setIsUploadingAttachment(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleAddAttachment = async () => {
    if (!newAttachmentTitle.trim() || !newAttachmentUrl.trim()) {
      toast.error("يرجى كتابة عنوان ورفع الملف");
      return;
    }

    if (lesson?.id) {
      try {
        const created = await addAttachmentMutation.mutateAsync({
          lessonId: lesson.id,
          data: {
            title: newAttachmentTitle.trim(),
            fileUrl: newAttachmentUrl.trim(),
            fileKey:
              newAttachmentKey ||
              `courses/attachments/${Date.now()}-${newAttachmentTitle.trim()}`,
            fileSize: newAttachmentSize,
            fileType: newAttachmentType || "application/pdf",
          },
        });
        if (created) {
          setAttachments((prev) => [
            ...prev.filter((a) => a.id !== created.id),
            created,
          ]);
        }
        setNewAttachmentTitle("");
        setNewAttachmentUrl("");
        setNewAttachmentKey("");
        setNewAttachmentSize(undefined);
        setIsAddingAttachment(false);
      } catch {
        // Handled by mutation
      }
    } else {
      const stagedAtt: LessonAttachment = {
        id: `staged-${Date.now()}`,
        title: newAttachmentTitle.trim(),
        fileUrl: newAttachmentUrl.trim(),
        fileKey:
          newAttachmentKey ||
          `courses/attachments/${Date.now()}-${newAttachmentTitle.trim()}`,
        fileSize: newAttachmentSize,
        fileType: newAttachmentType || "application/pdf",
        lessonId: "",
        createdAt: new Date().toISOString(),
      };
      setAttachments((prev) => [...prev, stagedAtt]);
      setNewAttachmentTitle("");
      setNewAttachmentUrl("");
      setNewAttachmentKey("");
      setNewAttachmentSize(undefined);
      setIsAddingAttachment(false);
      toast.success("تمت إضافة المرفق مؤقتاً وسيتم حفظه مع إنشاء الدرس");
    }
  };

  const handleDeleteAttachment = async (att: LessonAttachment) => {
    if (att.id.startsWith("staged-")) {
      if (att.fileKey || att.fileUrl) {
        coursesApi.deleteUploadedFile(att.fileKey || att.fileUrl);
      }
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      toast.success("تم حذف المرفق");
      return;
    }

    try {
      await deleteAttachmentMutation.mutateAsync(att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch {
      // Handled by mutation
    }
  };

  return {
    attachments,
    setAttachments,
    isAddingAttachment,
    setIsAddingAttachment,
    newAttachmentTitle,
    setNewAttachmentTitle,
    newAttachmentUrl,
    setNewAttachmentUrl,
    newAttachmentKey,
    setNewAttachmentKey,
    newAttachmentSize,
    setNewAttachmentSize,
    newAttachmentType,
    setNewAttachmentType,
    isUploadingAttachment,
    setIsUploadingAttachment,
    uploadProgress,
    setUploadProgress,
    attachmentsRef,
    handleUploadAttachmentFile,
    handleAddAttachment,
    handleDeleteAttachment,
    isSubmittingAttachment: addAttachmentMutation.isPending,
  };
}
