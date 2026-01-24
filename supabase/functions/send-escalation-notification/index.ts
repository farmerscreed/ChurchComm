import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    // Handle both direct calls and database webhook format
    const record = body.record || body

    if (!record || !record.organization_id) {
      return new Response(JSON.stringify({ error: 'No valid escalation record provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { id, organization_id, member_id, alert_type, priority, alert_message } = record

    console.log('Processing escalation: id=' + id + ' type=' + alert_type + ' priority=' + priority)

    // Get person details
    const { data: person } = await supabase
      .from('people')
      .select('first_name, last_name, phone_number')
      .eq('id', member_id)
      .single()

    // Get organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single()

    // Get admin and pastor members
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', organization_id)
      .in('role', ['admin', 'pastor'])

    if (!members || members.length === 0) {
      console.log('No admin/pastor recipients found for org ' + organization_id)
      return new Response(JSON.stringify({ success: true, recipients_notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const personName = (person?.first_name || '') + ' ' + (person?.last_name || '')
    const churchName = org?.name || 'Your Church'
    const appUrl = Deno.env.get('APP_URL') || 'https://churchcomm.app'
    let notified = 0

    for (const member of members) {
      // Get notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('escalation_sms, escalation_email')
        .eq('user_id', member.user_id)
        .eq('organization_id', organization_id)
        .maybeSingle()

      // Default to sending if no preferences set
      const sendSms = prefs?.escalation_sms !== false
      const sendEmail = prefs?.escalation_email !== false

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', member.user_id)
        .single()

      // Get phone from auth.users metadata
      const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id)
      const userPhone = authUser?.user?.phone || authUser?.user?.user_metadata?.phone

      if (sendEmail && profile?.email) {
        await sendEmailNotification(
          profile.email, personName, alert_type || 'escalation',
          priority || 'medium', alert_message || '', churchName, appUrl
        )
        notified++
      }

      if (sendSms && userPhone) {
        await sendSmsNotification(
          userPhone, personName, alert_type || 'escalation',
          priority || 'medium', alert_message || '', appUrl
        )
        notified++
      }
    }

    // Update escalation with notification timestamp
    if (id) {
      await supabase
        .from('escalation_alerts')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('id', id)
    }

    console.log('Escalation notification complete: ' + notified + ' notifications sent')

    return new Response(JSON.stringify({
      success: true,
      recipients_notified: notified,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Escalation notification error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function sendSmsNotification(
  phone: string, personName: string, alertType: string,
  priority: string, summary: string, appUrl: string
): Promise<void> {
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!twilioSid || !twilioToken || !twilioPhone) {
    console.error('Twilio credentials not configured')
    return
  }

  const prefix = priority === 'urgent' ? '[URGENT] ' : ''
  const msg = prefix + 'ChurchComm Alert: ' + personName.trim() + ' - ' + alertType + '. ' + (summary || '').slice(0, 100) + ' Review: ' + appUrl

  const response = await fetch(
    'https://api.twilio.com/2010-04-01/Accounts/' + twilioSid + '/Messages.json',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(twilioSid + ':' + twilioToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: twilioPhone, Body: msg }),
    }
  )

  if (!response.ok) {
    console.error('Twilio SMS failed:', await response.text())
  }
}

async function sendEmailNotification(
  email: string, personName: string, alertType: string,
  priority: string, summary: string, churchName: string, appUrl: string
): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured')
    return
  }

  const priorityColor = priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#f59e0b' : '#3b82f6'

  const html = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto">' +
    '<h2 style="color:' + priorityColor + '">' + priority.toUpperCase() + ' Escalation Alert</h2>' +
    '<p><strong>Church:</strong> ' + churchName + '</p>' +
    '<p><strong>Person:</strong> ' + personName.trim() + '</p>' +
    '<p><strong>Type:</strong> ' + alertType + '</p>' +
    '<h3>Details</h3>' +
    '<p style="background:#f3f4f6;padding:16px;border-radius:8px">' + (summary || 'No additional details.') + '</p>' +
    '<a href="' + appUrl + '/follow-ups" style="display:inline-block;background:' + priorityColor + ';color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:16px">Review in ChurchComm</a>' +
    '</div>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + resendKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ChurchComm <alerts@churchcomm.app>',
      to: email,
      subject: '[' + priority.toUpperCase() + '] Escalation: ' + personName.trim() + ' - ' + alertType,
      html: html,
    }),
  })

  if (!response.ok) {
    console.error('Resend email failed:', await response.text())
  }
}
