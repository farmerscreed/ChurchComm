import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { result, websiteUrl, preflightScore, preflightTotal, organizationName } = body

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = user.email
    if (!email) {
      return new Response(JSON.stringify({ error: 'No email on account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const firstName = user.user_metadata?.first_name || 'there'
    const appUrl = Deno.env.get('APP_URL') || 'https://keepflock.com'
    const churchName = organizationName || 'your church'

    let subject: string
    let html: string

    if (result === 'qualified') {
      subject = 'Great news — ' + churchName + ' qualifies for $10,000/mo in free Google Ads!'
      html = buildQualifiedEmail(firstName, churchName, websiteUrl, preflightScore, preflightTotal, appUrl)
    } else if (result === 'pending') {
      subject = 'Your eligibility check is on hold — here\'s what to do next'
      html = buildPendingEmail(firstName, churchName, appUrl)
    } else {
      subject = 'Your Google Ad Grant eligibility results'
      html = buildDisqualifiedEmail(firstName, churchName, appUrl)
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KeepFlock <noreply@faithtechalliance.org>',
        to: email,
        subject: subject,
        html: html,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Resend email failed:', errText)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Eligibility result email sent to ' + email + ' result=' + result)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-eligibility-result error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildDemoCallSection(appUrl: string): string {
  return '<div style="background:#f5f3ff;border:1px solid #8b5cf6;border-radius:8px;padding:20px;margin:24px 0;text-align:center">' +
    '<p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;font-weight:600">Free 2-minute walkthrough</p>' +
    '<h3 style="margin:0 0 8px 0;font-size:18px;color:#1f2937">Want help getting your $10,000/month Google Ad Grant?</h3>' +
    '<p style="margin:0 0 16px 0;font-size:14px;color:#6b7280">Request a free call and we\'ll walk you through how to claim the grant, how to protect it from suspension, and show you the AI tools that keep your congregation engaged — all in about 2 minutes.</p>' +
    '<a href="' + appUrl + '/demo" style="display:inline-block;background:#7c3aed;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Request a Free Walkthrough Call</a>' +
    '<p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af">No commitment. No sales pressure. Just a quick rundown of what\'s available to your church.</p>' +
    '</div>'
}

function buildQualifiedEmail(
  firstName: string, churchName: string, websiteUrl: string,
  score: number | null, total: number | null, appUrl: string
): string {
  const scoreSection = score !== null && total !== null
    ? '<div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:16px;margin:16px 0">' +
      '<p style="margin:0;font-size:14px;color:#065f46"><strong>Preflight Score:</strong> ' + score + '/' + total + ' checks passed</p>' +
      '</div>'
    : ''

  return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">' +
    '<div style="background:#10b981;padding:24px;border-radius:12px 12px 0 0;text-align:center">' +
    '<h1 style="color:white;margin:0;font-size:24px">Your Church Qualifies!</h1>' +
    '</div>' +
    '<div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">' +
    '<p>Hi ' + firstName + ',</p>' +
    '<p><strong>' + churchName + '</strong> is eligible for the Google Ad Grant — <strong>$10,000/month in free Google Ads</strong>.</p>' +
    scoreSection +
    (websiteUrl ? '<p><strong>Website scanned:</strong> ' + websiteUrl + '</p>' : '') +
    buildDemoCallSection(appUrl) +
    '<h3 style="margin-top:24px">Your Next Steps for the Ad Grant</h3>' +
    '<ol style="line-height:1.8">' +
    '<li>Run the <strong>Domain Preflight Checker</strong> to verify your website meets all requirements</li>' +
    '<li>Register with <strong>Google for Nonprofits</strong></li>' +
    '<li>Complete <strong>Goodstack verification</strong></li>' +
    '<li>Apply for the <strong>Google Ad Grant</strong></li>' +
    '</ol>' +
    '<p>We\'ll guide you through each step inside KeepFlock.</p>' +
    '<a href="' + appUrl + '/reach/preflight" style="display:inline-block;background:#10b981;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;margin-top:16px;font-weight:600">Continue in KeepFlock</a>' +
    '<p style="margin-top:24px;font-size:12px;color:#9ca3af">Your 14-day free trial has started. Complete your application before it ends.</p>' +
    '</div>' +
    '</div>'
}

function buildPendingEmail(firstName: string, churchName: string, appUrl: string): string {
  return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">' +
    '<div style="background:#f59e0b;padding:24px;border-radius:12px 12px 0 0;text-align:center">' +
    '<h1 style="color:white;margin:0;font-size:24px">Almost There</h1>' +
    '</div>' +
    '<div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">' +
    '<p>Hi ' + firstName + ',</p>' +
    '<p><strong>' + churchName + '</strong> needs 501(c)(3) status before applying for the Google Ad Grant.</p>' +
    '<p>Once your nonprofit status is approved, come back and re-run the eligibility check — you\'ll likely qualify right away.</p>' +
    '<h3>How to apply for 501(c)(3)</h3>' +
    '<ol style="line-height:1.8">' +
    '<li>File Form 1023-EZ (for churches under $50K/year) or Form 1023</li>' +
    '<li>Pay the IRS filing fee ($275-$600)</li>' +
    '<li>Typical approval: 3-6 months</li>' +
    '</ol>' +
    '<a href="https://www.irs.gov/charities-non-profits/apply-for-an-exemption" style="display:inline-block;background:#f59e0b;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;margin-top:16px;font-weight:600">Start IRS Application</a>' +
    buildDemoCallSection(appUrl) +
    '<p style="font-size:13px;color:#6b7280">While you wait for your 501(c)(3), you can still use KeepFlock\'s AI calling and SMS features to engage your congregation.</p>' +
    '<p style="margin-top:16px"><a href="' + appUrl + '/reach/eligibility" style="color:#6366f1">Re-check eligibility</a></p>' +
    '</div>' +
    '</div>'
}

function buildDisqualifiedEmail(firstName: string, churchName: string, appUrl: string): string {
  return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">' +
    '<div style="background:#6b7280;padding:24px;border-radius:12px 12px 0 0;text-align:center">' +
    '<h1 style="color:white;margin:0;font-size:24px">Eligibility Results</h1>' +
    '</div>' +
    '<div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">' +
    '<p>Hi ' + firstName + ',</p>' +
    '<p>Based on your answers, <strong>' + churchName + '</strong> doesn\'t currently qualify for the Google Ad Grant.</p>' +
    '<p>This doesn\'t mean it\'s permanent. If your church\'s circumstances change, you\'re welcome to re-check eligibility at any time.</p>' +
    buildDemoCallSection(appUrl) +
    '<p style="font-size:13px;color:#6b7280">Even without the Ad Grant, KeepFlock\'s AI calling and SMS tools can help you stay connected with your congregation — birthday calls, visitor follow-ups, and automated outreach.</p>' +
    '<p>Questions? Reach out at <a href="mailto:support@keepflock.com" style="color:#6366f1">support@keepflock.com</a>.</p>' +
    '<a href="' + appUrl + '/reach/eligibility" style="display:inline-block;background:#6366f1;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;margin-top:16px;font-weight:600">Re-check Eligibility</a>' +
    '</div>' +
    '</div>'
}
