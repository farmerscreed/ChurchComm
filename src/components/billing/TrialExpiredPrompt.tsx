import { Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type TrialModule = 'reach' | 'attract'

interface TrialExpiredPromptProps {
  module: TrialModule
  price: string
  className?: string
}

const MODULE_META: Record<
  TrialModule,
  { label: string; color: string; badgeClass: string; variantEnvKey: string }
> = {
  reach: {
    label: 'REACH',
    color: 'from-slate-600 to-slate-800',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    variantEnvKey: 'VITE_LS_VARIANT_REACH',
  },
  attract: {
    label: 'ATTRACT',
    color: 'from-purple-600 to-blue-700',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    variantEnvKey: 'VITE_LS_VARIANT_ATTRACT',
  },
}

function getCheckoutUrl(module: TrialModule): string {
  const variantId =
    module === 'reach'
      ? import.meta.env.VITE_LS_VARIANT_REACH
      : import.meta.env.VITE_LS_VARIANT_ATTRACT

  if (variantId) {
    return `https://keepflock.lemonsqueezy.com/checkout/buy/${variantId}`
  }
  return '/pricing'
}

export function TrialExpiredPrompt({ module, price, className }: TrialExpiredPromptProps) {
  const meta = MODULE_META[module]
  const checkoutUrl = getCheckoutUrl(module)
  const isExternal = checkoutUrl.startsWith('https://')

  return (
    <div
      className={cn(
        'flex items-center justify-center min-h-[60vh] p-6',
        className,
      )}
    >
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <Badge className={cn('text-xs mb-3 border', meta.badgeClass)}>
            {meta.label} trial ended
          </Badge>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your free trial has ended.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Subscribe to keep your $10,000/month grant protected.
          </p>
        </div>

        {/* Price card */}
        <div
          className={cn(
            'rounded-2xl p-5 mb-6 bg-gradient-to-br border border-white/10',
            meta.color,
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                Starting at
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">${price}</span>
                <span className="text-white/60 text-sm">/month</span>
              </div>
              <p className="text-white/50 text-xs mt-1">Yearly = 10 months (2 months free)</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Button
          asChild
          className="w-full h-12 text-base font-semibold bg-foreground text-background hover:bg-foreground/90"
        >
          <a
            href={checkoutUrl}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center justify-center gap-2"
          >
            Subscribe — ${price}/month
            <ArrowRight className="w-4 h-4" />
          </a>
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Secure checkout via LemonSqueezy · Cancel anytime
        </p>
      </div>
    </div>
  )
}
