import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { EligibilityChecker } from '@/components/reach/EligibilityChecker';
import { PreflightChecker } from '@/components/reach/PreflightChecker';
import { ApplicationWizard } from '@/components/reach/ApplicationWizard';
import { StatusTracker, type GrantStatus } from '@/components/reach/StatusTracker';
import {
  Target,
  Globe,
  ClipboardList,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// ---- Types ----

interface GrantAccount {
  id: string;
  org_id: string;
  grant_status: GrantStatus;
  google_ads_account_id: string | null;
  preflight_last_score: number | null;
  created_at: string;
  updated_at: string;
}

type ActiveSection = 'overview' | 'eligibility' | 'preflight' | 'wizard';

// ---- Main Page ----

export default function ReachDashboard() {
  const { currentOrganization } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [grantAccount, setGrantAccount] = useState<GrantAccount | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [preflightInitialUrl, setPreflightInitialUrl] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchGrantAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id]);

  async function fetchGrantAccount() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grant_accounts')
        .select('*')
        .eq('org_id', currentOrganization!.id)
        .maybeSingle();

      if (error) throw error;
      setGrantAccount(data ?? null);
    } catch (err: unknown) {
      console.error('Error fetching grant account:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleEligibilityQualified(websiteUrl: string) {
    setPreflightInitialUrl(websiteUrl);
    setActiveSection('preflight');
    fetchGrantAccount();
  }

  function handleStatusChange(newStatus: GrantStatus) {
    setGrantAccount(prev =>
      prev ? { ...prev, grant_status: newStatus } : prev
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
          <p className="text-slate-400 text-sm">Loading REACH...</p>
        </div>
      </div>
    );
  }

  const grantStatus = grantAccount?.grant_status ?? 'not_started';
  const hasStarted = grantStatus !== 'not_started';

  return (
    <div className="flex-1 overflow-auto bg-slate-950 min-h-screen">
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

        {/* Page Header */}
        <PageHeader grantStatus={grantStatus} />

        {/* Value proposition stats (always visible) */}
        <StatsRow />

        {/* Main content area */}
        {activeSection === 'overview' && (
          <OverviewSection
            grantAccount={grantAccount}
            grantStatus={grantStatus}
            hasStarted={hasStarted}
            onOpenEligibility={() => setActiveSection('eligibility')}
            onOpenPreflight={() => {
              setPreflightInitialUrl(currentOrganization?.website ?? '');
              setActiveSection('preflight');
            }}
            onOpenWizard={() => setActiveSection('wizard')}
            onStatusChange={handleStatusChange}
          />
        )}

        {activeSection === 'eligibility' && (
          <div className="space-y-4">
            <SectionNav
              label="Eligibility Checker"
              onBack={() => setActiveSection('overview')}
            />
            <EligibilityChecker onQualified={handleEligibilityQualified} />
          </div>
        )}

        {activeSection === 'preflight' && (
          <div className="space-y-4">
            <SectionNav
              label="Website Preflight Scan"
              onBack={() => setActiveSection('overview')}
            />
            <PreflightChecker initialUrl={preflightInitialUrl} />
          </div>
        )}

        {activeSection === 'wizard' && (
          <div className="space-y-4">
            <SectionNav
              label="Application Wizard"
              onBack={() => setActiveSection('overview')}
            />
            <ApplicationWizard
              grantAccountId={grantAccount?.id ?? null}
              currentStatus={grantStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Page Header ----

function PageHeader({ grantStatus }: { grantStatus: GrantStatus }) {
  const statusLabel: Record<GrantStatus, string> = {
    not_started: 'Not started',
    gathering_docs: 'In progress',
    submitted: 'Application submitted',
    under_review: 'Under review',
    approved: 'Approved',
    grants_activated: 'Grants active',
    campaigns_live: 'Campaigns live',
  };

  const statusColor: Record<GrantStatus, string> = {
    not_started: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
    gathering_docs: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    submitted: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    under_review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    grants_activated: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    campaigns_live: 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-indigo-600/5 to-blue-600/10 rounded-2xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-indigo-500/20 flex items-center justify-center">
            <Target className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">REACH</h1>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-semibold">
                Google Ad Grant Module
              </Badge>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Unlock $10,000/month in free Google advertising for your church
            </p>
          </div>
        </div>
        <Badge className={`${statusColor[grantStatus]} text-xs font-semibold px-3 py-1.5 shrink-0`}>
          {statusLabel[grantStatus]}
        </Badge>
      </div>
    </div>
  );
}

// ---- Stats Row ----

function StatsRow() {
  const stats = [
    {
      icon: DollarSign,
      value: '$10,000',
      label: 'Per month in free Google Ads',
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    {
      icon: TrendingUp,
      value: '35%',
      label: 'Average website traffic increase',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: Globe,
      value: '60%+',
      label: 'Of eligible nonprofits don\'t apply',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: Sparkles,
      value: '100%',
      label: 'Free — no budget required',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={`rounded-xl border p-4 ${stat.bg}`}>
          <stat.icon className={`h-5 w-5 mb-2 ${stat.color}`} />
          <p className="text-white text-xl font-bold">{stat.value}</p>
          <p className="text-slate-400 text-xs mt-0.5 leading-snug">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ---- Overview Section ----

interface OverviewSectionProps {
  grantAccount: GrantAccount | null;
  grantStatus: GrantStatus;
  hasStarted: boolean;
  onOpenEligibility: () => void;
  onOpenPreflight: () => void;
  onOpenWizard: () => void;
  onStatusChange: (status: GrantStatus) => void;
}

function OverviewSection({
  grantAccount,
  grantStatus,
  hasStarted,
  onOpenEligibility,
  onOpenPreflight,
  onOpenWizard,
  onStatusChange,
}: OverviewSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: action cards */}
      <div className="lg:col-span-2 space-y-4">
        {/* CTA header card */}
        {!hasStarted && (
          <div className="rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-indigo-500/20 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-white font-semibold text-lg mb-1">
                  Start your free $10,000/month grant
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  The Google Ad Grants program gives eligible nonprofits $10,000 per month to run search ads — completely free. Most churches qualify in under 30 days.
                </p>
                <Button
                  onClick={onOpenEligibility}
                  className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                >
                  Check eligibility
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModuleCard
            icon={CheckCircle2}
            iconColor="text-green-400"
            iconBg="bg-green-500/10 border-green-500/20"
            title="Eligibility Checker"
            description="5 quick questions to see if you qualify for Google Ad Grants."
            ctaLabel="Check eligibility"
            onClick={onOpenEligibility}
          />
          <ModuleCard
            icon={Globe}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10 border-blue-500/20"
            title="Preflight Website Scan"
            description="Scan your site against all 10 Google Ad Grant website requirements."
            ctaLabel="Scan website"
            badge={
              grantAccount?.preflight_last_score !== null && grantAccount?.preflight_last_score !== undefined
                ? `Last score: ${grantAccount.preflight_last_score}/10`
                : undefined
            }
            onClick={onOpenPreflight}
          />
          <ModuleCard
            icon={ClipboardList}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10 border-purple-500/20"
            title="Application Wizard"
            description="Step-by-step guidance through the entire application process."
            ctaLabel="Open wizard"
            onClick={onOpenWizard}
          />
          <ModuleCard
            icon={TrendingUp}
            iconColor="text-indigo-400"
            iconBg="bg-indigo-500/10 border-indigo-500/20"
            title="Application Progress"
            description="Track where you are in the 7-stage grant application journey."
            ctaLabel="View tracker"
            onClick={() => {
              // scroll to tracker below
              document.getElementById('status-tracker')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      </div>

      {/* Right column: status tracker */}
      <div id="status-tracker">
        <StatusTracker
          grantAccountId={grantAccount?.id ?? null}
          currentStatus={grantStatus}
          onStatusChange={onStatusChange}
        />
      </div>
    </div>
  );
}

// ---- Module Card ----

interface ModuleCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  ctaLabel: string;
  badge?: string;
  onClick: () => void;
}

function ModuleCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  ctaLabel,
  badge,
  onClick,
}: ModuleCardProps) {
  return (
    <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl hover:border-white/20 transition-all group">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {badge && (
            <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/30 text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-white text-sm font-semibold">{title}</p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="w-full justify-between text-slate-300 hover:text-white hover:bg-white/5 group-hover:text-white"
        >
          {ctaLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ---- Section Nav ----

function SectionNav({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="text-slate-400 hover:text-white hover:bg-white/5 -ml-2"
      >
        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
        Back to overview
      </Button>
      <span className="text-slate-600">/</span>
      <span className="text-slate-300 text-sm font-medium">{label}</span>
    </div>
  );
}
