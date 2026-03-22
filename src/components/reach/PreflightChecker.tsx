import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

// ---- Types ----

type CheckStatus = 'pass' | 'fail' | 'warn';

interface PreflightCheck {
  key: string;
  label: string;
  description: string;
  status: CheckStatus;
  fixInstructions?: string;
}

interface PreflightResult {
  score: number;
  total: number;
  isReady: boolean;
  checks: PreflightCheck[];
  criticalFailures: string[];
  highFailures: string[];
  advisories: string[];
  passingChecks: string[];
}

// ---- Fallback: build mock result client-side if edge fn unavailable ----
// The real implementation calls the `reach-preflight` edge function.
// We define the 10 requirement labels for display purposes.

const REQUIREMENT_LABELS: Record<string, string> = {
  https: 'HTTPS / SSL certificate',
  privacy_policy: 'Privacy policy page',
  about_page: 'About page',
  contact_info: 'Contact information',
  multi_page: 'Multi-page website',
  mission_statement: 'Mission statement',
  donation_page: 'Donation or giving page',
  sitemap: 'Valid sitemap.xml',
  mobile_friendly: 'Mobile-friendly design',
  load_time: 'Fast load time (< 3s)',
};

const REQUIREMENT_DESCRIPTIONS: Record<string, string> = {
  https: 'Your site must use HTTPS with a valid SSL certificate.',
  privacy_policy:
    'A privacy policy page is required by Google. It should explain how you collect and use visitor data.',
  about_page:
    'An "About Us" page describing your organization, mission, and history.',
  contact_info:
    'A physical address, phone number, or email address publicly displayed on your site.',
  multi_page:
    'Your site must have more than one page — single-page sites are not permitted.',
  mission_statement:
    'Clear language describing what your organization does and who it serves.',
  donation_page:
    'A page where visitors can give — required to show noncommercial intent.',
  sitemap:
    'A sitemap.xml file helps Google index your site properly.',
  mobile_friendly:
    'Your site must pass the Google Mobile-Friendly Test. Most modern sites with responsive design already do.',
  load_time:
    'Pages should load in under 3 seconds. Slow load times hurt Quality Scores and user experience.',
};

const FIX_INSTRUCTIONS: Record<string, string> = {
  https:
    'Install a free SSL certificate via Let\'s Encrypt, or enable HTTPS through your hosting provider (Cloudflare, Netlify, etc.).',
  privacy_policy:
    'Add a /privacy-policy page. You can generate one at privacypolicygenerator.info and link it in your footer.',
  about_page:
    'Create an /about page that describes your church or nonprofit, its history, leadership, and mission.',
  contact_info:
    'Add a /contact page with your address, phone, and email. Include contact info in your footer as well.',
  multi_page:
    'Ensure your site has a navigation menu with at least 3–5 distinct pages (Home, About, Ministries, Contact, etc.).',
  mission_statement:
    'Add a clear mission statement to your homepage or about page that explains who you are and what you do.',
  donation_page:
    'Create a /give or /donate page. You can embed a free giving widget from Stripe, PayPal, or your church management software.',
  sitemap:
    'Generate a sitemap.xml with a plugin (Yoast SEO for WordPress) or your website builder, then submit it in Google Search Console.',
  mobile_friendly:
    'Test your site at search.google.com/test/mobile-friendly. Most issues are fixed by using a responsive theme or template.',
  load_time:
    'Compress images (TinyPNG.com), enable caching, and use a CDN. Google PageSpeed Insights gives a free action plan.',
};

// ---- Component ----

interface PreflightCheckerProps {
  initialUrl?: string;
  onScanComplete?: (result: PreflightResult) => void;
}

export function PreflightChecker({ initialUrl = '', onScanComplete }: PreflightCheckerProps) {
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  function toggleExpand(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function runScan() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast({ title: 'URL required', description: 'Please enter your website URL before scanning.', variant: 'destructive' });
      return;
    }

    // Normalise — prepend https:// if missing
    const normalised = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('reach-preflight', {
        body: {
          url: normalised,
          org_id: currentOrganization?.id ?? null,
        },
      });

      if (error) throw error;

      const scanResult = data as PreflightResult;
      setResult(scanResult);
      onScanComplete?.(scanResult);

      // Expand all failing checks by default
      const failing = new Set<string>(
        scanResult.checks.filter(c => c.status !== 'pass').map(c => c.key)
      );
      setExpandedKeys(failing);
    } catch (err: unknown) {
      console.error('Preflight scan error:', err);
      toast({
        title: 'Scan failed',
        description:
          'Could not complete the preflight scan. Please check the URL and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Globe className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-white text-lg">Website Preflight Scan</CardTitle>
            <p className="text-slate-400 text-xs mt-0.5">
              Check if your website meets Google Ad Grant requirements
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* URL Input */}
        <div className="flex gap-3">
          <Input
            type="url"
            placeholder="https://yourchurch.org"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runScan(); }}
            disabled={loading}
            className="flex-1 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500"
          />
          <Button
            onClick={runScan}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : result ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-scan
              </>
            ) : (
              'Scan site'
            )}
          </Button>
        </div>

        {/* Loading Skeleton */}
        {loading && <PreflightSkeleton />}

        {/* Results */}
        {!loading && result && (
          <div className="space-y-4">
            {/* Score header */}
            <ScoreHeader result={result} />

            {/* Checks list */}
            <div className="space-y-2">
              {result.checks.map(check => (
                <CheckItem
                  key={check.key}
                  check={check}
                  expanded={expandedKeys.has(check.key)}
                  onToggle={() => toggleExpand(check.key)}
                />
              ))}
            </div>

            {/* Footer note */}
            <p className="text-slate-500 text-xs pt-2 border-t border-white/5">
              Scan results are an estimate based on publicly available information. Google's review is the authoritative source of eligibility.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Score Header ----

function ScoreHeader({ result }: { result: PreflightResult }) {
  const pct = Math.round((result.score / result.total) * 100);

  return (
    <div className={[
      'rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4',
      result.isReady
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-amber-500/30 bg-amber-500/5',
    ].join(' ')}>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {result.isReady ? (
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
          )}
          <span className="text-white font-semibold">
            {result.isReady ? 'Your site looks ready!' : 'A few things need fixing'}
          </span>
        </div>
        <Progress
          value={pct}
          className="h-2 bg-slate-800"
        />
        <p className="text-slate-400 text-xs">
          {result.score} of {result.total} requirements passing ({pct}%)
        </p>
      </div>
      <Badge className={[
        'text-sm font-bold px-4 py-2 shrink-0',
        result.isReady
          ? 'bg-green-500/20 text-green-300 border-green-500/30'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      ].join(' ')}>
        {result.score}/{result.total}
      </Badge>
    </div>
  );
}

// ---- Check Item ----

interface CheckItemProps {
  check: PreflightCheck;
  expanded: boolean;
  onToggle: () => void;
}

function CheckItem({ check, expanded, onToggle }: CheckItemProps) {
  const isPass = check.status === 'pass';
  const isWarn = check.status === 'warn';

  return (
    <div className={[
      'rounded-xl border transition-all',
      isPass ? 'border-white/5 bg-slate-800/20' : isWarn ? 'border-amber-500/20 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5',
    ].join(' ')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {isPass ? (
          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
        ) : isWarn ? (
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <p className={['text-sm font-medium', isPass ? 'text-slate-200' : 'text-white'].join(' ')}>
            {REQUIREMENT_LABELS[check.key] ?? check.label}
          </p>
          {!expanded && (
            <p className="text-slate-500 text-xs truncate">
              {REQUIREMENT_DESCRIPTIONS[check.key] ?? check.description}
            </p>
          )}
        </div>

        {!isPass && (
          expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
          )
        )}
      </button>

      {expanded && !isPass && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <p className="text-slate-400 text-sm">
            {REQUIREMENT_DESCRIPTIONS[check.key] ?? check.description}
          </p>
          {(FIX_INSTRUCTIONS[check.key] ?? check.fixInstructions) && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">How to fix</p>
              <p className="text-slate-400 text-sm">
                {FIX_INSTRUCTIONS[check.key] ?? check.fixInstructions}
              </p>
            </div>
          )}
          <a
            href={`https://search.google.com/search-console/about`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs"
          >
            Google Search Console
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ---- Loading Skeleton ----

function PreflightSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full rounded-xl bg-slate-800/60" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl bg-slate-800/40" />
      ))}
    </div>
  );
}
