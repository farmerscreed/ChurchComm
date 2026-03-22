import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Megaphone,
  Star,
  Shield,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplianceEvent } from './ComplianceTimeline';
import { ComplianceTimeline } from './ComplianceTimeline';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceData {
  ctr30Day: number | null;
  activeCampaigns: number;
  qualityScoreAvg: number | null;
  grantStatus: 'Active' | 'Warning' | 'Suspended' | 'Unknown';
  events: ComplianceEvent[];
}

interface ComplianceDashboardProps {
  data: ComplianceData;
  onEventsUpdated?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCTRHealth(ctr: number | null): 'healthy' | 'warning' | 'critical' {
  if (ctr === null) return 'warning';
  if (ctr >= 5) return 'healthy';
  if (ctr >= 3) return 'warning';
  return 'critical';
}

function getQSHealth(qs: number | null): 'healthy' | 'warning' | 'critical' {
  if (qs === null) return 'warning';
  if (qs >= 6) return 'healthy';
  if (qs >= 4) return 'warning';
  return 'critical';
}

type Health = 'healthy' | 'warning' | 'critical';

const healthStyles: Record<
  Health,
  { gradient: string; border: string; iconBg: string; iconColor: string; textColor: string }
> = {
  healthy: {
    gradient: 'from-green-500/10 to-green-500/5',
    border: 'border-green-500/20 hover:border-green-500/30',
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    textColor: 'text-green-400',
  },
  warning: {
    gradient: 'from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/20 hover:border-amber-500/30',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-400',
  },
  critical: {
    gradient: 'from-red-500/10 to-red-500/5',
    border: 'border-red-500/20 hover:border-red-500/30',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    textColor: 'text-red-400',
  },
};

function GrantStatusBadge({ status }: { status: ComplianceData['grantStatus'] }) {
  const styles: Record<string, string> = {
    Active: 'bg-green-500/20 text-green-300 border-green-500/30',
    Warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Suspended: 'bg-red-500/20 text-red-300 border-red-500/30',
    Unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  return (
    <Badge
      variant="outline"
      className={cn('font-semibold px-3 py-1 text-sm', styles[status] ?? styles['Unknown'])}
    >
      {status}
    </Badge>
  );
}

function CTRHealthIcon({ health }: { health: Health }) {
  if (health === 'healthy') return <TrendingUp className="w-5 h-5" />;
  if (health === 'warning') return <AlertTriangle className="w-5 h-5" />;
  return <XCircle className="w-5 h-5" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComplianceDashboard({ data, onEventsUpdated }: ComplianceDashboardProps) {
  const ctrHealth = getCTRHealth(data.ctr30Day);
  const qsHealth = getQSHealth(data.qualityScoreAvg);

  const grantStatusHealth: Health =
    data.grantStatus === 'Active'
      ? 'healthy'
      : data.grantStatus === 'Suspended'
      ? 'critical'
      : 'warning';

  const ctrStyle = healthStyles[ctrHealth];
  const qsStyle = healthStyles[qsHealth];
  const grantStyle = healthStyles[grantStatusHealth];

  // CTR progress bar — 0–10% range, floor at 5%
  const ctrPercent =
    data.ctr30Day !== null ? Math.min(Math.max((data.ctr30Day / 10) * 100, 0), 100) : 0;
  const qsPercent =
    data.qualityScoreAvg !== null
      ? Math.min(Math.max((data.qualityScoreAvg / 10) * 100, 0), 100)
      : 0;

  const unreadCount = data.events.filter((e) => !e.is_read).length;

  return (
    <div className="space-y-6">
      {/* ── Metric Cards Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CTR (30-day) */}
        <div
          className={cn(
            'p-5 rounded-xl bg-gradient-to-br border transition-colors',
            ctrStyle.gradient,
            ctrStyle.border,
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', ctrStyle.iconBg)}>
              <span className={ctrStyle.iconColor}>
                <CTRHealthIcon health={ctrHealth} />
              </span>
            </div>
            {ctrHealth !== 'healthy' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-semibold border',
                  ctrHealth === 'warning'
                    ? 'border-amber-500/30 text-amber-300 bg-amber-500/10'
                    : 'border-red-500/30 text-red-300 bg-red-500/10',
                )}
              >
                {ctrHealth === 'warning' ? 'Low' : 'Critical'}
              </Badge>
            )}
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {data.ctr30Day !== null ? `${data.ctr30Day.toFixed(2)}%` : '—'}
          </p>
          <Progress
            value={ctrPercent}
            className={cn(
              'h-1.5 mt-2',
              ctrHealth === 'healthy'
                ? 'bg-green-500/20'
                : ctrHealth === 'warning'
                ? 'bg-amber-500/20'
                : 'bg-red-500/20',
            )}
          />
          <p className="text-xs text-slate-500 mt-2">CTR (30-day) — floor 5%</p>
        </div>

        {/* Active Campaigns */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{data.activeCampaigns}</p>
          <p className="text-xs text-slate-500 mt-2">Active Campaigns</p>
        </div>

        {/* Quality Score Avg */}
        <div
          className={cn(
            'p-5 rounded-xl bg-gradient-to-br border transition-colors',
            qsStyle.gradient,
            qsStyle.border,
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', qsStyle.iconBg)}>
              <Star className={cn('w-5 h-5', qsStyle.iconColor)} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {data.qualityScoreAvg !== null ? (
              <>
                {data.qualityScoreAvg.toFixed(1)}
                <span className="text-lg text-slate-500">/10</span>
              </>
            ) : (
              '—'
            )}
          </p>
          <Progress
            value={qsPercent}
            className={cn(
              'h-1.5 mt-2',
              qsHealth === 'healthy'
                ? 'bg-green-500/20'
                : qsHealth === 'warning'
                ? 'bg-amber-500/20'
                : 'bg-red-500/20',
            )}
          />
          <p className="text-xs text-slate-500 mt-2">Quality Score Avg</p>
        </div>

        {/* Grant Status */}
        <div
          className={cn(
            'p-5 rounded-xl bg-gradient-to-br border transition-colors',
            grantStyle.gradient,
            grantStyle.border,
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', grantStyle.iconBg)}>
              <Shield className={cn('w-5 h-5', grantStyle.iconColor)} />
            </div>
          </div>
          <div className="mt-1">
            <GrantStatusBadge status={data.grantStatus} />
          </div>
          <p className="text-xs text-slate-500 mt-3">Grant Status</p>
        </div>
      </div>

      {/* ── Compliance Timeline ───────────────────────────────────────────────── */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-indigo-400" />
            Compliance Events
          </h3>
          {unreadCount > 0 && (
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <ComplianceTimeline events={data.events} onEventsUpdated={onEventsUpdated} />
      </div>
    </div>
  );
}

export default ComplianceDashboard;
