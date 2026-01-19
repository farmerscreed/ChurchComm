import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Use the Service Role Key for admin-level access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Vapi configuration from environment variables
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY')
    const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID')

    console.log('VAPI Config - API Key present:', !!VAPI_API_KEY, 'Phone ID present:', !!VAPI_PHONE_NUMBER_ID)
    console.log('VAPI Phone Number ID:', VAPI_PHONE_NUMBER_ID)

    if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
      console.error('Vapi configuration incomplete')
      throw new Error('Vapi configuration incomplete')
    }

    // Get script content - either from database or use raw script for individual calls
    let scriptContent: string

    if (isIndividualCall) {
      // For individual calls, use the provided script or a default greeting
      scriptContent = rawScript || 'Hello {Name}, this is a call from your church. How are you doing today?'
    } else {
      // For group calls, get script from database
      const { data: script, error: scriptError } = await supabaseAdmin
        .from('call_scripts')
        .select('*')
        .eq('id', scriptId)
        .single()

      if (scriptError) throw scriptError
      scriptContent = script.content
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
            phone_number
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

    // Process calls
    let scheduled = 0
    let failed = 0
    const results = []

    for (const recipient of recipients) {
      try {
        // Create call attempt record
        const { data: attempt } = await supabaseAdmin
          .from('call_attempts')
          .insert({
            campaign_id: campaign.id,
            person_id: recipient.id,
            phone_number: recipient.phone_number,
            provider: 'vapi',
            status: 'in_progress'
          })
          .select()
          .single()

        // Process script variables
        const processedScript = scriptContent
          .replace(/\[Name\]/g, recipient.first_name || 'Friend')
          .replace(/\{Name\}/g, recipient.first_name || 'Friend')

        // Clean phone number
        const cleanPhone = recipient.phone_number.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`

        // Get webhook URL for callbacks
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
        const webhookUrl = `${SUPABASE_URL}/functions/v1/vapi-webhook`

        // Make Vapi call with retry for rate limits (429)
        const maxRetries = 3
        let vapiResponse: Response | null = null
        const payload = JSON.stringify({
          phoneNumberId: VAPI_PHONE_NUMBER_ID,
          customer: {
            number: formattedPhone,
            name: recipient.first_name || 'Friend'
          },
          assistantOverrides: {
            metadata: {
              organization_id: organizationId,
              person_id: recipient.id
            }
          },
          assistant: {
            name: 'Church Connect Assistant',
            firstMessage: processedScript,
            model: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 0.7,
              messages: [
                {
                  role: 'system',
                  content: `You are a friendly church assistant making a caring outreach call. Be warm, empathetic, and conversational. Listen actively and respond appropriately. If the person mentions any crisis, distress, or need for pastoral care, note it carefully. Keep the conversation natural and supportive.`
                }
              ]
            },
            voice: {
              provider: '11labs',
              voiceId: 'paula'
            },
            serverUrl: webhookUrl,
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
          }
        })

        console.log('Making VAPI call to:', formattedPhone)
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

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } else {
          const errorText = await vapiResponse.text()
          let parsedError: any = errorText
          try { parsedError = JSON.parse(errorText) } catch (e) {}

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
