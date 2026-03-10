import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { substituteVariables, calculateMembershipDuration } from '../_shared/substitute-variables.ts'
import { buildEnhancedPrompt } from '../_shared/context-injection.ts'
import { getPlanFeatures, planGateError } from '../_shared/planFeatures.ts'

// Helper to format address object into readable string
function formatAddress(address: { street?: string; city?: string; state?: string; zip?: string; country?: string } | null): string {
  if (!address) return ''
  const parts = [address.street, address.city, address.state, address.zip].filter(Boolean)
  return parts.join(', ')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use the Service Role Key for admin-level access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate the caller
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

    const body = await req.json()
    const {
      groupId,
      scriptId,
      organizationId,
      createdBy,
      // Individual call parameters
      recipientType,
      recipientId,
      script: rawScript,
      campaignName
    } = body

    console.log('Received request:', body)

    const isIndividualCall = recipientType === 'individual'

    // Validate based on call type
    if (isIndividualCall) {
      if (!recipientId || !organizationId) {
        console.error('Missing required fields for individual call')
        return new Response(JSON.stringify({ error: 'Missing required fields: recipientId and organizationId required for individual calls' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    } else {
      if (!groupId || !scriptId || !organizationId) {
        console.error('Missing required fields for group call')
        return new Response(JSON.stringify({ error: 'Missing required fields: groupId, scriptId, and organizationId required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // Verify user belongs to the organization
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: 'Forbidden: not a member of this organization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Check minute usage from organizations table (source of truth)
    const { data: orgBilling } = await supabaseAdmin
      .from('organizations')
      .select('minutes_used, minutes_included')
      .eq('id', organizationId)
      .single()

    if (orgBilling) {
      const minutesUsed = parseFloat(String(orgBilling.minutes_used)) || 0
      if (minutesUsed >= (orgBilling.minutes_included || 0)) {
        return new Response(JSON.stringify({
          error: 'Monthly minute limit reached. Upgrade plan or approve overage in Settings.',
          code: 'MINUTE_LIMIT_REACHED'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
    }

    // Get Vapi configuration from environment variables
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY')
    const DEFAULT_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID') // KeepFlock shared number

    if (!VAPI_API_KEY || !DEFAULT_PHONE_NUMBER_ID) {
      console.error('Vapi configuration incomplete')
      throw new Error('Vapi configuration incomplete')
    }

    // Check if organization has a dedicated phone number (premium feature)
    // If they do, caller ID will show their church name instead of "KeepFlock"
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name, vapi_phone_number_id, subscription_plan, subscription_tier, pastor_name, service_times, ministry_list, ai_context_notes, website, address, email, phone')
      .eq('id', organizationId)
      .single()

    // Plan gate: group calls (manual campaigns) require Growth+ plan
    const orgPlanFeatures = getPlanFeatures(orgData?.subscription_plan)
    if (!isIndividualCall && !orgPlanFeatures.hasGroupCalling) {
      return new Response(planGateError('Growth', 'group_calling'), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Use org's dedicated number if available, otherwise use shared KeepFlock number
    const VAPI_PHONE_NUMBER_ID = orgData?.vapi_phone_number_id || DEFAULT_PHONE_NUMBER_ID
    const orgName = orgData?.name || 'your church'
    const pastorName = orgData?.pastor_name || 'the Pastor'
    const serviceTimes = orgData?.service_times || ''
    const ministryList = orgData?.ministry_list || ''
    const aiContextNotes = orgData?.ai_context_notes || ''
    // General org info for AI knowledge
    const orgWebsite = orgData?.website || ''
    const orgAddress = orgData?.address ? formatAddress(orgData.address) : ''
    const orgEmail = orgData?.email || ''
    const orgPhone = orgData?.phone || ''
    const isPremium = orgData?.subscription_tier === 'premium' || orgData?.subscription_tier === 'enterprise'

    console.log('VAPI Config - API Key present:', !!VAPI_API_KEY)
    console.log('Using phone number ID:', VAPI_PHONE_NUMBER_ID, isPremium ? '(dedicated)' : '(shared KeepFlock)')

    // Voice ID mapping: convert friendly names to ElevenLabs IDs
    const VOICE_MAP: Record<string, string> = {
      'rachel': '21m00Tcm4TlvDq8ikWAM',
      'josh': 'TxGEqnHWrfWFTfGW9XjX',
      'bella': 'EXAVITQu4vr4xnSDxMaL',
      'adam': 'pNInz6obpgDQGcFmaJgB',
      'domi': 'AZnzlk1XvdvUeBnXmlld',
      'paula': '21m00Tcm4TlvDq8ikWAM', // Map old 'paula' to Rachel
    }
    const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel

    // Helper to resolve voice ID (handles both friendly names and actual ElevenLabs IDs)
    const resolveVoiceId = (voiceId: string | null): string => {
      if (!voiceId) return DEFAULT_VOICE_ID
      // If it's a friendly name, map it
      if (VOICE_MAP[voiceId.toLowerCase()]) return VOICE_MAP[voiceId.toLowerCase()]
      // If it looks like an ElevenLabs ID (long alphanumeric), use it directly
      if (voiceId.length > 10) return voiceId
      return DEFAULT_VOICE_ID
    }

    // Get script content - either from database or use raw script for individual calls
    let scriptContent: string
    let scriptVoiceId = DEFAULT_VOICE_ID

    if (isIndividualCall) {
      // For individual calls, use the provided script or a default greeting
      scriptContent = rawScript || 'Hello {first_name}, this is a call from your church. How are you doing today?'
    } else {
      // For group calls, get script from database
      const { data: script, error: scriptError } = await supabaseAdmin
        .from('call_scripts')
        .select('*')
        .eq('id', scriptId)
        .single()

      if (scriptError) throw scriptError
      scriptContent = script.content
      scriptVoiceId = resolveVoiceId(script.voice_id)
    }

    // Get recipients based on call type
    let recipients: any[] = []

    if (isIndividualCall) {
      // Get individual person
      const { data: person, error: personError } = await supabaseAdmin
        .from('people')
        .select('id, first_name, last_name, phone_number')
        .eq('id', recipientId)
        .single()

      if (personError) throw personError
      if (person?.phone_number) {
        recipients = [person]
      }
    } else {
      // Get all phone numbers from the group
      const { data: members, error: membersError } = await supabaseAdmin
        .from('group_members')
        .select(`
          people!inner (
            id,
            first_name,
            last_name,
            phone_number,
            created_at
          )
        `)
        .eq('group_id', groupId)

      if (membersError) throw membersError

      recipients = members
        ?.map(m => m.people)
        .filter(person => person.phone_number) || []
    }

    console.log('Call type:', isIndividualCall ? 'individual' : 'group')
    console.log('Recipients with phone numbers:', recipients.length)

    if (recipients.length === 0) {
      console.log('No recipients found, returning early')
      return new Response(JSON.stringify({
        message: 'No recipients with phone numbers found',
        scheduled: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('First recipient:', recipients[0])

    // Create calling campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('calling_campaigns')
      .insert({
        name: campaignName || (isIndividualCall
          ? `Individual Call - ${new Date().toLocaleDateString()}`
          : `AI Group Call - ${new Date().toLocaleDateString()}`),
        provider: 'vapi',
        cost_threshold: 100.00,
        target_filters: isIndividualCall ? { person_id: recipientId } : { group_id: groupId },
        batch_size: 10,
        status: 'active',
        organization_id: organizationId,
        created_by: createdBy,
        scheduled_start: new Date().toISOString()
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // --- Concurrency control ---
    // VAPI enforces concurrency limits per account. Before each call,
    // check how many calls are currently in_progress and wait if needed.
    const MAX_CONCURRENT_CALLS = 1 // Safe default; increase if your VAPI plan allows more
    const INTER_CALL_DELAY_MS = 10000 // 10s between call initiations

    // Auto-expire stale in_progress records (calls that never got a webhook callback)
    await supabaseAdmin
      .from('call_attempts')
      .update({ status: 'failed', error_message: 'Auto-expired: stale in_progress record' })
      .eq('status', 'in_progress')
      .eq('organization_id', organizationId)
      .lt('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())

    const waitForConcurrencySlot = async () => {
      const maxWaitMs = 60000 // 1 minute max wait (within edge function timeout)
      const pollIntervalMs = 5000
      let waited = 0

      while (waited < maxWaitMs) {
        const { count } = await supabaseAdmin
          .from('call_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'in_progress')
          .eq('organization_id', organizationId)

        if ((count || 0) < MAX_CONCURRENT_CALLS) return true

        console.log(`Concurrency limit reached (${count} active), waiting ${pollIntervalMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
        waited += pollIntervalMs
      }

      console.warn('Concurrency wait timed out after 1 minute')
      return false
    }

    // Process calls
    let scheduled = 0
    let failed = 0
    const results = []

    for (const recipient of recipients) {
      try {
        // Wait for a concurrency slot before proceeding
        const hasSlot = await waitForConcurrencySlot()
        if (!hasSlot) {
          failed++
          results.push({
            recipient: `${recipient.first_name} ${recipient.last_name}`,
            status: 'failed',
            error: 'Concurrency wait timed out'
          })
          continue
        }

        // Re-check minute usage before EACH call (not just at campaign start)
        const { data: currentOrg } = await supabaseAdmin
          .from('organizations')
          .select('minutes_used, minutes_included, overage_approved')
          .eq('id', organizationId)
          .single()

        if (currentOrg) {
          const currentUsed = parseFloat(String(currentOrg.minutes_used)) || 0
          const currentIncluded = currentOrg.minutes_included || 0
          if (currentUsed >= currentIncluded && !currentOrg.overage_approved) {
            console.log(`Minute limit reached mid-campaign (${currentUsed}/${currentIncluded}). Stopping remaining calls.`)
            // Mark remaining recipients as skipped
            for (const remaining of recipients.slice(recipients.indexOf(recipient))) {
              results.push({
                recipient: `${remaining.first_name} ${remaining.last_name}`,
                status: 'skipped',
                error: 'Minute limit reached'
              })
              failed++
            }
            break
          }
        }

        // Create call attempt record
        const { data: attempt } = await supabaseAdmin
          .from('call_attempts')
          .insert({
            campaign_id: campaign.id,
            person_id: recipient.id,
            phone_number: recipient.phone_number,
            provider: 'vapi',
            status: 'in_progress',
            organization_id: organizationId
          })
          .select()
          .single()

        // orgName already fetched above when checking for dedicated phone number

        // Process script variables using shared substitution engine
        const processedScript = substituteVariables(scriptContent, {
          first_name: recipient.first_name || 'Friend',
          last_name: recipient.last_name || '',
          church_name: orgName,
          pastor_name: pastorName,
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          membership_duration: recipient.created_at
            ? calculateMembershipDuration(new Date(recipient.created_at))
            : '',
        })

        // Enhanced prompt with memory injection (Pro+ only)
        let finalPrompt = processedScript
        if (orgPlanFeatures.hasAIMemory) {
          try {
            finalPrompt = await buildEnhancedPrompt(
              processedScript,
              supabaseAdmin,
              recipient.id,
              organizationId
            )
          } catch (err) {
            console.error('Failed to build enhanced prompt:', err)
          }
        }

        // Clean phone number
        const cleanPhone = recipient.phone_number.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`

        // Get webhook URL for callbacks
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
        const webhookUrl = `${SUPABASE_URL}/functions/v1/vapi-webhook`
        const webhookSecret = Deno.env.get('VAPI_WEBHOOK_SECRET') || ''

        // Make Vapi call with retry for rate limits (429)
        const maxRetries = 3
        const firstName = recipient.first_name || 'there'
        const firstGreeting = `Hi ${firstName}, this is a call from ${orgName}. How are you doing today?`

        // Build comprehensive system prompt with the script as guidance
        // Build church knowledge section from org data
        let churchKnowledge = ''
        const hasAIFields = serviceTimes || ministryList || aiContextNotes
        const hasOrgInfo = orgWebsite || orgAddress || orgPhone
        if (hasAIFields || hasOrgInfo) {
          churchKnowledge = `\n\nCHURCH KNOWLEDGE (use naturally in conversation if relevant):
${serviceTimes ? `- Service Times: ${serviceTimes}` : ''}
${ministryList ? `- Available Ministries: ${ministryList}` : ''}
${orgWebsite ? `- Website: ${orgWebsite}` : ''}
${orgAddress ? `- Address: ${orgAddress}` : ''}
${orgPhone ? `- Church Phone: ${orgPhone}` : ''}
${aiContextNotes ? `- Additional Notes: ${aiContextNotes}` : ''}`
        }

        const systemPrompt = `You are a warm, caring church assistant calling on behalf of ${orgName}. You should sound like a real person from the church, not a robot reading a script.

CONVERSATION STYLE:
1. Be warm, natural, and conversational — like a friendly church member checking in.
2. NEVER read or recite the script below word-for-word. Use it only to understand the PURPOSE and TOPICS of this call.
3. Put things in your own words. Speak naturally as if you're having a casual phone conversation.
4. Keep responses SHORT (1-2 sentences max). Be concise but genuine.
5. Listen and respond to what the person actually says. Have a real conversation.
6. If they respond positively, wrap up warmly. Don't drag the call out.
7. If they mention a crisis or need, acknowledge it with empathy and note it.
8. The entire call should ideally last under 2 minutes.
9. Use ${firstName}'s name sparingly — once or twice at most.${churchKnowledge}

CALL PURPOSE & TALKING POINTS (use as a guide, NOT a script to read):
${finalPrompt}

Remember: understand the intent above and convey it naturally in your own words. Do NOT quote or recite it.`

        let vapiResponse: Response | null = null
        const payload = JSON.stringify({
          phoneNumberId: VAPI_PHONE_NUMBER_ID,
          customer: {
            number: formattedPhone,
            name: firstName
          },
          assistantOverrides: {
            metadata: {
              organization_id: organizationId,
              person_id: recipient.id
            },
            serverUrl: webhookUrl,
            serverUrlSecret: webhookSecret
          },
          assistant: {
            name: 'Church Connect Assistant',
            firstMessage: firstGreeting,
            model: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              temperature: 0.7,
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                }
              ]
            },
            voice: {
              provider: '11labs',
              voiceId: scriptVoiceId
            },
            serverUrl: webhookUrl,
            serverUrlSecret: webhookSecret,
            endCallMessage: 'Thank you so much for talking with me today. God bless you!',
            endCallPhrases: ['goodbye', 'bye', 'have a good day', 'take care'],
            analysisPlan: {
              summaryPrompt: 'Summarize the key points of this conversation in 2-3 sentences.',
              structuredDataPrompt: 'Extract: 1) Overall sentiment (positive/neutral/negative), 2) Any prayer requests mentioned, 3) Any signs of crisis or need for pastoral care, 4) Any specific interests or needs mentioned',
              structuredDataSchema: {
                type: 'object',
                properties: {
                  response_type: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                  crisis_detected: { type: 'boolean' },
                  crisis_reason: { type: 'string' },
                  needs_follow_up: { type: 'boolean' },
                  needs_pastoral_care: { type: 'boolean' },
                  prayer_requests: { type: 'array', items: { type: 'string' } },
                  interests: { type: 'array', items: { type: 'string' } },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
                }
              }
            }
          },
          maxDurationSeconds: Math.max(60, ((orgBilling?.minutes_included || 0) - (parseFloat(String(orgBilling?.minutes_used)) || 0)) * 60)
        })

        console.log('Making VAPI call to:', formattedPhone)
        console.log('Webhook URL:', webhookUrl)
        console.log('Payload size:', payload.length, 'bytes')

        for (let attemptCount = 0; attemptCount <= maxRetries; attemptCount++) {
          try {
            console.log(`VAPI API attempt ${attemptCount + 1}/${maxRetries + 1}`)
            vapiResponse = await fetch('https://api.vapi.ai/call', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: payload
            })
            console.log('VAPI response status:', vapiResponse.status)

            // Retry on 429 (rate limited)
            if (vapiResponse.status === 429 && attemptCount < maxRetries) {
              const waitMs = 500 * Math.pow(2, attemptCount)
              console.warn(`Rate limited by Vapi; retrying in ${waitMs}ms (attempt ${attemptCount + 1})`)
              await new Promise(resolve => setTimeout(resolve, waitMs))
              continue
            }

            break
          } catch (fetchErr) {
            console.error('Network error calling Vapi', fetchErr)
            if (attemptCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attemptCount)))
              continue
            } else {
              throw fetchErr
            }
          }
        }

        if (!vapiResponse) {
          throw new Error('No response from Vapi')
        }

        if (vapiResponse.ok) {
          const vapiResult = await vapiResponse.json()

          // Record the full Vapi response for debugging and audit
          console.log('Vapi response for', formattedPhone, vapiResult)

          // If the provider returned an error object or a failed status, treat as failed
          const hasError = vapiResult?.error || vapiResult?.errors || vapiResult?.status === 'failed' || vapiResult?.success === false

          if (hasError) {
            const errText = JSON.stringify(vapiResult)

            // If the provider reports insufficient funds, pause the campaign to avoid more failures
            try {
              const isBalanceIssue = /insuffi|balance|funds|payment/i.test(errText)
              if (isBalanceIssue) {
                await supabaseAdmin
                  .from('calling_campaigns')
                  .update({ status: 'paused' })
                  .eq('id', campaign.id)
              }
            } catch (e) { /* ignore */ }

            await supabaseAdmin
              .from('call_attempts')
              .update({
                status: 'failed',
                error_message: errText
              })
              .eq('id', attempt.id)

            await supabaseAdmin
              .from('vapi_call_logs')
              .insert({
                organization_id: organizationId,
                member_id: recipient.id,
                vapi_call_id: vapiResult?.id || null,
                phone_number_used: formattedPhone,
                call_status: vapiResult?.status || 'failed',
                assistant_id: scriptId,
                raw_vapi_data: vapiResult
              })

            failed++
            results.push({
              recipient: `${recipient.first_name} ${recipient.last_name}`,
              phone: formattedPhone,
              status: 'failed',
              error: vapiResult
            })
          } else {
            // Consider the call initiated/queued — final outcome will come from webhook
            await supabaseAdmin
              .from('call_attempts')
              .update({
                call_sid: vapiResult.id,
                status: 'in_progress'
              })
              .eq('id', attempt.id)

            // Log to vapi_call_logs with full response
            await supabaseAdmin
              .from('vapi_call_logs')
              .insert({
                organization_id: organizationId,
                member_id: recipient.id,
                vapi_call_id: vapiResult.id,
                phone_number_used: formattedPhone,
                call_status: vapiResult?.status || 'initiated',
                assistant_id: scriptId,
                raw_vapi_data: vapiResult
              })

            scheduled++
            results.push({
              recipient: `${recipient.first_name} ${recipient.last_name}`,
              phone: formattedPhone,
              status: 'scheduled',
              call_id: vapiResult.id
            })

            // Delay between calls to respect VAPI concurrency limits
            await new Promise(resolve => setTimeout(resolve, INTER_CALL_DELAY_MS))
          }
        } else {
          const errorText = await vapiResponse.text()
          let parsedError: any = errorText
          try { parsedError = JSON.parse(errorText) } catch (e) { }

          // If HTTP 402 (payment required) or the provider reports a balance issue, pause the campaign
          try {
            const isBalanceIssue = vapiResponse.status === 402 || /insuffi|balance|funds|payment/i.test(JSON.stringify(parsedError))
            if (isBalanceIssue) {
              await supabaseAdmin
                .from('calling_campaigns')
                .update({ status: 'paused' })
                .eq('id', campaign.id)
            }
          } catch (e) { /* ignore */ }

          // Update attempt
          await supabaseAdmin
            .from('call_attempts')
            .update({
              status: 'failed',
              error_message: typeof parsedError === 'string' ? parsedError : JSON.stringify(parsedError)
            })
            .eq('id', attempt.id)

          // Log to vapi_call_logs for debugging
          await supabaseAdmin
            .from('vapi_call_logs')
            .insert({
              organization_id: organizationId,
              member_id: recipient.id,
              vapi_call_id: null,
              phone_number_used: formattedPhone,
              call_status: 'failed',
              assistant_id: scriptId,
              raw_vapi_data: parsedError
            })

          failed++
          results.push({
            recipient: `${recipient.first_name} ${recipient.last_name}`,
            phone: formattedPhone,
            status: 'failed',
            error: parsedError
          })
        }
      } catch (error) {
        failed++
        results.push({
          recipient: `${recipient.first_name} ${recipient.last_name}`,
          status: 'failed',
          error: error.message
        })
      }
    }

    // Update campaign status
    await supabaseAdmin
      .from('calling_campaigns')
      .update({
        status: 'completed',
        actual_cost: scheduled * 0.05, // Estimate $0.05 per call
        completed_at: new Date().toISOString()
      })
      .eq('id', campaign.id)

    return new Response(JSON.stringify({
      message: `Calling campaign completed`,
      campaignId: campaign.id,
      scheduled,
      failed,
      results
    }), {
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
