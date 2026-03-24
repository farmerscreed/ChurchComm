import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  PauseCircle,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ── Types ────────────────────────────────────────────────────────────────────

interface GuardianData {
  ctr: number                      // 30-day account-wide CTR as a percentage (e.g. 6.2)
  status: 'ACTIVE' | 'AT_RISK' | 'SUSPENDED'
  last_sweep_minutes_ago: number
  keywords_paused_quality: number
  keywords_paused_ctr: number
  budget_used: number              // dollars used this month (max $10,000)
}

interface ComplianceEntry {
  timestamp: string
  event: string
  detail: string
}

const MOCK_DATA: GuardianData = {
  ctr: 6.2,
  status: 'ACTIVE',
  last_sweep_minutes_ago: 45,
  keywords_paused_quality: 3,
  keywords_paused_ctr: 1,
  budget_used: 4200,
}

const BUDGET_MAX = 10000

// ── CTR Gauge ────────────────────────────────────────────────────────────────

function CtrGauge({ ctr }: { ctr: number }) {
  const clampedCtr = Math.min(Math.max(ctr, 0), 15)
  // Map 0–15% CTR to 0–180 degrees (semicircle)
  const angle = (clampedCtr / 15) * 180

  const color =
    ctr >= 5.5
      ? { stroke: '#22c55e', text: 'text-green-500', label: 'Healthy' }
      : ctr >= 5.0
      ? { stroke: '#f59e0b', text: 'text-amber-500', label: 'At risk' }
      : { stroke: '#ef4444', text: 'text-red-500', label: 'Below threshold' }

  // SVG arc math for a semicircle gauge (r=80, centre 100,100)
  const r = 80
  const cx = 100
  const cy = 100
  const startAngle = 180 // degrees, points left
  const endAngle = startAngle + angle

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const largeArc = angle > 180 ? 1 : 0

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 110" className="w-48 h-28">
        {/* Track */}
        <path
          d={`M 20 100 A ${r} ${r} 0 0 1 180 100`}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-muted/30"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {angle > 1 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={color.stroke}
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}
        {/* Tick marks at 5.0% and 5.5% */}
        {[5.0, 5.5].map((threshold) => {
          const ta = 180 + (threshold / 15) * 180
          const inner = r - 12
          const outer = r + 2
          const tx1 = cx + inner * Math.cos(toRad(ta))
          const ty1 = cy + inner * Math.sin(toRad(ta))
          const tx2 = cx + outer * Math.cos(toRad(ta))
          const ty2 = cy + outer * Math.sin(toRad(ta))
          return (
            <line
              key={threshold}
              x1={tx1} y1={ty1} x2={tx2} y2={ty2}
              stroke="#6b7280"
              strokeWidth="2"
            />
          )
        })}
        {/* Centre text */}
        <text x="100" y="92" textAnchor="middle" className="fill-foreground" fontSize="22" fontWeight="700">
          {ctr.toFixed(1)}%
        </text>
        <text x="100" y="107" textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          30-day CTR
        </text>
      </svg>
      <span className={cn('text-xs font-semibold', color.text)}>{color.label}</span>
      <p className="text-xs text-muted-foreground text-center">
        Your account CTR: <span className={cn('font-bold', color.text)}>{ctr.toFixed(1)}%</span>
        <br />
        <span className="text-[10px]">Minimum required: 5.0% | Suspension risk below 5.0%</span>
      </p>
    </div>
  )
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GuardianData['status'] }) {
  const cfg = {
    ACTIVE: {
      icon: CheckCircle2,
      label: 'ACTIVE',
      className: 'bg-green-500/10 text-green-600 border-green-500/30',
    },
    AT_RISK: {
      icon: AlertTriangle,
      label: 'AT RISK',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    },
    SUSPENDED: {
      icon: XCircle,
      label: 'SUSPENDED',
      className: 'bg-red-500/10 text-red-600 border-red-500/30',
    },
  }[status]

  const Icon = cfg.icon

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Account Status
      </span>
      <Badge className={cn('text-sm px-4 py-1.5 gap-2 border', cfg.className)}>
        <Icon className="w-4 h-4" />
        {cfg.label}
      </Badge>
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  iconColor?: string
}) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
        <Icon className={cn('w-3.5 h-3.5', iconColor)} />
        {label}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Budget Bar ────────────────────────────────────────────────────────────────

function BudgetBar({ used, max }: { used: number; max: number }) {
  const pct = Math.min((used / max) * 100, 100)
  const color =
    pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-slate-500'

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
        <DollarSign className="w-3.5 h-3.5 text-green-500" />
        Budget Utilisation
      </div>
      <div className="flex items-end justify-between">
        <p className="text-xl font-bold text-foreground">
          ${used.toLocaleString()}
        </p>
        <span className="text-xs text-muted-foreground mb-1">of ${max.toLocaleString()}/month</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {pct.toFixed(0)}% of grant used — ${(max - used).toLocaleString()} remaining this month
      </p>
    </div>
  )
}

// ── Attract Trial Setup ───────────────────────────────────────────────────────

function AttractTrialSetup({ orgId, onStarted }: { orgId: string; onStarted: () => void }) {
  const [accountId, setAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const trimmed = accountId.trim()
    if (!trimmed) {
      setError('Please enter your Google Ad Grant account ID.')
      return
    }
    setSaving(true)
    setError('')
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const { error: dbError } = await supabase
      .from('organizations')
      .update({
        google_ad_grant_account_id: trimmed,
        attract_trial_started_at: now.toISOString(),
        attract_trial_ends_at: trialEnd.toISOString(),
      })
      .eq('id', orgId)
    setSaving(false)
    if (dbError) {
      setError('Failed to save. Please try again.')
      console.error('AttractTrialSetup error', dbError)
      return
    }
    onStarted()
  }

  return (
    <div className="border border-border rounded-xl p-6 bg-card space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Connect your Ad Grant account to start your free 14-day ATTRACT trial.
          </h3>
          <p className="text-xs text-muted-foreground">
            GUARDIAN will begin watching your account for CTR compliance and budget utilisation.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Google Ad Grant account ID</label>
        <Input
          value={accountId}
          onChange={(e) => { setAccountId(e.target.value); setError('') }}
          placeholder="e.g. 123-456-7890"
          className="bg-background"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button onClick={handleSubmit} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {saving ? 'Saving…' : 'Start ATTRACT trial'}
      </Button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function GrantDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any
  const orgId: string = currentOrganization?.id ?? ''

  const accountId: string = currentOrganization?.google_ad_grant_account_id ?? ''

  const [data, setData] = useState<GuardianData | null>(null)
  const [complianceLog, setComplianceLog] = useState<ComplianceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sweeping, setSweeping] = useState(false)
  const [usingMock, setUsingMock] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Whether attract trial is already started for this org
  const [attractTrialStarted, setAttractTrialStarted] = useState<boolean>(
    !!currentOrganization?.attract_trial_started_at,
  )
  // Message shown after trial is activated
  const [attractTrialJustStarted, setAttractTrialJustStarted] = useState(false)

  const fetchData = async () => {
    if (!accountId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // Fetch status from Guardian via the proxy
      const statusRes = await supabase.functions.invoke('guardian-proxy', {
        body: { path: `/api/status/${accountId}` },
        headers: { 'Content-Type': 'application/json' },
      })

      if (statusRes.error || !statusRes.data) throw new Error(statusRes.error?.message ?? 'No data')

      // Map the Guardian response to our GuardianData shape
      const raw = statusRes.data
      setData({
        ctr: raw.ctr ?? 0,
        status: raw.status ?? 'ACTIVE',
        last_sweep_minutes_ago: raw.last_sweep ?? 0,
        keywords_paused_quality: raw.keywords_paused?.quality ?? 0,
        keywords_paused_ctr: raw.keywords_paused?.ctr ?? 0,
        budget_used: raw.budget_used ?? 0,
      })
      setUsingMock(false)

      // Also fetch compliance log (non-blocking)
      fetchComplianceLog()
    } catch {
      // GUARDIAN not reachable in dev — use mock data
      setData(MOCK_DATA)
      setUsingMock(true)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }

  const fetchComplianceLog = async () => {
    if (!accountId) return
    try {
      const res = await supabase.functions.invoke('guardian-proxy', {
        body: { path: `/api/compliance/${accountId}` },
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.error && Array.isArray(res.data)) {
        setComplianceLog(res.data)
      }
    } catch {
      // Silently ignore — compliance log is supplementary
    }
  }

  const triggerSweep = async () => {
    if (!accountId) return
    setSweeping(true)
    try {
      await supabase.functions.invoke('guardian-proxy', {
        body: { path: `/api/sweep/${accountId}`, method: 'POST' },
        headers: { 'Content-Type': 'application/json' },
      })
      // Refresh data after sweep
      await fetchData()
    } catch {
      // Ignore — fetchData will handle fallback
    } finally {
      setSweeping(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Poll every 5 minutes
    const timer = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const sweepLabel =
    data.last_sweep_minutes_ago < 60
      ? `${data.last_sweep_minutes_ago} minutes ago`
      : `${Math.round(data.last_sweep_minutes_ago / 60)} hours ago`

  return (
    <div className="space-y-6">
      {/* ATTRACT trial setup prompt */}
      {!attractTrialStarted && orgId && (
        <AttractTrialSetup
          orgId={orgId}
          onStarted={() => {
            setAttractTrialStarted(true)
            setAttractTrialJustStarted(true)
          }}
        />
      )}

      {/* ATTRACT trial just activated confirmation */}
      {attractTrialJustStarted && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            <strong>Your ATTRACT trial is now active.</strong> GUARDIAN is watching your account.
          </span>
        </div>
      )}

      {/* Mock data banner */}
      {usingMock && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Demo data</strong> — GUARDIAN API not reachable. Showing sample values.
          </span>
        </div>
      )}

      {/* Top row: CTR gauge + Status + Last sweep */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="border border-border rounded-xl p-6 bg-card flex flex-col items-center md:col-span-1">
          <CtrGauge ctr={data.ctr} />
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-border rounded-xl p-6 bg-card flex flex-col items-center justify-center gap-3">
            <StatusBadge status={data.status} />
          </div>

          <StatCard
            icon={Clock}
            label="Last Sweep"
            value={sweepLabel}
            sub="GUARDIAN checked your account"
            iconColor="text-indigo-400"
          />

          <StatCard
            icon={PauseCircle}
            label="This Week"
            value={`${data.keywords_paused_quality + data.keywords_paused_ctr} keywords paused`}
            sub={`${data.keywords_paused_quality} for low quality · ${data.keywords_paused_ctr} for low CTR`}
            iconColor="text-amber-400"
          />

          <StatCard
            icon={TrendingUp}
            label="Grant Health"
            value={data.status === 'ACTIVE' ? 'Good standing' : data.status === 'AT_RISK' ? 'Action needed' : 'Suspended'}
            sub="Based on CTR and compliance checks"
            iconColor={data.status === 'ACTIVE' ? 'text-green-500' : data.status === 'AT_RISK' ? 'text-amber-500' : 'text-red-500'}
          />
        </div>
      </div>

      {/* Budget utilisation */}
      <BudgetBar used={data.budget_used} max={BUDGET_MAX} />

      {/* Compliance log */}
      {complianceLog.length > 0 && (
        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
            Recent Compliance Events
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {complianceLog.slice(0, 10).map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-xs py-1.5 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
                <span className="font-medium text-foreground">{entry.event}</span>
                <span className="text-muted-foreground">{entry.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
        <div className="flex items-center gap-2">
          {accountId && (
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSweep}
              disabled={sweeping || loading}
              className="gap-1.5 text-xs h-8"
            >
              {sweeping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {sweeping ? 'Sweeping...' : 'Run Sweep'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  )
}
