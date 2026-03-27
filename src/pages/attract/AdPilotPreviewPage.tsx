import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { AdPreview } from '@/components/attract/AdPreview'
import { KeywordTable, type KeywordRow } from '@/components/attract/KeywordTable'
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  MapPin,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface CampaignDetail {
  id: number | string
  campaign_name: string
  status: string
  ad_groups: AdGroup[]
  geo_targeting?: {
    city?: string
    state?: string
    radius_miles?: number
  }
}

interface AdGroup {
  id: number
  ad_group_name: string
  keywords: KeywordRow[]
  ads: AdData[]
}

interface AdData {
  id: number
  headlines: string[]
  descriptions: string[]
  final_url: string
  display_url?: string
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdPilotPreviewPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any
  const accountId: string = currentOrganization?.google_ad_grant_account_id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const params = useParams()

  // Campaign ID can come from query string or route param
  const campaignId = searchParams.get('campaign') ?? params.id ?? ''

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  // Keyword toggle state (local override before approval)
  const [keywordOverrides, setKeywordOverrides] = useState<Record<number, string>>({})

  // ── Fetch campaign detail ──────────────────────────────────────────────────
  useEffect(() => {
    if (!accountId || !campaignId) {
      setLoading(false)
      return
    }

    async function fetchCampaign() {
      setLoading(true)
      try {
        const res = await supabase.functions.invoke('guardian-proxy', {
          body: {
            path: `/api/v1/kf/customers/${accountId}/adpilot/campaigns/${campaignId}`,
          },
        })
        if (res.error) throw new Error(res.error.message)
        setCampaign(res.data)
      } catch {
        toast({
          title: 'Failed to load campaign',
          description: 'Could not fetch campaign details.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, campaignId])

  // ── Approve & Launch ───────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!accountId || !campaignId) return
    setApproving(true)
    try {
      const res = await supabase.functions.invoke('guardian-proxy', {
        body: {
          path: `/api/v1/kf/customers/${accountId}/adpilot/campaigns/${campaignId}/approve`,
          method: 'POST',
          keyword_overrides: keywordOverrides,
        },
      })
      if (res.error) throw new Error(res.error.message)

      toast({ title: 'Campaign launched!', description: 'Your campaign is now live.' })
      navigate(`/attract/adpilot/${campaignId}`)
    } catch (err) {
      toast({
        title: 'Approval failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setApproving(false)
    }
  }

  // ── Keyword toggle handler ─────────────────────────────────────────────────
  const handleKeywordToggle = (id: number, newStatus: string) => {
    setKeywordOverrides((prev) => ({ ...prev, [id]: newStatus }))
  }

  // ── Apply overrides to keywords ────────────────────────────────────────────
  const getKeywordsWithOverrides = (keywords: KeywordRow[]): KeywordRow[] =>
    keywords.map((kw) => ({
      ...kw,
      status: keywordOverrides[kw.id] ?? kw.status,
    }))

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Breadcrumb />
        <div className="border border-border rounded-xl p-8 bg-card text-center space-y-4 max-w-xl mx-auto mt-8">
          <p className="text-muted-foreground text-sm">Campaign not found.</p>
          <Button onClick={() => navigate('/attract/adpilot')} variant="outline" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    )
  }

  const firstAdGroup = campaign.ad_groups?.[0]
  const firstAd = firstAdGroup?.ads?.[0]
  const geo = campaign.geo_targeting

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Breadcrumb campaignName={campaign.campaign_name} />

      <div className="space-y-8">
        {/* ── Ad Preview ───────────────────────────────────────────────────── */}
        {firstAd && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Ad Preview</h2>
            <p className="text-xs text-muted-foreground">
              This is how your ad will appear in Google search results.
            </p>
            <AdPreview
              headlines={firstAd.headlines}
              descriptions={firstAd.descriptions}
              displayUrl={firstAd.display_url ?? firstAd.final_url}
              finalUrl={firstAd.final_url}
            />
          </section>
        )}

        {/* ── Keyword Table ────────────────────────────────────────────────── */}
        {firstAdGroup && firstAdGroup.keywords.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Keywords</h2>
            <p className="text-xs text-muted-foreground">
              Toggle keywords on or off before launching. Disabled keywords will not be added.
            </p>
            <KeywordTable
              keywords={getKeywordsWithOverrides(firstAdGroup.keywords)}
              onToggle={handleKeywordToggle}
            />
          </section>
        )}

        {/* Show additional ad groups if present */}
        {campaign.ad_groups?.slice(1).map((ag) => (
          <section key={ag.id} className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              {ag.ad_group_name}
            </h2>
            {ag.ads?.[0] && (
              <AdPreview
                headlines={ag.ads[0].headlines}
                descriptions={ag.ads[0].descriptions}
                displayUrl={ag.ads[0].display_url ?? ag.ads[0].final_url}
                finalUrl={ag.ads[0].final_url}
              />
            )}
            {ag.keywords.length > 0 && (
              <KeywordTable
                keywords={getKeywordsWithOverrides(ag.keywords)}
                onToggle={handleKeywordToggle}
              />
            )}
          </section>
        ))}

        {/* ── Geo-targeting ────────────────────────────────────────────────── */}
        {geo && (geo.city || geo.state) && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Geo-Targeting</h2>
            <div className="border border-border rounded-xl p-4 bg-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-sm text-foreground">
                {geo.city && geo.state
                  ? `${geo.city}, ${geo.state}`
                  : geo.state ?? geo.city}
                {geo.radius_miles != null && ` — ${geo.radius_miles} mile radius`}
              </p>
            </div>
          </section>
        )}

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => navigate('/attract/adpilot')}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Edit
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approving}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            {approving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {approving ? 'Launching...' : 'Approve & Launch'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ campaignName }: { campaignName?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <span>ATTRACT</span>
        <span>&rsaquo;</span>
        <span>Ad Campaigns</span>
        {campaignName && (
          <>
            <span>&rsaquo;</span>
            <span>Preview</span>
          </>
        )}
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {campaignName ? `Review: ${campaignName}` : 'Review Campaign'}
      </h1>
      <p className="text-muted-foreground text-sm">
        Review your AI-generated campaign before it goes live.
      </p>
    </div>
  )
}
