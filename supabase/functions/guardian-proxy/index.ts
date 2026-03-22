import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * guardian-proxy — Authenticated proxy between KeepFlock frontend and GUARDIAN VPS.
 *
 * Supported actions:
 *   status      — GET compliance snapshot for the org's GUARDIAN customer
 *   sweep       — Trigger a manual compliance check
 *   register    — Register org with GUARDIAN (stores returned customer_id)
 *   deregister  — Remove org from GUARDIAN (clears guardian_customer_id)
 *
 * Env vars: GUARDIAN_API_URL, GUARDIAN_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

type Action = 'status' | 'sweep' | 'register' | 'deregister'

const VALID_ACTIONS: Action[] = ['status', 'sweep', 'register', 'deregister']

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Environment ---
    const GUARDIAN_API_URL = Deno.env.get('GUARDIAN_API_URL')
    const GUARDIAN_API_KEY = Deno.env.get('GUARDIAN_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!GUARDIAN_API_URL || !GUARDIAN_API_KEY) {
      console.error('GUARDIAN configuration incomplete')
      return new Response(JSON.stringify({ error: 'GUARDIAN service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // --- 1. Authenticate caller via Supabase JWT ---
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

    // --- 2. Parse request body ---
    const body = await req.json()
    const { action, ...data } = body as { action: Action } & Record<string, unknown>

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // --- 3. Get user's organization ---
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: 'User is not a member of any organization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const orgId = membership.organization_id

    // --- 4. Check org has ATTRACT module ---
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, active_modules')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const activeModules: string[] = org.active_modules || []
    if (!activeModules.includes('attract')) {
      return new Response(JSON.stringify({
        error: 'ATTRACT module is not active for this organization. Please upgrade your plan.',
        code: 'MODULE_NOT_ACTIVE',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // --- 5. Get grant_accounts record ---
    const { data: grantAccount, error: grantError } = await supabaseAdmin
      .from('grant_accounts')
      .select('id, guardian_customer_id, google_ads_account_id')
      .eq('org_id', orgId)
      .maybeSingle()

    // Common headers for GUARDIAN API requests
    const guardianHeaders: Record<string, string> = {
      'x-api-key': GUARDIAN_API_KEY,
      'Content-Type': 'application/json',
    }

    // --- 6. Route by action ---

    if (action === 'register') {
      // Register org with GUARDIAN
      const googleAdsAccountId = data.google_ads_account_id as string | undefined
      if (!googleAdsAccountId) {
        return new Response(JSON.stringify({ error: 'google_ads_account_id is required for registration' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      if (grantAccount?.guardian_customer_id) {
        return new Response(JSON.stringify({
          error: 'Organization is already registered with GUARDIAN',
          guardian_customer_id: grantAccount.guardian_customer_id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        })
      }

      const webhookUrl = `${SUPABASE_URL}/functions/v1/guardian-webhook`
      const registerPayload = {
        keepflock_org_id: orgId,
        keepflock_org_name: org.name,
        google_ads_account_id: googleAdsAccountId,
        webhook_url: webhookUrl,
        plan_tier: 'attract',
      }

      console.log('Registering org with GUARDIAN:', orgId)

      const guardianRes = await fetch(`${GUARDIAN_API_URL}/api/v1/kf/customers`, {
        method: 'POST',
        headers: guardianHeaders,
        body: JSON.stringify(registerPayload),
      })

      if (!guardianRes.ok) {
        const errBody = await guardianRes.text()
        console.error('GUARDIAN register failed:', guardianRes.status, errBody)
        return new Response(JSON.stringify({
          error: 'Failed to register with GUARDIAN',
          details: errBody,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: guardianRes.status >= 400 && guardianRes.status < 500 ? guardianRes.status : 502,
        })
      }

      const guardianResult = await guardianRes.json()
      const guardianCustomerId = guardianResult.customer_id || guardianResult.id
      const webhookSecret = guardianResult.webhook_secret || null

      // Upsert grant_accounts with guardian_customer_id
      if (grantAccount) {
        await supabaseAdmin
          .from('grant_accounts')
          .update({
            guardian_customer_id: guardianCustomerId,
            google_ads_account_id: googleAdsAccountId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', grantAccount.id)
      } else {
        await supabaseAdmin
          .from('grant_accounts')
          .insert({
            org_id: orgId,
            guardian_customer_id: guardianCustomerId,
            google_ads_account_id: googleAdsAccountId,
          })
      }

      console.log('Registered org', orgId, 'as GUARDIAN customer:', guardianCustomerId)

      return new Response(JSON.stringify({
        success: true,
        guardian_customer_id: guardianCustomerId,
        message: 'Organization registered with GUARDIAN',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // For status, sweep, and deregister — guardian_customer_id is required
    if (!grantAccount?.guardian_customer_id) {
      return new Response(JSON.stringify({
        error: 'Organization is not registered with GUARDIAN. Please register first.',
        code: 'NOT_REGISTERED',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const guardianCustomerId = grantAccount.guardian_customer_id

    if (action === 'status') {
      console.log('Fetching GUARDIAN status for customer:', guardianCustomerId)

      const guardianRes = await fetch(
        `${GUARDIAN_API_URL}/api/v1/kf/customers/${guardianCustomerId}/status`,
        { method: 'GET', headers: guardianHeaders }
      )

      if (!guardianRes.ok) {
        const errBody = await guardianRes.text()
        console.error('GUARDIAN status failed:', guardianRes.status, errBody)
        return new Response(JSON.stringify({
          error: 'Failed to fetch compliance status',
          details: errBody,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: guardianRes.status >= 400 && guardianRes.status < 500 ? guardianRes.status : 502,
        })
      }

      const statusData = await guardianRes.json()
      return new Response(JSON.stringify(statusData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'sweep') {
      console.log('Triggering GUARDIAN sweep for customer:', guardianCustomerId)

      const guardianRes = await fetch(
        `${GUARDIAN_API_URL}/api/v1/kf/customers/${guardianCustomerId}/sweep`,
        { method: 'POST', headers: guardianHeaders }
      )

      if (!guardianRes.ok) {
        const errBody = await guardianRes.text()
        console.error('GUARDIAN sweep failed:', guardianRes.status, errBody)
        return new Response(JSON.stringify({
          error: 'Failed to trigger compliance sweep',
          details: errBody,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: guardianRes.status >= 400 && guardianRes.status < 500 ? guardianRes.status : 502,
        })
      }

      const sweepData = await guardianRes.json()
      return new Response(JSON.stringify(sweepData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'deregister') {
      console.log('Deregistering GUARDIAN customer:', guardianCustomerId)

      const guardianRes = await fetch(
        `${GUARDIAN_API_URL}/api/v1/kf/customers/${guardianCustomerId}`,
        { method: 'DELETE', headers: guardianHeaders }
      )

      if (!guardianRes.ok) {
        const errBody = await guardianRes.text()
        console.error('GUARDIAN deregister failed:', guardianRes.status, errBody)
        return new Response(JSON.stringify({
          error: 'Failed to deregister from GUARDIAN',
          details: errBody,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: guardianRes.status >= 400 && guardianRes.status < 500 ? guardianRes.status : 502,
        })
      }

      // Clear guardian_customer_id from grant_accounts
      await supabaseAdmin
        .from('grant_accounts')
        .update({
          guardian_customer_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', grantAccount.id)

      console.log('Deregistered org', orgId, 'from GUARDIAN')

      return new Response(JSON.stringify({
        success: true,
        message: 'Organization deregistered from GUARDIAN',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Should not reach here due to validation above
    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    console.error('guardian-proxy error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
