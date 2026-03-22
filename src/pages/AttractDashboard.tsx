import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Link2,
  Megaphone,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { ComplianceDashboard } from '@/components/attract/ComplianceDashboard';
import { ConnectGrantAccount } from '@/components/attract/ConnectGrantAccount';
import type { ComplianceData } from '@/components/attract/ComplianceDashboard';
import type { ComplianceEvent } from '@/components/attract/ComplianceTimeline';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrantAccount {
  id: string;
  org_id: string;
  google_ads_account_id: string | null;
  guardian_customer_id: string | null;
  grant_status: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse',
        className,
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-white/5 mb-3" />
      <div className="h-8 w-20 bg-white/5 rounded mb-2" />
      <div className="h-3 w-28 bg-white/[0.03] rounded" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="p-5 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse h-64" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AttractDashboard() {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [guardianError, setGuardianError] = useState(false);
  const [grantAccount, setGrantAccount] = useState<GrantAccount | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [complianceData, setComplianceData] = useState<ComplianceData>({
    ctr30Day: null,
    activeCampaigns: 0,
    qualityScoreAvg: null,
    grantStatus: 'Unknown',
    events: [],
  });

  // ── Fetch grant account ────────────────────────────────────────────────────
  const fetchGrantAccount = useCallback(async () => {
    if (!currentOrganization?.id) return;
    const { data, error } = await supabase
      .from('grant_accounts')
      .select('*')
      .eq('org_id', currentOrganization.id)
      .maybeSingle();

    if (error) {
      console.error('grant_accounts fetch error:', error);
    }
    setGrantAccount(data ?? null);
    setAccountChecked(true);
    return data ?? null;
  }, [currentOrganization?.id]);

  // ── Fetch compliance events from DB ───────────────────────────────────────
  const fetchComplianceEvents = useCallback(async (): Promise<ComplianceEvent[]> => {
    if (!currentOrganization?.id) return [];
    const { data, error } = await supabase
      .from('grant_compliance_events')
      .select('*')
      .eq('org_id', currentOrganization.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('grant_compliance_events fetch error:', error);
      return [];
    }
    return (data ?? []) as ComplianceEvent[];
  }, [currentOrganization?.id]);

  // ── Fetch GUARDIAN status ──────────────────────────────────────────────────
  const fetchGuardianStatus = useCallback(async (): Promise<Partial<ComplianceData>> => {
    try {
      const { data, error } = await supabase.functions.invoke('guardian-proxy', {
        body: { action: 'status' },
      });
      if (error) throw error;

      return {
        ctr30Day: data?.ctr_30_day ?? null,
        activeCampaigns: data?.active_campaigns ?? 0,
        qualityScoreAvg: data?.quality_score_avg ?? null,
        grantStatus:
          (data?.grant_status as ComplianceData['grantStatus']) ?? 'Unknown',
      };
    } catch (err) {
      console.warn('GUARDIAN status unavailable:', err);
      setGuardianError(true);
      return {};
    }
  }, []);

  // ── Master data load ───────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);
    setGuardianError(false);

    const [account, events, guardianStatus] = await Promise.all([
      fetchGrantAccount(),
      fetchComplianceEvents(),
      fetchGuardianStatus(),
    ]);

    setComplianceData((prev) => ({
      ...prev,
      ...guardianStatus,
      // Derive grant_status from DB account if GUARDIAN didn't return one
      grantStatus:
        guardianStatus.grantStatus && guardianStatus.grantStatus !== 'Unknown'
          ? guardianStatus.grantStatus
          : account
          ? (account.grant_status as ComplianceData['grantStatus']) ?? 'Unknown'
          : 'Unknown',
      events,
    }));

    setLoading(false);
  }, [currentOrganization?.id, fetchGrantAccount, fetchComplianceEvents, fetchGuardianStatus]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Compliance sweep ───────────────────────────────────────────────────────
  const runComplianceSweep = async () => {
    setSweeping(true);
    try {
      const { error } = await supabase.functions.invoke('guardian-proxy', {
        body: { action: 'sweep' },
      });
      if (error) throw error;
      toast({ title: 'Compliance sweep complete', description: 'GUARDIAN has finished scanning your account.' });
      // Reload events after sweep
      const events = await fetchComplianceEvents();
      setComplianceData((prev) => ({ ...prev, events }));
    } catch (err: unknown) {
      toast({
        title: 'Sweep failed',
        description: guardianError
          ? 'GUARDIAN is currently unreachable. Please try again later.'
          : err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSweeping(false);
    }
  };

  // ── Events updated callback (from timeline mark-as-read) ──────────────────
  const handleEventsUpdated = async () => {
    const events = await fetchComplianceEvents();
    setComplianceData((prev) => ({ ...prev, events }));
  };

  // ── Handle account connected ───────────────────────────────────────────────
  const handleConnected = () => {
    setShowConnect(false);
    loadAll();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              ATTRACT
            </span>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-semibold">
              GUARDIAN
            </Badge>
          </h1>
          <p className="text-slate-400 mt-1">
            Google Ad Grant compliance monitoring — powered by GUARDIAN.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Connect account — show if no account or explicitly requested */}
          {(!grantAccount || showConnect) && accountChecked && !loading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConnect((v) => !v)}
              className="border-white/10 text-slate-300 hover:bg-white/5 gap-2"
            >
              <Link2 className="w-4 h-4" />
              {showConnect ? 'Cancel' : 'Connect Ad Grant Account'}
            </Button>
          )}

          {grantAccount && (
            <Button
              size="sm"
              onClick={runComplianceSweep}
              disabled={sweeping || loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 gap-2"
            >
              {sweeping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Run Compliance Check
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── GUARDIAN unreachable banner ──────────────────────────────────────── */}
      {guardianError && !loading && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10 p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">GUARDIAN is unreachable</p>
              <p className="text-xs text-slate-400 mt-0.5">
                The compliance engine could not be contacted. Compliance events from the database
                are still shown below. GUARDIAN may be deploying — check back shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────────────── */}
      {loading && (
        <DashboardSkeleton />
      )}

      {/* ── Connect account flow ──────────────────────────────────────────────── */}
      {!loading && (showConnect || (!grantAccount && accountChecked)) && (
        <div className="p-5 md:p-6 rounded-xl bg-white/5 border border-white/10">
          {/* No-account CTA when not yet connected */}
          {!grantAccount && !showConnect && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <Megaphone className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Connect your Ad Grant account</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Link your Google Ad Grant to start GUARDIAN compliance monitoring.
                </p>
              </div>
              <Button
                onClick={() => setShowConnect(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 gap-2 mx-auto"
              >
                <Link2 className="w-4 h-4" />
                Connect Ad Grant Account
              </Button>
            </div>
          )}

          {showConnect && (
            <ConnectGrantAccount onConnected={handleConnected} />
          )}
        </div>
      )}

      {/* ── Main compliance dashboard ─────────────────────────────────────────── */}
      {!loading && grantAccount && !showConnect && (
        <>
          {/* Connected account info strip */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/15">
            <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Connected account:</span>
              <Badge
                variant="outline"
                className="border-white/10 text-slate-300 font-mono text-xs"
              >
                {grantAccount.google_ads_account_id ?? 'Unknown'}
              </Badge>
              {grantAccount.guardian_customer_id && (
                <Badge
                  variant="outline"
                  className="border-indigo-500/30 text-indigo-400 font-mono text-xs"
                >
                  GUARDIAN: {grantAccount.guardian_customer_id}
                </Badge>
              )}
            </div>
            <button
              onClick={() => setShowConnect(true)}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Change
            </button>
          </div>

          <ComplianceDashboard
            data={complianceData}
            onEventsUpdated={handleEventsUpdated}
          />
        </>
      )}

      {/* ── Empty state when no events yet ───────────────────────────────────── */}
      {!loading && grantAccount && !showConnect && complianceData.events.length === 0 && !guardianError && (
        <div className="flex flex-col items-center py-10 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-400 opacity-60" />
          </div>
          <p className="text-sm text-slate-500">
            No compliance events yet. Run a check or wait for GUARDIAN to scan automatically.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={runComplianceSweep}
            disabled={sweeping}
            className="text-indigo-400 hover:text-indigo-300 gap-2"
          >
            {sweeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run First Check
          </Button>
        </div>
      )}

      {/* ── Compliance score legend ───────────────────────────────────────────── */}
      {!loading && grantAccount && !showConnect && (
        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.02] flex flex-wrap gap-5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 inline-block" />
            CTR ≥ 5% — Compliant
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
            CTR 3–5% — Warning zone
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block" />
            CTR &lt; 3% — Suspension risk
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-slate-600" />
            QS ≥ 6 healthy · QS 4–5 warning · QS &lt; 4 critical
          </div>
        </div>
      )}
    </div>
  );
}
