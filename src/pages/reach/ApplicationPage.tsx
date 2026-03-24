import { ApplicationWizard } from '@/components/reach/ApplicationWizard'

export default function ApplicationPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>REACH</span>
          <span>›</span>
          <span>Google Ad Grant</span>
          <span>›</span>
          <span>Apply</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Apply for the Google Ad Grant
        </h1>
        <p className="text-muted-foreground text-sm">
          Follow these steps to submit your application for{' '}
          <span className="text-foreground font-medium">$10,000/month in free Google Ads</span>.
        </p>
      </div>
      <ApplicationWizard />
    </div>
  )
}
