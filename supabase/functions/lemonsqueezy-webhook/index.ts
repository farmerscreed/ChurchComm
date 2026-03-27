import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Variant → module mapping ──────────────────────────────────────────────────

// REACH is free — no variant mapping needed. Only paid modules tracked here.
const VARIANT_MODULE_MAP: Record<number, string[]> = {
  1432323: ['engage'],              // ENGAGE monthly
  1432332: ['engage'],              // ENGAGE annual
  1432351: ['attract'],             // ATTRACT monthly
  1432352: ['attract'],             // ATTRACT annual
  1432355: ['engage', 'attract'],   // Full Platform monthly (bundle)
  1432361: ['engage', 'attract'],   // Full Platform annual (bundle)
};

// ── HMAC-SHA256 signature verification ───────────────────────────────────────

async function verifySignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === signature;
}

// ── Edge function ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET') ?? '';
  const signature = req.headers.get('X-Signature') ?? '';

  console.log('LemonSqueezy webhook received', {
    method: req.method,
    hasSignature: !!signature,
    hasSecret: !!webhookSecret,
  });

  if (!signature) {
    console.error('Missing X-Signature header');
    return new Response(JSON.stringify({ error: 'Missing X-Signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();

  const valid = await verifySignature(rawBody, signature, webhookSecret);
  if (!valid) {
    console.error('Invalid webhook signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error('Failed to parse webhook body', err);
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const eventName: string = payload?.meta?.event_name ?? '';
  console.log(`Processing LemonSqueezy event: ${eventName}`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const HANDLED_EVENTS = [
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'subscription_expired',
  ];

  if (!HANDLED_EVENTS.includes(eventName)) {
    // Return 200 to prevent LemonSqueezy from retrying unrecognised events,
    // but log it as unrecognised.
    console.log(`Unrecognised event type: ${eventName} — acknowledging without action`);
    return new Response(
      JSON.stringify({ received: true, action: 'ignored', event: eventName }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const attributes = payload?.data?.attributes ?? {};
  const customerEmail: string = attributes?.customer_email ?? attributes?.user_email ?? '';

  if (!customerEmail) {
    console.error('No customer_email found in webhook payload');
    return new Response(
      JSON.stringify({ error: 'Missing customer_email in payload' }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // ── Find organization by customer email via auth.users ────────────────────

  // Look up the auth user by email
  const { data: userRecord, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Failed to list users', userError);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const matchedUser = userRecord?.users?.find(
    (u) => u.email?.toLowerCase() === customerEmail.toLowerCase(),
  );

  if (!matchedUser) {
    console.error(`No auth user found for email: ${customerEmail}`);
    // Return 200 so LS does not retry — we just can't find the user
    return new Response(
      JSON.stringify({ received: true, action: 'no_user_found', email: customerEmail }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Find the organization the user belongs to (take the first membership)
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', matchedUser.id)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    console.error('No organization membership found for user', matchedUser.id, membershipError);
    return new Response(
      JSON.stringify({ received: true, action: 'no_org_found', userId: matchedUser.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const orgId: string = membership.organization_id;

  // ── Handle event ──────────────────────────────────────────────────────────

  if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    // Clear all plan modules
    const { error: clearError } = await supabase
      .from('organizations')
      .update({ plan_modules: [] })
      .eq('id', orgId);

    if (clearError) {
      console.error('Failed to clear plan_modules', clearError);
      return new Response(JSON.stringify({ error: 'Database update failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Cleared plan_modules for org ${orgId} on event ${eventName}`);
    return new Response(JSON.stringify({ received: true, orgId, action: 'cleared' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // subscription_created or subscription_updated
  const variantId: number = Number(attributes?.variant_id);
  const modules = VARIANT_MODULE_MAP[variantId];

  if (!modules) {
    console.error(`Unrecognised variant_id: ${variantId}`);
    // Return 200 to stop retries; unrecognised variant is not a transient error
    return new Response(
      JSON.stringify({ received: true, action: 'unknown_variant', variantId }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ plan_modules: modules })
    .eq('id', orgId);

  if (updateError) {
    console.error('Failed to update plan_modules', updateError);
    return new Response(JSON.stringify({ error: 'Database update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`Updated plan_modules for org ${orgId} to [${modules.join(', ')}] (variant ${variantId})`);

  // ── Send confirmation email ───────────────────────────────────────────────
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (RESEND_API_KEY && customerEmail) {
    const moduleNames = modules.map((m: string) => m.toUpperCase()).join(' + ');
    const isBundle = modules.length >= 3;
    const planName = isBundle ? 'Full Platform' : moduleNames;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KeepFlock <hello@keepflock.com>',
          to: [customerEmail],
          subject: `Welcome to KeepFlock ${planName}!`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 16px;">Welcome to KeepFlock!</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Your <strong>${planName}</strong> subscription is now active. Here's what you can do next:
              </p>
              <ul style="color: #475569; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                ${modules.includes('engage') ? '<li><strong>ENGAGE:</strong> Import your members, set up AI voice calls and SMS campaigns</li>' : ''}
                ${modules.includes('attract') ? '<li><strong>ATTRACT:</strong> Connect your Google Ads account and let GUARDIAN monitor your grant 24/7</li>' : ''}
                ${modules.includes('reach') ? '<li><strong>REACH:</strong> Run your eligibility check and start your Ad Grant application</li>' : ''}
              </ul>
              <div style="margin-top: 32px;">
                <a href="https://keepflock.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Go to Your Dashboard
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">
                Questions? Reply to this email — we're here to help.<br/>
                — The KeepFlock Team
              </p>
            </div>
          `,
        }),
      });
      console.log(`Confirmation email sent to ${customerEmail} for ${planName}`);
    } catch (emailErr) {
      // Don't fail the webhook if email fails — modules are already activated
      console.error('Failed to send confirmation email', emailErr);
    }
  }

  return new Response(
    JSON.stringify({ received: true, orgId, modules, variantId }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
