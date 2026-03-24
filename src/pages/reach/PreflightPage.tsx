import { PreflightChecker } from '@/components/reach/PreflightChecker'

export default function PreflightPage() {
  // Pre-fill URL from eligibility result if available
  let savedUrl = ''
  try {
    const saved = localStorage.getItem('keepflock_eligibility_result')
    if (saved) {
      const parsed = JSON.parse(saved)
      savedUrl = parsed.websiteUrl ?? ''
    }
  } catch { /* ignore */ }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>REACH</span>
          <span>›</span>
          <span>Domain Preflight</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Domain Preflight Checker
        </h1>
        <p className="text-muted-foreground text-sm">
          Scan your church website against all 10 Google Ad Grant requirements before applying.
          Instant pass/fail report with specific fix instructions.
        </p>
      </div>
      <PreflightChecker initialUrl={savedUrl} />
    </div>
  )
}
