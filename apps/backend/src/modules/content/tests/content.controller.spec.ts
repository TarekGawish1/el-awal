import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from '../controllers/content.controller';
import { ContentService } from '../services/content.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('ContentController Student Upload and Deletion Ownership (SEC-03)', () => {
  let controller: ContentController;
  let contentService: Partial<ContentService>;

  const mockStudentUser: AuthenticatedUser = {
    id: 'user-stu-1',
    email: 'student@example.com',
    fullName: 'Student User',
    role: UserRole.STUDENT,
    studentProfileId: 'stu-profile-1',
  };

  const mockStudentBUser: AuthenticatedUser = {
    id: 'user-stu-2',
    email: 'student2@example.com',
    fullName: 'Student User 2',
    role: UserRole.STUDENT,
    studentProfileId: 'stu-profile-2',
  };

  const mockTeacherUser: AuthenticatedUser = {
    id: 'user-teach-1',
    email: 'teacher@example.com',
    fullName: 'Teacher User',
    role: UserRole.TEACHER,
    teacherProfileId: 'teach-profile-1',
  };

  const mockSecretariatUser: AuthenticatedUser = {
    id: 'user-sec-1',
    email: 'secretariat@example.com',
    fullName: 'Secretariat User',
    role: UserRole.SECRETARIAT,
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
      verifyStudentFileOwnership: jest.fn().mockImplementation(async (studentId, key, url) => {
        const target = key || url || '';
        // Mock ownership rule: files with 'student-1' or 'stu-profile-1' belong to mockStudentUser
        if (target.includes('stu-profile-1') || target.includes('my-receipt.png') || target.includes('my-submission.pdf')) {
          return studentId === 'stu-profile-1';
        }
        // Files belonging to Student B
        if (target.includes('stu-profile-2') || target.includes('student-b-file.pdf')) {
          return studentId === 'stu-profile-2';
        }
        return false;
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

  describe('deleteUploadedFile (/content/file) — SEC-03 Requirements', () => {
    it('1. allows Student A to delete their own verified file', async () => {
      const res = await controller.deleteUploadedFile(
        mockStudentUser,
        'payment-receipts/my-receipt.png',
      );
      expect(contentService.verifyStudentFileOwnership).toHaveBeenCalledWith(
        'stu-profile-1',
        'payment-receipts/my-receipt.png',
        undefined,
      );
      expect(contentService.deleteFileFromStorage).toHaveBeenCalledWith({
        fileKey: 'payment-receipts/my-receipt.png',
        fileUrl: undefined,
      });
      expect(res.success).toBe(true);
    });

    it('2. denies Student A requesting Student B file with 403 Forbidden', async () => {
      await expect(
        controller.deleteUploadedFile(
          mockStudentUser,
          'homework-submissions/student-b-file.pdf',
        ),
      ).rejects.toThrow(ForbiddenException);

      // Verify that storage deletion was NEVER invoked
      expect(contentService.deleteFileFromStorage).not.toHaveBeenCalled();
    });

    it('3. rejects nonexistent or unresolvable storage key for student with 403 Forbidden', async () => {
      await expect(
        controller.deleteUploadedFile(
          mockStudentUser,
          'homework-submissions/nonexistent-file.pdf',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(contentService.deleteFileFromStorage).not.toHaveBeenCalled();
    });

    it('4. rejects malformed storage key with path traversal (..) with 400 BadRequest', async () => {
      await expect(
        controller.deleteUploadedFile(
          mockStudentUser,
          'homework-submissions/../../etc/passwd',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(contentService.deleteFileFromStorage).not.toHaveBeenCalled();
    });

    it('5. rejects empty key and url with 400 BadRequest', async () => {
      await expect(
        controller.deleteUploadedFile(mockStudentUser, undefined, undefined),
      ).rejects.toThrow(BadRequestException);

      expect(contentService.deleteFileFromStorage).not.toHaveBeenCalled();
    });

    it('6. denies student deleting files outside allowed student folders even if attempted', async () => {
      await expect(
        controller.deleteUploadedFile(
          mockStudentUser,
          'courses/teacher-lecture-video.mp4',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(contentService.deleteFileFromStorage).not.toHaveBeenCalled();
    });

    it('7. allows TEACHER to delete files without student ownership check', async () => {
      const res = await controller.deleteUploadedFile(
        mockTeacherUser,
        'courses/lecture-materials.pdf',
      );
      expect(contentService.verifyStudentFileOwnership).not.toHaveBeenCalled();
      expect(contentService.deleteFileFromStorage).toHaveBeenCalledWith({
        fileKey: 'courses/lecture-materials.pdf',
        fileUrl: undefined,
      });
      expect(res.success).toBe(true);
    });

    it('8. allows SECRETARIAT to delete files without student ownership check', async () => {
      const res = await controller.deleteUploadedFile(
        mockSecretariatUser,
        'assessments/exam-questions.pdf',
      );
      expect(contentService.verifyStudentFileOwnership).not.toHaveBeenCalled();
      expect(contentService.deleteFileFromStorage).toHaveBeenCalledWith({
        fileKey: 'assessments/exam-questions.pdf',
        fileUrl: undefined,
      });
      expect(res.success).toBe(true);
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
