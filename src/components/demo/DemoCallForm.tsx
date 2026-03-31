import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Phone, Loader2, CheckCircle2, User, Church } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'

interface DemoCallFormProps {
  email?: string
  eligibilityResult?: Record<string, unknown>
  className?: string
}

export function DemoCallForm({ email, eligibilityResult, className }: DemoCallFormProps) {
  const [firstName, setFirstName] = useState('')
  const [churchName, setChurchName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'calling' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function formatPhoneDisplay(value: string): string {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  async function handleSubmit() {
    if (!firstName.trim()) { setErrorMsg('Please enter your first name.'); return }
    if (phone.replace(/\D/g, '').length < 10) { setErrorMsg('Please enter a valid 10-digit phone number.'); return }
    setErrorMsg('')
    setStatus('calling')

    try {
      const { data, error } = await supabase.functions.invoke('sales-demo-call', {
        body: {
          first_name: firstName.trim(),
          church_name: churchName.trim() || undefined,
          phone_number: phone.replace(/\D/g, ''),
          email: email || undefined,
          eligibility_result: eligibilityResult || undefined,
        },
      })

      if (error) throw new Error(error.message || 'Failed to connect to call service')
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Call service returned an error')

      if (typeof window.fbq === 'function') window.fbq('track', 'Contact', { content_name: 'demo_call_request' })
      setStatus('success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setErrorMsg(message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className={cn("max-w-md mx-auto", className)}>
        <div className="bg-card border border-[#10B981]/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-7 h-7 text-[#10B981] animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Calling you now, {firstName}!
          </h3>
          <p className="text-muted-foreground text-sm">
            Pick up your phone in about 30 seconds. Our AI assistant Sarah will walk you through how to get your $10,000/month Google Ad Grant.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("max-w-md mx-auto", className)}>
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Want a 2-minute walkthrough?
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Our AI assistant will call you and explain exactly how to get your church's $10,000/month grant.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={firstName}
              onChange={e => { setFirstName(e.target.value); setErrorMsg('') }}
              placeholder="Your first name"
              className="pl-10 bg-background h-11"
            />
          </div>
          <div className="relative">
            <Church className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={churchName}
              onChange={e => setChurchName(e.target.value)}
              placeholder="Church name (optional)"
              className="pl-10 bg-background h-11"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={phone}
              onChange={e => { setPhone(formatPhoneDisplay(e.target.value)); setErrorMsg('') }}
              placeholder="(555) 123-4567"
              className="pl-10 bg-background h-11"
              maxLength={14}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

          <Button
            onClick={handleSubmit}
            disabled={status === 'calling'}
            className="w-full h-11 sm:h-12 text-sm sm:text-base gap-2"
          >
            {status === 'calling' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Call Me Now
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Free 2-minute AI call. No obligation. US numbers only.
          </p>
        </div>
      </div>
    </div>
  )
}
