import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdPreview } from '@/components/attract/AdPreview'
import { KeywordTable, type KeywordRow } from '@/components/attract/KeywordTable'
import {
  Loader2,
  ArrowLeft,
  Pause,
  Play,
  Wand2,
  Eye,
  MousePointerClick,
  Percent,
  Target,
  Clock,
  RefreshCw,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface CampaignDetail {
  id: number | string
  campaign_name: string
  status: string
  created_at: string
  last_optimization?: string
  optimization_summary?: string
  performance?: {
    impressions: number
    clicks: number
    ctr: number
    conversions: number
  }
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

// ── Performance stat card ────────────────────────────────────────────────────

function PerfCard({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  iconColor?: string
}) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
        <Icon className={`w-3.5 h-3.5 ${iconColor ?? 'text-indigo-400'}`} />
        {label}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdPilotCampaignDetailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentOrganization = useAuthStore((s) => s.currentOrganization) as any
  const accountId: string = currentOrganization?.google_ad_grant_account_id ?? ''
  const { id: campaignId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [optimizing, setOptimizing] = useState(false)

  // ── Fetch campaign ─────────────────────────────────────────────────────────
  const fetchCampaign = useCallback(async () => {
    if (!accountId || !campaignId) {
      setLoading(false)
      return
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, campaignId])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  const handleToggleCampaign = async () => {
    if (!accountId || !campaignId || !campaign) return
    const newStatus = campaign.status?.toLowerCase() === 'active' ? 'paused' : 'active'
    setToggling(true)
    try {
      const res = await supabase.functions.invoke('guardian-proxy', {
        body: {
          path: `/api/v1/kf/customers/${accountId}/adpilot/campaigns/${campaignId}`,
          method: 'PATCH',
          status: newStatus,
        },
      })
      if (res.error) throw new Error(res.error.message)
      setCampaign((prev) => (prev ? { ...prev, status: newStatus } : prev))
      toast({
        title: newStatus === 'paused' ? 'Campaign paused' : 'Campaign resumed',
      })
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setToggling(false)
    }
  }

  // ── Run Optimization ───────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!accountId || !campaignId) return
    setOptimizing(true)
    try {
      const res = await supabase.functions.invoke('guardian-proxy', {
        body: {
          path: `/api/v1/kf/customers/${accountId}/adpilot/campaigns/${campaignId}/optimize`,
          method: 'POST',
        },
      })
      if (res.error) throw new Error(res.error.message)
      toast({ title: 'Optimization complete', description: res.data?.summary ?? 'Campaign has been optimized.' })
      await fetchCampaign()
    } catch (err) {
      toast({
        title: 'Optimization failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setOptimizing(false)
    }
  }

  // ── Keyword toggle ─────────────────────────────────────────────────────────
  const handleKeywordToggle = async (keywordId: number, newStatus: string) => {
    if (!accountId || !campaignId) return
    try {
      await supabase.functions.invoke('guardian-proxy', {
        body: {
          path: `/api/v1/kf/customers/${accountId}/adpilot/campaigns/${campaignId}/keywords/${keywordId}`,
          method: 'PATCH',
          status: newStatus,
        },
      })
      // Optimistically update
      setCampaign((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ad_groups: prev.ad_groups.map((ag) => ({
            ...ag,
            keywords: ag.keywords.map((kw) =>
              kw.id === keywordId ? { ...kw, status: newStatus } : kw,
            ),
          })),
        }
      })
    } catch {
      toast({
        title: 'Failed to update keyword',
        variant: 'destructive',
      })
    }
  }

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
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span>ATTRACT</span>
            <span>&rsaquo;</span>
            <span>Ad Campaigns</span>
          </div>
        </div>
        <div className="border border-border rounded-xl p-8 bg-card text-center space-y-4 max-w-xl mx-auto">
          <p className="text-muted-foreground text-sm">Campaign not found.</p>
          <Button onClick={() => navigate('/attract/adpilot')} variant="outline" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    )
  }

  const isActive = campaign.status?.toLowerCase() === 'active'
  const perf = campaign.performance

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb + Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>ATTRACT</span>
          <span>&rsaquo;</span>
          <button
            onClick={() => navigate('/attract/adpilot')}
            className="hover:text-foreground transition-colors"
          >
            Ad Campaigns
          </button>
          <span>&rsaquo;</span>
          <span>{campaign.campaign_name}</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {campaign.campaign_name}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge
                className={`text-[10px] px-2 py-0.5 border capitalize ${
                  isActive
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {campaign.status}
              </Badge>
              <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleCampaign}
              disabled={toggling}
              className="gap-1.5 text-xs"
            >
              {toggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isActive ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isActive ? 'Pause' : 'Resume'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOptimize}
              disabled={optimizing}
              className="gap-1.5 text-xs"
            >
              {optimizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              {optimizing ? 'Optimizing...' : 'Optimize'}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* ── Performance Cards ──────────────────────────────────────────── */}
        {perf && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PerfCard
              icon={Eye}
              label="Impressions"
              value={perf.impressions.toLocaleString()}
              iconColor="text-blue-400"
            />
            <PerfCard
              icon={MousePointerClick}
              label="Clicks"
              value={perf.clicks.toLocaleString()}
              iconColor="text-indigo-400"
            />
            <PerfCard
              icon={Percent}
              label="CTR"
              value={`${perf.ctr.toFixed(1)}%`}
              iconColor="text-amber-400"
            />
            <PerfCard
              icon={Target}
              label="Conversions"
              value={perf.conversions.toLocaleString()}
              iconColor="text-green-400"
            />
          </div>
        )}

        {/* ── Last optimization ──────────────────────────────────────────── */}
        {campaign.last_optimization && (
          <div className="border border-border rounded-xl p-4 bg-card flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Last optimization:{' '}
                <span className="font-medium text-foreground">
                  {new Date(campaign.last_optimization).toLocaleString()}
                </span>
              </p>
              {campaign.optimization_summary && (
                <p className="text-sm text-foreground">
                  {campaign.optimization_summary}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Keyword Performance ─────────────────────────────────────────── */}
        {campaign.ad_groups?.map((ag) => (
          <section key={ag.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {campaign.ad_groups.length > 1 ? ag.ad_group_name : 'Keyword Performance'}
            </h2>
            {ag.keywords.length > 0 && (
              <KeywordTable
                keywords={ag.keywords}
                onToggle={handleKeywordToggle}
              />
            )}
          </section>
        ))}

        {/* ── Ad Copy ─────────────────────────────────────────────────────── */}
        {campaign.ad_groups?.some((ag) => ag.ads?.length > 0) && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Ad Copy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaign.ad_groups.flatMap((ag) =>
                ag.ads.map((ad) => (
                  <AdPreview
                    key={ad.id}
                    headlines={ad.headlines}
                    descriptions={ad.descriptions}
                    displayUrl={ad.display_url ?? ad.final_url}
                    finalUrl={ad.final_url}
                  />
                )),
              )}
            </div>
          </section>
        )}

        {/* ── Footer actions ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/attract/adpilot')}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Campaigns
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCampaign}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  )
}
