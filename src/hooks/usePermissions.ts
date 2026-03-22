import { useAuthStore } from '@/stores/authStore';

export const usePermissions = () => {
    const { user, currentOrganization, currentMember } = useAuthStore();

    // Get role from organization_members table (via currentMember)
    // Fallback to user_metadata.role for backwards compatibility, then default to 'member'
    const role = currentMember?.role || user?.user_metadata?.role || 'member';

    const isAdmin = role === 'admin';
    const isPastor = role === 'pastor';

    return {
        role,
        isAdmin,
        isPastor,
        canManageCampaigns: isAdmin || isPastor,
        canHandleEscalations: isAdmin || isPastor,
        canManageOrgSettings: isAdmin || isPastor,
        // Add more permissions as needed
    };
};
