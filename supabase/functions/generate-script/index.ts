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

    const { organization_id, purpose, tone, key_points, denomination_style, desired_duration } = await req.json()

    if (!organization_id || !purpose) {
      return new Response(JSON.stringify({ error: 'organization_id and purpose are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check rate limit (max 10 per org per day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('script_generations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id)
      .gte('created_at', today.toISOString())

    if ((count || 0) >= 10) {
      return new Response(JSON.stringify({
        error: 'Daily generation limit reached (10 per day). Try again tomorrow.'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate script with Claude
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'AI generation not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        system: `You are an expert at creating AI phone call scripts for church communication.

Your scripts should:
- Be warm, pastoral, and appropriate for church contexts
- Include variable placeholders like {first_name}, {last_name}, {church_name}, {pastor_name}, {day_of_week}, {membership_duration}
- Be conversational and natural for AI voice synthesis
- Include appropriate responses to common situations (positive, neutral, negative reactions)
- Include voicemail fallback text
- Match the specified tone and duration

Output ONLY a valid JSON object (no markdown, no explanation) with these fields:
- "name": A short title for the script (2-5 words)
- "description": A one-sentence description of what this script does
- "prompt": The full AI assistant prompt text (this is what the AI voice agent will follow as its system instructions)`,
        messages: [{
          role: 'user',
          content: `Create a church call script with these requirements:

Purpose: ${purpose}
Tone: ${tone || 'warm'}
Key Points to Cover: ${(key_points || []).join(', ') || 'General conversation'}
Church Style: ${denomination_style || 'Non-denominational'}
Desired Duration: ${desired_duration || 'medium (5 minutes)'}

Remember to include {first_name}, {church_name}, and {pastor_name} variables where appropriate.
Output ONLY the JSON object, no other text.`
        }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return new Response(JSON.stringify({ error: 'AI generation failed. Please try again.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await response.json()
    const content = claudeData.content?.[0]?.text || ''

    // Parse the JSON from Claude's response
    let scriptData: { name: string; description: string; prompt: string }
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      scriptData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      if (!scriptData?.prompt) throw new Error('Missing prompt field')
    } catch {
      scriptData = {
        name: 'Generated Script',
        description: purpose,
        prompt: content,
      }
    }

    // Log generation for rate limiting
    await supabase.from('script_generations').insert({
      organization_id,
      purpose,
    })

    return new Response(JSON.stringify(scriptData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Generate script error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
