export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

export type PermissionAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'EXPORT'
  | 'IMPORT';

export interface RequiredPermission {
  action: PermissionAction;
  resource: string;
}
