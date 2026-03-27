import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Format validation ────────────────────────────────────────────────────────

const AD_GRANT_REGEX = /^\d{3}-\d{3}-\d{4}$/

function formatAccountId(value: string): string {
  // Strip non-digits
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ── Component ────────────────────────────────────────────────────────────────

export function ConnectGrantAccount() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any
  const refreshOrganization = useAuthStore((s) => s.refreshOrganization)
  const orgId: string = currentOrganization?.id ?? ''

  const navigate = useNavigate()

  const [accountId, setAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(value: string) {
    setError('')
    setAccountId(formatAccountId(value))
  }

  async function handleSubmit() {
    const trimmed = accountId.trim()

    if (!trimmed) {
      setError('Please enter your Google Ad Grant account ID.')
      return
    }

    if (!AD_GRANT_REGEX.test(trimmed)) {
      setError('Account ID must be in the format xxx-xxx-xxxx (e.g. 123-456-7890).')
      return
    }

    if (!orgId) {
      setError('No organization found. Please try refreshing the page.')
      return
    }

    setSaving(true)
    setError('')

    // Build Google OAuth URL and redirect
    const googleClientId = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID
    if (googleClientId) {
      // Full OAuth flow — redirect to Google consent screen
      const state = encodeURIComponent(JSON.stringify({ accountId: trimmed, orgId }))
      const redirectUri = `${window.location.origin}/attract/oauth-callback`
      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/adwords',
        access_type: 'offline',
        prompt: 'consent',
        state,
      })
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
      return
    }

    // Fallback: Save account ID without OAuth (for when Google OAuth is not yet configured)
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
      return
    }

    await refreshOrganization()
    setSuccess(true)
    setTimeout(() => navigate('/attract/grant-dashboard'), 2000)
  }

  // ── Success state ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="border border-green-500/20 rounded-xl p-8 bg-green-500/5 space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Account Connected</h3>
        <p className="text-sm text-muted-foreground">
          Your 14-day ATTRACT trial is now active. GUARDIAN will begin monitoring your Google Ad
          Grant account for CTR compliance and budget utilisation.
        </p>
        <p className="text-xs text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    )
  }

  // ── Form state ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Intro card */}
      <div className="border border-border rounded-xl p-6 bg-card space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Connect Your Google Ad Grant Account
            </h3>
            <p className="text-xs text-muted-foreground">
              Link your Google Ad Grant account to start your free 14-day ATTRACT trial. GUARDIAN
              will automatically monitor CTR compliance, pause low-performing keywords, and protect
              your $10,000/month grant.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { icon: ShieldCheck, title: 'CTR Protection', desc: 'Automatic keyword pausing to keep CTR above 5%' },
          { icon: TrendingUp, title: 'Budget Tracking', desc: 'Real-time utilisation of your $10k/month grant' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="border border-border rounded-lg p-4 bg-card flex items-start gap-3">
            <Icon className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Account ID form */}
      <div className="border border-border rounded-xl p-6 bg-card space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Google Ad Grant Account ID
          </label>
          <Input
            value={accountId}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="xxx-xxx-xxxx"
            className="bg-background font-mono text-base tracking-wider"
            maxLength={12}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <p className="text-[11px] text-muted-foreground">
            Find your account ID in Google Ads &rarr; Settings &rarr; Account Settings. Format:
            xxx-xxx-xxxx.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving || !accountId}
          className={cn('w-full gap-2')}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Connecting...' : 'Connect & Start 14-Day Trial'}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          No credit card required. Cancel anytime during the trial.
        </p>
      </div>
    </div>
  )
}
