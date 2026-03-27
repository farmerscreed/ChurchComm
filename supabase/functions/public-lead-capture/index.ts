import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (resets on cold start, good enough for abuse prevention)
const ipSubmissions: Record<string, { count: number; resetAt: number }> = {};

function isRateLimited(ipHash: string): boolean {
  const now = Date.now();
  const entry = ipSubmissions[ipHash];
  if (!entry || entry.resetAt < now) {
    ipSubmissions[ipHash] = { count: 1, resetAt: now + 3600_000 }; // 1 hour window
    return false;
  }
  entry.count++;
  return entry.count > 5; // max 5 per IP per hour
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { email, first_name, church_name, phone, source, eligibility_result } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit by IP hash
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(clientIp));
    const ipHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (isRateLimited(ipHash)) {
      return new Response(JSON.stringify({ error: 'Too many submissions. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if lead already exists (by email)
    const { data: existing } = await supabase
      .from('kf_leads')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    let leadId: string;

    if (existing) {
      // Update existing lead with new data
      const { data: updated, error: updateError } = await supabase
        .from('kf_leads')
        .update({
          first_name: first_name || undefined,
          church_name: church_name || undefined,
          phone: phone || undefined,
          eligibility_result: eligibility_result || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) throw updateError;
      leadId = updated.id;
    } else {
      // Create new lead
      const { data: created, error: createError } = await supabase
        .from('kf_leads')
        .insert({
          email: email.toLowerCase().trim(),
          first_name: first_name || null,
          church_name: church_name || null,
          phone: phone || null,
          source: source || 'eligibility_checker',
          eligibility_result: eligibility_result || null,
          ip_hash: ipHash.substring(0, 16),
          status: 'new',
        })
        .select('id')
        .single();

      if (createError) throw createError;
      leadId = created.id;
    }

    // Fire-and-forget: relay to Guardian /leads endpoint for CLOSER nurture
    const guardianUrl = Deno.env.get('GUARDIAN_BASE_URL');
    const guardianKey = Deno.env.get('GUARDIAN_API_KEY');
    if (guardianUrl && guardianKey) {
      fetch(`${guardianUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': guardianKey },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          name: first_name || '',
          source: 'keepflock-eligibility',
          lead_magnet: 'eligibility_report',
          nonprofit: 'keepflock-leads',
        }),
      }).catch(() => {/* non-critical */});
    }

    // Send immediate confirmation email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const qualified = eligibility_result?.result === 'qualified';
      const nameGreeting = first_name ? `Hi ${first_name},` : 'Hi there,';
      const subject = qualified
        ? 'Great news — your church likely qualifies for $10,000/month in free Google Ads!'
        : 'Your Google Ad Grant Eligibility Results';

      const htmlBody = qualified
        ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #7C3AED;">${nameGreeting}</h2>
            <p>Based on your answers, <strong>your church appears eligible</strong> for Google's Ad Grant program — that's up to <strong>$10,000/month</strong> in free Google advertising.</p>
            <h3>What happens next?</h3>
            <ol>
              <li><strong>Create your free KeepFlock account</strong> — our tools walk you through every step of the application.</li>
              <li><strong>Run the Preflight Scanner</strong> — we check your website against Google's requirements.</li>
              <li><strong>Submit your application</strong> — our wizard guides you through each form.</li>
              <li><strong>GUARDIAN monitors your grant 24/7</strong> — once approved, we protect your $10K/month automatically.</li>
            </ol>
            <p style="text-align: center; margin: 30px 0;">
              <a href="https://keepflock.com/login" style="background-color: #7C3AED; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Start Free — Create Your Account
              </a>
            </p>
            <p style="font-size: 13px; color: #888;">You're receiving this because you used the eligibility checker at keepflock.com. Reply to this email if you have questions.</p>
          </div>`
        : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #7C3AED;">${nameGreeting}</h2>
            <p>Thanks for checking your eligibility for the Google Ad Grant. Based on your answers, your church may need a few things before qualifying.</p>
            <p>The most common requirements are:</p>
            <ul>
              <li>Active 501(c)(3) nonprofit status</li>
              <li>A functioning church website</li>
              <li>US-based organization</li>
            </ul>
            <p>Once you meet these requirements, come back and check again — the process is fast and completely free.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="https://keepflock.com/check" style="background-color: #7C3AED; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Re-Check Your Eligibility
              </a>
            </p>
            <p style="font-size: 13px; color: #888;">You're receiving this because you used the eligibility checker at keepflock.com.</p>
          </div>`;

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KeepFlock <hello@keepflock.com>',
          to: email.toLowerCase().trim(),
          subject,
          html: htmlBody,
        }),
      }).catch((err) => {
        console.error('Failed to send confirmation email:', err);
      });
    }

    return new Response(
      JSON.stringify({ status: 'captured', lead_id: leadId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('public-lead-capture error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
