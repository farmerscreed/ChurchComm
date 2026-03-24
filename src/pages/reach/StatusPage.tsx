import { StatusTracker } from '@/components/reach/StatusTracker'

export default function StatusPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>REACH</span>
          <span>›</span>
          <span>Google Ad Grant</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Application Status
        </h1>
        <p className="text-muted-foreground text-sm">
          Track your church's progress toward{' '}
          <span className="text-foreground font-medium">$10,000/month in free Google Ads</span>.
        </p>
      </div>
      <StatusTracker />
    </div>
  )
}
