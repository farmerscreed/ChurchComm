import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type Organization = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: any;
  social_media?: any;
  settings?: any;
  subscription_plan?: string;
  subscription_status?: string;
  stripe_customer_id?: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
};

type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  organization: Organization | null;
  currentOrganization: Organization | null;
  currentMember: OrganizationMember | null;
  organizations: Organization[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, organizationName?: string) => Promise<void>;
  fetchSession: () => Promise<void>;
  fetchOrganizations: () => Promise<void>;
  setCurrentOrganization: (organizationId: string) => Promise<void>;
  hasPermission: (action: string, subject: string) => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  error: null,
  organization: null,
  currentOrganization: null,
  currentMember: null,
  organizations: [],

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, loading: false });
    } else if (data.session) {
      set({ session: data.session, user: data.session.user });
      await get().fetchOrganizations();
    }
    set({ loading: false });
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, organization: null, currentOrganization: null });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email: string, password: string, firstName: string, lastName: string, organizationName?: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            organization_name: organizationName,
          },
        },
      });
      if (error) throw error;
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchSession: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      if (session?.user) {
        set({ user: session.user, session: session });
        await get().fetchOrganizations();
      } else {
        set({ user: null, session: null, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false, user: null, session: null });
    }
  },

  fetchOrganizations: async () => {
    const { user, currentOrganization } = get();

    // Prevent re-fetching if organization is already loaded
    if (currentOrganization && currentOrganization.id) {
      set({ loading: false }); // Ensure loading is false if we skip
      return;
    }

    if (!user) {
      set({ loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (membershipError) {
        throw new Error(`Failed to find your organization membership: ${membershipError.message}`);
      }
      if (!memberships || memberships.length === 0) {
        // User has no organization - this is OK for new users
        set({ loading: false, organization: null, currentOrganization: null });
        return;
      }
      // Use the first (oldest) membership as the default
      const membership = memberships[0];
      const organizationId = membership.organization_id;

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) {
        throw new Error(`Failed to load your organization details: ${orgError.message}`);
      }
      if (!org) {
        throw new Error('Could not load your organization details.');
      }
      set({ organization: org, currentOrganization: org, loading: false, error: null });

    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  setCurrentOrganization: async (organizationId: string) => {
    const { organizations } = get();
    const organization = organizations.find(org => org.id === organizationId);
    if (organization) {
      set({ currentOrganization: organization });
      // You might want to fetch organization-specific data here
    }
  },

  hasPermission: (action: string, subject: string) => {
    const { user, currentOrganization } = get();
    if (!user || !currentOrganization) return false;

    // This is a placeholder. You should implement a proper role-based permission system.
    const role = user.user_metadata?.role || 'member';

    if (role === 'admin') return true;

    const permissions: Record<string, Record<string, string[]>> = {
      member: {
        'read': ['people', 'events', 'giving'],
        'write': ['people'],
      },
      leader: {
        'read': ['people', 'events', 'giving', 'roles'],
        'write': ['people', 'events'],
        'manage': ['giving'],
      },
    };

    return permissions[role]?.[action]?.includes(subject) || false;
  },

  clearError: () => {
    set({ error: null, loading: false });
  },
}));

// Listen to auth changes to keep the store and Supabase client in sync
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    useAuthStore.setState({ session, user: session?.user || null });
    // We fetch organizations after a successful sign-in
    useAuthStore.getState().fetchOrganizations();
  } else if (event === 'TOKEN_REFRESHED') {
    // When the token is refreshed, we update the session in the client and the store
    if (session) {
      supabase.auth.setSession(session);
      useAuthStore.setState({ session, user: session.user });
    }
  } else if (event === 'SIGNED_OUT') {
    // When the user signs out, we clear the session from the client and the store
    useAuthStore.setState({ session: null, user: null, organization: null, currentOrganization: null });
  }
});
