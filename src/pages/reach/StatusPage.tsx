import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { StatusTracker, type GrantStatus } from '@/components/reach/StatusTracker';
import { Loader2 } from 'lucide-react';

interface GrantAccount {
  id: string;
  grant_status: GrantStatus;
}

export default function StatusPage() {
  const { currentOrganization } = useAuthStore();
  const [grantAccount, setGrantAccount] = useState<GrantAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization?.id) return;

    supabase
      .from('grant_accounts')
      .select('id, grant_status')
      .eq('org_id', currentOrganization.id)
      .maybeSingle()
      .then(({ data }) => {
        setGrantAccount(data ?? null);
        setLoading(false);
      });
  }, [currentOrganization?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <StatusTracker
        grantAccountId={grantAccount?.id ?? null}
        currentStatus={grantAccount?.grant_status ?? 'not_started'}
        onStatusChange={newStatus =>
          setGrantAccount(prev => prev ? { ...prev, grant_status: newStatus } : prev)
        }
      />
    </div>
  );
}
