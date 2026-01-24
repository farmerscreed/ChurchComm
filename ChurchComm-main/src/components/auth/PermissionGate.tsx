import React from 'react';
import { usePermissions, type Permissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  children: React.ReactNode;
  permission: keyof Permissions;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  fallback = null,
}) => {
  const permissions = usePermissions();

  const hasPermission = Boolean(permissions[permission]);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
