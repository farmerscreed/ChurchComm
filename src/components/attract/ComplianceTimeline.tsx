import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  ShieldOff,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplianceEventType =
  | 'CTR_WARNING'
  | 'CTR_KILL'
  | 'QS_PURGE'
  | 'SUSPENSION'
  | 'HEALTHY'
  | string;

export type ComplianceSeverity = 'info' | 'warning' | 'critical';

export interface ComplianceEvent {
  id: string;
  org_id: string;
  event_type: ComplianceEventType;
  severity: ComplianceSeverity;
  metric_name: string | null;
  metric_value: number | null;
  threshold: number | null;
  action_taken: string | null;
  message: string | null;
  raw_payload: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

type SeverityFilter = 'all' | ComplianceSeverity;

interface ComplianceTimelineProps {
  events: ComplianceEvent[];
  onEventsUpdated?: () => void;
  pageSize?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(isoString).toLocaleDateString();
}

function getEventIcon(type: ComplianceEventType) {
  switch (type) {
    case 'CTR_WARNING':
      return <TrendingDown className="w-4 h-4" />;
    case 'CTR_KILL':
      return <AlertTriangle className="w-4 h-4" />;
    case 'QS_PURGE':
      return <Trash2 className="w-4 h-4" />;
    case 'SUSPENSION':
      return <ShieldOff className="w-4 h-4" />;
    case 'HEALTHY':
      return <CheckCircle2 className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
}

function getEventIconColors(type: ComplianceEventType): string {
  switch (type) {
    case 'CTR_WARNING':
      return 'text-amber-400 bg-amber-500/20';
    case 'CTR_KILL':
    case 'SUSPENSION':
      return 'text-red-400 bg-red-500/20';
    case 'QS_PURGE':
      return 'text-orange-400 bg-orange-500/20';
    case 'HEALTHY':
      return 'text-green-400 bg-green-500/20';
    default:
      return 'text-blue-400 bg-blue-500/20';
  }
}

function getSeverityBadge(severity: ComplianceSeverity) {
  const styles: Record<ComplianceSeverity, string> = {
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5', styles[severity])}
    >
      {severity}
    </Badge>
  );
}

function getEventTypeLabel(type: ComplianceEventType): string {
  const labels: Record<string, string> = {
    CTR_WARNING: 'CTR Warning',
    CTR_KILL: 'CTR Kill',
    QS_PURGE: 'QS Purge',
    SUSPENSION: 'Suspension',
    HEALTHY: 'Healthy',
  };
  return labels[type] ?? type.replace(/_/g, ' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComplianceTimeline({
  events,
  onEventsUpdated,
  pageSize = 10,
}: ComplianceTimelineProps) {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());

  const filtered = events.filter(
    (e) => severityFilter === 'all' || e.severity === severityFilter,
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const markAsRead = async (eventId: string) => {
    if (markingRead.has(eventId)) return;
    setMarkingRead((prev) => new Set(prev).add(eventId));
    try {
      const { error } = await supabase
        .from('grant_compliance_events')
        .update({ is_read: true })
        .eq('id', eventId);
      if (error) throw error;
      onEventsUpdated?.();
    } catch (err: unknown) {
      toast({
        title: 'Failed to mark as read',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setMarkingRead((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const markAllRead = async () => {
    const unread = events.filter((e) => !e.is_read).map((e) => e.id);
    if (unread.length === 0) return;
    try {
      const { error } = await supabase
        .from('grant_compliance_events')
        .update({ is_read: true })
        .in('id', unread);
      if (error) throw error;
      onEventsUpdated?.();
      toast({ title: 'All events marked as read' });
    } catch (err: unknown) {
      toast({
        title: 'Failed to mark all as read',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const unreadCount = events.filter((e) => !e.is_read).length;

  const filterButtons: { label: string; value: SeverityFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Info', value: 'info' },
    { label: 'Warning', value: 'warning' },
    { label: 'Critical', value: 'critical' },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Severity filters */}
        <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1 gap-0.5">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => {
                setSeverityFilter(btn.value);
                setVisibleCount(pageSize);
              }}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all',
                severityFilter === btn.value
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="text-xs text-slate-400 hover:text-white h-7 px-3"
          >
            Mark all read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Event list */}
      {visible.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No compliance events found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((event) => {
            const iconColors = getEventIconColors(event.event_type);
            const isUnread = !event.is_read;

            return (
              <div
                key={event.id}
                className={cn(
                  'relative flex gap-4 p-4 rounded-xl border transition-all',
                  isUnread
                    ? 'bg-white/5 border-white/10 border-l-2 border-l-indigo-500'
                    : 'bg-white/[0.02] border-white/5',
                  'hover:border-white/15',
                )}
              >
                {/* Event type icon */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                    iconColors,
                  )}
                >
                  {getEventIcon(event.event_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    {getSeverityBadge(event.severity)}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                  </div>

                  {event.message && (
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {event.message}
                    </p>
                  )}

                  {event.action_taken && (
                    <p className="text-xs text-slate-500">
                      <span className="text-slate-600">Action:</span>{' '}
                      {event.action_taken}
                    </p>
                  )}

                  {(event.metric_name || event.metric_value !== null) && (
                    <div className="flex gap-3 text-xs text-slate-600">
                      {event.metric_name && (
                        <span>
                          Metric:{' '}
                          <span className="text-slate-500">{event.metric_name}</span>
                        </span>
                      )}
                      {event.metric_value !== null && (
                        <span>
                          Value:{' '}
                          <span className="text-slate-400 font-mono">
                            {event.metric_value}
                          </span>
                        </span>
                      )}
                      {event.threshold !== null && (
                        <span>
                          Threshold:{' '}
                          <span className="text-slate-400 font-mono">
                            {event.threshold}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-600 pt-0.5">
                    {formatRelativeTime(event.created_at)}
                  </p>
                </div>

                {/* Mark as read */}
                {isUnread && (
                  <button
                    onClick={() => markAsRead(event.id)}
                    disabled={markingRead.has(event.id)}
                    className="shrink-0 text-slate-600 hover:text-indigo-400 transition-colors mt-0.5"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + pageSize)}
            className="text-slate-400 hover:text-white gap-2"
          >
            <ChevronDown className="w-4 h-4" />
            Load more ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

export default ComplianceTimeline;
