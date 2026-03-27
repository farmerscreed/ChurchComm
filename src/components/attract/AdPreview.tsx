import { cn } from '@/lib/utils'

interface AdPreviewProps {
  headlines: string[]
  descriptions: string[]
  displayUrl: string
  finalUrl: string
  className?: string
}

export function AdPreview({
  headlines,
  descriptions,
  displayUrl,
  finalUrl,
  className,
}: AdPreviewProps) {
  // Google Ads show up to 3 headlines separated by " | " and up to 2 descriptions
  const visibleHeadlines = headlines.slice(0, 3)
  const visibleDescriptions = descriptions.slice(0, 2)

  return (
    <div
      className={cn(
        'border border-border rounded-xl p-5 bg-card space-y-2 max-w-xl',
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        Ad Preview
      </p>

      {/* Sponsored label */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-semibold text-[11px]">Sponsored</span>
      </div>

      {/* Display URL */}
      <p className="text-sm text-emerald-500 truncate">{displayUrl || finalUrl}</p>

      {/* Headline */}
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-lg font-medium text-blue-400 hover:underline leading-snug"
      >
        {visibleHeadlines.join(' | ')}
      </a>

      {/* Descriptions */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {visibleDescriptions.join(' ')}
      </p>
    </div>
  )
}
