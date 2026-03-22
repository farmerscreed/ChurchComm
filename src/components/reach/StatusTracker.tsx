import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Send,
  Search,
  CheckCircle2,
  Zap,
  TrendingUp,
  Loader2,
} from 'lucide-react';

// ---- Types ----

export type GrantStatus =
  | 'not_started'
  | 'gathering_docs'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'grants_activated'
  | 'campaigns_live';

interface StageDefinition {
  status: GrantStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
}

const STAGES: StageDefinition[] = [
  {
    status: 'not_started',
    label: 'Not started',
    description: 'You have not yet begun the Google Ad Grant application process.',
    icon: FileText,
    actionLabel: 'Start gathering documents',
  },
  {
    status: 'gathering_docs',
    label: 'Gathering documents',
    description: 'Collecting your 501(c)(3) determination letter, Google account info, and other required materials.',
    icon: FileText,
    actionLabel: 'Mark documents ready',
  },
  {
    status: 'submitted',
    label: 'Application submitted',
    description: 'You have submitted your application at nonprofits.google.com and are awaiting review.',
    icon: Send,
    actionLabel: 'Mark as under review',
  },
  {
    status: 'under_review',
    label: 'Under review',
    description: 'Google is reviewing your application. This typically takes 5–10 business days.',
    icon: Search,
    actionLabel: 'Mark as approved',
  },
  {
    status: 'approved',
    label: 'Approved',
    description: 'Congratulations! Your Google for Nonprofits account has been approved.',
    icon: CheckCircle2,
    actionLabel: 'Activate Ad Grants',
  },
  {
    status: 'grants_activated',
    label: 'Grants activated',
    description: 'Your $10,000/month Google Ad Grant account is active and ready for campaigns.',
    icon: Zap,
    actionLabel: 'Launch first campaign',
  },
  {
    status: 'campaigns_live',
    label: 'Campaigns live',
    description: 'Your campaigns are running and driving traffic to your website.',
    icon: TrendingUp,
  },
];

const STATUS_ORDER = STAGES.map(s => s.status);

function getNextStatus(current: GrantStatus): GrantStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

function getStageIndex(status: GrantStatus): number {
  return STATUS_ORDER.indexOf(status);
}

// ---- Component ----

interface StatusTrackerProps {
  grantAccountId: string | null;
  currentStatus: GrantStatus;
  onStatusChange?: (newStatus: GrantStatus) => void;
}

export function StatusTracker({ grantAccountId, currentStatus, onStatusChange }: StatusTrackerProps) {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();
  const [advancing, setAdvancing] = useState(false);

  const currentIdx = getStageIndex(currentStatus);
  const nextStatus = getNextStatus(currentStatus);
  const currentStage = STAGES.find(s => s.status === currentStatus);

  async function handleAdvance() {
    if (!nextStatus || !currentOrganization?.id) return;

    setAdvancing(true);
    try {
      if (grantAccountId) {
        const { error } = await supabase
          .from('grant_accounts')
          .update({ grant_status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', grantAccountId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('grant_accounts').upsert(
          { org_id: currentOrganization.id, grant_status: nextStatus },
          { onConflict: 'org_id' }
        );
        if (error) throw error;
      }

      onStatusChange?.(nextStatus);
      const nextStage = STAGES.find(s => s.status === nextStatus);
      toast({
        title: 'Progress updated',
        description: `Status advanced to: ${nextStage?.label}`,
      });
    } catch (err: unknown) {
      console.error('Error advancing status:', err);
      toast({ title: 'Update failed', description: 'Could not save your progress.', variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">Application Progress</CardTitle>
          <StatusBadge status={currentStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {STAGES.map((stage, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <StageRow
              key={stage.status}
              stage={stage}
              isPast={isPast}
              isCurrent={isCurrent}
              isLast={idx === STAGES.length - 1}
            />
          );
        })}

        {/* Advance button */}
        {nextStatus && currentStage?.actionLabel && (
          <div className="pt-4">
            <Button
              onClick={handleAdvance}
              disabled={advancing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
            >
              {advancing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {currentStage.actionLabel}
                </>
              )}
            </Button>
          </div>
        )}

        {currentStatus === 'campaigns_live' && (
          <div className="pt-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-indigo-500/20 p-4 text-center">
            <TrendingUp className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">You're live!</p>
            <p className="text-slate-400 text-xs mt-1">
              Your Google Ad Grant campaigns are running. You can now reach people searching for what your church offers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Stage Row ----

interface StageRowProps {
  stage: StageDefinition;
  isPast: boolean;
  isCurrent: boolean;
  isLast: boolean;
}

function StageRow({ stage, isPast, isCurrent, isLast }: StageRowProps) {
  const Icon = stage.icon;

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        <div
          className={[
            'w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
            isPast
              ? 'bg-green-500/20 border-green-500/50'
              : isCurrent
              ? 'bg-indigo-500/20 border-indigo-500/60 ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-slate-900'
              : 'bg-slate-800/50 border-slate-700/50',
          ].join(' ')}
        >
          {isPast ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <Icon
              className={[
                'h-4 w-4',
                isCurrent ? 'text-indigo-400' : 'text-slate-600',
              ].join(' ')}
            />
          )}
        </div>
        {!isLast && (
          <div
            className={[
              'w-0.5 flex-1 my-1 min-h-[24px]',
              isPast ? 'bg-green-500/30' : 'bg-slate-800',
            ].join(' ')}
          />
        )}
      </div>

      {/* Content column */}
      <div className={['pb-5 flex-1', isLast && 'pb-0'].join(' ')}>
        <div className="flex items-center gap-2 mb-0.5">
          <p
            className={[
              'text-sm font-semibold',
              isPast ? 'text-slate-400' : isCurrent ? 'text-white' : 'text-slate-600',
            ].join(' ')}
          >
            {stage.label}
          </p>
          {isCurrent && (
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] px-1.5 py-0">
              Current
            </Badge>
          )}
        </div>
        {(isCurrent || isPast) && (
          <p
            className={[
              'text-xs leading-relaxed',
              isPast ? 'text-slate-600' : 'text-slate-400',
            ].join(' ')}
          >
            {stage.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ---- Status Badge ----

function StatusBadge({ status }: { status: GrantStatus }) {
  const config: Record<GrantStatus, { label: string; className: string }> = {
    not_started: { label: 'Not started', className: 'bg-slate-700/50 text-slate-300 border-slate-600/30' },
    gathering_docs: { label: 'In progress', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    submitted: { label: 'Submitted', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    under_review: { label: 'Under review', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    approved: { label: 'Approved', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
    grants_activated: { label: 'Grants active', className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    campaigns_live: { label: 'Live', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
  };

  const { label, className } = config[status] ?? config.not_started;
  return <Badge className={`${className} text-xs font-semibold`}>{label}</Badge>;
}
