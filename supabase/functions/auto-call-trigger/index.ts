import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { zonedTimeToUtc } from 'https://esm.sh/date-fns-tz@2.0.0?deps=date-fns@2.30.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildEnhancedPrompt } from '../_shared/context-injection.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
function resolveVoiceId(voiceId: string | null): string {
  if (!voiceId) return DEFAULT_VOICE_ID
  // If it's a friendly name, map it
  if (VOICE_MAP[voiceId.toLowerCase()]) return VOICE_MAP[voiceId.toLowerCase()]
  // If it looks like an ElevenLabs ID (long alphanumeric), use it directly
  if (voiceId.length > 10) return voiceId
  return DEFAULT_VOICE_ID
}

interface Organization {
  id: string
  name: string
  calling_window_start: string
  calling_window_end: string
  timezone: string
  phone_number_type: string | null
  dedicated_phone_number: string | null
  vapi_phone_number_id: string | null
  subscription_tier: string | null
}

interface AutoTrigger {
  id: string
  organization_id: string
  trigger_type: 'first_timer' | 'birthday' | 'anniversary'
  enabled: boolean
  script_id: string | null
  delay_hours: number
  anniversary_milestones: number[]
}

function isWithinCallingWindow(org: Organization): boolean {
  const { calling_window_start, calling_window_end, timezone } = org

  if (!calling_window_start || !calling_window_end || !timezone) {
    console.log('Org ' + org.id + ': Missing calling window config, defaulting to allow')
    return true
  }

  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
    const currentTimeMinutes = currentHour * 60 + currentMinute

    const [startH, startM] = calling_window_start.split(':').map(Number)
    const [endH, endM] = calling_window_end.split(':').map(Number)
    const windowStart = startH * 60 + startM
    const windowEnd = endH * 60 + endM

    const withinWindow = currentTimeMinutes >= windowStart && currentTimeMinutes < windowEnd
    console.log('Org ' + org.id + ': Time=' + currentHour + ':' + String(currentMinute).padStart(2, '0') + ' Window=' + calling_window_start + '-' + calling_window_end + ' Within=' + withinWindow)
    return withinWindow
  } catch (err) {
    console.error('Org ' + org.id + ': Error checking calling window:', err)
    return false
  }
}

// --- TRIGGER HANDLERS ---

async function processFirstTimerTrigger(
  supabase: any,
  org: Organization,
  trigger: AutoTrigger
): Promise<number> {
  const delayHours = trigger.delay_hours || 24

  const windowEnd = new Date()
  windowEnd.setHours(windowEnd.getHours() - delayHours)

  const windowStart = new Date(windowEnd)
  windowStart.setHours(windowStart.getHours() - 1)

  console.log('Org ' + org.id + ': first_timer - window: ' + windowStart.toISOString() + ' to ' + windowEnd.toISOString())

  const { data: people, error: peopleError } = await supabase
    .from('people')
    .select('id, first_name, last_name, phone_number')
    .eq('organization_id', org.id)
    .eq('member_status', 'first_time_visitor')
    .eq('do_not_call', false)
    .not('phone_number', 'is', null)
    .gte('created_at', windowStart.toISOString())
    .lt('created_at', windowEnd.toISOString())

  if (peopleError) {
    console.error('Org ' + org.id + ': Error fetching first-time visitors:', peopleError)
    return 0
  }

  if (!people || people.length === 0) return 0

  console.log('Org ' + org.id + ': Found ' + people.length + ' first-time visitor(s)')

  let scheduled = 0
  for (const person of people) {
    const { data: existing } = await supabase
      .from('call_attempts')
      .select('id')
      .eq('person_id', person.id)
      .eq('trigger_type', 'first_timer')
      .maybeSingle()

    if (existing) continue

    const { error: insertError } = await supabase
      .from('call_attempts')
      .insert({
        organization_id: org.id,
        person_id: person.id,
        phone_number: person.phone_number,
        script_id: trigger.script_id,
        provider: 'vapi',
        status: 'scheduled',
        trigger_type: 'first_timer',
        scheduled_at: new Date().toISOString(),
      })

    if (!insertError) {
      console.log('Org ' + org.id + ': Scheduled first_timer call for ' + person.first_name + ' ' + person.last_name)
      scheduled++
    }
  }

  return scheduled
}

async function processBirthdayTrigger(
  supabase: any,
  org: Organization,
  trigger: AutoTrigger
): Promise<number> {
  // Get current date in org's timezone
  const timezone = org.timezone || 'America/New_York'
  const now = new Date()
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateParts = dateFormatter.formatToParts(now)
  const currentYear = dateParts.find(p => p.type === 'year')?.value
  const month = parseInt(dateParts.find(p => p.type === 'month')?.value || '1', 10)
  const day = parseInt(dateParts.find(p => p.type === 'day')?.value || '1', 10)

  console.log('Org ' + org.id + ': birthday - checking for month=' + month + ' day=' + day)

  // Fetch people with birthdays (we filter in-memory since date part queries vary)
  const { data: people, error } = await supabase
    .from('people')
    .select('id, first_name, last_name, phone_number, birthday')
    .eq('organization_id', org.id)
    .eq('do_not_call', false)
    .not('phone_number', 'is', null)
    .not('birthday', 'is', null)

  if (error) {
    console.error('Org ' + org.id + ': Error fetching people for birthday:', error)
    return 0
  }

  // Filter for today's birthdays
  const birthdayPeople = (people || []).filter((person: any) => {
    if (!person.birthday) return false
    const bday = new Date(person.birthday + 'T00:00:00')
    return (bday.getMonth() + 1) === month && bday.getDate() === day
  })

  if (birthdayPeople.length === 0) return 0
  console.log('Org ' + org.id + ': Found ' + birthdayPeople.length + ' birthday(s) today')

  let scheduled = 0
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  for (const person of birthdayPeople) {
    // Check for existing birthday call today
    const { data: existing } = await supabase
      .from('call_attempts')
      .select('id')
      .eq('person_id', person.id)
      .eq('trigger_type', 'birthday')
      .gte('scheduled_at', todayStart.toISOString())
      .maybeSingle()

    if (existing) continue

    const { error: insertError } = await supabase
      .from('call_attempts')
      .insert({
        organization_id: org.id,
        person_id: person.id,
        phone_number: person.phone_number,
        script_id: trigger.script_id,
        provider: 'vapi',
        status: 'scheduled',
        trigger_type: 'birthday',
        scheduled_at: (() => {
          // Construct local time string: YYYY-MM-DD HH:mm:ss
          const hour = String(trigger.delay_hours || 10).padStart(2, '0')
          const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${hour}:00:00`
          const utcDate = zonedTimeToUtc(dateStr, timezone)
          return utcDate.toISOString()
        })(),
      })

    if (!insertError) {
      console.log('Org ' + org.id + ': Scheduled birthday call for ' + person.first_name)
      scheduled++
    }
  }

  return scheduled
}

async function processAnniversaryTrigger(
  supabase: any,
  org: Organization,
  trigger: AutoTrigger
): Promise<number> {
  const milestones = trigger.anniversary_milestones || [1, 6, 12]
  const timezone = org.timezone || 'America/New_York'
  const now = new Date()
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateParts = dateFormatter.formatToParts(now)
  const currentYear = parseInt(dateParts.find(p => p.type === 'year')?.value || '2024', 10)
  const currentMonth = parseInt(dateParts.find(p => p.type === 'month')?.value || '1', 10)
  const currentDay = parseInt(dateParts.find(p => p.type === 'day')?.value || '1', 10)

  console.log('Org ' + org.id + ': anniversary - milestones: ' + milestones.join(','))

  // Get members (not first-time visitors) who joined on this day of month
  const { data: people, error } = await supabase
    .from('people')
    .select('id, first_name, last_name, phone_number, created_at')
    .eq('organization_id', org.id)
    .eq('do_not_call', false)
    .not('phone_number', 'is', null)
    .in('member_status', ['member', 'leader', 'regular_visitor'])

  if (error) {
    console.error('Org ' + org.id + ': Error fetching people for anniversary:', error)
    return 0
  }

  let scheduled = 0
  for (const person of people || []) {
    const joinDate = new Date(person.created_at)

    // Only process if today is their join day of month
    if (joinDate.getDate() !== currentDay) continue

    // Calculate months since joining
    // Use currentMonth/currentYear (local) vs joinDate (might be UTC but we just need day of month matching usually)
    // Actually, joinDate is UTC. But we care about "months passed".
    const monthsSince = (currentYear - joinDate.getFullYear()) * 12 +
      (currentMonth - (joinDate.getMonth() + 1))

    if (monthsSince <= 0 || !milestones.includes(monthsSince)) continue

    // Check for existing anniversary call this month
    const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
    const { data: existing } = await supabase
      .from('call_attempts')
      .select('id')
      .eq('person_id', person.id)
      .eq('trigger_type', 'anniversary')
      .gte('scheduled_at', monthStart.toISOString())
      .maybeSingle()

    if (existing) continue

    const { error: insertError } = await supabase
      .from('call_attempts')
      .insert({
        organization_id: org.id,
        person_id: person.id,
        phone_number: person.phone_number,
        script_id: trigger.script_id,
        provider: 'vapi',
        status: 'scheduled',
        trigger_type: 'anniversary',
        scheduled_at: (() => {
          // Construct local time string: YYYY-MM-DD HH:mm:ss
          const hour = String(trigger.delay_hours || 10).padStart(2, '0')
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')} ${hour}:00:00`
          const utcDate = zonedTimeToUtc(dateStr, timezone)
          return utcDate.toISOString()
        })(),
      })

    if (!insertError) {
      console.log('Org ' + org.id + ': Scheduled anniversary call for ' + person.first_name + ' (' + monthsSince + ' months)')
      scheduled++
    }
  }

  return scheduled
}

// --- VAPI EXECUTION ---

function substituteVariables(template: string, context: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(context)) {
    const pattern = new RegExp('\\{' + key + '\\}', 'g')
    result = result.replace(pattern, value || '')
  }
  return result
}

async function executeScheduledCalls(supabase: any, org: Organization): Promise<number> {
  const MAX_CONCURRENT_CALLS = 1
  const INTER_CALL_DELAY_MS = 10000

  // Check current concurrency before proceeding
  const { count: activeCalls } = await supabase
    .from('call_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_progress')
    .eq('organization_id', org.id)

  if ((activeCalls || 0) >= MAX_CONCURRENT_CALLS) {
    console.log('Org ' + org.id + ': Skipping execution - ' + activeCalls + ' call(s) already in progress')
    return 0
  }

  // Get scheduled calls with their person and script details
  const { data: scheduledCalls, error } = await supabase
    .from('call_attempts')
    .select('id, person_id, script_id, trigger_type, phone_number, retry_count')
    .eq('organization_id', org.id)
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(3) // Reduced batch size for strict concurrency control

  if (error || !scheduledCalls?.length) return 0

  // Fetch minute usage from organizations table (source of truth for billing)
  const { data: orgBilling } = await supabase
    .from('organizations')
    .select('minutes_used, minutes_included')
    .eq('id', org.id)
    .single()

  const minutesUsed = orgBilling ? parseFloat(String(orgBilling.minutes_used)) || 0 : 0
  const minutesIncluded = orgBilling ? orgBilling.minutes_included || 0 : 0
  const remainingMinutes = Math.max(1, minutesIncluded - minutesUsed)
  const maxDurationSeconds = Math.floor(remainingMinutes * 60)


  console.log('Org ' + org.id + ': Executing ' + scheduledCalls.length + ' scheduled call(s)')

  const vapiApiKey = Deno.env.get('VAPI_API_KEY')
  if (!vapiApiKey) {
    console.error('VAPI_API_KEY not configured, skipping call execution')
    return 0
  }

  // Use org's dedicated VAPI phone number ID if available (premium feature)
  // This allows caller ID to show church name instead of "KeepFlock"
  const phoneNumberId = org.vapi_phone_number_id || Deno.env.get('VAPI_PHONE_NUMBER_ID')

  if (!phoneNumberId) {
    console.error('No phone number configured for calls')
    return 0
  }

  let executed = 0
  for (const call of scheduledCalls) {
    if (!call.phone_number) {
      console.log('Org ' + org.id + ': Call ' + call.id + ' has no phone number, marking failed')
      await supabase.from('call_attempts').update({ status: 'failed', error_message: 'No phone number' }).eq('id', call.id)
      continue
    }

    // Re-check minute usage before EACH call
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('minutes_used, minutes_included, overage_approved')
      .eq('id', org.id)
      .single()

    if (currentOrg) {
      const currentUsed = parseFloat(String(currentOrg.minutes_used)) || 0
      const currentIncluded = currentOrg.minutes_included || 0
      if (currentUsed >= currentIncluded && !currentOrg.overage_approved) {
        console.log('Org ' + org.id + ': Minute limit reached mid-execution (' + currentUsed + '/' + currentIncluded + '). Stopping.')
        break
      }
    }

    // Fetch the person's details for variable substitution
    const { data: person } = await supabase
      .from('people')
      .select('first_name, last_name')
      .eq('id', call.person_id)
      .single()

    // Fetch the script content
    const { data: script } = await supabase
      .from('call_scripts')
      .select('content, voice_id')
      .eq('id', call.script_id)
      .single()

    if (!script) {
      console.log('Org ' + org.id + ': No script found for call ' + call.id)
      await supabase.from('call_attempts').update({ status: 'failed', error_message: 'Script not found' }).eq('id', call.id)
      continue
    }

    // Apply variable substitution
    const basePrompt = substituteVariables(script.content, {
      first_name: person?.first_name || '',
      last_name: person?.last_name || '',
      church_name: org.name || '',
      pastor_name: '', // Will be populated when pastor context is available (Epic 6)
      day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    })

    // Enhanced prompt with memory injection (Heroic implementation)
    let conversationGuide = basePrompt
    try {
      conversationGuide = await buildEnhancedPrompt(basePrompt, supabase, call.person_id, org.id)
      console.log('Org ' + org.id + ': Enhanced prompt generated for person ' + call.person_id)
    } catch (err) {
      console.error('Org ' + org.id + ': Failed to build enhanced prompt, falling back to base:', err)
    }

    // Build natural greeting and comprehensive system prompt
    const firstName = person?.first_name || 'there'
    const churchName = org.name || 'your church'
    // Extract purpose from script for a direct opening
    const scriptPurpose = conversationGuide.split(/[.!\n]/)[0]?.trim() || ''
    const purposeSnippet = scriptPurpose.length > 10 && scriptPurpose.length < 200
      ? ` ${scriptPurpose}`
      : ''
    const firstGreeting = `Hi ${firstName}, this is a call from ${churchName}.${purposeSnippet}`

    const systemPrompt = `You are a church assistant calling on behalf of ${churchName}.

CRITICAL RULES:
1. Get to the point IMMEDIATELY. Do NOT ask "how are you" or make small talk before stating the purpose.
2. State the purpose of the call in your FIRST response after the greeting.
3. Keep responses SHORT (1-2 sentences max). Do not ramble.
4. If they respond positively, wrap up quickly. Do not keep asking follow-up questions.
5. If they mention crisis/needs, acknowledge it briefly and note it.
6. The entire call should ideally last under 2 minutes.
7. Use ${firstName}'s name once, not repeatedly.

YOUR SCRIPT/PURPOSE:
${conversationGuide}

Follow the script purpose directly. Do NOT add extra questions or topics beyond what the script says.`

    try {
      const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + vapiApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumberId: phoneNumberId,
          customer: { number: call.phone_number, name: firstName },
          assistant: {
            firstMessage: firstGreeting,
            model: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              messages: [{ role: 'system', content: systemPrompt }],
            },
            voice: {
              provider: '11labs',
              voiceId: resolveVoiceId(script.voice_id),
            },
          },
          maxDurationSeconds: maxDurationSeconds,
        }),
      })

      // Delay between calls to respect VAPI concurrency limits
      await new Promise(resolve => setTimeout(resolve, INTER_CALL_DELAY_MS))

      if (vapiResponse.ok) {
        const vapiData = await vapiResponse.json()
        await supabase
          .from('call_attempts')
          .update({
            status: 'in_progress',
            call_sid: vapiData.id,
            started_at: new Date().toISOString(),
          })
          .eq('id', call.id)

        // Create vapi_call_logs entry so webhook can find and update it
        const cleanPhone = call.phone_number.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`
        await supabase
          .from('vapi_call_logs')
          .insert({
            organization_id: org.id,
            member_id: call.person_id,
            vapi_call_id: vapiData.id,
            phone_number_used: formattedPhone,
            call_status: vapiData.status || 'initiated',
            assistant_id: call.script_id,
            raw_vapi_data: vapiData,
          })

        console.log('Org ' + org.id + ': Started call for person ' + call.person_id + ', VAPI ID: ' + vapiData.id)
        executed++
      } else {
        const errorText = await vapiResponse.text()
        throw new Error('VAPI API error: ' + vapiResponse.status + ' - ' + errorText)
      }
    } catch (err: any) {
      console.error('Org ' + org.id + ': Failed to execute call ' + call.id + ':', err.message)
      await supabase
        .from('call_attempts')
        .update({
          status: 'failed',
          error_message: err.message,
          retry_count: (call.retry_count || 0) + 1,
        })
        .eq('id', call.id)
    }
  }

  return executed
}

// --- RETRY LOGIC ---

async function processRetries(supabase: any, org: Organization): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: failedAttempts } = await supabase
    .from('call_attempts')
    .select('id, retry_count')
    .eq('organization_id', org.id)
    .eq('status', 'failed')
    .lt('retry_count', 2)
    .gte('created_at', oneDayAgo)

  if (!failedAttempts?.length) return 0

  let retried = 0
  for (const attempt of failedAttempts) {
    await supabase
      .from('call_attempts')
      .update({
        status: 'scheduled',
        scheduled_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)
    retried++
  }

  if (retried > 0) {
    console.log('Org ' + org.id + ': Rescheduled ' + retried + ' failed call(s) for retry')
  }
  return retried
}

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Auto Call Trigger: Starting evaluation ===')
    console.log('Timestamp:', new Date().toISOString())

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, calling_window_start, calling_window_end, timezone, phone_number_type, dedicated_phone_number, vapi_phone_number_id, subscription_tier')

    if (orgError) {
      console.error('Error fetching organizations:', orgError)
      throw orgError
    }

    if (!organizations || organizations.length === 0) {
      return new Response(JSON.stringify({ message: 'No organizations found', triggered: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('Found ' + organizations.length + ' organization(s) to evaluate')

    let totalTriggered = 0
    let totalExecuted = 0
    const results: Array<{ orgId: string; triggered: number; executed: number; skipped: string | null }> = []

    for (const org of organizations as Organization[]) {
      if (!isWithinCallingWindow(org)) {
        results.push({ orgId: org.id, triggered: 0, executed: 0, skipped: 'outside_calling_window' })
        continue
      }

      const { data: triggers, error: triggerError } = await supabaseAdmin
        .from('auto_triggers')
        .select('id, organization_id, trigger_type, enabled, script_id, delay_hours, anniversary_milestones')
        .eq('organization_id', org.id)
        .eq('enabled', true)

      if (triggerError) {
        results.push({ orgId: org.id, triggered: 0, executed: 0, skipped: 'trigger_fetch_error' })
        continue
      }

      if (!triggers || triggers.length === 0) {
        results.push({ orgId: org.id, triggered: 0, executed: 0, skipped: 'no_enabled_triggers' })
        continue
      }

      // Check minute usage from organizations table (source of truth)
      const { data: orgUsage } = await supabaseAdmin
        .from('organizations')
        .select('minutes_used, minutes_included')
        .eq('id', org.id)
        .single()

      if (orgUsage) {
        const minutesUsed = parseFloat(String(orgUsage.minutes_used)) || 0
        const minutesIncluded = orgUsage.minutes_included || 0
        if (minutesUsed >= minutesIncluded) {
          console.log('Org ' + org.id + ': Minute limit reached, skipping')
          results.push({ orgId: org.id, triggered: 0, executed: 0, skipped: 'minute_limit_reached' })
          continue
        }
      }

      // Process each enabled trigger
      let orgTriggered = 0
      for (const trigger of triggers as AutoTrigger[]) {
        if (!trigger.script_id) continue

        let triggered = 0
        switch (trigger.trigger_type) {
          case 'first_timer':
            triggered = await processFirstTimerTrigger(supabaseAdmin, org, trigger)
            break
          case 'birthday':
            triggered = await processBirthdayTrigger(supabaseAdmin, org, trigger)
            break
          case 'anniversary':
            triggered = await processAnniversaryTrigger(supabaseAdmin, org, trigger)
            break
        }
        orgTriggered += triggered
      }

      // Process retries for failed calls
      await processRetries(supabaseAdmin, org)

      // Execute all scheduled calls (including newly created ones)
      const orgExecuted = await executeScheduledCalls(supabaseAdmin, org)

      results.push({ orgId: org.id, triggered: orgTriggered, executed: orgExecuted, skipped: null })
      totalTriggered += orgTriggered
      totalExecuted += orgExecuted
    }

    console.log('=== Auto Call Trigger complete. Triggered: ' + totalTriggered + ', Executed: ' + totalExecuted + ' ===')

    return new Response(JSON.stringify({
      message: 'Auto call trigger evaluation complete',
      organizations_evaluated: organizations.length,
      total_triggered: totalTriggered,
      total_executed: totalExecuted,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Auto Call Trigger error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
