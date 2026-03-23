/**
 * UpgradePrompt — shown when a user navigates to a route that requires a
 * module their organisation has not purchased.
 *
 * LemonSqueezy checkout variant IDs are read from environment variables:
 *   VITE_LS_VARIANT_REACH   — variant ID for the REACH module ($49/mo)
 *   VITE_LS_VARIANT_ATTRACT — variant ID for the ATTRACT module ($199/mo)
 *   VITE_LS_VARIANT_ENGAGE  — variant ID for the ENGAGE module ($59/mo)
 *   VITE_LS_VARIANT_BUNDLE  — variant ID for the Full Platform Bundle ($249/mo)
 *
 * NOTE: A LemonSqueezy webhook handler is required to update the
 * organisations.plan_modules column when a purchase completes.
 * Currently the app only has a Stripe webhook at
 * supabase/functions/stripe-webhook/index.ts. A new edge function
 * (e.g. supabase/functions/lemonsqueezy-webhook/index.ts) should be
 * created to handle order_created / subscription_created events from
 * LemonSqueezy and map variant IDs to plan_modules entries.
 */

import { Lock, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ModuleId = 'reach' | 'attract' | 'engage'

interface UpgradePromptProps {
  module: ModuleId
  price: string
  /** Optional additional class names for the wrapper */
  className?: string
}

const MODULE_META: Record<
  ModuleId,
  { label: string; description: string; color: string; badgeClass: string }
> = {
  reach: {
    label: 'REACH',
    description: 'Grant acquisition — eligibility checker, Google verification wizard, preflight, and application tracker.',
    color: 'from-slate-600 to-slate-800',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
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
    reach: import.meta.env.VITE_LS_VARIANT_REACH ?? '',
    attract: import.meta.env.VITE_LS_VARIANT_ATTRACT ?? '',
    engage: import.meta.env.VITE_LS_VARIANT_ENGAGE ?? '',
  }
  const variantId = keyMap[module]
  if (variantId) {
    return `https://keepflock.lemonsqueezy.com/checkout/buy/${variantId}`
  }
  // Fallback: send to pricing page
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
