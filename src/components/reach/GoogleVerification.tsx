import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Building,
  Church,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

type Path = 'A' | 'B' | 'C' | null

interface Step {
  id: number
  title: string
  instruction: string
  url?: { label: string; href: string }
  documents?: string[]
  timeline?: string
  note?: string
}

// ── Step definitions per path ────────────────────────────────────────────────

const PATH_A_STEPS: Step[] = [
  {
    id: 1,
    title: 'Gather your documents',
    instruction:
      'Before you begin the application, collect the three items Google requires during enrollment. Having them ready prevents delays.',
    documents: [
      'EIN confirmation letter from the IRS',
      '501(c)(3) determination letter (CP-575 or the official letter)',
      'Your church website URL (must be live and functional)',
    ],
    timeline: '15–30 minutes to locate documents',
  },
  {
    id: 2,
    title: 'Check eligibility & enroll in Google for Nonprofits',
    instruction:
      'Google for Nonprofits is the gateway program. Start by confirming your eligibility, then request an account. Google uses a verification partner (Goodstack) to validate your nonprofit status — this happens automatically during enrollment.',
    url: { label: 'Check eligibility requirements', href: 'https://www.google.com/nonprofits/eligibility/' },
    documents: [
      'EIN number',
      '501(c)(3) determination letter PDF',
      'Church website URL',
    ],
    timeline: '2–14 business days for verification',
    note:
      'After checking eligibility, click "Get Started" to begin enrollment. You will be asked to sign in with a Google account and then verify your nonprofit through Goodstack. The verification email may come from noreply@goodstack.io — check spam if you do not see it.',
  },
  {
    id: 3,
    title: 'Sign up for Google for Nonprofits',
    instruction:
      'Once your nonprofit is verified, complete the Google for Nonprofits enrollment. Use the same Google account email you plan to use for Google Ads.',
    url: {
      label: 'Google for Nonprofits signup',
      href: 'https://www.google.com/nonprofits/account/signup/',
    },
    documents: ['Goodstack verification (completed in previous step)'],
    timeline: '1–3 business days for Google to approve your account',
  },
  {
    id: 4,
    title: 'Activate Google Ad Grants',
    instruction:
      'After Google approves your nonprofits account, sign in and activate Google Ad Grants from the product list. Follow the prompts to submit your organization for Ad Grants review. Once approved, you will have a Google Ads account with a $10,000/month credit.',
    url: {
      label: 'Google Ad Grants — Get Started guide',
      href: 'https://www.google.com/grants/get-started/',
    },
    timeline: 'Approval typically within a few business days',
    note: 'Use the same login email for both Google for Nonprofits and Google Ads. After activation, bring your Google Ads account ID to the KeepFlock ATTRACT module to link your grant and enable GUARDIAN monitoring.',
  },
]

const PATH_B_STEPS: Step[] = [
  {
    id: 1,
    title: 'Obtain your group exemption letter',
    instruction:
      'Contact your denominational headquarters and request the IRS group exemption letter. This letter covers all churches under the denomination\'s umbrella EIN so individual 501(c)(3) determination letters are not required.',
    documents: [
      'Group exemption letter from denomination (IRS Letter 1025 or equivalent)',
      'Letter showing your church is listed as a subordinate under the group ruling',
    ],
    timeline: '1–5 business days (denomination response varies)',
    note:
      'Common denominations with group exemptions include the United Methodist Church, SBC, ELCA, and many others. Ask your regional office or bishop\'s office.',
  },
  {
    id: 2,
    title: 'Enroll in Google for Nonprofits with group exemption',
    instruction:
      'Start the Google for Nonprofits enrollment. During the Goodstack verification step, upload the group exemption letter instead of an individual determination letter. Note in any comments field that you are a subordinate organisation under a group ruling.',
    url: { label: 'Google for Nonprofits eligibility', href: 'https://www.google.com/nonprofits/eligibility/' },
    documents: [
      'Group exemption letter PDF',
      'Denomination\'s EIN (from the group exemption letter)',
      'Your church website URL',
    ],
    timeline: '2–14 business days for verification',
    note:
      'If Goodstack asks for a subordinate list, your denomination\'s national office can provide a letter confirming your church\'s inclusion.',
  },
  {
    id: 3,
    title: 'Complete Google for Nonprofits signup',
    instruction:
      'Once verified, complete the Google for Nonprofits enrollment. Use the same Google account email you plan to use for Google Ads.',
    url: {
      label: 'Google for Nonprofits signup',
      href: 'https://www.google.com/nonprofits/account/signup/',
    },
    documents: ['Goodstack verification (completed in previous step)'],
    timeline: '1–3 business days for Google approval',
  },
  {
    id: 4,
    title: 'Activate Google Ad Grants',
    instruction:
      'Sign in to your Google for Nonprofits account and activate Google Ad Grants from the product list. Follow the steps to submit for Ad Grants review.',
    url: { label: 'Google Ad Grants — Get Started guide', href: 'https://www.google.com/grants/get-started/' },
    timeline: 'Approval typically within a few business days',
    note: 'After activation, bring your Google Ads account ID to KeepFlock ATTRACT to link your grant and enable GUARDIAN monitoring.',
  },
]

const PATH_C_STEPS: Step[] = [
  {
    id: 1,
    title: 'Apply for 501(c)(3) status using Form 1023-EZ',
    instruction:
      'Form 1023-EZ is the streamlined IRS application for tax-exempt status. It is available for most organisations with projected annual gross receipts under $50,000. The filing fee is $275.',
    url: {
      label: 'File Form 1023-EZ on Pay.gov',
      href: 'https://pay.gov/public/form/start/233374255',
    },
    documents: [
      'EIN (apply free at irs.gov/ein if you do not have one)',
      '$275 IRS filing fee (pay by debit/credit on pay.gov)',
      'Church articles of incorporation or charter (most states require this)',
    ],
    timeline: '2–4 weeks for IRS approval',
    note:
      'Read the Form 1023-EZ instructions PDF before filing. Eligibility: gross receipts under $50,000/year and total assets under $250,000. Larger churches must use Form 1023 (longer process).',
  },
  {
    id: 2,
    title: 'Read the IRS instructions before you start',
    instruction:
      'The IRS instructions explain every question on the form. Answering incorrectly can cause rejection or delays. This read takes about 30 minutes.',
    url: {
      label: 'IRS Form 1023-EZ instructions',
      href: 'https://www.irs.gov/pub/irs-pdf/i1023ez.pdf',
    },
    timeline: '30 minutes to review',
  },
  {
    id: 3,
    title: 'Wait for IRS determination letter',
    instruction:
      'The IRS will email or mail your determination letter (CP-575 or equivalent). This confirms your 501(c)(3) status. Once you have this letter, you are on Path A — return to this wizard and select "Standard church with EIN + determination letter".',
    timeline: '2–4 weeks from submission',
    note:
      'If you submitted and have not heard back after 4 weeks, call the IRS Exempt Organizations customer account services at 1-877-829-5500.',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>Step {current} of {total}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StepCard({ step, isLast }: { step: Step; isLast: boolean }) {
  return (
    <div className="relative">
      <div className="border border-border rounded-xl p-5 space-y-4 bg-card">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-indigo-400">{step.id}</span>
          </div>
          <h3 className="font-semibold text-foreground text-sm leading-snug">{step.title}</h3>
        </div>

        {/* Instruction */}
        <p className="text-sm text-muted-foreground leading-relaxed pl-10">{step.instruction}</p>

        {/* Where to go */}
        {step.url && (
          <div className="pl-10">
            <a
              href={step.url.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {step.url.label}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Documents needed */}
        {step.documents && step.documents.length > 0 && (
          <div className="pl-10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Have ready
            </div>
            <ul className="space-y-1">
              {step.documents.map((doc) => (
                <li key={doc} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline */}
        {step.timeline && (
          <div className="pl-10 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-medium text-amber-600 dark:text-amber-400">{step.timeline}</span>
          </div>
        )}

        {/* Note */}
        {step.note && (
          <div className="pl-10 flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{step.note}</p>
          </div>
        )}
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[22px] top-full w-px h-4 bg-border" />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GoogleVerification() {
  const [selectedPath, setSelectedPath] = useState<Path>(null)

  const stepsForPath = (p: Path): Step[] => {
    if (p === 'A') return PATH_A_STEPS
    if (p === 'B') return PATH_B_STEPS
    if (p === 'C') return PATH_C_STEPS
    return []
  }

  const steps = stepsForPath(selectedPath)

  // Path selection screen
  if (!selectedPath) {
    return (
      <div className="space-y-6">
        <ProgressBar current={1} total={2} />

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Which situation best describes your church?
          </h2>
          <p className="text-sm text-muted-foreground">
            Your answer determines the fastest route to Google for Nonprofits verification.
          </p>
        </div>

        <div className="space-y-3">
          {/* Path A */}
          <button
            onClick={() => setSelectedPath('A')}
            className={cn(
              'w-full text-left p-5 rounded-xl border border-border bg-card',
              'hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group',
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground">
                    Standard church — I have an EIN and 501(c)(3) letter
                  </span>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                    Most common
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You are incorporated, have your IRS EIN, and received a determination letter
                  confirming 501(c)(3) status.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-indigo-400 shrink-0 mt-2.5 transition-colors" />
            </div>
          </button>

          {/* Path B */}
          <button
            onClick={() => setSelectedPath('B')}
            className={cn(
              'w-full text-left p-5 rounded-xl border border-border bg-card',
              'hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group',
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Church className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground">
                    We are under a denominational umbrella
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your church is a member of a denomination (e.g. United Methodist, SBC, ELCA)
                  that holds a group exemption letter from the IRS.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-indigo-400 shrink-0 mt-2.5 transition-colors" />
            </div>
          </button>

          {/* Path C */}
          <button
            onClick={() => setSelectedPath('C')}
            className={cn(
              'w-full text-left p-5 rounded-xl border border-border bg-card',
              'hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group',
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground">
                    Independent church — no 501(c)(3) letter yet
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You do not yet have a formal determination letter from the IRS. We will walk
                  you through applying for one with Form 1023-EZ ($275 fee, ~2–4 weeks).
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-indigo-400 shrink-0 mt-2.5 transition-colors" />
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Steps screen
  const pathLabels: Record<NonNullable<Path>, { label: string; color: string }> = {
    A: { label: 'Path A — Standard church', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    B: { label: 'Path B — Denominational umbrella', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    C: { label: 'Path C — Apply for 501(c)(3) first', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  }

  return (
    <div className="space-y-6">
      <ProgressBar current={2} total={2} />

      <div className="flex items-center justify-between">
        <div>
          <Badge className={cn('text-xs mb-2', pathLabels[selectedPath].color)}>
            {pathLabels[selectedPath].label}
          </Badge>
          <h2 className="text-lg font-semibold text-foreground">
            {selectedPath === 'C'
              ? 'Get your 501(c)(3) status first'
              : 'Your Google for Nonprofits application steps'}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPath(null)}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {selectedPath === 'C' && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <p className="font-semibold mb-1">After IRS approval, come back to Path A</p>
            <p className="text-xs leading-relaxed">
              Once you receive your 501(c)(3) determination letter, return to this wizard and
              select "Standard church with EIN + determination letter" to complete your Google
              for Nonprofits application.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, idx) => (
          <StepCard key={step.id} step={step} isLast={idx === steps.length - 1} />
        ))}
      </div>

      {/* Summary timeline */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="w-4 h-4 text-indigo-400" />
          Total estimated timeline
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedPath === 'A' && 'Goodstack verification (2–14 days) + Google approval (1–3 days) = 3–17 business days total.'}
          {selectedPath === 'B' && 'Denomination letter (1–5 days) + Goodstack (2–14 days) + Google approval (1–3 days) = 4–22 business days total.'}
          {selectedPath === 'C' && 'IRS 1023-EZ (2–4 weeks) + Goodstack (2–14 days) + Google approval (1–3 days) = 5–9 weeks total. Apply now to start the clock.'}
        </p>
      </div>

      {selectedPath !== 'C' && (
        <div className="flex items-center gap-2 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-foreground">Once approved</span>
            <span className="text-muted-foreground">
              {' '}— bring your Google Ads account ID back to KeepFlock ATTRACT to link your grant and enable GUARDIAN monitoring.
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
        </div>
      )}
    </div>
  )
}
