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
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
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

  signUp: async (email: string, password: string, firstName: string, lastName: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
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
    console.log('fetchSession: Starting');
    set({ loading: true, error: null });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('fetchSession: getSession error', error);
        throw error;
      }

      console.log('fetchSession: Session data:', session);
      if (session?.user) {
        console.log('fetchSession: User found in session, setting user and loading organization.');
        set({ user: session.user, session: session });
        await get().fetchOrganizations();
      } else {
        console.log('fetchSession: No user in session, setting loading to false.');
        set({ user: null, session: null, loading: false });
      }
    } catch (error: any) {
      console.error('fetchSession: CATCH block error:', error);
      set({ error: error.message, loading: false, user: null, session: null });
    }
  },

  fetchOrganizations: async () => {
    console.log('--- loadUserOrganization START ---');
    const { user, currentOrganization } = get();

    // Prevent re-fetching if organization is already loaded
    if (currentOrganization && currentOrganization.id) {
      console.log('Organization already in store. Skipping fetch.');
      set({ loading: false }); // Ensure loading is false if we skip
      return;
    }

    if (!user) {
      console.error('loadUserOrganization: No user found, aborting.');
      set({ loading: false });
      return;
    }

    set({ loading: true, error: null });
    console.log('Set loading to true. User ID:', user.id);

    try {
      console.log("Step 1: Fetching membership from 'organization_members'");
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        console.error('loadUserOrganization ERROR at Step 1:', membershipError);
        throw new Error(`Failed to find your organization membership: ${membershipError.message}`);
      }
      if (!membership) {
        console.error('loadUserOrganization ERROR: No membership record found for user.');
        throw new Error('Your user account is not associated with any organization.');
      }
      console.log('Step 1 SUCCESS. Membership found. Org ID:', membership.organization_id);

      const organizationId = membership.organization_id;

      console.log("Step 2: Fetching organization details from 'organizations'");
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) {
        console.error('loadUserOrganization ERROR at Step 2:', orgError);
        throw new Error(`Failed to load your organization details: ${orgError.message}`);
      }
      if (!org) {
        console.error('loadUserOrganization ERROR: No organization record found for ID:', organizationId);
        throw new Error('Could not load your organization details.');
      }
      console.log('Step 2 SUCCESS. Organization found:', org.name);

      console.log('Step 3: Setting organization in store.');
      set({ organization: org, currentOrganization: org, loading: false, error: null });
      console.log('--- loadUserOrganization END ---');

    } catch (error: any) {
      console.error('loadUserOrganization: CATCH block error:', error);
      set({ error: error.message, loading: false });
      console.log('--- loadUserOrganization END with ERROR ---');
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

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  const store = useAuthStore.getState();

  if (event === 'SIGNED_IN' && session) {
    store.fetchSession();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({
      user: null,
      organization: null,
      currentOrganization: null,
    });
  }
});
