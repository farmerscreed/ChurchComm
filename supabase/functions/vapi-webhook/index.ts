import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify Bearer token authentication
  const authHeader = req.headers.get("authorization")
  const webhookSecret = Deno.env.get("VAPI_WEBHOOK_SECRET")

  if (webhookSecret) {
    const expectedToken = `Bearer ${webhookSecret}`
    if (authHeader !== expectedToken) {
      console.error('Webhook auth failed. Received:', authHeader?.substring(0, 20) + '...')
      return new Response("Unauthorized", { status: 401 })
    }
  }

  const body = await req.text()
  console.log('Received webhook payload:', body.substring(0, 500))

  try {
    const rawPayload = JSON.parse(body)

    // VAPI sends different event types - handle them appropriately
    const messageType = rawPayload.message?.type || rawPayload.type
    console.log('Webhook message type:', messageType)

    // Handle different VAPI webhook events
    if (messageType === 'status-update' || messageType === 'end-of-call-report') {
      // Process the call data
    } else if (messageType === 'hang' || messageType === 'function-call') {
      // These are real-time events during the call, just acknowledge
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Extract call data - VAPI payload structure varies by event type
    const callData = rawPayload.message || rawPayload
    const call_id = callData.call?.id || callData.callId || rawPayload.id
    const status = callData.call?.status || callData.status || 'unknown'
    const transcript = callData.transcript || callData.call?.transcript || ''
    const duration = callData.call?.duration || callData.duration || 0

    // Extract analysis if present (from end-of-call-report)
    const analysis = callData.analysis || callData.call?.analysis || {
      summary: callData.summary || '',
      crisis_detected: false,
      needs_follow_up: false,
      needs_pastoral_care: false,
      priority: 'medium',
      prayer_requests: [],
      interests: [],
      response_type: 'neutral'
    }

    // Extract metadata - may be in assistantOverrides or call metadata
    const metadata = callData.call?.assistantOverrides?.metadata ||
                     callData.assistantOverrides?.metadata ||
                     callData.metadata ||
                     { organization_id: null, person_id: null }

    console.log('Extracted call data:', { call_id, status, duration, metadata })

    // Skip if we don't have minimum required data
    if (!call_id) {
      console.log('No call_id found, skipping processing')
      return new Response(JSON.stringify({ success: true, message: 'No call_id, skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Store call log (only if we have organization_id and member_id)
    let callLog = null
    if (metadata.organization_id && metadata.person_id) {
      const { data, error: callError } = await supabaseAdmin
        .from('vapi_call_logs')
        .insert({
          organization_id: metadata.organization_id,
          member_id: metadata.person_id,
          vapi_call_id: call_id,
          call_status: status,
          call_duration: duration,
          full_transcript: transcript,
          call_summary: analysis.summary || '',
          crisis_indicators: analysis.crisis_detected || false,
          crisis_details: analysis.crisis_reason || null,
          follow_up_needed: analysis.needs_follow_up || false,
          needs_pastoral_care: analysis.needs_pastoral_care || false,
          escalation_priority: analysis.priority || 'medium',
          prayer_requests: analysis.prayer_requests || [],
          specific_interests: analysis.interests || [],
          member_response_type: analysis.response_type || 'neutral',
          raw_vapi_data: rawPayload
        })
        .select()
        .single()

      if (callError) {
        console.error('Error storing call log:', callError)
      } else {
        callLog = data
      }
    } else {
      console.log('Missing metadata, skipping vapi_call_logs insert')
    }

    // 2. Update corresponding call_attempt (if present) with final status and details
    try {
      const mappedStatus = (s: string) => {
        const st = s?.toLowerCase()
        if (!st) return null
        if (st.includes('comp') || st === 'completed') return 'completed'
        if (st.includes('fail') || st === 'failed' || st.includes('error')) return 'failed'
        if (st.includes('no') && st.includes('answer')) return 'no_answer'
        if (st.includes('busy')) return 'busy'
        return null
      }

      const updateValues: any = {}
      const mapped = mappedStatus(status)
      if (mapped) updateValues.status = mapped
      if (typeof duration === 'number') {
        updateValues.duration = duration
      }
      if (transcript) {
        updateValues.response_notes = transcript
      }
      if (analysis && analysis.response_type) {
        updateValues.response_category = analysis.response_type
      }
      if (status === 'completed') {
        updateValues.completed_at = new Date().toISOString()
      }

      // If webhook provides recording_url or recordingLocation, set recording_url
      // (Vapi naming may vary — attempt to read common keys)
      const recordingUrl = rawPayload?.recording_url || rawPayload?.recordingLocation || rawPayload?.recordingUrl ||
                          callData?.call?.recordingUrl || callData?.recordingUrl
      if (recordingUrl) updateValues.recording_url = recordingUrl

      if (Object.keys(updateValues).length > 0) {
        await supabaseAdmin
          .from('call_attempts')
          .update(updateValues)
          .eq('call_sid', call_id)
      }
    } catch (e) {
      console.error('Failed updating call_attempts from webhook', e)
    }

    // 3. Create escalation alert if needed
    if ((analysis.crisis_detected || analysis.needs_pastoral_care) && metadata.organization_id && metadata.person_id) {
      await supabaseAdmin.from('escalation_alerts').insert({
        organization_id: metadata.organization_id,
        member_id: metadata.person_id,
        vapi_call_log_id: callLog?.id || null,
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
