import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, Clock, AlertCircle, ArrowRight,
  Shield, Globe, FileCheck, Rocket, Radio, Loader2,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type StageStatus =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'issues'
  | 'in_review'
  | 'submitted'
  | 'active'

interface Stage {
  id: number
  title: string
  description: string
  status: StageStatus
  completedAt: string | null
  actionLabel: string | null
  actionRoute: string | null
}

interface EligibilityResult {
  answers: Record<string, unknown>
  result: string
  websiteUrl: string
  preflightResult: unknown
  timestamp: number
}

interface GrantStatusData {
  grant_status?: string
  reach_trial_started_at?: string
  google_nonprofit_verified?: boolean
  google_nonprofit_verified_at?: string
  google_ad_grant_applied?: boolean
  google_ad_grant_applied_at?: string
  google_ad_grant_approved?: boolean
  google_ad_grant_approved_at?: string
  google_ad_grant_account_id?: string
  attract_trial_started_at?: string
  website_preflight_passed?: boolean
  website_preflight_passed_at?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function getEligibilityFromLocalStorage(): EligibilityResult | null {
  try {
    const raw = localStorage.getItem('keepflock_eligibility_result')
    if (!raw) return null
    return JSON.parse(raw) as EligibilityResult
  } catch {
    return null
  }
}

function buildStages(org: GrantStatusData | null, eligibility: EligibilityResult | null): Stage[] {
  // Stage 1: Eligibility Check
  const eligibilityCompleted = eligibility?.result === 'qualified' || eligibility?.result === 'preflight_issues'
  const stage1: Stage = {
    id: 1,
    title: 'Eligibility Check',
    description: 'Verify your church qualifies for the Google Ad Grant program.',
    status: eligibilityCompleted ? 'completed' : 'pending',
    completedAt: eligibilityCompleted && eligibility?.timestamp
      ? new Date(eligibility.timestamp).toISOString()
      : null,
    actionLabel: eligibilityCompleted ? null : 'Start Eligibility Check',
    actionRoute: eligibilityCompleted ? null : '/reach/eligibility',
  }

  // Stage 2: Website Preflight
  const preflightPassed = org?.website_preflight_passed === true
  const preflightHasIssues = eligibility?.result === 'preflight_issues'
  const stage2Status: StageStatus = preflightPassed
    ? 'completed'
    : preflightHasIssues
    ? 'issues'
    : eligibilityCompleted
    ? 'pending'
    : 'pending'
  const stage2: Stage = {
    id: 2,
    title: 'Website Preflight',
    description: 'Scan your website against Google Ad Grant compliance requirements.',
    status: stage2Status,
    completedAt: formatDate(org?.website_preflight_passed_at) ? org?.website_preflight_passed_at ?? null : null,
    actionLabel: stage2Status === 'issues' ? 'Fix Issues & Re-scan' : (!preflightPassed && eligibilityCompleted ? 'Run Preflight' : null),
    actionRoute: stage2Status === 'issues' || (!preflightPassed && eligibilityCompleted) ? '/reach/preflight' : null,
  }

  // Stage 3: Google for Nonprofits Verification
  const nonprofitVerified = org?.google_nonprofit_verified === true
  const stage3Status: StageStatus = nonprofitVerified
    ? 'completed'
    : (preflightPassed || preflightHasIssues)
    ? 'pending'
    : 'pending'
  const stage3: Stage = {
    id: 3,
    title: 'Google for Nonprofits Verification',
    description: 'Register with Google for Nonprofits and complete identity verification.',
    status: stage3Status,
    completedAt: org?.google_nonprofit_verified_at ?? null,
    actionLabel: !nonprofitVerified && (preflightPassed || preflightHasIssues) ? 'Start Verification' : null,
    actionRoute: !nonprofitVerified && (preflightPassed || preflightHasIssues) ? '/reach/google-verification' : null,
  }

  // Stage 4: Ad Grant Application
  const grantApplied = org?.google_ad_grant_applied === true
  const grantApproved = org?.google_ad_grant_approved === true
  const stage4Status: StageStatus = grantApproved
    ? 'completed'
    : grantApplied
    ? 'submitted'
    : nonprofitVerified
    ? 'pending'
    : 'pending'
  const stage4: Stage = {
    id: 4,
    title: 'Ad Grant Application',
    description: 'Submit your Google Ad Grant application for $10,000/month in free ads.',
    status: stage4Status,
    completedAt: grantApproved ? (org?.google_ad_grant_approved_at ?? org?.google_ad_grant_applied_at ?? null) : null,
    actionLabel: null,
    actionRoute: null,
  }

  // Stage 5: Account Setup & First Campaign
  const accountSetup = !!org?.google_ad_grant_account_id
  const stage5Status: StageStatus = accountSetup ? 'completed' : grantApproved ? 'pending' : 'pending'
  const stage5: Stage = {
    id: 5,
    title: 'Account Setup & First Campaign',
    description: 'Configure your Google Ads account and launch your first campaign.',
    status: stage5Status,
    completedAt: null,
    actionLabel: null,
    actionRoute: null,
  }

  // Stage 6: Guardian Monitoring Active
  const guardianActive = !!org?.attract_trial_started_at || accountSetup
  const stage6: Stage = {
    id: 6,
    title: 'Guardian Monitoring Active',
    description: 'Automated compliance monitoring keeps your grant safe 24/7.',
    status: guardianActive ? 'active' : 'pending',
    completedAt: org?.attract_trial_started_at ?? null,
    actionLabel: guardianActive ? 'View Dashboard' : null,
    actionRoute: guardianActive ? '/attract/grant-dashboard' : null,
  }

  return [stage1, stage2, stage3, stage4, stage5, stage6]
}

// ── Stage row component ──────────────────────────────────────────────────────

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case 'completed':
      return (
        <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
        </div>
      )
    case 'active':
      return (
        <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-[#10B981]" />
        </div>
      )
    case 'in_progress':
      return (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )
    case 'issues':
      return (
        <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
        </div>
      )
    case 'in_review':
      return (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
      )
    case 'submitted':
      return (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <FileCheck className="w-5 h-5 text-primary" />
        </div>
      )
    case 'pending':
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
      )
  }
}

function statusLabel(status: StageStatus): { text: string; className: string } {
  switch (status) {
    case 'completed':
      return { text: 'Completed', className: 'bg-[#10B981]/10 text-[#10B981]' }
    case 'active':
      return { text: 'Active', className: 'bg-[#10B981]/10 text-[#10B981]' }
    case 'in_progress':
      return { text: 'In Progress', className: 'bg-primary/10 text-primary' }
    case 'issues':
      return { text: 'Issues Found', className: 'bg-[#F59E0B]/10 text-[#F59E0B]' }
    case 'in_review':
      return { text: 'In Review', className: 'bg-primary/10 text-primary' }
    case 'submitted':
      return { text: 'Submitted', className: 'bg-primary/10 text-primary' }
    case 'pending':
    default:
      return { text: 'Pending', className: 'bg-secondary text-muted-foreground' }
  }
}

const STAGE_ICONS = [Shield, Globe, FileCheck, Rocket, Rocket, Radio]

function StageRow({ stage, isLast }: { stage: Stage; isLast: boolean }) {
  const navigate = useNavigate()
  const label = statusLabel(stage.status)
  const StageTypeIcon = STAGE_ICONS[stage.id - 1]

  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <StageIcon status={stage.status} />
        {!isLast && (
          <div className={cn(
            'w-0.5 flex-1 min-h-[24px] my-1',
            stage.status === 'completed' || stage.status === 'active'
              ? 'bg-[#10B981]/30'
              : 'bg-border',
          )} />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <StageTypeIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{stage.title}</h3>
            </div>
            <span className={cn(
              'text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0',
              label.className,
            )}>
              {label.text}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mb-3">{stage.description}</p>

          {stage.completedAt && (
            <p className="text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              {formatDate(stage.completedAt)}
            </p>
          )}

          {stage.actionLabel && stage.actionRoute && (
            <Button
              size="sm"
              onClick={() => navigate(stage.actionRoute!)}
              className="gap-2 h-8 text-xs"
            >
              {stage.actionLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function StatusTracker() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any
  const orgId: string = currentOrganization?.id ?? ''

  const [grantData, setGrantData] = useState<GrantStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGrantStatus() {
      if (!orgId) {
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select(
            'grant_status, reach_trial_started_at, google_nonprofit_verified, google_nonprofit_verified_at, google_ad_grant_applied, google_ad_grant_applied_at, google_ad_grant_approved, google_ad_grant_approved_at, google_ad_grant_account_id, attract_trial_started_at, website_preflight_passed, website_preflight_passed_at'
          )
          .eq('id', orgId)
          .single()

        if (error) {
          console.error('Failed to fetch grant status', error)
        } else {
          setGrantData(data as GrantStatusData)
        }
      } catch (err) {
        console.error('Error fetching grant status', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGrantStatus()
  }, [orgId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const eligibility = getEligibilityFromLocalStorage()
  const stages = buildStages(grantData, eligibility)

  const completedCount = stages.filter(s => s.status === 'completed' || s.status === 'active').length
  const progress = (completedCount / stages.length) * 100

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Application Progress</h2>
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount} of {stages.length} stages complete
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-2 bg-[#10B981] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div>
        {stages.map((stage, idx) => (
          <StageRow key={stage.id} stage={stage} isLast={idx === stages.length - 1} />
        ))}
      </div>
    </div>
  )
}
