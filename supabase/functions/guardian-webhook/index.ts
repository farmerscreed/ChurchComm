import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * guardian-webhook — Receives compliance alerts from GUARDIAN VPS.
 *
 * MUST be deployed with --no-verify-jwt (GUARDIAN is external, no Supabase JWT).
 *
 * Flow:
 *   1. Receive POST with HMAC-SHA256 signature in X-Guardian-Signature header
 *   2. Look up org by keepflock_org_id in payload
 *   3. Get per-org webhook_secret from grant_accounts (fallback to GUARDIAN_WEBHOOK_SECRET)
 *   4. Verify HMAC signature
 *   5. Insert event into grant_compliance_events table
 *   6. Return 200
 *
 * Env vars: GUARDIAN_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guardian-signature',
}

/**
 * Verify HMAC-SHA256 signature against the raw request body.
 * The signature header format is: sha256={hex_digest}
 */
async function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false

  const prefix = 'sha256='
  if (!signatureHeader.startsWith(prefix)) return false

  const receivedHex = signatureHeader.slice(prefix.length)

  // Encode the secret and body for HMAC
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const bodyData = encoder.encode(rawBody)

  // Import the key for HMAC-SHA256
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Compute HMAC
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, bodyData)

  // Convert to hex
  const computedHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison
  if (receivedHex.length !== computedHex.length) return false

  let mismatch = 0
  for (let i = 0; i < computedHex.length; i++) {
    mismatch |= computedHex.charCodeAt(i) ^ receivedHex.charCodeAt(i)
  }

  return mismatch === 0
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  const rawBody = await req.text()
  console.log('Received GUARDIAN webhook payload:', rawBody.substring(0, 500))

  try {
    const payload = JSON.parse(rawBody)

    // Validate required fields
    const { keepflock_org_id, event_type } = payload
    if (!keepflock_org_id) {
      console.error('Missing keepflock_org_id in webhook payload')
      return new Response(JSON.stringify({ error: 'Missing keepflock_org_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!event_type) {
      console.error('Missing event_type in webhook payload')
      return new Response(JSON.stringify({ error: 'Missing event_type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Look up the org's grant_accounts record to get per-org webhook_secret
    const { data: grantAccount, error: grantError } = await supabaseAdmin
      .from('grant_accounts')
      .select('id, org_id, guardian_customer_id')
      .eq('org_id', keepflock_org_id)
      .maybeSingle()

    if (grantError) {
      console.error('Error looking up grant_accounts:', grantError)
    }

    if (!grantAccount) {
      console.error('No grant_accounts record found for org:', keepflock_org_id)
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Use global GUARDIAN_WEBHOOK_SECRET
    const webhookSecret = Deno.env.get('GUARDIAN_WEBHOOK_SECRET') || ''

    // Verify HMAC signature
    const signatureHeader = req.headers.get('X-Guardian-Signature') || ''

    if (webhookSecret) {
      const valid = await verifySignature(rawBody, signatureHeader, webhookSecret)
      if (!valid) {
        console.error('Invalid GUARDIAN webhook signature for org:', keepflock_org_id)
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }
      console.log('Signature verified for org:', keepflock_org_id)
    } else {
      console.warn('No webhook secret configured — accepting without signature verification')
    }

    // Insert compliance event
    const { error: insertError } = await supabaseAdmin
      .from('grant_compliance_events')
      .insert({
        org_id: grantAccount.org_id,
        event_type: payload.event_type,
        severity: payload.severity || 'info',
        metric_name: payload.metric_name || null,
        metric_value: payload.metric_value ?? null,
        threshold: payload.threshold ?? null,
        action_taken: payload.action_taken || null,
        message: payload.message || null,
        raw_payload: payload.raw_data || payload,
      })

    if (insertError) {
      console.error('Error inserting compliance event:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to store compliance event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log('Stored compliance event:', event_type, 'for org:', keepflock_org_id)

    return new Response(JSON.stringify({ success: true, event_type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('guardian-webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
