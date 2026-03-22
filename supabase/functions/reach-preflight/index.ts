import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * reach-preflight — Website preflight scanner for Google Ad Grant requirements.
 *
 * Accepts POST: { url: "https://example.com", org_id?: "uuid" }
 *
 * Checks 10 requirements and returns a scored report.
 * Available to REACH subscribers (no ATTRACT module gate).
 * Authenticated via Supabase JWT.
 */

interface CheckResult {
  name: string
  passed: boolean
  severity: 'critical' | 'high' | 'advisory'
  message: string
  fix_hint: string
}

interface PreflightReport {
  url: string
  score: number
  total_checks: number
  is_ready: boolean
  critical_failures: CheckResult[]
  high_failures: CheckResult[]
  advisories: CheckResult[]
  passing_checks: CheckResult[]
}

/**
 * Fetch a URL with timeout, following redirects.
 * Returns the Response object or null if the fetch fails.
 */
async function safeFetch(url: string, timeoutMs = 10000): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'KeepFlock-Preflight-Scanner/1.0',
      },
    })
    return res
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Extract the HTML body text from a URL response.
 */
async function fetchHtml(url: string, timeoutMs = 10000): Promise<{ html: string; loadTimeMs: number } | null> {
  const start = Date.now()
  const res = await safeFetch(url, timeoutMs)
  const loadTimeMs = Date.now() - start

  if (!res || !res.ok) return null

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
    // Try to read anyway
  }

  const html = await res.text()
  return { html, loadTimeMs }
}

/**
 * Check if a relative or absolute link exists in the HTML.
 * Returns the matched href if found.
 */
function findLink(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[0]
  }
  return null
}

/**
 * Count unique internal navigation links in the HTML.
 */
function countInternalLinks(html: string, baseUrl: string): number {
  const linkPattern = /href=["']([^"'#]+)["']/gi
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  const base = new URL(baseUrl)

  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1]
    try {
      // Resolve relative URLs
      const resolved = new URL(href, baseUrl)
      // Only count internal links (same hostname)
      if (resolved.hostname === base.hostname && resolved.pathname !== '/') {
        seen.add(resolved.pathname)
      }
    } catch {
      // Skip malformed URLs
    }
  }

  return seen.size
}

/**
 * Run all 10 preflight checks against the fetched HTML.
 */
async function runChecks(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  // Normalize URL
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  const parsedUrl = new URL(normalizedUrl)

  // --- Check 1: HTTPS enabled ---
  const isHttps = parsedUrl.protocol === 'https:'
  results.push({
    name: 'HTTPS Enabled',
    passed: isHttps,
    severity: 'critical',
    message: isHttps
      ? 'Site uses HTTPS encryption'
      : 'Site does not use HTTPS. Google requires all grant-funded sites to use HTTPS.',
    fix_hint: 'Install an SSL certificate and redirect all HTTP traffic to HTTPS.',
  })

  // Fetch the homepage
  const fetchResult = await fetchHtml(normalizedUrl, 10000)
  if (!fetchResult) {
    // If we can't even fetch the site, mark all remaining checks as failed
    const failedChecks: Array<{ name: string; severity: 'critical' | 'high' | 'advisory'; hint: string }> = [
      { name: 'Privacy Policy Page', severity: 'critical', hint: 'Add a /privacy or /privacy-policy page.' },
      { name: 'About/Mission Page', severity: 'high', hint: 'Add an /about page describing your mission.' },
      { name: 'Contact Information', severity: 'high', hint: 'Add a /contact page or visible contact info.' },
      { name: 'Multi-Page Site', severity: 'critical', hint: 'Ensure your site has at least 3 navigable pages.' },
      { name: 'Mission Statement', severity: 'high', hint: 'Add a clear mission statement to your homepage.' },
      { name: 'Donation/Giving Page', severity: 'advisory', hint: 'Add a /donate or /give page.' },
      { name: 'Valid Sitemap', severity: 'advisory', hint: 'Add a sitemap.xml to your site root.' },
      { name: 'Mobile-Friendly', severity: 'high', hint: 'Add a viewport meta tag for responsive design.' },
      { name: 'Page Load Time', severity: 'advisory', hint: 'Optimize your site to load within 5 seconds.' },
    ]
    for (const c of failedChecks) {
      results.push({
        name: c.name,
        passed: false,
        severity: c.severity,
        message: 'Could not fetch website — site may be down or unreachable.',
        fix_hint: c.hint,
      })
    }
    return results
  }

  const { html, loadTimeMs } = fetchResult
  const htmlLower = html.toLowerCase()

  // --- Check 2: Privacy Policy ---
  const privacyPatterns = [
    /href=["'][^"']*(?:privacy[-_]?policy|\/privacy)[^"']*["']/i,
    /privacy\s*policy/i,
  ]
  const hasPrivacy = privacyPatterns.some(p => p.test(html))
  results.push({
    name: 'Privacy Policy Page',
    passed: hasPrivacy,
    severity: 'critical',
    message: hasPrivacy
      ? 'Privacy policy link found on site'
      : 'No privacy policy page or link detected.',
    fix_hint: 'Add a privacy policy page and link to it from your footer or main navigation.',
  })

  // --- Check 3: About/Mission Page ---
  const aboutPatterns = [
    /href=["'][^"']*(?:\/about|\/mission|\/who-we-are|\/our-story|\/our-mission)[^"']*["']/i,
    /<a[^>]*>(?:about|our\s*mission|who\s*we\s*are|our\s*story)<\/a>/i,
  ]
  const hasAbout = aboutPatterns.some(p => p.test(html))
  results.push({
    name: 'About/Mission Page',
    passed: hasAbout,
    severity: 'high',
    message: hasAbout
      ? 'About or mission page link found'
      : 'No about or mission page detected.',
    fix_hint: 'Add an About Us or Our Mission page that clearly describes your organization.',
  })

  // --- Check 4: Contact Information ---
  const contactPatterns = [
    /href=["'][^"']*(?:\/contact|mailto:)[^"']*["']/i,
    /(?:tel:|phone:|call\s*us|contact\s*us)/i,
    /\(\d{3}\)\s*\d{3}[-.]?\d{4}/,
    /\d{3}[-.]?\d{3}[-.]?\d{4}/,
  ]
  const hasContact = contactPatterns.some(p => p.test(html))
  results.push({
    name: 'Contact Information',
    passed: hasContact,
    severity: 'high',
    message: hasContact
      ? 'Contact information or contact page found'
      : 'No contact page, phone number, or email link detected.',
    fix_hint: 'Add a Contact page with phone number, email, and/or physical address.',
  })

  // --- Check 5: Multi-page site (>= 3 navigable pages) ---
  const internalLinkCount = countInternalLinks(html, normalizedUrl)
  const isMultiPage = internalLinkCount >= 3
  results.push({
    name: 'Multi-Page Site',
    passed: isMultiPage,
    severity: 'critical',
    message: isMultiPage
      ? `Found ${internalLinkCount} internal page links`
      : `Only ${internalLinkCount} internal page link(s) found. Google requires at least 3.`,
    fix_hint: 'Ensure your site has at least 3 distinct navigable pages (e.g., Home, About, Contact, Sermons).',
  })

  // --- Check 6: Mission Statement ---
  const missionPatterns = [
    /mission\s*(?:statement|:)/i,
    /our\s*mission/i,
    /we\s*(?:exist|are\s*(?:dedicated|committed))\s*to/i,
    /501\s*\(?\s*c\s*\)?\s*\(?\s*3\s*\)?/i,
    /non[-\s]?profit/i,
  ]
  const hasMission = missionPatterns.some(p => p.test(html))
  results.push({
    name: 'Mission Statement',
    passed: hasMission,
    severity: 'high',
    message: hasMission
      ? 'Mission-related content detected on the site'
      : 'No clear mission statement found on the homepage.',
    fix_hint: 'Add a visible mission statement on your homepage that describes your nonprofit purpose.',
  })

  // --- Check 7: Donation/Giving Page ---
  const donationPatterns = [
    /href=["'][^"']*(?:\/donate|\/give|\/giving|\/support)[^"']*["']/i,
    /<a[^>]*>(?:donate|give|support\s*us|make\s*a\s*gift)<\/a>/i,
  ]
  const hasDonation = donationPatterns.some(p => p.test(html))
  results.push({
    name: 'Donation/Giving Page',
    passed: hasDonation,
    severity: 'advisory',
    message: hasDonation
      ? 'Donation or giving page link found'
      : 'No donation/giving page detected. While not strictly required, it strengthens your grant application.',
    fix_hint: 'Add a Donate or Give page with clear donation functionality.',
  })

  // --- Check 8: Valid sitemap.xml ---
  const sitemapUrl = `${parsedUrl.origin}/sitemap.xml`
  const sitemapRes = await safeFetch(sitemapUrl, 5000)
  const hasSitemap = sitemapRes !== null && sitemapRes.ok
  let sitemapMessage = ''
  if (hasSitemap) {
    const sitemapText = await sitemapRes!.text()
    const hasUrlEntries = sitemapText.includes('<url>') || sitemapText.includes('<urlset')
    if (hasUrlEntries) {
      sitemapMessage = 'Valid sitemap.xml found with URL entries'
    } else {
      sitemapMessage = 'sitemap.xml exists but may not have valid entries'
    }
  } else {
    sitemapMessage = 'No sitemap.xml found at site root'
  }
  results.push({
    name: 'Valid Sitemap',
    passed: hasSitemap,
    severity: 'advisory',
    message: sitemapMessage,
    fix_hint: 'Generate and upload a sitemap.xml to your site root. Most CMS platforms can do this automatically.',
  })

  // --- Check 9: Mobile-friendly (viewport meta tag) ---
  const viewportPattern = /<meta[^>]*name=["']viewport["'][^>]*>/i
  const hasMobileViewport = viewportPattern.test(html)
  results.push({
    name: 'Mobile-Friendly',
    passed: hasMobileViewport,
    severity: 'high',
    message: hasMobileViewport
      ? 'Viewport meta tag found — site is configured for mobile'
      : 'No viewport meta tag found. Site may not render well on mobile devices.',
    fix_hint: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your HTML head.',
  })

  // --- Check 10: Page Load Time ---
  const loadTimeSec = loadTimeMs / 1000
  const fastEnough = loadTimeSec < 5
  results.push({
    name: 'Page Load Time',
    passed: fastEnough,
    severity: 'advisory',
    message: fastEnough
      ? `Page loaded in ${loadTimeSec.toFixed(1)}s (under 5s threshold)`
      : `Page took ${loadTimeSec.toFixed(1)}s to load. Aim for under 5 seconds.`,
    fix_hint: 'Optimize images, enable caching, and minimize JavaScript to improve load times.',
  })

  return results
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Parse request body
    const body = await req.json()
    const { url, org_id } = body as { url?: string; org_id?: string }

    if (!url) {
      return new Response(JSON.stringify({ error: 'url is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
      parsedUrl = new URL(normalizedUrl)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // If org_id is provided, verify the user belongs to that org
    if (org_id) {
      const { data: membership, error: memberError } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('organization_id', org_id)
        .eq('user_id', user.id)
        .single()

      if (memberError || !membership) {
        return new Response(JSON.stringify({ error: 'Forbidden: not a member of this organization' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
    }

    console.log('Running preflight scan for:', url)

    // Run all checks
    const checks = await runChecks(url)

    // Categorize results
    const criticalFailures = checks.filter(c => !c.passed && c.severity === 'critical')
    const highFailures = checks.filter(c => !c.passed && c.severity === 'high')
    const advisories = checks.filter(c => !c.passed && c.severity === 'advisory')
    const passingChecks = checks.filter(c => c.passed)

    const score = passingChecks.length
    const totalChecks = checks.length

    // is_ready = no critical failures and score >= 7
    const isReady = criticalFailures.length === 0 && score >= 7

    const report: PreflightReport = {
      url,
      score,
      total_checks: totalChecks,
      is_ready: isReady,
      critical_failures: criticalFailures,
      high_failures: highFailures,
      advisories,
      passing_checks: passingChecks,
    }

    // Store result in preflight_results if org_id provided
    if (org_id) {
      const { error: storeError } = await supabaseAdmin
        .from('preflight_results')
        .insert({
          organization_id: org_id,
          url,
          score,
          total_checks: totalChecks,
          is_ready: isReady,
          critical_failures: criticalFailures,
          high_failures: highFailures,
          advisories,
          passing_checks: passingChecks,
          scanned_by: user.id,
        })

      if (storeError) {
        console.error('Error storing preflight result:', storeError)
        // Non-fatal — still return the report
      } else {
        console.log('Stored preflight result for org:', org_id)
      }
    }

    console.log('Preflight scan complete:', url, `Score: ${score}/${totalChecks}`, isReady ? 'READY' : 'NOT READY')

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('reach-preflight error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
