import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getPlanFeatures } from '../_shared/planFeatures.ts'

// --- INLINED SHARED UTILITIES ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function createEmbedding(text: string): Promise<number[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embeddings API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function recordMinuteUsage(supabase: any, orgId: string, minutes: number): Promise<void> {
  const today = new Date()
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of month
  const billingPeriodStart = periodStart.toISOString().split('T')[0] // date format: YYYY-MM-DD
  const billingPeriodEnd = periodEnd.toISOString().split('T')[0]

  // 1. Get current organization details for minutes_included
  const { data: org } = await supabase
    .from('organizations')
    .select('minutes_included, minutes_used')
    .eq('id', orgId)
    .single()

  // 2. Update organizations table (Source of Truth for billing enforcement)
  if (org) {
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ minutes_used: (org.minutes_used || 0) + minutes })
      .eq('id', orgId)
    if (updateError) console.error('Error updating org minutes_used:', updateError)
  }

  // 3. Update minute_usage history table (For Dashboard & Analytics)
  const { data: existing, error: fetchError } = await supabase
    .from('minute_usage')
    .select('id, minutes_used')
    .eq('organization_id', orgId)
    .gte('billing_period_start', billingPeriodStart)
    .order('billing_period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) console.error('Error fetching minute_usage:', fetchError)

  if (existing) {
    const { error: muError } = await supabase
      .from('minute_usage')
      .update({ minutes_used: (parseFloat(String(existing.minutes_used)) || 0) + minutes })
      .eq('id', existing.id)
    if (muError) console.error('Error updating minute_usage:', muError)
    else console.log(`Recorded ${minutes} min usage for org ${orgId}. Total: ${(parseFloat(String(existing.minutes_used)) || 0) + minutes}`)
  } else {
    console.warn(`No minute_usage record for current period, creating one for org ${orgId}`)
    const { error: insertError } = await supabase.from('minute_usage').insert({
      organization_id: orgId,
      minutes_used: minutes,
      minutes_included: org?.minutes_included || 75,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
    })
    if (insertError) console.error('Error inserting minute_usage:', insertError)
  }
}

// --- MEMORY CREATION FUNCTIONS (Epic 6) ---

interface MemoryCreationParams {
  personId: string;
  organizationId: string;
  sourceCallId: string;
  transcript: string;
  summary: string;
}

async function createMemberMemories(
  supabase: any,
  params: MemoryCreationParams
): Promise<void> {
  const { personId, organizationId, sourceCallId, transcript, summary } = params;

  try {
    // 1. Store call summary as memory
    if (summary && summary.length > 10) {
      const embedding = await createEmbedding(summary);

      const { error: summaryError } = await supabase.from("member_memories").insert({
        organization_id: organizationId,
        person_id: personId,
        content: summary,
        embedding,
        memory_type: "call_summary",
        source_call_id: sourceCallId,
      });

      if (summaryError) {
        console.error("Error storing call summary memory:", summaryError);
      } else {
        console.log("Stored call summary memory for person:", personId);
      }
    }

    // 2. Extract and store prayer requests
    const prayerRequests = extractPrayerRequests(transcript);
    for (const request of prayerRequests) {
      try {
        const embedding = await createEmbedding(request);

        await supabase.from("member_memories").insert({
          organization_id: organizationId,
          person_id: personId,
          content: request,
          embedding,
          memory_type: "prayer_request",
          source_call_id: sourceCallId,
        });
      } catch (err) {
        console.error("Error storing prayer request memory:", err);
      }
    }

    if (prayerRequests.length > 0) {
      console.log(`Stored ${prayerRequests.length} prayer request memories`);
    }

    // 3. Extract personal facts
    const personalFacts = extractPersonalFacts(transcript);
    for (const fact of personalFacts) {
      try {
        const embedding = await createEmbedding(fact);

        await supabase.from("member_memories").insert({
          organization_id: organizationId,
          person_id: personId,
          content: fact,
          embedding,
          memory_type: "personal_note",
          source_call_id: sourceCallId,
        });
      } catch (err) {
        console.error("Error storing personal note memory:", err);
      }
    }

    if (personalFacts.length > 0) {
      console.log(`Stored ${personalFacts.length} personal note memories`);
    }
  } catch (error) {
    console.error("Error in createMemberMemories:", error);
  }
}

function extractPrayerRequests(transcript: string): string[] {
  if (!transcript) return [];

  const requests: string[] = [];
  const lowerTranscript = transcript.toLowerCase();

  // Simple pattern matching for prayer-related phrases
  const prayerPatterns = [
    /pray(?:ing)? for (?:my |our |the )?([^.!?]{10,100})/gi,
    /need(?:s)? prayer (?:for |about )?([^.!?]{10,100})/gi,
    /please pray (?:for |about )?([^.!?]{10,100})/gi,
    /prayer request[:\s]+([^.!?]{10,100})/gi,
  ];

  for (const pattern of prayerPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      const request = `Prayer request: ${match[1].trim()}`;
      if (!requests.includes(request)) {
        requests.push(request);
      }
    }
  }

  return requests.slice(0, 5); // Limit to 5 prayer requests per call
}

function extractPersonalFacts(transcript: string): string[] {
  if (!transcript) return [];

  const facts: string[] = [];

  // Pattern matching for life events and personal information
  const factPatterns = [
    /(?:my|our) (\w+ is (?:getting|going to|starting|graduating|retiring)[^.!?]{5,80})/gi,
    /(?:we|I) (?:just|recently) (\w+[^.!?]{10,80})/gi,
    /(?:my|our) (\w+ (?:had|has|is having) [^.!?]{10,80})/gi,
    /(?:we're|I'm|we are|I am) (?:expecting|having|planning) ([^.!?]{10,80})/gi,
  ];

  for (const pattern of factPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      const fact = match[1].trim();
      if (fact.length > 10 && !facts.includes(fact)) {
        facts.push(fact);
      }
    }
  }

  return facts.slice(0, 3); // Limit to 3 personal facts per call
}

async function checkUsageWarning(supabase: any, orgId: string): Promise<void> {
  const { data: usage } = await supabase
    .from('minute_usage')
    .select('id, minutes_used, minutes_included, warning_sent_at')
    .eq('organization_id', orgId)
    .order('billing_period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!usage) return

  const minutesUsed = parseFloat(String(usage.minutes_used)) || 0
  const minutesIncluded = usage.minutes_included || 75
  const usagePercent = (minutesUsed / minutesIncluded) * 100

  if (usagePercent >= 80 && !usage.warning_sent_at) {
    await supabase
      .from('minute_usage')
      .update({ warning_sent_at: new Date().toISOString() })
      .eq('id', usage.id)

    // Send warning notification to admins via email
    const { data: admins } = await supabase
      .from('organization_members')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('organization_id', orgId)
      .in('role', ['admin', 'pastor'])

    if (admins?.length) {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        for (const admin of admins) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'KeepFlock <notifications@churchcomm.app>',
                to: admin.profiles.email,
                subject: `Usage Alert: ${usagePercent.toFixed(0)}% of calling minutes used`,
                html: `
                  <h2>Calling Minutes Usage Warning</h2>
                  <p>Hi ${admin.profiles.full_name || 'Admin'},</p>
                  <p>Your organization has used <strong>${usagePercent.toFixed(0)}%</strong> of its included calling minutes this billing period.</p>
                  <p><strong>${minutesUsed}</strong> of <strong>${minutesIncluded}</strong> minutes used.</p>
                  <p>When you reach 100%, new calls will be blocked unless you approve overage charges in Settings.</p>
                `,
              }),
            })
          } catch (emailErr) {
            console.error('Failed to send usage warning email:', emailErr)
          }
        }
      }
    }
    console.log(`Usage warning sent for org ${orgId}: ${usagePercent.toFixed(0)}%`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validate VAPI webhook secret if configured (sent via x-vapi-secret header)
  const vapiWebhookSecret = Deno.env.get('VAPI_WEBHOOK_SECRET')
  if (vapiWebhookSecret) {
    const incomingSecret = req.headers.get('x-vapi-secret') || ''
    if (incomingSecret !== vapiWebhookSecret) {
      console.warn('Warning: x-vapi-secret header mismatch — allowing request but logging for review')
    }
  } else {
    console.warn('VAPI_WEBHOOK_SECRET not configured — accepting webhook without secret validation')
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
    const endedReason = message.endedReason || call.endedReason || ''

    // Duration: VAPI sends durationSeconds at message level for end-of-call-report
    // Priority: message.durationSeconds > message.durationMs > fallbacks
    let duration = 0
    if (typeof message.durationSeconds === 'number') {
      duration = Math.round(message.durationSeconds)
    } else if (typeof message.durationMs === 'number') {
      duration = Math.round(message.durationMs / 1000)
    } else if (typeof call.durationSeconds === 'number') {
      duration = Math.round(call.durationSeconds)
    } else if (typeof message.durationMinutes === 'number') {
      duration = Math.round(message.durationMinutes * 60)
    } else if (typeof call.duration === 'number') {
      duration = call.duration > 1000 ? Math.round(call.duration / 1000) : call.duration
    } else if (typeof message.duration === 'number') {
      duration = message.duration > 1000 ? Math.round(message.duration / 1000) : message.duration
    }

    console.log('Duration extraction:', {
      messageDurationSeconds: message.durationSeconds,
      messageDurationMs: message.durationMs,
      callDuration: call.duration,
      finalDuration: duration
    })

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Helper function to map VAPI status to user-friendly status
    // For end-of-call-report events, the call has definitely ended
    const mapCallStatus = (reason: string): string => {
      const r = reason?.toLowerCase() || ''

      console.log('Status mapping - endedReason:', r)

      // Check for failure/unanswered scenarios
      if (r.includes('no-answer') || r.includes('unanswered') || r === 'customer-did-not-pick-up') return 'no_answer'
      if (r.includes('busy') || r === 'customer-busy') return 'busy'
      if (r.includes('fail') || r.includes('error') || r.includes('pipeline-error')) return 'failed'
      if (r.includes('voicemail')) return 'voicemail'
      if (r.includes('rejected') || r.includes('declined')) return 'failed'

      // All other scenarios = completed call
      // This includes: assistant-ended-call, customer-ended-call, assistant-said-end-call-phrase,
      // silence-timed-out (after conversation), max-duration-reached, etc.
      return 'completed'
    }

    const mappedCallStatus = mapCallStatus(endedReason)

    // Determine escalation status based on analysis
    const escalationStatus = (crisis_detected || needs_pastoral_care) ? 'open' : 'resolved'

    // 1. Store or update call log
    let callLog = null

    // First, always try to find existing call log by vapi_call_id (regardless of metadata)
    const { data: existingLog } = await supabaseAdmin
      .from('vapi_call_logs')
      .select('id, organization_id, member_id')
      .eq('vapi_call_id', call_id)
      .maybeSingle()

    if (existingLog) {
      // Update existing record with full data from webhook
      const { data, error: updateError } = await supabaseAdmin
        .from('vapi_call_logs')
        .update({
          call_status: mappedCallStatus,
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
          ended_reason: endedReason,
          escalation_status: escalationStatus,
          raw_vapi_data: rawPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLog.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating call log:', updateError)
      } else {
        callLog = data
        console.log('Updated existing call log:', existingLog.id, 'status:', mappedCallStatus, 'duration:', duration)
      }

      // Use org/person from existing record if not in metadata
      if (!organization_id && existingLog.organization_id) {
        console.log('Using organization_id from existing log:', existingLog.organization_id)
      }
    } else if (organization_id && person_id) {
      // Only insert new record if we have metadata (call wasn't created by send-group-call)
      const { data, error: insertError } = await supabaseAdmin
        .from('vapi_call_logs')
        .insert({
          organization_id: organization_id,
          member_id: person_id,
          vapi_call_id: call_id,
          phone_number_used: phoneNumber,
          call_status: mappedCallStatus,
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
          ended_reason: endedReason,
          escalation_status: escalationStatus,
          raw_vapi_data: rawPayload,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting call log:', insertError)
      } else {
        callLog = data
        console.log('Inserted new call log:', data.id)
      }
    } else {
      console.log('No existing call log found and missing metadata, cannot create new record')
    }

    // Use organization from existing log if metadata was missing
    const effectiveOrgId = organization_id || existingLog?.organization_id
    const effectivePersonId = person_id || existingLog?.member_id

    // 2. Update corresponding call_attempt with final status
    let attemptOrgId = organization_id
    try {
      // Use the same mapped status for call_attempts
      const finalStatus = mappedCallStatus
      const updateValues: any = {
        status: finalStatus,
        duration: duration,
        completed_at: new Date().toISOString()
      }

      if (formattedTranscript) {
        updateValues.response_notes = formattedTranscript.substring(0, 5000)
      }
      if (response_type && response_type !== 'neutral') {
        updateValues.response_category = response_type
      }
      if (recordingUrl) {
        updateValues.recording_url = recordingUrl
      }

      const { data: updatedAttempt, error: attemptError } = await supabaseAdmin
        .from('call_attempts')
        .update(updateValues)
        .eq('call_sid', call_id)
        .select('id, organization_id, person_id, status, duration')
        .maybeSingle()

      if (attemptError) {
        console.error('Error updating call_attempt:', attemptError)
      } else {
        console.log('Updated call_attempt for call_sid:', call_id)
        if (updatedAttempt?.organization_id) {
          attemptOrgId = updatedAttempt.organization_id
        }
      }

      // 2b. Record minute usage for completed calls
      // Use effectiveOrgId (metadata + existing log fallback) rather than attemptOrgId
      const minuteOrgId = attemptOrgId || effectiveOrgId
      if (duration > 0 && minuteOrgId && finalStatus === 'completed') {
        const durationMinutes = Math.ceil(duration / 60)
        await recordMinuteUsage(supabaseAdmin, minuteOrgId, durationMinutes)
        await checkUsageWarning(supabaseAdmin, minuteOrgId)
      }

      // 2c. Trigger real-time call summary notification
      if (attemptOrgId && updatedAttempt) {
        try {
          const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
          await fetch(`${SUPABASE_URL}/functions/v1/send-call-summary`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mode: 'realtime',
              organization_id: attemptOrgId,
              call_attempt: {
                ...updatedAttempt,
                summary: summary,
                duration_seconds: duration,
              },
            }),
          })
        } catch (notifErr) {
          console.error('Failed to send real-time notification:', notifErr)
        }
      }
    } catch (e) {
      console.error('Failed updating call_attempts from webhook:', e)
    }

    // 3. Create escalation alert if crisis detected or pastoral care needed
    if ((crisis_detected || needs_pastoral_care) && effectiveOrgId && effectivePersonId && callLog) {
      const { error: escalationError } = await supabaseAdmin
        .from('escalation_alerts')
        .insert({
          organization_id: effectiveOrgId,
          member_id: effectivePersonId,
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

    // 4. Create member memories from call transcript (Pro+ only)
    if (effectiveOrgId && effectivePersonId && (formattedTranscript || summary)) {
      const { data: memOrgRow } = await supabaseAdmin
        .from('organizations')
        .select('subscription_plan')
        .eq('id', effectiveOrgId)
        .single();
      const memFeatures = getPlanFeatures(memOrgRow?.subscription_plan);
      if (memFeatures.hasAIMemory) {
        try {
          await createMemberMemories(supabaseAdmin, {
            personId: effectivePersonId,
            organizationId: effectiveOrgId,
            sourceCallId: callLog?.id || call_id,
            transcript: formattedTranscript || '',
            summary: summary || '',
          });
          console.log('Member memories created for call:', call_id);
        } catch (memoryError) {
          console.error('Error creating member memories:', memoryError);
        }
      } else {
        console.log(`Skipping memory storage for org ${effectiveOrgId}: plan '${memOrgRow?.subscription_plan}' does not include AI Memory`);
      }
    }

    console.log('Webhook processing completed successfully for call:', call_id)

    return new Response(JSON.stringify({
      success: true,
      call_id,
      status: mappedCallStatus,
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
