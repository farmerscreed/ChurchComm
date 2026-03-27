import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicEligibilityChecker } from '@/components/reach/PublicEligibilityChecker'
import { DemoCallForm } from '@/components/demo/DemoCallForm'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function CheckEligibilityPage() {
  const [leadData, setLeadData] = useState<{
    email: string
    qualified: boolean
  } | null>(null)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Simple nav */}
      <nav className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Does your church qualify for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              $10,000/month
            </span>
            {' '}in free Google Ads?
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Answer 5 quick questions to find out. Takes less than 60 seconds.
            If you qualify, our AI creates and manages your campaigns for you — completely hands-free.
          </p>
        </div>

        {!leadData ? (
          <PublicEligibilityChecker onLeadCaptured={setLeadData} />
        ) : leadData.qualified ? (
          <div className="space-y-8">
            <div className="text-center">
              <p className="text-slate-400 mb-2">Your report has been sent! While you wait...</p>
            </div>
            <DemoCallForm
              email={leadData.email}
              eligibilityResult={{ result: 'qualified' }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
