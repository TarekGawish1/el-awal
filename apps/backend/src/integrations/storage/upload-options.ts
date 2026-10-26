import { BadRequestException } from '@nestjs/common';
import { FastifyFileOptions } from '../../core/interceptors/fastify-file.interceptor';

export interface FileUploadConfig {
  limits?: {
    fileSize?: number;
  };
  fileFilter?: (
    req: any,
    file: any,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => void;
}

function validateMagicBytes(file: any): boolean {
  const buf = file?.buffer;
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 4) {
    return true; // If buffer not yet populated, rely on mimetype filter
  }

  const isPdf = file.mimetype === 'application/pdf';
  if (isPdf) {
    // %PDF
    return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  }

  // PNG: \x89PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    return true;
  }
  // JPEG: \xFF\xD8\xFF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
    return true;
  }
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return true;
  }
  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return true;
  }

  return false;
}

/**
 * Secure upload configuration enforcing maximum 50MB limit, MIME allowlisting,
 * and binary magic-byte content validation (images and PDF documents only).
 */
export const SECURE_FILE_UPLOAD_OPTIONS: FileUploadConfig & FastifyFileOptions = {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file) {
      return cb(null, true);
    }
    const isImage = file.mimetype?.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (!isImage && !isPdf) {
      return cb(
        new BadRequestException(
          'نوع الملف غير مدعوم. يُسمح فقط بالصور وملفات PDF بحجم أقصى 50 ميجابايت.',
        ),
        false,
      );
    }

    if (!validateMagicBytes(file)) {
      return cb(
        new BadRequestException(
          'محتوى الملف لا يطابق الصيغة المصرح بها (File signature mismatch).',
        ),
        false,
      );
    }

    cb(null, true);
  },
};
