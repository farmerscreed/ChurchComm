import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export interface KeywordRow {
  id: number
  keyword_text: string
  match_type: string
  avg_monthly_searches?: number
  competition?: string
  status: string
  performance?: {
    impressions?: number
    clicks?: number
    ctr?: number
  }
}

interface KeywordTableProps {
  keywords: KeywordRow[]
  onToggle?: (id: number, newStatus: string) => void
  readonly?: boolean
}

export function KeywordTable({ keywords, onToggle, readonly }: KeywordTableProps) {
  const hasPerformance = keywords.some((k) => k.performance)

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Keyword</th>
              <th className="text-left px-4 py-3 font-medium">Match</th>
              <th className="text-right px-4 py-3 font-medium">Volume</th>
              <th className="text-left px-4 py-3 font-medium">Competition</th>
              {hasPerformance && (
                <>
                  <th className="text-right px-4 py-3 font-medium">Imp.</th>
                  <th className="text-right px-4 py-3 font-medium">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium">CTR</th>
                </>
              )}
              <th className="text-center px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw) => {
              const isEnabled = kw.status?.toLowerCase() === 'enabled'
              return (
                <tr
                  key={kw.id}
                  className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{kw.keyword_text}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{kw.match_type}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {kw.avg_monthly_searches != null
                      ? kw.avg_monthly_searches.toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-medium capitalize',
                        kw.competition?.toLowerCase() === 'low'
                          ? 'text-green-400'
                          : kw.competition?.toLowerCase() === 'high'
                          ? 'text-red-400'
                          : 'text-amber-400',
                      )}
                    >
                      {kw.competition ?? '—'}
                    </span>
                  </td>
                  {hasPerformance && (
                    <>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {kw.performance?.impressions?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {kw.performance?.clicks?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {kw.performance?.ctr != null ? `${kw.performance.ctr.toFixed(1)}%` : '—'}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-center">
                    {readonly ? (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isEnabled ? 'text-green-400' : 'text-slate-500',
                        )}
                      >
                        {kw.status}
                      </span>
                    ) : (
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          onToggle?.(kw.id, checked ? 'enabled' : 'paused')
                        }
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {keywords.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">No keywords found.</div>
      )}
    </div>
  )
}
