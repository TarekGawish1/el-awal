import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ContactMessagesController } from '../contact-messages.controller';
import { ContactMessagesService } from '../contact-messages.service';
import { RolesGuard } from '../../../core/security/guards/roles.guard';
import { IS_PUBLIC_KEY } from '../../../core/security/decorators/public.decorator';
import { ROLES_KEY } from '../../../core/security/decorators/roles.decorator';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('SEC-01: ContactMessagesController Access Control', () => {
  let controller: ContactMessagesController;
  let service: Partial<ContactMessagesService>;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockTeacherUser: AuthenticatedUser = {
    id: 'user-teacher-1',
    email: 'teacher@el-awal.online',
    fullName: 'Teacher A',
    role: UserRole.TEACHER,
    teacherProfileId: 'teacher-profile-1',
  };

  const mockSecretariatUser: AuthenticatedUser = {
    id: 'user-secretariat-1',
    email: 'assistant@el-awal.online',
    fullName: 'Assistant A',
    role: UserRole.SECRETARIAT,
  };

  const mockStudentUser: AuthenticatedUser = {
    id: 'user-student-1',
    email: 'student@el-awal.online',
    fullName: 'Student A',
    role: UserRole.STUDENT,
    studentProfileId: 'student-profile-1',
  };

  const mockParentUser: AuthenticatedUser = {
    id: 'user-parent-1',
    email: 'parent@el-awal.online',
    fullName: 'Parent A',
    role: UserRole.PARENT,
    parentProfileId: 'parent-profile-1',
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({ id: 'msg-synthetic-1', ...dto, isRead: false, createdAt: new Date() }),
      ),
      findAll: jest.fn().mockResolvedValue([
        { id: 'msg-1', name: 'Visitor Synthetic', phone: '01000000000', message: 'Inquiry', isRead: false },
      ]),
      getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 1 }),
      markAsRead: jest.fn().mockImplementation((id) =>
        Promise.resolve({ id, isRead: true }),
      ),
      delete: jest.fn().mockImplementation((id) =>
        Promise.resolve({ id }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactMessagesController],
      providers: [
        {
          provide: ContactMessagesService,
          useValue: service,
        },
        Reflector,
        RolesGuard,
      ],
    }).compile();

    controller = module.get<ContactMessagesController>(ContactMessagesController);
    reflector = module.get<Reflector>(Reflector);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
  });

  const createMockContext = (handler: Function, user?: AuthenticatedUser): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => ContactMessagesController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Route Security Metadata', () => {
    it('preserves public access exclusively on POST create inquiry endpoint', () => {
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, controller.create);
      expect(isPublic).toBe(true);
    });

    it('requires authentication and staff roles on GET findAll', () => {
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, controller.findAll);
      const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.findAll);
      expect(isPublic).toBeUndefined();
      expect(roles).toEqual([UserRole.TEACHER, UserRole.SECRETARIAT]);
    });

    it('requires authentication and staff roles on GET getUnreadCount', () => {
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, controller.getUnreadCount);
      const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.getUnreadCount);
      expect(isPublic).toBeUndefined();
      expect(roles).toEqual([UserRole.TEACHER, UserRole.SECRETARIAT]);
    });

    it('requires authentication and staff roles on PATCH markAsRead', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.markAsRead);
      expect(roles).toEqual([UserRole.TEACHER, UserRole.SECRETARIAT]);
    });

    it('requires authentication and staff roles on DELETE delete', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.delete);
      expect(roles).toEqual([UserRole.TEACHER, UserRole.SECRETARIAT]);
    });
  });

  describe('Authorization Enforcement via RolesGuard', () => {
    it('rejects unauthenticated/anonymous access to management endpoints', () => {
      const context = createMockContext(controller.findAll, undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('rejects STUDENT role from listing contact inquiries', () => {
      const context = createMockContext(controller.findAll, mockStudentUser);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('rejects STUDENT role from getting unread count', () => {
      const context = createMockContext(controller.getUnreadCount, mockStudentUser);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('rejects STUDENT role from marking inquiry as read or deleting', () => {
      const readCtx = createMockContext(controller.markAsRead, mockStudentUser);
      expect(() => rolesGuard.canActivate(readCtx)).toThrow(ForbiddenException);

      const deleteCtx = createMockContext(controller.delete, mockStudentUser);
      expect(() => rolesGuard.canActivate(deleteCtx)).toThrow(ForbiddenException);
    });

    it('rejects PARENT role from listing or modifying contact inquiries', () => {
      const findCtx = createMockContext(controller.findAll, mockParentUser);
      expect(() => rolesGuard.canActivate(findCtx)).toThrow(ForbiddenException);

      const deleteCtx = createMockContext(controller.delete, mockParentUser);
      expect(() => rolesGuard.canActivate(deleteCtx)).toThrow(ForbiddenException);
    });

    it('authorizes TEACHER to access inquiries and perform operations', async () => {
      const findCtx = createMockContext(controller.findAll, mockTeacherUser);
      expect(rolesGuard.canActivate(findCtx)).toBe(true);

      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);

      const deleteCtx = createMockContext(controller.delete, mockTeacherUser);
      expect(rolesGuard.canActivate(deleteCtx)).toBe(true);
      await controller.delete('msg-1');
      expect(service.delete).toHaveBeenCalledWith('msg-1');
    });

    it('authorizes SECRETARIAT to access inquiries and perform operations', async () => {
      const countCtx = createMockContext(controller.getUnreadCount, mockSecretariatUser);
      expect(rolesGuard.canActivate(countCtx)).toBe(true);

      const count = await controller.getUnreadCount();
      expect(count).toEqual({ unreadCount: 1 });

      const readCtx = createMockContext(controller.markAsRead, mockSecretariatUser);
      expect(rolesGuard.canActivate(readCtx)).toBe(true);
      await controller.markAsRead('msg-1');
      expect(service.markAsRead).toHaveBeenCalledWith('msg-1');
    });

    it('allows public inquiry submission with synthetic payload', async () => {
      const dto = {
        name: 'Synthetic Prospective Student',
        phone: '01123456789',
        message: 'Synthetic inquiry about course schedules',
      };
      const created = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(created.id).toBe('msg-synthetic-1');
    });
  });
});
