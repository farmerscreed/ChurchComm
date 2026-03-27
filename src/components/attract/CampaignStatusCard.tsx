import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BarChart3, Calendar } from 'lucide-react'

export interface CampaignSummary {
  id: number | string
  campaign_name: string
  status: string
  created_at: string
  performance?: {
    impressions?: number
    clicks?: number
    ctr?: number
  }
}

interface CampaignStatusCardProps {
  campaign: CampaignSummary
  onClick: () => void
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/30',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  draft: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  removed: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export function CampaignStatusCard({ campaign, onClick }: CampaignStatusCardProps) {
  const statusKey = campaign.status?.toLowerCase() ?? 'draft'
  const badgeClass = STATUS_STYLES[statusKey] ?? STATUS_STYLES.draft

  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-border rounded-xl p-5 bg-card hover:bg-white/5 transition-colors space-y-3 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground truncate">
          {campaign.campaign_name}
        </h3>
        <Badge className={cn('text-[10px] px-2 py-0.5 border shrink-0 capitalize', badgeClass)}>
          {campaign.status}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
      </div>

      {campaign.performance && (
        <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-indigo-400" />
            <span>{(campaign.performance.impressions ?? 0).toLocaleString()} imp</span>
          </div>
          <span>{(campaign.performance.clicks ?? 0).toLocaleString()} clicks</span>
          {campaign.performance.ctr != null && (
            <span>{campaign.performance.ctr.toFixed(1)}% CTR</span>
          )}
        </div>
      )}
    </button>
  )
}
