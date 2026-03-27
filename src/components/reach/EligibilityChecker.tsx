import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, XCircle, AlertCircle, ChevronRight,
  Globe, ArrowRight, ExternalLink, RefreshCw, Loader2,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreflightCheck {
  id: string
  name: string
  passed: boolean
  message: string
  fix?: string
  severity: 'critical' | 'high' | 'advisory'
}

interface PreflightResult {
  score: number
  total: number
  ready: boolean
  critical_failures: PreflightCheck[]
  high_failures: PreflightCheck[]
  advisories: PreflightCheck[]
  passing: PreflightCheck[]
  estimated_fix_time: string
  scanned_url: string
  scan_duration_ms: number
}

type Q1Answer = 'yes' | 'no' | 'pending'
type Q2Answer = 'yes' | 'no'
type Q4Answer = 'yes' | 'no' | 'not_sure'
type Q5Answer = 'yes' | 'no'
type Phase = 'wizard' | 'preflight_scanning' | 'preflight_issues' | 'qualified' | 'pending' | 'disqualified'

interface Answers {
  q1: Q1Answer | null
  q2: Q2Answer | null
  q3_has_site: 'yes' | 'no' | null
  q3_url: string
  q4: Q4Answer | null
  q5: Q5Answer | null
}

// ── Question definitions ──────────────────────────────────────────────────────

const QUESTIONS = [
  {
    step: 1,
    text: 'Does your church have 501(c)(3) nonprofit status?',
    subtext: 'This is required to apply for the Google Ad Grant.',
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
    subtext: 'Google requires a functioning website for the Ad Grant.',
    options: null, // handled specially
  },
  {
    step: 4,
    text: 'Does your church currently run Google Ads?',
    subtext: 'Organizations already using paid Google Ads need to apply through a different path.',
    options: [
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: "Not sure" },
      { value: 'yes', label: 'Yes, we run paid Google Ads' },
    ],
  },
  {
    step: 5,
    text: 'Is your church classified as a hospital, school, or government entity?',
    subtext: 'These categories are excluded from the Google Ad Grant program.',
    options: [
      { value: 'no', label: 'No — we are a church/ministry only' },
      { value: 'yes', label: 'Yes, we have one of these designations' },
    ],
  },
]

// ── Preflight results display ─────────────────────────────────────────────────

function PreflightCheckRow({ check }: { check: PreflightCheck }) {
  const [open, setOpen] = useState(false)

  const icon = check.passed
    ? <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
    : check.severity === 'advisory'
    ? <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
    : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 cursor-pointer transition-colors',
        check.passed
          ? 'border-[#10B981]/20 bg-[#10B981]/5'
          : check.severity === 'advisory'
          ? 'border-[#F59E0B]/20 bg-[#F59E0B]/5'
          : check.severity === 'critical'
          ? 'border-destructive/20 bg-destructive/5'
          : 'border-[#F59E0B]/30 bg-[#F59E0B]/5'
      )}
      onClick={() => !check.passed && setOpen(o => !o)}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{check.name}</span>
            {!check.passed && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                check.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                check.severity === 'high' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                'bg-[#F59E0B]/10 text-[#F59E0B]'
              )}>
                {check.severity === 'critical' ? 'Critical' : check.severity === 'high' ? 'High' : 'Advisory'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
          {open && check.fix && (
            <div className="mt-2 text-xs bg-card border border-border rounded p-2 text-muted-foreground">
              <span className="font-medium text-foreground">How to fix: </span>{check.fix}
            </div>
          )}
          {!check.passed && check.fix && (
            <button className="text-xs text-primary mt-1 hover:underline">
              {open ? 'Hide fix ↑' : 'How to fix →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EligibilityChecker() {
  const navigate = useNavigate()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    q1: null, q2: null, q3_has_site: null, q3_url: '', q4: null, q5: null,
  })
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [q3HasSite, setQ3HasSite] = useState<'yes' | 'no' | null>(null)
  const [phase, setPhase] = useState<Phase>('wizard')
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [preflightError, setPreflightError] = useState<string | null>(null)
  const [disqualifyReason, setDisqualifyReason] = useState<{ headline: string; detail: string; change?: string } | null>(null)

  const totalSteps = 5

  function saveResult(p: Phase, url: string, pf: PreflightResult | null) {
    localStorage.setItem('keepflock_eligibility_result', JSON.stringify({
      answers, result: p, websiteUrl: url, preflightResult: pf, timestamp: Date.now(),
    }))
  }

  async function sendResultEmail(result: 'qualified' | 'pending' | 'disqualified', websiteUrl: string, pf: PreflightResult | null) {
    try {
      await supabase.functions.invoke('send-eligibility-result', {
        body: {
          result,
          websiteUrl,
          preflightScore: pf?.score ?? null,
          preflightTotal: pf?.total ?? null,
          organizationName: currentOrganization?.name || '',
        },
      })
    } catch (err) {
      // Email is non-blocking — don't break the flow
      console.warn('Failed to send eligibility result email:', err)
    }
  }

  function disqualify(headline: string, detail: string, change?: string) {
    setDisqualifyReason({ headline, detail, change })
    setPhase('disqualified')
    saveResult('disqualified', answers.q3_url, null)
    sendResultEmail('disqualified', answers.q3_url, null)
  }

  async function startReachTrial() {
    if (!currentOrganization?.id) return
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const { error } = await supabase
      .from('organizations')
      .update({
        reach_trial_started_at: now.toISOString(),
        reach_trial_ends_at: trialEnd.toISOString(),
      })
      .eq('id', currentOrganization.id)
    if (error) {
      console.error('Failed to start REACH trial', error)
    }
  }

  async function runPreflight(url: string) {
    setPhase('preflight_scanning')
    setPreflightError(null)
    try {
      const { data, error } = await supabase.functions.invoke('reach-preflight', {
        body: { url },
      })
      if (error) throw new Error(error.message)
      const result = data as PreflightResult
      setPreflight(result)
      saveResult(result.ready ? 'qualified' : 'preflight_issues', url, result)
      if (result.ready) {
        await startReachTrial()
        sendResultEmail('qualified', url, result)
      }
      setPhase(result.ready ? 'qualified' : 'preflight_issues')
    } catch (err: any) {
      setPreflightError(err.message ?? 'Scan failed. Please try again.')
      setPhase('preflight_issues')
    }
  }

  function handleAnswer(qIdx: number, value: string) {
    if (qIdx === 0) {
      const v = value as Q1Answer
      setAnswers(a => ({ ...a, q1: v }))
      if (v === 'pending') { setPhase('pending'); sendResultEmail('pending', '', null); return }
      if (v === 'no') { disqualify('501(c)(3) status required', 'The Google Ad Grant is only available to registered 501(c)(3) nonprofits.', 'Once your church receives 501(c)(3) status, you can re-apply here.'); return }
      setStep(1)
    } else if (qIdx === 1) {
      const v = value as Q2Answer
      setAnswers(a => ({ ...a, q2: v }))
      if (v === 'no') { disqualify('US-based churches only', 'The Google Ad Grant is available to nonprofits registered in the United States only.', 'Google for Nonprofits is expanding internationally — check google.com/nonprofits for updates.'); return }
      setStep(2)
    } else if (qIdx === 3) {
      const v = value as Q4Answer
      setAnswers(a => ({ ...a, q4: v }))
      if (v === 'yes') { disqualify('Already running Google Ads', 'Organizations currently running paid Google Ads campaigns must go through a different process.', 'Contact Google support to transition your account to a grant-eligible setup.'); return }
      setStep(4)
    } else if (qIdx === 4) {
      const v = value as Q5Answer
      const url = answers.q3_url
      setAnswers(a => ({ ...a, q5: v }))
      if (v === 'yes') { disqualify('Hospital, school, or government entity', 'These organization types are excluded from the Google Ad Grant program by Google policy.'); return }
      // Qualifies — trigger preflight
      runPreflight(url)
    }
  }

  function handleQ3(hasSite: 'yes' | 'no') {
    setQ3HasSite(hasSite)
    if (hasSite === 'no') {
      disqualify('Website required', 'Google requires a functioning website to participate in the Ad Grant program.', 'Build your church website first (free options: WordPress.com, Wix), then come back.')
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

  // ── Renders ──────────────────────────────────────────────────────────────────

  if (phase === 'preflight_scanning') {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Scanning your website…</h2>
        <p className="text-muted-foreground text-sm">
          Checking {answers.q3_url} against all 10 Google Ad Grant requirements.
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={cn(
              'w-2 h-2 rounded-full bg-primary animate-bounce',
              i === 1 && '[animation-delay:150ms]',
              i === 2 && '[animation-delay:300ms]',
            )} />
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'pending') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-[#F59E0B]/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            You need 501(c)(3) status first
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            The Google Ad Grant requires registered 501(c)(3) nonprofit status. Once your application is approved, you qualify immediately.
          </p>
          <div className="bg-background rounded-lg p-4 text-left mb-6">
            <p className="text-sm font-medium text-foreground mb-2">How to apply for 501(c)(3) status:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>File Form 1023-EZ (eligible churches under $50K/year) or Form 1023</li>
              <li>Pay the IRS filing fee ($275–$600)</li>
              <li>Typical approval: 3–6 months</li>
            </ol>
          </div>
          <a
            href="https://www.irs.gov/charities-non-profits/apply-for-an-exemption"
            target="_blank" rel="noopener noreferrer"
          >
            <Button className="w-full gap-2">
              Start IRS Application <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
          <button
            onClick={() => { setPhase('wizard'); setStep(0); setAnswers({ q1: null, q2: null, q3_has_site: null, q3_url: '', q4: null, q5: null }) }}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'disqualified' && disqualifyReason) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-destructive/30 rounded-xl p-8 text-center">
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
          <a href="mailto:support@keepflock.com">
            <Button variant="outline" className="w-full mb-3">Contact us for guidance</Button>
          </a>
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

  if (phase === 'preflight_issues') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-8">
          {preflightError ? (
            <>
              <div className="text-center mb-6">
                <AlertCircle className="w-10 h-10 text-[#F59E0B] mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-foreground">Website scan failed</h2>
                <p className="text-sm text-muted-foreground mt-1">{preflightError}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => runPreflight(answers.q3_url)} className="flex-1 gap-2">
                  <RefreshCw className="w-4 h-4" /> Try again
                </Button>
                <Button variant="outline" onClick={() => { setPreflight(null); setPhase('qualified') }} className="flex-1">
                  Skip scan & continue
                </Button>
              </div>
            </>
          ) : preflight && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-foreground">Preflight Scan Results</h2>
                <span className="text-sm text-muted-foreground">{preflight.scanned_url}</span>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn('h-2 rounded-full transition-all', preflight.ready ? 'bg-[#10B981]' : 'bg-[#F59E0B]')}
                    style={{ width: `${(preflight.score / preflight.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground shrink-0">
                  {preflight.score}/{preflight.total} passed
                </span>
              </div>

              {preflight.critical_failures.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-destructive mb-2">
                    {preflight.critical_failures.length} Critical issue{preflight.critical_failures.length > 1 ? 's' : ''} — fix before applying
                  </p>
                  <div className="space-y-2">
                    {preflight.critical_failures.map(c => <PreflightCheckRow key={c.id} check={c} />)}
                  </div>
                </div>
              )}

              {preflight.high_failures.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[#F59E0B] mb-2">
                    {preflight.high_failures.length} High-priority issue{preflight.high_failures.length > 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2">
                    {preflight.high_failures.map(c => <PreflightCheckRow key={c.id} check={c} />)}
                  </div>
                </div>
              )}

              {preflight.advisories.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Advisory</p>
                  <div className="space-y-2">
                    {preflight.advisories.map(c => <PreflightCheckRow key={c.id} check={c} />)}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Estimated fix time: <span className="font-medium text-foreground">{preflight.estimated_fix_time}</span>
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => runPreflight(answers.q3_url)} variant="outline" className="flex-1 gap-2">
                    <RefreshCw className="w-4 h-4" /> Re-scan after fixing
                  </Button>
                  <Button
                    onClick={async () => {
                      saveResult('qualified', answers.q3_url, preflight)
                      await startReachTrial()
                      setPhase('qualified')
                    }}
                    variant="outline"
                    className="flex-1 text-muted-foreground"
                  >
                    Acknowledge & continue anyway
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'qualified') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-[#10B981]/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Great news — your church qualifies for $10,000/month in free Google Ads.
          </h2>
          <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm font-medium text-[#10B981]">
              Your free 14-day trial starts today. Complete your application before it ends.
            </p>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Here are your next steps inside KeepFlock to get your grant application started.
          </p>
          {preflight && (
            <div className="bg-background rounded-lg p-4 text-left mb-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">Preflight score</span>
                <span className="text-sm font-medium text-[#10B981]">{preflight.score}/{preflight.total} checks passed</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-[#10B981]"
                  style={{ width: `${(preflight.score / preflight.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          <Button onClick={() => navigate('/reach/preflight')} className="w-full gap-2 mb-3">
            Start Domain Preflight Checker <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Your eligibility result has been saved. We'll guide you through every step.
          </p>
        </div>
      </div>
    )
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────

  const currentQ = QUESTIONS[step]
  const progress = ((step) / totalSteps) * 100

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Question {step + 1} of {totalSteps}</span>
          <span>{Math.round(((step) / totalSteps) * 100)}% complete</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-1.5 bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-8">
        <h2 className="text-lg font-semibold text-foreground mb-1">{currentQ.text}</h2>
        {currentQ.subtext && (
          <p className="text-sm text-muted-foreground mb-6">{currentQ.subtext}</p>
        )}

        {/* Q3 — URL input special case */}
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
                    <div className="font-medium text-foreground text-sm">Yes — enter my website URL</div>
                    <div className="text-xs text-muted-foreground">I'll enter the URL below</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary" />
                </button>
                <button
                  onClick={() => handleQ3('no')}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-border/80 hover:bg-secondary/30 transition-all text-left"
                >
                  <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="font-medium text-foreground text-sm">No — we don't have a website yet</div>
                </button>
              </>
            )}
            {q3HasSite === 'yes' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Your church website URL</label>
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
