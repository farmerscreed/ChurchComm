import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      recipientType,
      recipientId,
      message,
      organizationId,
      createdBy
    } = await req.json()

    if (!recipientType || !message || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // recipientId is required for group and individual, but not for 'all'
    if ((recipientType === 'group' || recipientType === 'individual') && !recipientId) {
      return new Response(JSON.stringify({ error: 'recipientId is required for group or individual' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Use the Service Role Key for admin-level access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Twilio configuration from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const FROM_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !FROM_PHONE) {
      throw new Error('Twilio configuration incomplete')
    }

    let recipients = []

    if (recipientType === 'all') {
      // Get all people in the organization with phone numbers
      const { data: allPeople, error: allError } = await supabaseAdmin
        .from('people')
        .select('id, first_name, last_name, phone_number')
        .eq('organization_id', organizationId)
        .not('phone_number', 'is', null)

      if (allError) throw allError

      recipients = allPeople?.filter(person => person.phone_number) || []

    } else if (recipientType === 'group') {
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
        .eq('group_id', recipientId)

      if (membersError) throw membersError

      recipients = members
        ?.map(m => m.people)
        .filter(person => person.phone_number) || []

    } else if (recipientType === 'individual') {
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
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        message: 'No recipients with phone numbers found',
        sent: 0,
        failed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Create SMS campaign record
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('messaging_campaigns')
      .insert({
        organization_id: organizationId,
        name: `SMS ${recipientType === 'group' ? 'Group' : 'Individual'} Message`,
        type: 'sms',
        content: message,
        target_audience: { type: recipientType, id: recipientId },
        recipients: recipients.length,
        status: 'active',
        created_by: createdBy
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // Send SMS messages
    let sent = 0
    let failed = 0
    const results = []

    for (const recipient of recipients) {
      try {
        // Clean phone number
        const cleanPhone = recipient.phone_number.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`

        // Send SMS via Twilio
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: formattedPhone,
              From: FROM_PHONE,
              Body: message.replace(/\{Name\}/g, recipient.first_name || 'Friend')
            }),
          }
        )

        if (twilioResponse.ok) {
          const twilioResult = await twilioResponse.json()

          // Log successful send
          await supabaseAdmin.from('campaign_recipients').insert({
            campaign_id: campaign.id,
            person_id: recipient.id,
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_id: twilioResult.sid,
            cost: parseFloat(twilioResult.price || '0.0075') // Default SMS cost
          })

          sent++
          results.push({
            recipient: `${recipient.first_name} ${recipient.last_name}`,
            phone: formattedPhone,
            status: 'sent',
            message_sid: twilioResult.sid
          })
        } else {
          const error = await twilioResponse.text()

          // Log failed send
          await supabaseAdmin.from('campaign_recipients').insert({
            campaign_id: campaign.id,
            person_id: recipient.id,
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error
          })

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
          phone: recipient.phone_number,
          status: 'failed',
          error: error.message
        })
      }
    }

    // Update campaign with results
    await supabaseAdmin
      .from('messaging_campaigns')
      .update({
        sent_count: sent,
        failed_count: failed,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', campaign.id)

    return new Response(JSON.stringify({
      message: `SMS campaign completed`,
      campaignId: campaign.id,
      sent,
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
