import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Secure upload configuration enforcing maximum 50MB limit and MIME validation
 * (images and PDF documents only).
 */
export const SECURE_FILE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file) {
      return cb(null, true);
    }
    const isImage = file.mimetype?.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (isImage || isPdf) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'نوع الملف غير مدعوم. يُسمح فقط بالصور وملفات PDF بحجم أقصى 50 ميجابايت.',
        ),
        false,
      );
    }
  },
};
