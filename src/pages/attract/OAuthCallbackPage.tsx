import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentOrganization, refreshOrganization } = useAuthStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = currentOrganization as any

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')

    if (!code) {
      setStatus('error')
      setErrorMsg('No authorization code received from Google. Please try again.')
      return
    }

    let accountId = ''
    try {
      const state = JSON.parse(decodeURIComponent(stateParam || '{}'))
      accountId = state.accountId || ''
    } catch {
      // state parsing failed — continue without it
    }

    async function completeOAuth() {
      try {
        // Call Guardian via guardian-proxy to exchange the code
        const { data, error } = await supabase.functions.invoke('guardian-proxy', {
          body: {
            path: '/api/v1/kf/customers/oauth',
            method: 'POST',
            keepflock_org_id: org?.id || '',
            keepflock_org_name: org?.name || '',
            google_ads_account_id: accountId,
            oauth_code: code,
            redirect_uri: `${window.location.origin}/attract/oauth-callback`,
          },
        })

        if (error) throw new Error(error.message)
        if (data?.error || data?.detail) throw new Error(data.detail || data.error)

        // Update organization with grant account ID and start ATTRACT trial
        const now = new Date()
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        await supabase
          .from('organizations')
          .update({
            google_ad_grant_account_id: accountId,
            attract_trial_started_at: now.toISOString(),
            attract_trial_ends_at: trialEnd.toISOString(),
          })
          .eq('id', org?.id)

        await refreshOrganization()
        setStatus('success')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Connection failed. Please try again.'
        setErrorMsg(message)
        setStatus('error')
      }
    }

    completeOAuth()
  }, [searchParams, org?.id, org?.name, refreshOrganization])

  if (status === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-semibold">Connecting your Google Ads account...</h2>
          <p className="text-muted-foreground text-sm">This takes a few seconds.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
          <h2 className="text-xl font-semibold">Account Connected!</h2>
          <p className="text-muted-foreground text-sm">
            GUARDIAN is now monitoring your Google Ads account 24/7. Your 14-day free trial has started.
          </p>
          <Button onClick={() => navigate('/attract/grant-dashboard')} className="w-full gap-2">
            Go to GUARDIAN Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Connection Failed</h2>
        <p className="text-muted-foreground text-sm">{errorMsg}</p>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/attract/connect')} variant="outline" className="flex-1">
            Try Again
          </Button>
          <Button onClick={() => navigate('/dashboard')} className="flex-1">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
