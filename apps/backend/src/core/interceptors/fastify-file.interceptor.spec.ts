import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  Controller,
  Post,
  UploadedFile,
  Body,
  UseInterceptors,
  Module,
  BadRequestException,
} from '@nestjs/common';
import fastifyMultipart from '@fastify/multipart';
import FormData from 'form-data';
import {
  FastifyFileInterceptor,
  UploadedFilePayload,
  FastifyFileOptions,
} from './fastify-file.interceptor';

const SECURE_TEST_OPTIONS: FastifyFileOptions = {
  limits: {
    fileSize: 10 * 1024, // 10 KB limit for test
  },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype?.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (isImage || isPdf) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException('نوع الملف غير مدعوم. يُسمح فقط بالصور وملفات PDF.'),
        false,
      );
    }
  },
};

@Controller('test-upload')
class TestUploadController {
  @Post('file')
  @UseInterceptors(FastifyFileInterceptor('file', SECURE_TEST_OPTIONS))
  uploadFile(
    @UploadedFile() file: UploadedFilePayload,
    @Body('folder') folder?: string,
    @Body('description') description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('الملف مطلوب للرفع');
    }
    return {
      folder: folder || 'default',
      description: description || '',
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      contentString: file.buffer.toString('utf-8'),
    };
  }

  @Post('video')
  @UseInterceptors(
    FastifyFileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024, // 50 KB
      },
    }),
  )
  uploadVideo(
    @UploadedFile() file: UploadedFilePayload,
    @Body('title') title?: string,
  ) {
    if (!file) {
      throw new BadRequestException('ملف الفيديو مطلوب للرفع');
    }
    return {
      title: title || 'Untitled',
      videoName: file.originalname,
      videoSize: file.size,
    };
  }
}

@Module({
  controllers: [TestUploadController],
})
class TestUploadModule {}

describe('FastifyFileInterceptor Integration Suite', () => {
  let app: NestFastifyApplication;
  let adapter: FastifyAdapter;

  beforeEach(async () => {
    adapter = new FastifyAdapter();
    app = await NestFactory.create<NestFastifyApplication>(
      TestUploadModule,
      adapter,
      { logger: false },
    );

    await app.register(fastifyMultipart, {
      limits: {
        fileSize: 100 * 1024, // 100 KB global limit
      },
    });

    await app.init();
    await adapter.getInstance().ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should successfully parse multipart PDF file and form fields in Fastify', async () => {
    const form = new FormData();
    form.append('folder', 'homework-submissions');
    form.append('description', 'حل واجب الفيزياء');
    form.append('file', Buffer.from('PDF_SAMPLE_DATA_CONTENT'), {
      filename: 'physics-hw.pdf',
      contentType: 'application/pdf',
    });

    const res = await adapter.getInstance().inject({
      method: 'POST',
      url: '/test-upload/file',
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.folder).toBe('homework-submissions');
    expect(body.description).toBe('حل واجب الفيزياء');
    expect(body.fileName).toBe('physics-hw.pdf');
    expect(body.fileType).toBe('application/pdf');
    expect(body.contentString).toBe('PDF_SAMPLE_DATA_CONTENT');
  });

  it('should reject unauthorized MIME types (e.g. .exe or .sh file)', async () => {
    const form = new FormData();
    form.append('folder', 'assessments');
    form.append('file', Buffer.from('MALICIOUS_SCRIPT'), {
      filename: 'virus.exe',
      contentType: 'application/x-msdownload',
    });

    const res = await adapter.getInstance().inject({
      method: 'POST',
      url: '/test-upload/file',
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('نوع الملف غير مدعوم');
  });

  it('should reject files exceeding the specified size limit', async () => {
    const form = new FormData();
    form.append('folder', 'assessments');
    // Create 15 KB buffer (limit is 10 KB)
    const largeBuffer = Buffer.alloc(15 * 1024, 'A');
    form.append('file', largeBuffer, {
      filename: 'huge-image.png',
      contentType: 'image/png',
    });

    const res = await adapter.getInstance().inject({
      method: 'POST',
      url: '/test-upload/file',
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('حجم الملف يتجاوز الحد الأقصى المسموح به');
  });

  it('should handle video upload with video title field', async () => {
    const form = new FormData();
    form.append('title', 'شرح قاعدة كان وأخواتها');
    form.append('file', Buffer.from('VIDEO_STREAM_DATA'), {
      filename: 'grammar-lesson.mp4',
      contentType: 'video/mp4',
    });

    const res = await adapter.getInstance().inject({
      method: 'POST',
      url: '/test-upload/video',
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.title).toBe('شرح قاعدة كان وأخواتها');
    expect(body.videoName).toBe('grammar-lesson.mp4');
    expect(body.videoSize).toBe(Buffer.from('VIDEO_STREAM_DATA').length);
  });
});
