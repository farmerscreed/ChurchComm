import { ConnectGrantAccount } from '@/components/attract/ConnectGrantAccount'

export default function ConnectPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>ATTRACT</span>
          <span>&rsaquo;</span>
          <span>Connect Account</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Connect Your Ad Grant
        </h1>
        <p className="text-muted-foreground text-sm">
          Link your Google Ad Grant account to activate GUARDIAN monitoring and start your
          free 14-day ATTRACT trial.
        </p>
      </div>
      <ConnectGrantAccount />
    </div>
  )
}
