import { useAuthStore } from '@/stores/authStore';

export function useAdmin() {
  const { currentMember } = useAuthStore();
  const isAdmin = currentMember?.role === 'admin';
  return { isAdmin };
}
