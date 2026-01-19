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
  console.log('Received webhook payload:', body.substring(0, 1000))

  try {
    const rawPayload = JSON.parse(body)

    // VAPI sends data in message wrapper
    const message = rawPayload.message || rawPayload
    const messageType = message.type || rawPayload.type
    console.log('Webhook message type:', messageType)

    // Only process end-of-call-report events (contains transcript and analysis)
    if (messageType !== 'end-of-call-report') {
      console.log('Skipping non-end-of-call-report event:', messageType)
      return new Response(JSON.stringify({ success: true, message: `Skipped ${messageType}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Extract call object - VAPI structure: message.call
    const call = message.call || {}
    const call_id = call.id || message.callId || rawPayload.id
    const status = call.status || message.status || 'ended'
    const endedReason = message.endedReason || call.endedReason || 'unknown'

    // Duration is in seconds
    const duration = call.duration || message.duration || 0

    // Extract artifact (contains transcript and messages)
    const artifact = message.artifact || {}
    const transcript = artifact.transcript || message.transcript || ''
    const messages = artifact.messages || []

    // Format messages into readable transcript if raw transcript is empty
    let formattedTranscript = transcript
    if (!formattedTranscript && messages.length > 0) {
      formattedTranscript = messages.map((m: any) =>
        `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.message || m.content || ''}`
      ).join('\n')
    }

    // Extract analysis (contains summary and structuredData)
    const analysis = message.analysis || call.analysis || {}
    const summary = analysis.summary || ''
    const structuredData = analysis.structuredData || {}
    const successEvaluation = analysis.successEvaluation || ''

    // Extract our custom structured data fields
    const crisis_detected = structuredData.crisis_detected || false
    const crisis_reason = structuredData.crisis_reason || null
    const needs_follow_up = structuredData.needs_follow_up || false
    const needs_pastoral_care = structuredData.needs_pastoral_care || false
    const response_type = structuredData.response_type || 'neutral'
    const prayer_requests = structuredData.prayer_requests || []
    const interests = structuredData.interests || []
    const priority = structuredData.priority || 'medium'

    // Extract metadata from assistantOverrides
    const assistantOverrides = call.assistantOverrides || message.assistantOverrides || {}
    const metadata = assistantOverrides.metadata || {}
    const organization_id = metadata.organization_id || null
    const person_id = metadata.person_id || null

    // Extract recording URL
    const recording = artifact.recording || {}
    const recordingUrl = recording.url || recording.stereoUrl || call.recordingUrl || null

    // Extract phone number
    const customer = call.customer || message.customer || {}
    const phoneNumber = customer.number || call.phoneNumber || null

    console.log('Extracted call data:', {
      call_id,
      status,
      endedReason,
      duration,
      hasTranscript: !!formattedTranscript,
      hasSummary: !!summary,
      hasStructuredData: Object.keys(structuredData).length > 0,
      organization_id,
      person_id
    })

    // Skip if we don't have call_id
    if (!call_id) {
      console.log('No call_id found, skipping processing')
      return new Response(JSON.stringify({ success: true, message: 'No call_id, skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )

    // 1. Store or update call log
    let callLog = null

    if (organization_id && person_id) {
      // Check if this call already exists (from initial creation in send-group-call)
      const { data: existingLog } = await supabaseAdmin
        .from('vapi_call_logs')
        .select('id')
        .eq('vapi_call_id', call_id)
        .single()

      if (existingLog) {
        // Update existing record with full data
        const { data, error: updateError } = await supabaseAdmin
          .from('vapi_call_logs')
          .update({
            call_status: status,
            call_duration: duration,
            full_transcript: formattedTranscript,
            call_summary: summary,
            crisis_indicators: crisis_detected,
            crisis_details: crisis_reason,
            follow_up_needed: needs_follow_up,
            needs_pastoral_care: needs_pastoral_care,
            escalation_priority: priority,
            prayer_requests: prayer_requests,
            specific_interests: interests,
            member_response_type: response_type,
            raw_vapi_data: rawPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLog.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating call log:', updateError)
        } else {
          callLog = data
          console.log('Updated existing call log:', existingLog.id)
        }
      } else {
        // Insert new record
        const { data, error: insertError } = await supabaseAdmin
          .from('vapi_call_logs')
          .insert({
            organization_id: organization_id,
            member_id: person_id,
            vapi_call_id: call_id,
            phone_number_used: phoneNumber,
            call_status: status,
            call_duration: duration,
            full_transcript: formattedTranscript,
            call_summary: summary,
            crisis_indicators: crisis_detected,
            crisis_details: crisis_reason,
            follow_up_needed: needs_follow_up,
            needs_pastoral_care: needs_pastoral_care,
            escalation_priority: priority,
            prayer_requests: prayer_requests,
            specific_interests: interests,
            member_response_type: response_type,
            raw_vapi_data: rawPayload
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting call log:', insertError)
        } else {
          callLog = data
          console.log('Inserted new call log:', data.id)
        }
      }
    } else {
      console.log('Missing organization_id or person_id, skipping vapi_call_logs')
    }

    // 2. Update corresponding call_attempt with final status
    try {
      const mappedStatus = (s: string, reason: string) => {
        const st = s?.toLowerCase()
        const r = reason?.toLowerCase()
        if (st === 'ended' && (r === 'assistant-ended-call' || r === 'customer-ended-call')) return 'completed'
        if (st === 'ended' || st === 'completed') return 'completed'
        if (r?.includes('no-answer') || r?.includes('unanswered')) return 'no_answer'
        if (r?.includes('busy')) return 'busy'
        if (r?.includes('fail') || r?.includes('error')) return 'failed'
        return 'completed'
      }

      const updateValues: any = {
        status: mappedStatus(status, endedReason),
        duration: duration,
        completed_at: new Date().toISOString()
      }

      if (formattedTranscript) {
        updateValues.response_notes = formattedTranscript.substring(0, 5000) // Limit size
      }
      if (response_type && response_type !== 'neutral') {
        updateValues.response_category = response_type
      }
      if (recordingUrl) {
        updateValues.recording_url = recordingUrl
      }

      const { error: attemptError } = await supabaseAdmin
        .from('call_attempts')
        .update(updateValues)
        .eq('call_sid', call_id)

      if (attemptError) {
        console.error('Error updating call_attempt:', attemptError)
      } else {
        console.log('Updated call_attempt for call_sid:', call_id)
      }
    } catch (e) {
      console.error('Failed updating call_attempts from webhook:', e)
    }

    // 3. Create escalation alert if crisis detected or pastoral care needed
    if ((crisis_detected || needs_pastoral_care) && organization_id && person_id && callLog) {
      const { error: escalationError } = await supabaseAdmin
        .from('escalation_alerts')
        .insert({
          organization_id: organization_id,
          member_id: person_id,
          vapi_call_log_id: callLog.id,
          status: 'open',
          priority: priority,
          alert_type: crisis_detected ? 'crisis_detected' : 'pastoral_care_needed',
          alert_message: crisis_reason || (crisis_detected
            ? 'Crisis indicators detected during call - immediate attention required'
            : 'Member expressed need for pastoral care or follow-up')
        })

      if (escalationError) {
        console.error('Error creating escalation alert:', escalationError)
      } else {
        console.log('Created escalation alert for call:', call_id)
      }
    }

    // 4. Create a follow-up record if needed
    if ((needs_follow_up || crisis_detected || needs_pastoral_care) && organization_id && person_id && callLog) {
      const { error: followupError } = await supabaseAdmin
        .from('follow_ups')
        .insert({
          organization_id: organization_id,
          person_id: person_id,
          call_log_id: callLog.id,
          status: 'new',
          priority: priority,
          notes: [{
            timestamp: new Date().toISOString(),
            type: 'system',
            content: `Follow-up created automatically from call. Reason: ${
              crisis_detected ? 'Crisis Detected' : (needs_pastoral_care ? 'Pastoral Care Needed' : 'Follow-up Requested')
            }.`
          }]
        })

      if (followupError) {
        console.error('Error creating follow-up record:', followupError)
      } else {
        console.log('Created follow-up record for call:', call_id)
      }
    }

    console.log('Webhook processing completed successfully for call:', call_id)

    return new Response(JSON.stringify({
      success: true,
      call_id,
      status,
      duration,
      has_summary: !!summary,
      has_transcript: !!formattedTranscript
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
