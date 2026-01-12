import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      groupId,
      scriptId,
      organizationId,
      createdBy
    } = await req.json()

    if (!groupId || !scriptId || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Use the Service Role Key for admin-level access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Vapi configuration from environment variables
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY')
    const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID')

    if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
      throw new Error('Vapi configuration incomplete')
    }

    // Get calling script
    const { data: script, error: scriptError } = await supabaseAdmin
      .from('calling_scripts')
      .select('*')
      .eq('id', scriptId)
      .single()

    if (scriptError) throw scriptError

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

    const recipients = members
      ?.map(m => m.people)
      .filter(person => person.phone_number) || []

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        message: 'No recipients with phone numbers found',
        scheduled: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Create calling campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('calling_campaigns')
      .insert({
        name: `AI Group Call - ${new Date().toLocaleDateString()}`,
        provider: 'vapi',
        cost_threshold: 100.00,
        target_filters: { group_id: groupId },
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
        const processedScript = script.content
          .replace(/\[Name\]/g, recipient.first_name || 'Friend')
          .replace(/\{Name\}/g, recipient.first_name || 'Friend')

        // Clean phone number
        const cleanPhone = recipient.phone_number.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`

        // Make Vapi call
        const vapiResponse = await fetch('https://api.vapi.ai/call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phoneNumberId: VAPI_PHONE_NUMBER_ID,
            customer: {
              number: formattedPhone,
              name: recipient.first_name || 'Friend'
            },
            assistant: {
              firstMessage: processedScript,
              model: {
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                temperature: 0.7
              }
            }
          })
        })

        if (vapiResponse.ok) {
          const vapiResult = await vapiResponse.json()

          // Update call attempt with Vapi call ID
          await supabaseAdmin
            .from('call_attempts')
            .update({
              call_sid: vapiResult.id,
              status: 'completed'
            })
            .eq('id', attempt.id)

          // Log to vapi_call_logs
          await supabaseAdmin
            .from('vapi_call_logs')
            .insert({
              organization_id: organizationId,
              member_id: recipient.id,
              vapi_call_id: vapiResult.id,
              phone_number_used: formattedPhone,
              call_status: 'initiated',
              assistant_id: scriptId
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
        } else {
          const error = await vapiResponse.text()

          await supabaseAdmin
            .from('call_attempts')
            .update({
              status: 'failed',
              error_message: error
            })
            .eq('id', attempt.id)

          failed++
          results.push({
            recipient: `${recipient.first_name} ${recipient.last_name}`,
            phone: formattedPhone,
            status: 'failed',
            error: error
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
