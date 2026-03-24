import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PreflightCheck {
  id: string
  name: string
  passed: boolean
  message: string
  fix?: string
  severity: 'critical' | 'high' | 'advisory'
}

interface PreflightResult {
  score: number
  total: number
  ready: boolean
  critical_failures: PreflightCheck[]
  high_failures: PreflightCheck[]
  advisories: PreflightCheck[]
  passing: PreflightCheck[]
  estimated_fix_time: string
  scanned_url: string
  scan_duration_ms: number
}

const SCANNER_UA = 'KeepFlock Preflight Scanner 1.0 (keepflock.com)'

async function fetchPage(url: string, timeoutMs = 10000): Promise<{ html: string; durationMs: number; status: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': SCANNER_UA },
      redirect: 'follow',
    })
    const html = res.ok ? await res.text() : ''
    return { html, durationMs: Date.now() - start, status: res.status }
  } finally {
    clearTimeout(timer)
  }
}

async function headCheck(url: string, timeoutMs = 5000): Promise<number> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': SCANNER_UA },
      redirect: 'follow',
    })
    return res.status
  } catch {
    return 0
  } finally {
    clearTimeout(timer)
  }
}

function internalLinks(html: string, hostname: string): string[] {
  const hrefs = [...html.matchAll(/href="([^"#]+)"/gi)].map(m => m[1])
  return [...new Set(
    hrefs
      .filter(h => h.startsWith('/') || h.includes(hostname))
      .map(h => h.startsWith('/') ? `https://${hostname}${h}` : h)
      .filter(h => !h.includes('mailto:') && !h.includes('tel:'))
  )].slice(0, 20)
}

function estimateFixTime(critCount: number, highCount: number): string {
  if (critCount === 0 && highCount === 0) return "None — you're ready to apply!"
  const weight = critCount * 2 + highCount
  if (weight <= 1) return '30–60 minutes'
  if (weight <= 3) return '1–2 hours'
  if (weight <= 5) return '2–4 hours'
  return '1–2 days'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const scanStart = Date.now()

  try {
    const { url: rawUrl } = await req.json()
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: 'url is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Normalise URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const hostname = parsedUrl.hostname
    const httpsBase = `https://${hostname}`
    const checks: PreflightCheck[] = []

    // ── REQ-01: HTTPS ─────────────────────────────────────────────────────────
    const isHttps = parsedUrl.protocol === 'https:'
    checks.push({
      id: 'REQ-01', name: 'HTTPS / Secure Site', severity: 'critical',
      passed: isHttps,
      message: isHttps ? 'Your site uses HTTPS.' : 'Your site is not using HTTPS. Google requires secure websites.',
      fix: isHttps ? undefined : 'Enable HTTPS via your hosting provider or Cloudflare (free).',
    })

    // ── Fetch homepage ────────────────────────────────────────────────────────
    let html = ''
    let loadTimeSeconds = 0
    let fetchError: string | null = null

    try {
      const { html: pageHtml, durationMs, status } = await fetchPage(`${httpsBase}/`, 10000)
      loadTimeSeconds = durationMs / 1000
      if (pageHtml) {
        html = pageHtml
      } else {
        fetchError = `Site returned HTTP ${status}`
      }
    } catch (e: any) {
      fetchError = e.name === 'AbortError' ? 'Site timed out after 10 seconds' : `Connection failed: ${e.message}`
      loadTimeSeconds = 10
    }

    // ── Check robots.txt ──────────────────────────────────────────────────────
    let robotsDisallowsCrawl = false
    try {
      const { html: robotsTxt } = await fetchPage(`${httpsBase}/robots.txt`, 5000)
      if (robotsTxt) {
        robotsDisallowsCrawl =
          /User-agent:\s*\*[\s\S]{0,200}?Disallow:\s*\/(?:\s|$)/i.test(robotsTxt) ||
          /User-agent:\s*Googlebot[\s\S]{0,200}?Disallow:\s*\/(?:\s|$)/i.test(robotsTxt)
      }
    } catch { /* robots.txt is optional */ }

    if (fetchError) {
      // Cannot scan — fail all remaining checks
      const unreachable = (id: string, name: string, sev: 'critical' | 'high' | 'advisory'): PreflightCheck => ({
        id, name, severity: sev, passed: false,
        message: `Could not scan site: ${fetchError}`,
        fix: 'Ensure your website is publicly accessible.',
      })
      checks.push(unreachable('REQ-02', 'Donation/Giving Page', 'critical'))
      checks.push(unreachable('REQ-03', 'Clear Mission Statement', 'critical'))
      checks.push(unreachable('REQ-04', 'No Excessive Commercial Content', 'critical'))
      checks.push(unreachable('REQ-05', 'Multi-Page Site', 'critical'))
      checks.push(unreachable('REQ-06', 'No Broken Links', 'high'))
      checks.push({ id: 'REQ-07', name: 'Page Load Speed', severity: 'high', passed: false,
        message: `Site unreachable or too slow (${loadTimeSeconds.toFixed(1)}s).`,
        fix: 'Ensure your site is online and responding quickly.' })
      checks.push(unreachable('REQ-08', 'Contact Information', 'high'))
      checks.push(unreachable('REQ-09', 'EIN Visible in Footer', 'advisory'))
      checks.push(unreachable('REQ-10', 'Analytics Tracking', 'advisory'))
    } else {
      const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      // ── REQ-02: Donation page ───────────────────────────────────────────────
      const donateInPage = /\b(donat|giving|online.giving|contribut|tithe)\b/i.test(html)
      let donatePathOk = false
      if (!donateInPage) {
        // Check all donate paths in parallel to avoid sequential timeouts
        const donateStatuses = await Promise.all(
          ['/donate', '/give', '/giving', '/online-giving'].map(p => headCheck(`${httpsBase}${p}`, 4000))
        )
        donatePathOk = donateStatuses.some(s => s >= 200 && s < 400)
      }
      const hasDonate = donateInPage || donatePathOk
      checks.push({
        id: 'REQ-02', name: 'Donation/Giving Page', severity: 'critical',
        passed: hasDonate,
        message: hasDonate ? 'Donation or giving page found.'
          : 'No donation page found. Google requires nonprofits to accept donations.',
        fix: hasDonate ? undefined : 'Add a donation page and link it from your homepage navigation.',
      })

      // ── REQ-03: Clear mission statement ────────────────────────────────────
      const wordCount = plain.split(/\s+/).filter(w => w.length > 2).length
      const missionWords = /\b(church|community|worship|ministry|faith|mission|congregation|pastor|gospel|serve|prayer|christian|believe|jesus)\b/i.test(plain)
      const missionOk = wordCount > 200 && missionWords
      checks.push({
        id: 'REQ-03', name: 'Clear Mission Statement', severity: 'critical',
        passed: missionOk,
        message: missionOk
          ? `Mission statement present (${wordCount} words, mission context confirmed).`
          : `Homepage lacks sufficient mission description (${wordCount} words detected).`,
        fix: missionOk ? undefined : "Add a paragraph explaining your church's mission and who you serve.",
      })

      // ── REQ-04: No excessive commercial content ─────────────────────────────
      const commercialCount = [...html.matchAll(/href="[^"]*\b(shop|buy|store|purchase|product|cart)\b[^"]*"/gi)].length
      const commercialOk = commercialCount <= 3
      checks.push({
        id: 'REQ-04', name: 'No Excessive Commercial Content', severity: 'critical',
        passed: commercialOk,
        message: commercialOk
          ? 'No excessive commercial content detected.'
          : `Found ${commercialCount} commercial links. Ad Grant sites must be primarily mission-focused.`,
        fix: commercialOk ? undefined : 'Reduce commercial links. The site must be primarily educational and mission-driven.',
      })

      // ── REQ-05: Multi-page site ─────────────────────────────────────────────
      const links = internalLinks(html, hostname)
      const navPages = links.filter(l => l !== `${httpsBase}/` && l !== httpsBase).length
      const multiPageOk = navPages >= 3 || robotsDisallowsCrawl
      checks.push({
        id: 'REQ-05', name: 'Multi-Page Site', severity: 'critical',
        passed: multiPageOk,
        message: multiPageOk
          ? (robotsDisallowsCrawl
              ? 'Robots.txt limits crawling — link count check skipped.'
              : `Multi-page site confirmed (${navPages} navigable pages found).`)
          : `Site appears to be single-page (${navPages} internal links found). Google requires multi-page sites.`,
        fix: multiPageOk ? undefined : 'Add pages for About, Sermons/Events, and Contact.',
      })

      // ── REQ-06: No broken links ─────────────────────────────────────────────
      const brokenLinks: string[] = []
      const linksToTest = robotsDisallowsCrawl ? [] : links.slice(0, 10)
      if (linksToTest.length > 0) {
        await Promise.allSettled(linksToTest.map(async (link) => {
          const status = await headCheck(link, 5000)
          if (status === 404 || status === 410 || status >= 500) brokenLinks.push(link)
        }))
      }
      checks.push({
        id: 'REQ-06', name: 'No Broken Links', severity: 'high',
        passed: brokenLinks.length === 0,
        message: brokenLinks.length === 0
          ? `No broken links found (checked ${linksToTest.length} pages).`
          : `Found ${brokenLinks.length} broken link(s). Broken links reduce Quality Score.`,
        fix: brokenLinks.length === 0 ? undefined
          : `Remove or update: ${brokenLinks.slice(0, 3).map(l => l.replace(httpsBase, '')).join(', ')}`,
      })

      // ── REQ-07: Page load speed ─────────────────────────────────────────────
      const speedOk = loadTimeSeconds <= 8
      checks.push({
        id: 'REQ-07', name: 'Page Load Speed', severity: 'high',
        passed: speedOk,
        message: speedOk
          ? `Site loaded in ${loadTimeSeconds.toFixed(1)}s. Good performance.`
          : `Site loaded in ${loadTimeSeconds.toFixed(1)}s. This impacts Ad Grant Quality Score.`,
        fix: speedOk ? undefined : 'Optimize images and enable caching via your hosting provider.',
      })

      // ── REQ-08: Contact information ─────────────────────────────────────────
      const hasContact = /\b(tel:|mailto:|address|phone|contact us|our location|find us|get in touch)\b/i.test(html)
      checks.push({
        id: 'REQ-08', name: 'Contact Information', severity: 'high',
        passed: hasContact,
        message: hasContact
          ? 'Contact information found.'
          : 'No contact information found. Google requires nonprofits to be clearly reachable.',
        fix: hasContact ? undefined : 'Add a Contact page with your address and phone number.',
      })

      // ── REQ-09: EIN visible ─────────────────────────────────────────────────
      const hasEIN = /\b\d{2}-\d{7}\b/.test(html)
      checks.push({
        id: 'REQ-09', name: 'EIN Visible in Footer', severity: 'advisory',
        passed: hasEIN,
        message: hasEIN ? 'EIN found on page.' : 'EIN not visible on homepage.',
        fix: hasEIN ? undefined : 'Display your EIN in the footer. Required for some grant verification paths.',
      })

      // ── REQ-10: Analytics tracking ──────────────────────────────────────────
      const hasAnalytics = /google-analytics\.com|gtag\s*\(|G-[A-Z0-9]{6,}|UA-\d+|googletagmanager\.com|_gaq\./i.test(html)
      checks.push({
        id: 'REQ-10', name: 'Analytics Tracking', severity: 'advisory',
        passed: hasAnalytics,
        message: hasAnalytics
          ? 'Google Analytics or Tag Manager detected.'
          : 'No analytics tracking found. Ad Grant requires conversion tracking to be configured.',
        fix: hasAnalytics ? undefined : 'Install Google Analytics 4 and set up conversion tracking before going live.',
      })
    }

    const critical_failures = checks.filter(c => c.severity === 'critical' && !c.passed)
    const high_failures     = checks.filter(c => c.severity === 'high'     && !c.passed)
    const advisories        = checks.filter(c => c.severity === 'advisory' && !c.passed)
    const passing           = checks.filter(c => c.passed)

    const result: PreflightResult = {
      score: passing.length,
      total: checks.length,
      ready: critical_failures.length === 0,
      critical_failures,
      high_failures,
      advisories,
      passing,
      estimated_fix_time: estimateFixTime(critical_failures.length, high_failures.length),
      scanned_url: httpsBase,
      scan_duration_ms: Date.now() - scanStart,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('reach-preflight error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
