import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, XCircle, AlertCircle, ChevronRight,
  Globe, Loader2, Mail, ArrowRight,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Q1Answer = 'yes' | 'no' | 'pending'
type Q2Answer = 'yes' | 'no'
type Q4Answer = 'yes' | 'no' | 'not_sure'
type Q5Answer = 'yes' | 'no'
type Phase = 'wizard' | 'qualified' | 'pending' | 'disqualified' | 'email_capture' | 'complete'

interface Answers {
  q1: Q1Answer | null
  q2: Q2Answer | null
  q3_has_site: 'yes' | 'no' | null
  q3_url: string
  q4: Q4Answer | null
  q5: Q5Answer | null
}

interface PublicEligibilityCheckerProps {
  onLeadCaptured?: (data: { email: string; first_name?: string; church_name?: string; qualified: boolean }) => void
  compact?: boolean
}

// ── Question definitions ──────────────────────────────────────────────────────

const QUESTIONS = [
  {
    step: 1,
    text: 'Does your church have 501(c)(3) nonprofit status?',
    subtext: 'Required for the Google Ad Grant.',
    options: [
      { value: 'yes', label: 'Yes, we are a registered 501(c)(3)' },
      { value: 'no', label: 'No' },
      { value: 'pending', label: "Pending — we're in the process" },
    ],
  },
  {
    step: 2,
    text: 'Is your church based in the United States?',
    subtext: 'The Google Ad Grant is available to US nonprofits.',
    options: [
      { value: 'yes', label: 'Yes, we are US-based' },
      { value: 'no', label: 'No, we are outside the US' },
    ],
  },
  {
    step: 3,
    text: 'Does your church have a website?',
    subtext: 'Google requires a functioning website.',
    options: null,
  },
  {
    step: 4,
    text: 'Does your church currently run Google Ads?',
    subtext: 'Organizations using paid Google Ads apply through a different path.',
    options: [
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: "Not sure" },
      { value: 'yes', label: 'Yes, we run paid Google Ads' },
    ],
  },
  {
    step: 5,
    text: 'Is your church a hospital, school, or government entity?',
    subtext: 'These categories are excluded from the program.',
    options: [
      { value: 'no', label: 'No — we are a church/ministry only' },
      { value: 'yes', label: 'Yes' },
    ],
  },
]

// ── Main component ────────────────────────────────────────────────────────────

export function PublicEligibilityChecker({ onLeadCaptured, compact }: PublicEligibilityCheckerProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    q1: null, q2: null, q3_has_site: null, q3_url: '', q4: null, q5: null,
  })
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [q3HasSite, setQ3HasSite] = useState<'yes' | 'no' | null>(null)
  const [phase, setPhase] = useState<Phase>('wizard')
  const [disqualifyReason, setDisqualifyReason] = useState<{ headline: string; detail: string; change?: string } | null>(null)

  // Email capture state
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalSteps = 5

  function disqualify(headline: string, detail: string, change?: string) {
    setDisqualifyReason({ headline, detail, change })
    setPhase('disqualified')
  }

  function handleAnswer(qIdx: number, value: string) {
    if (qIdx === 0) {
      const v = value as Q1Answer
      setAnswers(a => ({ ...a, q1: v }))
      if (v === 'pending') { setPhase('pending'); return }
      if (v === 'no') { disqualify('501(c)(3) status required', 'The Google Ad Grant is only available to registered 501(c)(3) nonprofits.', 'Once your church receives 501(c)(3) status, come back and check again.'); return }
      setStep(1)
    } else if (qIdx === 1) {
      const v = value as Q2Answer
      setAnswers(a => ({ ...a, q2: v }))
      if (v === 'no') { disqualify('US-based churches only', 'The Google Ad Grant is available to US nonprofits only.'); return }
      setStep(2)
    } else if (qIdx === 3) {
      const v = value as Q4Answer
      setAnswers(a => ({ ...a, q4: v }))
      if (v === 'yes') { disqualify('Already running Google Ads', 'Organizations currently running paid Google Ads must go through a different process.'); return }
      setStep(4)
    } else if (qIdx === 4) {
      const v = value as Q5Answer
      setAnswers(a => ({ ...a, q5: v }))
      if (v === 'yes') { disqualify('Excluded organization type', 'Hospitals, schools, and government entities are excluded from the Google Ad Grant.'); return }
      // Qualified! Show email capture
      setPhase('email_capture')
    }
  }

  function handleQ3(hasSite: 'yes' | 'no') {
    setQ3HasSite(hasSite)
    if (hasSite === 'no') {
      disqualify('Website required', 'Google requires a functioning website.', 'Build your church website first (WordPress, Wix, Squarespace), then come back.')
    }
  }

  function handleQ3Submit() {
    let url = urlInput.trim()
    if (!url) { setUrlError('Please enter your website URL.'); return }
    if (!url.startsWith('http')) url = `https://${url}`
    try { new URL(url) } catch { setUrlError('Please enter a valid URL (e.g. https://yourchurch.org)'); return }
    setUrlError('')
    setAnswers(a => ({ ...a, q3_has_site: 'yes', q3_url: url }))
    setStep(3)
  }

  async function handleEmailSubmit() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setSubmitting(true)

    try {
      await supabase.functions.invoke('public-lead-capture', {
        body: {
          email: trimmed,
          source: 'eligibility_checker',
          eligibility_result: {
            answers,
            result: 'qualified',
            timestamp: Date.now(),
          },
        },
      })

      localStorage.setItem('keepflock_eligibility_result', JSON.stringify({
        answers, result: 'qualified', email: trimmed, timestamp: Date.now(),
      }))

      onLeadCaptured?.({ email: trimmed, qualified: true })
      setPhase('complete')
    } catch {
      // Still show success — don't block UX on backend failure
      onLeadCaptured?.({ email: trimmed, qualified: true })
      setPhase('complete')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render: Email Capture Gate ─────────────────────────────────────────────

  if (phase === 'email_capture') {
    return (
      <div className={cn("max-w-lg mx-auto", compact && "max-w-md")}>
        <div className="bg-card border border-[#10B981]/30 rounded-xl p-4 sm:p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Great news — your church likely qualifies!
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your church appears eligible for up to $10,000/month in free Google advertising.
            Enter your email to get a detailed eligibility report with your next steps.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                placeholder="pastor@yourchurch.org"
                className="pl-10 bg-background h-12"
                onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                autoFocus
              />
            </div>
            <Button onClick={handleEmailSubmit} disabled={submitting} className="h-12 px-6">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
          {emailError && <p className="text-xs text-destructive mb-2">{emailError}</p>}
          <p className="text-xs text-muted-foreground">
            We'll send you a personalized report. No spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    )
  }

  // ── Render: Complete (after email captured) ────────────────────────────────

  if (phase === 'complete') {
    return (
      <div className={cn("max-w-lg mx-auto", compact && "max-w-md")}>
        <div className="bg-card border border-[#10B981]/30 rounded-xl p-4 sm:p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Your report is on the way!
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Check your inbox for your detailed eligibility report and next steps to claim your $10,000/month grant.
          </p>
          <a href="/login">
            <Button className="w-full gap-2 mb-3">
              Sign Up Free & Start Your Application <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
          <p className="text-xs text-muted-foreground">
            Free account includes eligibility tools, preflight scanner, and application guide.
          </p>
        </div>
      </div>
    )
  }

  // ── Render: Pending (501(c)(3) in progress) ────────────────────────────────

  if (phase === 'pending') {
    return (
      <div className={cn("max-w-lg mx-auto", compact && "max-w-md")}>
        <div className="bg-card border border-[#F59E0B]/30 rounded-xl p-4 sm:p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Almost there — 501(c)(3) status needed
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Once your 501(c)(3) is approved, you'll qualify immediately. Enter your email and we'll send you a preparation guide so you're ready to apply the moment it comes through.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              placeholder="your@email.com"
              className="bg-background h-12"
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
            />
            <Button onClick={handleEmailSubmit} disabled={submitting} className="h-12 px-6">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Guide'}
            </Button>
          </div>
          {emailError && <p className="text-xs text-destructive mb-2">{emailError}</p>}
          <button
            onClick={() => { setPhase('wizard'); setStep(0); setAnswers({ q1: null, q2: null, q3_has_site: null, q3_url: '', q4: null, q5: null }) }}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Disqualified ───────────────────────────────────────────────────

  if (phase === 'disqualified' && disqualifyReason) {
    return (
      <div className={cn("max-w-lg mx-auto", compact && "max-w-md")}>
        <div className="bg-card border border-destructive/30 rounded-xl p-4 sm:p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {disqualifyReason.headline}
          </h2>
          <p className="text-muted-foreground text-sm mb-4">{disqualifyReason.detail}</p>
          {disqualifyReason.change && (
            <div className="bg-background rounded-lg p-4 text-left mb-6">
              <p className="text-sm font-medium text-foreground mb-1">What you can do:</p>
              <p className="text-sm text-muted-foreground">{disqualifyReason.change}</p>
            </div>
          )}
          <button
            onClick={() => { setPhase('wizard'); setStep(0); setQ3HasSite(null); setUrlInput(''); setAnswers({ q1: null, q2: null, q3_has_site: null, q3_url: '', q4: null, q5: null }) }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Wizard ─────────────────────────────────────────────────────────

  const currentQ = QUESTIONS[step]
  const progress = (step / totalSteps) * 100

  return (
    <div className={cn("max-w-lg mx-auto", compact && "max-w-md")}>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Question {step + 1} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-1.5 bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 md:p-8">
        <h2 className="text-lg font-semibold text-foreground mb-1">{currentQ.text}</h2>
        {currentQ.subtext && (
          <p className="text-sm text-muted-foreground mb-6">{currentQ.subtext}</p>
        )}

        {/* Q3 — URL input */}
        {step === 2 && (
          <div className="space-y-3">
            {q3HasSite === null && (
              <>
                <button
                  onClick={() => handleQ3('yes')}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <Globe className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium text-foreground text-sm">Yes — I'll enter the URL</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary" />
                </button>
                <button
                  onClick={() => handleQ3('no')}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-border/80 hover:bg-secondary/30 transition-all text-left"
                >
                  <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="font-medium text-foreground text-sm">No — we don't have one yet</div>
                </button>
              </>
            )}
            {q3HasSite === 'yes' && (
              <div className="space-y-3">
                <Input
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlError('') }}
                  placeholder="https://yourchurch.org"
                  className="bg-background"
                  onKeyDown={e => e.key === 'Enter' && handleQ3Submit()}
                  autoFocus
                />
                {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                <Button onClick={handleQ3Submit} className="w-full gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => setQ3HasSite(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                >
                  ← Go back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Standard option buttons */}
        {step !== 2 && currentQ.options && (
          <div className="space-y-2">
            {currentQ.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleAnswer(step, opt.value)}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-4 h-4 rounded-full border-2 border-border group-hover:border-primary transition-colors shrink-0" />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>

      {step > 0 && (
        <button
          onClick={() => {
            setStep(s => s - 1)
            if (step === 2) setQ3HasSite(null)
          }}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Previous question
        </button>
      )}
    </div>
  )
}
