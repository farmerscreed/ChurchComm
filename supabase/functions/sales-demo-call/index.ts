import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: max 1 call per phone per 24h, max 20 calls per day total
const phoneCallTimes: Record<string, number> = {};
let dailyCallCount = 0;
let dailyResetAt = Date.now() + 86400_000;

function isCallRateLimited(phone: string): string | null {
  const now = Date.now();
  if (now > dailyResetAt) {
    dailyCallCount = 0;
    dailyResetAt = now + 86400_000;
  }
  if (dailyCallCount >= 20) {
    return 'Daily call limit reached. Please try again tomorrow.';
  }
  const lastCall = phoneCallTimes[phone];
  if (lastCall && now - lastCall < 86400_000) {
    return 'A call was already made to this number recently. Please try again tomorrow.';
  }
  return null;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.startsWith('+')) return phone;
  return `+${digits}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
  const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');

  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
    console.error('Missing VAPI_API_KEY or VAPI_PHONE_NUMBER_ID');
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { first_name, church_name, phone_number, email, eligibility_result } = body;

    // Validate required fields
    if (!first_name || !phone_number) {
      return new Response(JSON.stringify({ error: 'first_name and phone_number are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formattedPhone = formatPhone(phone_number);
    if (formattedPhone.replace(/\D/g, '').length < 10) {
      return new Response(JSON.stringify({ error: 'Please enter a valid US phone number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const rateLimitMsg = isCallRateLimited(formattedPhone);
    if (rateLimitMsg) {
      return new Response(JSON.stringify({ error: rateLimitMsg }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Find or create lead
    let leadId: string | null = null;
    if (email) {
      const { data: lead } = await supabase
        .from('kf_leads')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (lead) {
        leadId = lead.id;
        await supabase
          .from('kf_leads')
          .update({
            first_name,
            church_name: church_name || undefined,
            phone: formattedPhone,
            demo_call_requested: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);
      }
    }

    // Build personalized sales script
    const qualified = eligibility_result?.result === 'qualified';
    const churchRef = church_name ? ` with ${church_name}` : '';
    const eligibilityContext = qualified
      ? `Based on ${first_name}'s eligibility check, their church likely qualifies for the Google Ad Grant. This is great news to share.`
      : `${first_name} recently checked their eligibility. Guide them through what they need to qualify.`;

    const systemPrompt = `You are Sarah from KeepFlock. You're calling ${first_name}${churchRef} who just showed interest in the Google Ad Grant through the KeepFlock website. This is a warm, conversational outbound call — NOT a scripted sales pitch.

## WHO YOU ARE
You're genuinely passionate about helping churches grow. You talk like a real person — you pause, you react to what they say, you go off-script when the conversation flows that way. You never sound like you're reading. You're knowledgeable but casual. Think of yourself as a friend who happens to know a lot about church growth tools.

## CONTEXT
${eligibilityContext}

## WHAT TO COVER (in your own words, in whatever order feels natural)

**The $10K Google Ad Grant (REACH)**
The hook that got them interested. Google literally gives qualifying churches $10,000/month in free Google Ads. Most churches have never heard of it. KeepFlock helps them check eligibility and walks them through the whole application — that part is completely free. When people nearby search for a church, their church shows up at the top.

**Grant Protection (ATTRACT)**
Something most people don't know: Google suspends roughly 30% of Ad Grant accounts for compliance violations — click-through rates, keyword quality, spending rules. KeepFlock has a system called GUARDIAN that watches the account 24/7. It catches problems like dropping CTR or bad keywords and handles them before Google pulls the plug. It's basically insurance for the $10K.

**AI Calling & Texting (ENGAGE) — this is the wow moment**
This is the part that really changes things. KeepFlock has AI-powered voice calls and SMS built in. Think about: every member getting a personalized birthday call from the church. Every first-time visitor getting a warm follow-up the next day. SMS campaigns going out to the whole congregation in minutes. The calls sound natural — not robotic. The AI knows each person's name, speaks with warmth, adjusts to the conversation. It's like having a full-time outreach pastor who never forgets anyone and works around the clock. Let your enthusiasm show here — this feature genuinely excites you.

**How it all ties together**
Three pillars, one platform: get the grant (REACH, free), protect it (ATTRACT), and keep your congregation engaged (ENGAGE). They can start free today at keepflock.com.

## HOW TO HANDLE THE CONVERSATION
- Open by introducing yourself, mentioning you saw their interest in the Ad Grant, and asking if they have a couple minutes
- Read their energy — if they're excited, match it. If they're reserved, be more measured
- If they ask questions, drop the flow and just answer. Come back to your points naturally
- If they seem busy, offer to call back or just point them to keepflock.com
- If they ask about pricing: the grant tools are free. ATTRACT (monitoring) is $199/mo. ENGAGE (AI calls/texts) is $59/mo. Full platform is $229/mo, saves about $29. Suggest starting free
- If they want to hear what the AI calls sound like, offer to send them a sample birthday call after you hang up
- If you don't know something, be honest and say the team will follow up by email
- End warmly — thank them, mention you'll send a summary email, wish them well

## BOUNDARIES
- Keep it under 3 minutes unless they're asking lots of questions
- Never be pushy. You're informing, not closing
- Don't make up stats or claim lots of churches use KeepFlock — you're honest that it's new
- Don't recite memorized sentences. Every call should sound different because every conversation IS different`;


    const firstMessage = `Hi ${first_name}, this is Sarah from KeepFlock! I saw you were checking out the Google Ad Grant for your church — that's $10,000 every month in free Google advertising. I'd love to give you a quick rundown on that and a couple other things we do to help churches grow. Do you have about two minutes?`;

    // Create Vapi call
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/vapi-webhook`;

    const vapiPayload = {
      phoneNumberId: VAPI_PHONE_NUMBER_ID,
      customer: { number: formattedPhone },
      assistantOverrides: {
        firstMessage,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.7,
        },
        voice: {
          provider: '11labs',
          voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel — warm, professional female
          stability: 0.6,
          similarityBoost: 0.8,
        },
        serverUrl: webhookUrl,
        maxDurationSeconds: 180, // 3 min max
        endCallMessage: `Thanks for your time, ${first_name}! Check your email for a summary. Have a great day!`,
      },
    };

    console.log(`Initiating sales demo call to ${formattedPhone} for ${first_name}`);

    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiPayload),
    });

    const vapiData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('Vapi call failed:', vapiData);
      return new Response(JSON.stringify({ error: 'Failed to initiate call. Please try again.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the call
    const { error: logError } = await supabase
      .from('demo_call_logs')
      .insert({
        lead_id: leadId,
        phone_number: formattedPhone,
        first_name,
        church_name: church_name || null,
        vapi_call_id: vapiData.id || null,
        status: 'initiated',
      });

    if (logError) {
      console.error('Failed to log demo call:', logError);
    }

    // Update rate limit tracking
    phoneCallTimes[formattedPhone] = Date.now();
    dailyCallCount++;

    console.log(`Sales demo call initiated: ${vapiData.id} to ${formattedPhone}`);

    return new Response(
      JSON.stringify({
        status: 'calling',
        call_id: vapiData.id,
        message: `We're calling you now, ${first_name}! Pick up in about 30 seconds.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('sales-demo-call error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
