import { EligibilityChecker } from '@/components/reach/EligibilityChecker'

export default function EligibilityPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>REACH</span>
          <span>›</span>
          <span>Google Ad Grant</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Check Your Eligibility
        </h1>
        <p className="text-muted-foreground text-sm">
          Answer 5 quick questions to find out if your church qualifies for{' '}
          <span className="text-foreground font-medium">$10,000/month in free Google Ads</span>.
        </p>
      </div>
      <EligibilityChecker />
    </div>
  )
}
