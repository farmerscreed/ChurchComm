import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('RESEND_API_KEY not configured, skipping email')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ChurchComm <notifications@churchcomm.app>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    console.error('Email send failed:', await res.text())
  }
}

async function sendRealtimeNotification(
  supabase: any,
  orgId: string,
  callAttempt: any
): Promise<void> {
  // Get users who want real-time notifications
  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, role, profiles!inner(email, full_name)')
    .eq('organization_id', orgId)
    .in('role', ['admin', 'pastor'])

  if (!members?.length) return

  // Check notification preferences for each member
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, call_summary_frequency')
    .eq('organization_id', orgId)
    .eq('call_summary_frequency', 'realtime')

  const realtimeUserIds = new Set((prefs || []).map((p: any) => p.user_id))
  const realtimeRecipients = members.filter((m: any) => realtimeUserIds.has(m.user_id))

  if (realtimeRecipients.length === 0) return

  // Get person details
  let personName = 'Unknown'
  if (callAttempt.person_id) {
    const { data: person } = await supabase
      .from('people')
      .select('first_name, last_name')
      .eq('id', callAttempt.person_id)
      .single()

    if (person) {
      personName = `${person.first_name || ''} ${person.last_name || ''}`.trim()
    }
  }

  const isCompleted = callAttempt.status === 'completed'
  const durationMin = Math.round((callAttempt.duration_seconds || callAttempt.duration || 0) / 60)

  for (const recipient of realtimeRecipients) {
    await sendEmail(
      recipient.profiles.email,
      `Call ${isCompleted ? 'Completed' : 'Update'}: ${personName}`,
      `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${isCompleted ? '#22c55e' : '#ef4444'};">
            ${isCompleted ? 'Call Completed' : 'Call Update'}
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold;">Person:</td><td>${personName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td>${callAttempt.status}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Duration:</td><td>${durationMin} minute${durationMin !== 1 ? 's' : ''}</td></tr>
            ${callAttempt.summary ? `<tr><td style="padding: 8px 0; font-weight: bold;">Summary:</td><td>${callAttempt.summary}</td></tr>` : ''}
          </table>
        </div>
      `
    )
  }

  console.log(`Sent real-time notifications to ${realtimeRecipients.length} recipient(s)`)
}

async function sendDailyDigests(supabase: any): Promise<void> {
  const { data: orgs } = await supabase.from('organizations').select('id, name')

  for (const org of orgs || []) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: calls } = await supabase
      .from('call_attempts')
      .select('id, status, duration, person_id')
      .eq('organization_id', org.id)
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    if (!calls?.length) continue

    const totalCalls = calls.length
    const completed = calls.filter((c: any) => c.status === 'completed').length
    const failed = calls.filter((c: any) => c.status === 'failed').length
    const noAnswer = calls.filter((c: any) => c.status === 'no_answer').length
    const successRate = totalCalls > 0 ? ((completed / totalCalls) * 100).toFixed(0) : '0'
    const totalMinutes = calls.reduce((sum: number, c: any) => sum + Math.ceil((c.duration || 0) / 60), 0)

    // Get escalations from yesterday
    const { data: escalations } = await supabase
      .from('escalation_alerts')
      .select('id, alert_type, priority')
      .eq('organization_id', org.id)
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    // Get daily digest recipients
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('organization_id', org.id)
      .in('role', ['admin', 'pastor'])

    if (!members?.length) continue

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, call_summary_frequency')
      .eq('organization_id', org.id)
      .eq('call_summary_frequency', 'daily')

    const dailyUserIds = new Set((prefs || []).map((p: any) => p.user_id))
    const digestRecipients = members.filter((m: any) => dailyUserIds.has(m.user_id))

    if (digestRecipients.length === 0) continue

    const dateStr = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    for (const recipient of digestRecipients) {
      await sendEmail(
        recipient.profiles.email,
        `Daily Call Summary - ${org.name} (${dateStr})`,
        `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Daily Call Summary</h2>
            <p style="color: #6b7280;">${dateStr}</p>

            <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="margin-top: 0;">Call Statistics</h3>
              <table style="width: 100%;">
                <tr><td>Total Calls:</td><td style="text-align: right; font-weight: bold;">${totalCalls}</td></tr>
                <tr><td>Completed:</td><td style="text-align: right; font-weight: bold; color: #22c55e;">${completed}</td></tr>
                <tr><td>Failed:</td><td style="text-align: right; font-weight: bold; color: #ef4444;">${failed}</td></tr>
                <tr><td>No Answer:</td><td style="text-align: right; font-weight: bold; color: #f59e0b;">${noAnswer}</td></tr>
                <tr><td>Success Rate:</td><td style="text-align: right; font-weight: bold;">${successRate}%</td></tr>
                <tr><td>Total Minutes:</td><td style="text-align: right; font-weight: bold;">${totalMinutes}</td></tr>
              </table>
            </div>

            ${escalations?.length ? `
              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #dc2626;">Escalations (${escalations.length})</h3>
                <ul>
                  ${escalations.map((e: any) => `<li>${e.alert_type.replace(/_/g, ' ')} (${e.priority})</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `
      )
    }

    console.log(`Sent daily digest for org ${org.id} to ${digestRecipients.length} recipient(s)`)
  }
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

    const { mode, organization_id, call_attempt } = await req.json()

    if (mode === 'realtime' && call_attempt) {
      await sendRealtimeNotification(supabase, organization_id, call_attempt)
    } else if (mode === 'daily_digest') {
      await sendDailyDigests(supabase)
    } else {
      return new Response(JSON.stringify({ error: 'Invalid mode. Use "realtime" or "daily_digest"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Call summary error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
