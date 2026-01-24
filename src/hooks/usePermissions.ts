import { useAuthStore } from '@/stores/authStore';

export const usePermissions = () => {
    const { user, currentOrganization } = useAuthStore();

    // We expect the user role to be in user_metadata or we can fetch organization_members
    // Based on activity.md, organization_members has roles like 'admin', 'pastor', 'member'
    // For now, let's assume the metadata contains the role or default to 'member'
    const role = user?.user_metadata?.role || 'member';

    const isAdmin = role === 'admin';
    const isPastor = role === 'pastor';

    return {
        role,
        isAdmin,
        isPastor,
        canManageCampaigns: isAdmin || isPastor,
        // Add more permissions as needed
    };
};
