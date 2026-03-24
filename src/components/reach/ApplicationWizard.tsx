import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  FileCheck,
  Link2,
  Send,
  PartyPopper,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardStep {
  id: number
  title: string
  description: string
  instructions: string[]
  externalLink?: { label: string; href: string }
  note?: string
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Verify Prerequisites',
    description: 'Confirm you have everything needed before starting the application.',
    instructions: [
      'Your church has 501(c)(3) nonprofit status (or group exemption)',
      'You have completed Google for Nonprofits verification through Goodstack',
      'Your website meets Google Ad Grant requirements (checked via Preflight)',
    ],
    note:
      'If you have not completed these steps yet, go back to the REACH dashboard and complete the Eligibility Check, Preflight Scan, and Google Verification steps first.',
  },
  {
    id: 2,
    title: 'Create a Google Ads Account',
    description: 'Set up a new Google Ads account specifically for the Ad Grant.',
    instructions: [
      'Go to ads.google.com and click "Start now"',
      'Sign in with the same Google account used for Google for Nonprofits',
      'When asked about your goal, select "Switch to Expert mode" at the bottom',
      'Click "Create an account without a campaign"',
      'Confirm your business info (country, timezone, currency) and click Submit',
      'Note your Google Ads Customer ID (displayed at the top of the dashboard, format: XXX-XXX-XXXX)',
    ],
    externalLink: { label: 'Open Google Ads', href: 'https://ads.google.com/home' },
    note:
      'Do NOT create a campaign or enter billing information. The Ad Grant will fund your account once approved.',
  },
  {
    id: 3,
    title: 'Link to Google for Nonprofits',
    description: 'Connect your new Google Ads account to your Google for Nonprofits profile.',
    instructions: [
      'Go to the Google for Nonprofits portal and sign in',
      'Navigate to the "Google Ad Grants" product',
      'Click "Get started" or "Activate"',
      'When prompted, enter the Google Ads Customer ID from the previous step',
      'Confirm the link between your Ads account and Nonprofits profile',
    ],
    externalLink: { label: 'Google for Nonprofits Portal', href: 'https://nonprofits.google.com/' },
    note:
      'The Google Ads account must be empty (no campaigns, no billing info) for the link to succeed.',
  },
  {
    id: 4,
    title: 'Submit the Ad Grant Application',
    description: 'Complete and submit your Google Ad Grant application for review.',
    instructions: [
      'From the Google for Nonprofits portal, go to the Ad Grants section',
      'Click "Activate" or "Enroll" to begin the Ad Grant application',
      'Review the program policies and agree to the terms of service',
      'Confirm your organization details are correct',
      'Submit the application for review',
    ],
    externalLink: { label: 'Google for Nonprofits', href: 'https://www.google.com/nonprofits/' },
    note:
      'Google reviews applications within 3-5 business days. You will receive an email notification when a decision is made.',
  },
  {
    id: 5,
    title: 'Application Submitted',
    description: 'Your Ad Grant application is now under review by Google.',
    instructions: [
      'Google typically reviews applications within 3-5 business days',
      'You will receive an email from Google when the grant is approved',
      'Once approved, your Google Ads account will automatically receive $10,000/month in ad credit',
      'Come back to KeepFlock REACH to start building your first campaigns',
    ],
    note:
      'While waiting for approval, you can start planning your ad campaigns in the KeepFlock REACH module. Most churches are approved within 3 business days.',
  },
]

// ── Step icon helper ──────────────────────────────────────────────────────────

function stepIcon(stepId: number, className: string) {
  switch (stepId) {
    case 1: return <FileCheck className={className} />
    case 2: return <Globe className={className} />
    case 3: return <Link2 className={className} />
    case 4: return <Send className={className} />
    case 5: return <PartyPopper className={className} />
    default: return <FileCheck className={className} />
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function ApplicationWizard() {
  const navigate = useNavigate()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any

  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalSteps = STEPS.length
  const step = STEPS[currentStep - 1]
  const isLastStep = currentStep === totalSteps
  const isStepCompleted = completedSteps.has(currentStep)

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('keepflock_application_progress')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.completedSteps && Array.isArray(data.completedSteps)) {
          setCompletedSteps(new Set(data.completedSteps))
          // Resume from the first incomplete step
          const maxCompleted = Math.max(...data.completedSteps, 0)
          if (maxCompleted < totalSteps) {
            setCurrentStep(maxCompleted + 1)
          } else {
            setCurrentStep(totalSteps)
          }
        }
      } catch {
        // ignore malformed data
      }
    }
  }, [totalSteps])

  function saveProgress(completed: Set<number>) {
    localStorage.setItem('keepflock_application_progress', JSON.stringify({
      completedSteps: Array.from(completed),
      timestamp: Date.now(),
    }))
  }

  async function markStepComplete() {
    const next = new Set(completedSteps)
    next.add(currentStep)
    setCompletedSteps(next)
    saveProgress(next)

    // On the last step, also save to Supabase
    if (isLastStep) {
      await saveToSupabase()
      return
    }

    // Advance to next step
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  async function saveToSupabase() {
    if (!currentOrganization?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          ad_grant_application_submitted_at: new Date().toISOString(),
          ad_grant_application_status: 'pending_review',
        })
        .eq('id', currentOrganization.id)
      if (error) {
        console.error('Failed to save application status', error)
      } else {
        setSaved(true)
      }
    } catch (err) {
      console.error('Failed to save application status', err)
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // ── Progress indicator ────────────────────────────────────────────────────

  const progress = Math.round(((completedSteps.size) / totalSteps) * 100)

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{progress}% complete</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step indicator pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s) => {
          const isCompleted = completedSteps.has(s.id)
          const isCurrent = s.id === currentStep
          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(s.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0',
                isCompleted
                  ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                  : isCurrent
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-muted/50 border-border text-muted-foreground',
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                  {s.id}
                </span>
              )}
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          )
        })}
      </div>

      {/* Current step card */}
      <div className="border border-border rounded-xl p-6 bg-card space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            isLastStep && saved
              ? 'bg-[#10B981]/10 border border-[#10B981]/30'
              : 'bg-indigo-500/10 border border-indigo-500/30',
          )}>
            {stepIcon(step.id, cn(
              'w-5 h-5',
              isLastStep && saved ? 'text-[#10B981]' : 'text-indigo-400',
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              {isStepCompleted && (
                <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 text-xs">
                  Completed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>

        {/* Instructions checklist */}
        <div className="space-y-2 pl-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isLastStep ? 'What happens next' : 'Instructions'}
          </div>
          {step.instructions.map((instruction, idx) => (
            <div key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium text-foreground">{idx + 1}</span>
              </div>
              <span className="leading-relaxed">{instruction}</span>
            </div>
          ))}
        </div>

        {/* External link */}
        {step.externalLink && (
          <div className="pl-2">
            <a
              href={step.externalLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {step.externalLink.label}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Note */}
        {step.note && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{step.note}</p>
          </div>
        )}

        {/* Estimated timeline for last step */}
        {isLastStep && (
          <div className="flex items-center gap-2 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Estimated approval time:</span>{' '}
              3-5 business days from submission
            </span>
          </div>
        )}

        {/* Success banner for completed last step */}
        {isLastStep && saved && (
          <div className="flex items-start gap-3 p-4 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Application progress saved
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your application status has been recorded. We will track Google's response and
                notify you when your grant is approved. You can now return to the REACH dashboard.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous step
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isLastStep && saved ? (
            <Button
              onClick={() => navigate('/reach/eligibility')}
              className="gap-2"
            >
              Back to REACH Dashboard
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : isLastStep ? (
            <Button
              onClick={markStepComplete}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Application Submitted
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={markStepComplete}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              I've completed this step
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
