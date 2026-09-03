import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from '../controllers/content.controller';
import { ContentService } from '../services/content.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('ContentController Student Upload and Folder Restriction', () => {
  let controller: ContentController;
  let contentService: Partial<ContentService>;

  const mockStudentUser: AuthenticatedUser = {
    id: 'user-stu-1',
    email: 'student@example.com',
    fullName: 'Student User',
    role: UserRole.STUDENT,
    studentProfileId: 'stu-profile-1',
  };

  const mockTeacherUser: AuthenticatedUser = {
    id: 'user-teach-1',
    email: 'teacher@example.com',
    fullName: 'Teacher User',
    role: UserRole.TEACHER,
    teacherProfileId: 'teach-profile-1',
  };

  const mockFile = {
    originalname: 'receipt.png',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('fake-image'),
  } as Express.Multer.File;

  beforeEach(async () => {
    contentService = {
      uploadRawFile: jest.fn().mockResolvedValue({
        fileUrl: 'https://r2.el-awal.online/payment-receipts/receipt.png',
        fileKey: 'payment-receipts/receipt.png',
        fileName: 'receipt.png',
      }),
      deleteFileFromStorage: jest.fn().mockResolvedValue({
        success: true,
      }),
      generatePresignedUpload: jest.fn().mockResolvedValue({
        uploadUrl: 'https://r2.el-awal.online/upload',
        fileKey: 'payment-receipts/key.png',
        publicUrl: 'https://r2.el-awal.online/payment-receipts/key.png',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: contentService,
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
  });

  describe('uploadFile (/content/upload-file)', () => {
    it('allows a student to upload a payment receipt to payment-receipts folder', async () => {
      const res = await controller.uploadFile(mockFile, mockStudentUser, 'payment-receipts');
      expect(contentService.uploadRawFile).toHaveBeenCalledWith(mockFile, 'payment-receipts');
      expect(res.fileKey).toContain('payment-receipts');
    });

    it('denies a student uploading to unauthorized folder like courses', async () => {
      await expect(
        controller.uploadFile(mockFile, mockStudentUser, 'courses'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows teacher to upload to any folder', async () => {
      await controller.uploadFile(mockFile, mockTeacherUser, 'courses');
      expect(contentService.uploadRawFile).toHaveBeenCalledWith(mockFile, 'courses');
    });
  });

  describe('deleteUploadedFile (/content/file)', () => {
    it('allows a student to delete their own uploaded file in payment-receipts', async () => {
      const res = await controller.deleteUploadedFile(
        mockStudentUser,
        'payment-receipts/receipt.png',
      );
      expect(contentService.deleteFileFromStorage).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('denies a student deleting files outside allowed student folders', async () => {
      await expect(
        controller.deleteUploadedFile(mockStudentUser, 'courses/lesson-video.mp4'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUploadUrl (/content/presigned-upload-url)', () => {
    it('allows student to request presigned upload URL for payment-receipts', async () => {
      const res = await controller.getUploadUrl(
        {
          fileName: 'receipt.jpg',
          contentType: 'image/jpeg',
          folder: 'payment-receipts',
        },
        mockStudentUser,
      );
      expect(contentService.generatePresignedUpload).toHaveBeenCalled();
      expect(res.uploadUrl).toBeDefined();
    });

    it('throws Arabic BadRequestException if student requests unauthorized folder', async () => {
      await expect(
        controller.getUploadUrl(
          {
            fileName: 'lesson.pdf',
            contentType: 'application/pdf',
            folder: 'course-curriculum',
          },
          mockStudentUser,
        ),
      ).rejects.toThrow('يمكن للطلاب رفع الملفات لواجباتهم واختباراتهم وإيصالات الدفع فقط');
    });
  });
});
