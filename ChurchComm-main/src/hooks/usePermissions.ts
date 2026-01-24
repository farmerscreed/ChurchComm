import { useAuthStore } from '@/stores/authStore';

export type UserRole = 'admin' | 'pastor' | 'member';

export interface Permissions {
  role: UserRole;
  canManageBilling: boolean;
  canManageTeam: boolean;
  canManageOrgSettings: boolean;
  canManagePeople: boolean;
  canManageGroups: boolean;
  canManageCampaigns: boolean;
  canManageScripts: boolean;
  canHandleEscalations: boolean;
  canViewPeople: boolean;
  canViewCampaigns: boolean;
  canViewCallHistory: boolean;
  canViewGroups: boolean;
  isAdmin: boolean;
  isPastor: boolean;
  isMember: boolean;
}

const VALID_ROLES: UserRole[] = ['admin', 'pastor', 'member'];

function resolveRole(rawRole: string | undefined | null): UserRole {
  if (rawRole && VALID_ROLES.includes(rawRole as UserRole)) {
    return rawRole as UserRole;
  }
  return 'member';
}

export function usePermissions(): Permissions {
  const { currentMember } = useAuthStore();

  const role = resolveRole(currentMember?.role);

  const isAdmin = role === 'admin';
  const isPastor = role === 'pastor';
  const isMember = role === 'member';

  return {
    role,

    // Admin only
    canManageBilling: isAdmin,
    canManageTeam: isAdmin,
    canManageOrgSettings: isAdmin,

    // Admin + Pastor
    canManagePeople: isAdmin || isPastor,
    canManageGroups: isAdmin || isPastor,
    canManageCampaigns: isAdmin || isPastor,
    canManageScripts: isAdmin || isPastor,
    canHandleEscalations: isAdmin || isPastor,

    // All roles
    canViewPeople: true,
    canViewCampaigns: true,
    canViewCallHistory: true,
    canViewGroups: true,

    isAdmin,
    isPastor,
    isMember,
  };
}
