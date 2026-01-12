import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const schema = z.object({
  call_id: z.string(),
  status: z.string(),
  transcript: z.string(),
  analysis: z.object({
    summary: z.string(),
    crisis_detected: z.boolean().optional(),
    crisis_reason: z.string().optional(),
    needs_follow_up: z.boolean().optional(),
    needs_pastoral_care: z.boolean().optional(),
    priority: z.string().optional(),
    prayer_requests: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    response_type: z.string().optional(),
  }),
  metadata: z.object({
    organization_id: z.string(),
    person_id: z.string(),
  }),
  duration: z.number(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const body = await req.text()
  const signature = req.headers.get("x-vapi-signature")
  const webhookSecret = Deno.env.get("VAPI_WEBHOOK_SECRET")!
  const hmac = createHmac("sha256", webhookSecret)
  hmac.update(body)
  const hash = hmac.digest("hex")

  if (hash !== signature) {
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    const payload = schema.parse(JSON.parse(body))
    const {
      call_id,
      status,
      transcript,
      analysis,
      metadata,
      duration
    } = payload

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Store call log
    const { data: callLog, error: callError } = await supabaseAdmin
      .from('vapi_call_logs')
      .insert({
        organization_id: metadata.organization_id,
        member_id: metadata.person_id,
        vapi_call_id: call_id,
        call_status: status,
        call_duration: duration,
        full_transcript: transcript,
        call_summary: analysis.summary,
        crisis_indicators: analysis.crisis_detected || false,
        crisis_details: analysis.crisis_reason,
        follow_up_needed: analysis.needs_follow_up || false,
        needs_pastoral_care: analysis.needs_pastoral_care || false,
        escalation_priority: analysis.priority || 'medium',
        prayer_requests: analysis.prayer_requests || [],
        specific_interests: analysis.interests || [],
        member_response_type: analysis.response_type || 'neutral',
        raw_vapi_data: { analysis, metadata }
      })
      .select()
      .single()

    if (callError) throw callError

    // 2. Create escalation alert if needed
    if (analysis.crisis_detected || analysis.needs_pastoral_care) {
      await supabaseAdmin.from('escalation_alerts').insert({
        organization_id: metadata.organization_id,
        member_id: metadata.person_id,
        vapi_call_log_id: callLog.id,
        priority: analysis.priority || 'medium',
        alert_type: analysis.crisis_detected ? 'crisis_detected' : 'pastoral_care_needed',
        alert_message: analysis.crisis_details || 'Member needs pastoral follow-up',
        status: 'open'
      })

      // TODO V1: Create send-escalation-notification function
      // Commented out for V1 - can implement later
      // await supabaseAdmin.functions.invoke('send-escalation-notification', {
      //   body: {
      //     organization_id: metadata.organization_id,
      //     person_id: metadata.person_id,
      //     escalation_type: analysis.crisis_detected ? 'crisis' : 'pastoral_care',
      //     priority: analysis.priority
      //   }
      // })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
