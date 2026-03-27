/**
 * UpgradePrompt — shown when a user navigates to a route that requires a
 * paid module (ATTRACT or ENGAGE) their organisation has not purchased.
 * REACH is free and never shows this prompt.
 */

import { Lock, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ModuleId = 'attract' | 'engage'

interface UpgradePromptProps {
  module: ModuleId
  price: string
  className?: string
}

const MODULE_META: Record<
  ModuleId,
  { label: string; description: string; color: string; badgeClass: string }
> = {
  attract: {
    label: 'ATTRACT',
    description: 'Grant compliance — GUARDIAN monitoring, CTR tracking, suspension protection, and budget utilisation.',
    color: 'from-purple-600 to-blue-700',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  engage: {
    label: 'ENGAGE',
    description: 'Congregation communication — SMS, email, AI voice calls, and congregation management.',
    color: 'from-cyan-600 to-blue-700',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
}

function getCheckoutUrl(module: ModuleId): string {
  const keyMap: Record<ModuleId, string> = {
    attract: import.meta.env.VITE_LS_VARIANT_ATTRACT ?? '',
    engage: import.meta.env.VITE_LS_VARIANT_ENGAGE ?? '',
  }
  const variantId = keyMap[module]
  if (variantId) {
    return `https://keepflock.lemonsqueezy.com/checkout/buy/${variantId}`
  }
  return '/pricing'
}

export function UpgradePrompt({ module, price, className }: UpgradePromptProps) {
  const meta = MODULE_META[module]
  const checkoutUrl = getCheckoutUrl(module)
  const isExternalCheckout = checkoutUrl.startsWith('https://')

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
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <Badge className={cn('text-xs mb-3 border', meta.badgeClass)}>
            <Zap className="w-3 h-3 mr-1" />
            {meta.label} module
          </Badge>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            This feature requires the {meta.label} plan
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {meta.description}
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
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
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
            {...(isExternalCheckout ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center justify-center gap-2"
          >
            Upgrade — ${price}/month
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
