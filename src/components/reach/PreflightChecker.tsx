import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Loader2, ExternalLink, Globe,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
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

// ── Check row ─────────────────────────────────────────────────────────────────

function CheckRow({ check }: { check: PreflightCheck }) {
  const [open, setOpen] = useState(false)

  const severityBadge = !check.passed && (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
      check.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
      check.severity === 'high'     ? 'bg-[#F59E0B]/20 text-[#F59E0B]'   :
                                      'bg-[#F59E0B]/10 text-[#F59E0B]'
    )}>
      {check.severity === 'critical' ? 'Critical' : check.severity === 'high' ? 'High' : 'Advisory'}
    </span>
  )

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 transition-colors',
        !check.passed && 'cursor-pointer',
        check.passed
          ? 'border-[#10B981]/20 bg-[#10B981]/5'
          : check.severity === 'advisory'
          ? 'border-[#F59E0B]/20 bg-[#F59E0B]/5 hover:border-[#F59E0B]/40'
          : check.severity === 'critical'
          ? 'border-destructive/20 bg-destructive/5 hover:border-destructive/40'
          : 'border-[#F59E0B]/30 bg-[#F59E0B]/5 hover:border-[#F59E0B]/50'
      )}
      onClick={() => !check.passed && check.fix && setOpen(o => !o)}
    >
      <div className="flex items-start gap-3">
        {check.passed
          ? <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          : check.severity === 'advisory'
          ? <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{check.name}</span>
            {severityBadge}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
          {open && check.fix && (
            <div className="mt-2 text-xs bg-card border border-border rounded p-2 text-muted-foreground">
              <span className="font-medium text-foreground">How to fix: </span>{check.fix}
            </div>
          )}
          {!check.passed && check.fix && (
            <button className="text-xs text-primary mt-1 hover:underline">
              {open ? 'Hide ↑' : 'How to fix →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, total, ready }: { score: number; total: number; ready: boolean }) {
  const pct = score / total
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = circ * pct

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={ready ? '#10B981' : '#F59E0B'}
          strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="text-center">
        <div className={cn('text-2xl font-bold', ready ? 'text-[#10B981]' : 'text-[#F59E0B]')}>
          {score}
        </div>
        <div className="text-[10px] text-muted-foreground leading-none">of {total}</div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface PreflightCheckerProps {
  /** Pre-fill the URL (from eligibility checker) */
  initialUrl?: string
}

export function PreflightChecker({ initialUrl = '' }: PreflightCheckerProps) {
  const [url, setUrl] = useState(initialUrl)
  const [urlError, setUrlError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<PreflightResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  async function runScan() {
    let target = url.trim()
    if (!target) { setUrlError('Please enter a website URL.'); return }
    // Strip duplicate protocols (e.g. "http://https://..." or "https://http://...")
    target = target.replace(/^(https?:\/\/)+/i, '')
    target = `https://${target}`
    try { new URL(target) } catch { setUrlError('Please enter a valid URL.'); return }

    setUrlError('')
    setScanning(true)
    setScanError(null)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('reach-preflight', {
        body: { url: target },
      })
      if (error) throw new Error(error.message)
      setResult(data as PreflightResult)
    } catch (err: any) {
      setScanError(err.message ?? 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* URL input card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Domain Preflight Checker</h2>
            <p className="text-xs text-muted-foreground">Checks all 10 Google Ad Grant requirements</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <Input
              value={url}
              onChange={e => { setUrl(e.target.value); setUrlError(''); setScanError(null) }}
              placeholder="yourchurch.org"
              className="bg-background w-full"
              onKeyDown={e => e.key === 'Enter' && !scanning && runScan()}
              disabled={scanning}
            />
            {urlError && <p className="text-xs text-destructive mt-1">{urlError}</p>}
            {!urlError && !result && <p className="text-xs text-muted-foreground mt-1">Just the domain — no need to include https://</p>}
          </div>
          <Button onClick={runScan} disabled={scanning} className="gap-2 shrink-0 w-full sm:w-auto">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {scanning ? 'Scanning…' : result ? 'Re-scan' : 'Scan my website'}
          </Button>
        </div>
      </div>

      {/* Scanning state */}
      {scanning && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground mb-1">Scanning your website…</p>
          <p className="text-xs text-muted-foreground">Checking all 10 Ad Grant requirements. This takes up to 30 seconds.</p>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {[0, 1, 2].map(i => (
              <div key={i} className={cn(
                'w-2 h-2 rounded-full bg-primary/60 animate-bounce',
                i === 1 && '[animation-delay:150ms]',
                i === 2 && '[animation-delay:300ms]',
              )} />
            ))}
          </div>
        </div>
      )}

      {/* Scan error */}
      {scanError && !scanning && (
        <div className="bg-card border border-destructive/30 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Scan failed</p>
          <p className="text-xs text-muted-foreground">{scanError}</p>
        </div>
      )}

      {/* Results */}
      {result && !scanning && (
        <div className="bg-card border border-border rounded-xl p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Scan Results</h3>
              <a
                href={result.scanned_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                {result.scanned_url} <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-xs text-muted-foreground mt-1">
                Scanned in {(result.scan_duration_ms / 1000).toFixed(1)}s
              </p>
            </div>
            <ScoreRing score={result.score} total={result.total} ready={result.ready} />
          </div>

          {/* Status banner */}
          <div className={cn(
            'rounded-lg p-4 mb-6 flex items-center gap-3',
            result.ready ? 'bg-[#10B981]/10 border border-[#10B981]/20' : 'bg-[#F59E0B]/10 border border-[#F59E0B]/20'
          )}>
            {result.ready
              ? <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
              : <AlertCircle className="w-5 h-5 text-[#F59E0B] shrink-0" />
            }
            <div>
              <p className={cn('text-sm font-semibold', result.ready ? 'text-[#10B981]' : 'text-[#F59E0B]')}>
                {result.ready
                  ? 'Your site is ready — start your grant application'
                  : `Fix ${result.critical_failures.length} critical issue${result.critical_failures.length !== 1 ? 's' : ''} first, then re-scan`}
              </p>
              {!result.ready && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estimated fix time: {result.estimated_fix_time}
                </p>
              )}
            </div>
          </div>

          {/* Critical failures */}
          {result.critical_failures.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-2">
                Critical — must fix ({result.critical_failures.length})
              </p>
              <div className="space-y-2">
                {result.critical_failures.map(c => <CheckRow key={c.id} check={c} />)}
              </div>
            </div>
          )}

          {/* High failures */}
          {result.high_failures.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F59E0B] mb-2">
                High priority ({result.high_failures.length})
              </p>
              <div className="space-y-2">
                {result.high_failures.map(c => <CheckRow key={c.id} check={c} />)}
              </div>
            </div>
          )}

          {/* Advisories */}
          {result.advisories.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Advisory ({result.advisories.length})
              </p>
              <div className="space-y-2">
                {result.advisories.map(c => <CheckRow key={c.id} check={c} />)}
              </div>
            </div>
          )}

          {/* Passing */}
          {result.passing.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#10B981] mb-2">
                Passing ({result.passing.length})
              </p>
              <div className="space-y-2">
                {result.passing.map(c => <CheckRow key={c.id} check={c} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
