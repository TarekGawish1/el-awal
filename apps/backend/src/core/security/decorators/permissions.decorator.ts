import { SetMetadata } from '@nestjs/common';
import { AssistantPermission } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: AssistantPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
