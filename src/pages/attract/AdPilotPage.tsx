import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CampaignStatusCard,
  type CampaignSummary,
} from '@/components/attract/CampaignStatusCard'
import {
  Loader2,
  Plus,
  Rocket,
  Globe,
  Search,
  PenTool,
  Layers,
} from 'lucide-react'

// ── Step indicators for the generation flow ──────────────────────────────────

const GENERATION_STEPS = [
  { label: 'Analyzing your website...', icon: Globe },
  { label: 'Researching keywords...', icon: Search },
  { label: 'Writing ad copy...', icon: PenTool },
  { label: 'Building campaign...', icon: Layers },
]

function GenerationProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="space-y-3 py-4">
      {GENERATION_STEPS.map((step, idx) => {
        const StepIcon = step.icon
        const isActive = idx === currentStep
        const isDone = idx < currentStep

        return (
          <div
            key={step.label}
            className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
              isDone
                ? 'text-green-400 opacity-100'
                : isActive
                ? 'text-indigo-400 opacity-100'
                : 'text-muted-foreground opacity-40'
            }`}
          >
            {isDone ? (
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-green-400">✓</span>
              </div>
            ) : isActive ? (
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            ) : (
              <StepIcon className="w-5 h-5 shrink-0" />
            )}
            <span className={isActive ? 'font-medium' : ''}>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Empty state: first-time generate card ────────────────────────────────────

function EmptyState({
  onGenerate,
  generating,
  generationStep,
}: {
  onGenerate: (url: string) => void
  generating: boolean
  generationStep: number
}) {
  const [websiteUrl, setWebsiteUrl] = useState('')

  return (
    <div className="border border-border rounded-xl p-8 bg-card max-w-xl mx-auto text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
        <Rocket className="w-8 h-8 text-indigo-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Generate Your First Campaign
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Let AdPilot create Google Ads campaigns for your church automatically.
          Just paste your website URL and we handle the rest.
        </p>
      </div>

      {generating ? (
        <GenerationProgress currentStep={generationStep} />
      ) : (
        <div className="space-y-3 max-w-sm mx-auto">
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourchurch.org"
            className="bg-background"
            onKeyDown={(e) => e.key === 'Enter' && websiteUrl.trim() && onGenerate(websiteUrl.trim())}
          />
          <Button
            onClick={() => onGenerate(websiteUrl.trim())}
            disabled={!websiteUrl.trim()}
            className="w-full gap-2"
          >
            <Rocket className="w-4 h-4" />
            Generate Campaign
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdPilotPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any
  const accountId: string = currentOrganization?.google_ad_grant_account_id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)

  // Inline generate form state (for when campaigns already exist)
  const [showInlineGenerate, setShowInlineGenerate] = useState(false)
  const [inlineUrl, setInlineUrl] = useState('')

  // ── Fetch campaigns ────────────────────────────────────────────────────────
  const fetchCampaigns = async () => {
    if (!accountId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await supabase.functions.invoke('guardian-proxy', {
        body: {
          path: `/api/v1/kf/customers/${accountId}/adpilot/campaigns`,
        },
      })
      if (res.error) throw new Error(res.error.message)
      const list = Array.isArray(res.data) ? res.data : res.data?.campaigns ?? []
      setCampaigns(list)
    } catch {
      // If the endpoint isn't live yet, show empty state
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  // ── Generate campaign ──────────────────────────────────────────────────────
  const handleGenerate = async (websiteUrl: string) => {
    if (!accountId) {
      toast({
        title: 'No Ad Grant account',
        description: 'Please connect your Google Ad Grant account first.',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    setGenerationStep(0)

    // Animate through steps while waiting for the API
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev < GENERATION_STEPS.length - 1) return prev + 1
        return prev
      })
    }, 3000)

    try {
      const res = await supabase.functions.invoke('guardian-proxy', {
        body: {
          path: `/api/v1/kf/customers/${accountId}/adpilot/generate`,
          method: 'POST',
          website_url: websiteUrl,
        },
      })

      clearInterval(stepInterval)

      if (res.error) throw new Error(res.error.message)

      const campaignId = res.data?.campaign_id ?? res.data?.id
      if (campaignId) {
        navigate(`/attract/adpilot/preview?campaign=${campaignId}`)
      } else {
        // Fallback: refresh list
        toast({ title: 'Campaign generated', description: 'Your campaign is ready for review.' })
        await fetchCampaigns()
      }
    } catch (err) {
      clearInterval(stepInterval)
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
      setGenerationStep(0)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── No account connected ───────────────────────────────────────────────────
  if (!accountId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Breadcrumb />
        <div className="border border-border rounded-xl p-8 bg-card text-center space-y-4 max-w-xl mx-auto mt-8">
          <p className="text-muted-foreground text-sm">
            Connect your Google Ad Grant account first to use AdPilot.
          </p>
          <Button onClick={() => navigate('/attract/connect')} variant="outline">
            Connect Account
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Breadcrumb />

      {campaigns.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            onGenerate={handleGenerate}
            generating={generating}
            generationStep={generationStep}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Header with generate button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Your Campaigns ({campaigns.length})
            </h2>
            <Button
              size="sm"
              className="gap-1.5 w-full sm:w-auto"
              onClick={() => setShowInlineGenerate(!showInlineGenerate)}
            >
              <Plus className="w-4 h-4" />
              Generate New Campaign
            </Button>
          </div>

          {/* Inline generate form */}
          {showInlineGenerate && (
            <div className="border border-border rounded-xl p-5 bg-card space-y-3">
              {generating ? (
                <GenerationProgress currentStep={generationStep} />
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Website URL</label>
                    <Input
                      value={inlineUrl}
                      onChange={(e) => setInlineUrl(e.target.value)}
                      placeholder="https://yourchurch.org"
                      className="bg-background"
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        inlineUrl.trim() &&
                        handleGenerate(inlineUrl.trim())
                      }
                    />
                  </div>
                  <Button
                    onClick={() => handleGenerate(inlineUrl.trim())}
                    disabled={!inlineUrl.trim() || generating}
                    className="gap-1.5 w-full sm:w-auto"
                  >
                    <Rocket className="w-4 h-4" />
                    Generate
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Campaign grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <CampaignStatusCard
                key={c.id}
                campaign={c}
                onClick={() => navigate(`/attract/adpilot/${c.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <span>ATTRACT</span>
        <span>&rsaquo;</span>
        <span>Ad Campaigns</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">AdPilot</h1>
      <p className="text-muted-foreground text-sm">
        AI-powered Google Ads campaign generation and management for your church.
      </p>
    </div>
  )
}
