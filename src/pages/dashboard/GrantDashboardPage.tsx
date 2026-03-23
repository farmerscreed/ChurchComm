import { GrantDashboard } from '@/components/dashboard/GrantDashboard'

export default function GrantDashboardPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>ATTRACT</span>
          <span>›</span>
          <span>Grant Health</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          GUARDIAN Compliance Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Real-time monitoring of your Google Ad Grant account — CTR, compliance status, and
          budget utilisation tracked automatically.
        </p>
      </div>
      <GrantDashboard />
    </div>
  )
}
