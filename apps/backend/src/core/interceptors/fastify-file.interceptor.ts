import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Type,
  mixin,
} from '@nestjs/common';
import { Observable } from 'rxjs';

export interface UploadedFilePayload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FastifyFileOptions {
  fieldName?: string;
  limits?: {
    fileSize?: number; // max size in bytes
  };
  fileFilter?: (
    req: any,
    file: { originalname: string; mimetype: string; size: number; buffer?: Buffer },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => void;
}

/**
 * High-performance Multipart Interceptor designed for Fastify (with Express fallback).
 * Streams multipart form fields directly into `req.body` and binary files into `req.file`.
 */
export function FastifyFileInterceptor(
  fieldName = 'file',
  options?: FastifyFileOptions,
): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const httpCtx = context.switchToHttp();
      const req = httpCtx.getRequest<any>();

      // 1. If req.file is already a parsed file object with buffer (e.g. Express multer or test mock), skip
      if (req.file && typeof req.file === 'object' && Buffer.isBuffer(req.file.buffer)) {
        return next.handle();
      }

      // 2. Handle Fastify multipart request
      if (typeof req.isMultipart === 'function' && req.isMultipart()) {
        try {
          const parts = req.parts();
          req.body = req.body || {};

          for await (const part of parts) {
            if (part.type === 'file') {
              // Read stream into buffer
              const buffer = await part.toBuffer();
              const targetFieldName = part.fieldname || 'file';

              // Only accept matching fieldName if specified, or default to any file if matching
              if (!fieldName || targetFieldName === fieldName || !req.file) {
                // Check custom limit
                if (options?.limits?.fileSize && buffer.length > options.limits.fileSize) {
                  const limit = options.limits.fileSize;
                  const limitStr =
                    limit >= 1024 * 1024
                      ? `${Math.round(limit / (1024 * 1024))} ميجابايت`
                      : `${Math.round(limit / 1024)} كيلوبايت`;
                  throw new BadRequestException(
                    `حجم الملف يتجاوز الحد الأقصى المسموح به (${limitStr}).`,
                  );
                }

                // Check file filter
                if (options?.fileFilter) {
                  await new Promise<void>((resolve, reject) => {
                    options.fileFilter!(
                      req,
                      {
                        originalname: part.filename,
                        mimetype: part.mimetype,
                        size: buffer.length,
                        buffer,
                      },
                      (err, accept) => {
                        if (err) return reject(err);
                        if (!accept) {
                          return reject(
                            new BadRequestException('نوع الملف المرفوع غير مدعوم.'),
                          );
                        }
                        resolve();
                      },
                    );
                  });
                }

                const fileObj: UploadedFilePayload = {
                  fieldname: targetFieldName,
                  originalname: part.filename,
                  encoding: part.encoding,
                  mimetype: part.mimetype,
                  size: buffer.length,
                  buffer,
                };

                req.file = fileObj;
                req.rawFile = fileObj;
                req.files = req.files || {};
                req.files[targetFieldName] = fileObj;
              }
            } else if (part.type === 'field') {
              // Assign form field directly to req.body
              req.body[part.fieldname] = part.value;
            }
          }
        } catch (err: any) {
          if (err instanceof BadRequestException) {
            throw err;
          }
          if (err?.code === 'FST_REQ_FILE_TOO_LARGE') {
            throw new BadRequestException('حجم الملف يتجاوز الحد الأقصى المسموح به.');
          }
          throw new BadRequestException(
            err?.message || 'فشل معالجة الملف المرفوع عبر خادم Fastify',
          );
        }
      }

      return next.handle();
    }
  }

  return mixin(Interceptor);
}
