import { GoogleVerification } from '@/components/reach/GoogleVerification'

export default function GoogleVerificationPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>REACH</span>
          <span>›</span>
          <span>Google for Nonprofits</span>
          <span>›</span>
          <span>Verification Wizard</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Google for Nonprofits Verification
        </h1>
        <p className="text-muted-foreground text-sm">
          Step-by-step guidance to verify your church and unlock{' '}
          <span className="text-foreground font-medium">$10,000/month in free Google Ads</span>.
        </p>
      </div>
      <GoogleVerification />
    </div>
  )
}
