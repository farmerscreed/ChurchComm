import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectGrantAccountProps {
  onConnected?: () => void;
}

type Step = 1 | 2 | 3;

// ─── Regex ────────────────────────────────────────────────────────────────────

// Google Ads Account ID format: XXX-XXX-XXXX
const ADS_ID_REGEX = /^\d{3}-\d{3}-\d{4}$/;

function formatAdsId(raw: string): string {
  // Strip all non-digits and auto-insert dashes
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = (i + 1) as Step;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                isDone
                  ? 'bg-green-500/30 text-green-400 border border-green-500/40'
                  : isActive
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 text-slate-600 border border-white/10',
              )}
            >
              {isDone ? <CheckCircle2 className="w-4 h-4" /> : step}
            </div>
            {i < total - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 rounded-full transition-all',
                  isDone ? 'bg-green-500/40' : 'bg-white/10',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConnectGrantAccount({ onConnected }: ConnectGrantAccountProps) {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [adsId, setAdsId] = useState('');
  const [adsIdError, setAdsIdError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [guardianCustomerId, setGuardianCustomerId] = useState<string | null>(null);

  // ── Step 1: Validate and advance ────────────────────────────────────────────
  const handleStep1Continue = () => {
    if (!ADS_ID_REGEX.test(adsId)) {
      setAdsIdError('Please enter a valid Google Ads Account ID (e.g. 123-456-7890)');
      return;
    }
    setAdsIdError('');
    setStep(2);
  };

  // ── Step 2: Authorize (OAuth placeholder) → advance ─────────────────────────
  const handleAuthorize = () => {
    // OAuth not yet available; proceed to manual confirmation
    setStep(3);
  };

  // ── Step 3: Register with GUARDIAN and persist ──────────────────────────────
  const handleRegister = async () => {
    if (!currentOrganization?.id) {
      toast({ title: 'No organization found', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upsert into grant_accounts
      const { error: dbError } = await supabase.from('grant_accounts').upsert(
        {
          org_id: currentOrganization.id,
          google_ads_account_id: adsId,
          grant_status: 'grants_activated',
        },
        { onConflict: 'org_id' },
      );
      if (dbError) throw dbError;

      // 2. Register with GUARDIAN proxy
      const { data: guardianData, error: fnError } = await supabase.functions.invoke(
        'guardian-proxy',
        { body: { action: 'register', google_ads_account_id: adsId } },
      );

      if (fnError) {
        // Non-fatal: GUARDIAN may not be deployed yet; we still store the account
        console.warn('GUARDIAN register warning:', fnError.message);
        toast({
          title: 'Account saved — GUARDIAN pending',
          description:
            'Your Ad Grant account was stored. GUARDIAN will activate once the API is approved.',
        });
      } else {
        const customerId = guardianData?.customer_id ?? null;
        if (customerId) {
          setGuardianCustomerId(customerId);
          await supabase
            .from('grant_accounts')
            .update({ guardian_customer_id: customerId })
            .eq('org_id', currentOrganization.id);
        }
        toast({ title: 'Account connected', description: 'GUARDIAN is now monitoring your Ad Grant.' });
      }

      setConnected(true);
      onConnected?.();
    } catch (err: unknown) {
      toast({
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (connected) {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4">
        <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
          <Shield className="w-10 h-10 text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white">GUARDIAN is active</h3>
          <p className="text-sm text-slate-400">
            Your account is now being monitored by GUARDIAN.
          </p>
        </div>
        {guardianCustomerId && (
          <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono text-xs">
            Customer ID: {guardianCustomerId}
          </Badge>
        )}
        <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono">
          {adsId}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Connect Your Ad Grant Account
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Link your Google Ad Grant so GUARDIAN can monitor compliance automatically.
          </p>
        </div>
        <StepIndicator current={step} total={3} />
      </div>

      {/* Step cards */}
      <div className="space-y-4">
        {/* ── Step 1: Account ID ─────────────────────────────────────────────── */}
        <div
          className={cn(
            'p-5 rounded-xl border transition-all',
            step === 1
              ? 'bg-white/5 border-white/15'
              : step > 1
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-white/[0.02] border-white/5 opacity-50',
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                step > 1
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white',
              )}
            >
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <h3 className="font-semibold text-white">Enter Your Google Ads Account ID</h3>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Account ID
                </label>
                <input
                  type="text"
                  value={adsId}
                  onChange={(e) => {
                    setAdsId(formatAdsId(e.target.value));
                    setAdsIdError('');
                  }}
                  placeholder="123-456-7890"
                  className={cn(
                    'w-full bg-white/5 border rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600',
                    'font-mono text-base focus:outline-none focus:ring-2 transition-all',
                    adsIdError
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-white/10 focus:ring-indigo-500/30 focus:border-indigo-500/50',
                  )}
                  maxLength={12}
                />
                {adsIdError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <Info className="w-3 h-3" />
                    {adsIdError}
                  </p>
                )}
                <p className="text-xs text-slate-600">
                  Find this in your Google Ads account under{' '}
                  <span className="text-slate-500">Account settings → Account ID</span>.
                </p>
              </div>

              <Button
                onClick={handleStep1Continue}
                disabled={!adsId}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step > 1 && (
            <p className="text-sm text-slate-400 font-mono">{adsId}</p>
          )}
        </div>

        {/* ── Step 2: OAuth authorization ───────────────────────────────────── */}
        <div
          className={cn(
            'p-5 rounded-xl border transition-all',
            step === 2
              ? 'bg-white/5 border-white/15'
              : step > 2
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-white/[0.02] border-white/5 opacity-50',
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                step > 2
                  ? 'bg-green-500/20 text-green-400'
                  : step === 2
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                  : 'bg-white/5 text-slate-600 border border-white/10',
              )}
            >
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <h3 className="font-semibold text-white">Authorize with Google</h3>
          </div>

          {step === 2 && (
            <div className="space-y-4">
              {/* API approval pending notice */}
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-300">
                    Google OAuth — API approval pending
                  </p>
                  <p className="text-xs text-slate-400">
                    Full OAuth integration is awaiting Google API approval. In the meantime,
                    your account is connected via manual entry and GUARDIAN will begin monitoring
                    once approved.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleAuthorize}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Authorize with Google (Pending)
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAuthorize}
                  className="border-white/10 text-slate-300 hover:bg-white/5 gap-2"
                >
                  Skip — Use Manual Entry
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step > 2 && (
            <p className="text-sm text-slate-500">Manual entry (OAuth pending approval)</p>
          )}
        </div>

        {/* ── Step 3: Confirm registration ──────────────────────────────────── */}
        <div
          className={cn(
            'p-5 rounded-xl border transition-all',
            step === 3
              ? 'bg-white/5 border-white/15'
              : 'bg-white/[0.02] border-white/5 opacity-50',
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                step === 3
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                  : 'bg-white/5 text-slate-600 border border-white/10',
              )}
            >
              3
            </div>
            <h3 className="font-semibold text-white">Activate GUARDIAN Monitoring</h3>
          </div>

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                <p className="text-sm text-slate-300">
                  GUARDIAN will monitor your Ad Grant account{' '}
                  <span className="text-white font-mono">{adsId}</span> and:
                </p>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside ml-1">
                  <li>Alert you when CTR drops below the 5% compliance floor</li>
                  <li>Automatically pause keywords that risk grant suspension</li>
                  <li>Monitor quality scores and trigger purges as needed</li>
                  <li>Send real-time compliance events to this dashboard</li>
                </ul>
              </div>

              <Button
                onClick={handleRegister}
                disabled={submitting}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Activate GUARDIAN
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConnectGrantAccount;
