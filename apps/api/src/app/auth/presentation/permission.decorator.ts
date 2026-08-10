import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@project-ql/api-contracts';

export const REQUIRED_PERMISSIONS = 'required_permissions';
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
