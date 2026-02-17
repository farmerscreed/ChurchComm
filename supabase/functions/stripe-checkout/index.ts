import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
});

// Map tier + billing cycle to Stripe price IDs from environment variables.
// Set these via: supabase secrets set STRIPE_PRICE_STARTER_MONTHLY=price_xxx
const PRICE_IDS: Record<string, Record<string, string>> = {
    starter: {
        monthly: Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY") ?? "",
        annual: Deno.env.get("STRIPE_PRICE_STARTER_ANNUAL") ?? "",
    },
    growth: {
        monthly: Deno.env.get("STRIPE_PRICE_GROWTH_MONTHLY") ?? "",
        annual: Deno.env.get("STRIPE_PRICE_GROWTH_ANNUAL") ?? "",
    },
    pro: {
        monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") ?? "",
        annual: Deno.env.get("STRIPE_PRICE_PRO_ANNUAL") ?? "",
    },
    enterprise: {
        monthly: Deno.env.get("STRIPE_PRICE_ENTERPRISE_MONTHLY") ?? "",
        annual: Deno.env.get("STRIPE_PRICE_ENTERPRISE_ANNUAL") ?? "",
    },
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get authenticated user
        const authHeader = req.headers.get("Authorization");
        console.log("Auth header present:", !!authHeader);
        if (!authHeader) {
            console.error("Missing authorization header");
            return new Response(JSON.stringify({ error: "Missing authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth error:", authError?.message, "User found:", !!user);
            return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        console.log("Authenticated user:", user.id);

        const { tier, billing_cycle, organization_id } = await req.json();

        if (!tier || !billing_cycle || !organization_id) {
            return new Response(JSON.stringify({ error: "Missing required fields: tier, billing_cycle, organization_id" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Verify user belongs to organization
        const { data: membership, error: memberError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", organization_id)
            .single();

        if (memberError || !membership) {
            return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Only admins can manage billing
        if (membership.role !== "admin") {
            return new Response(JSON.stringify({ error: "Only admins can manage billing" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get or create Stripe customer
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("stripe_customer_id, name")
            .eq("id", organization_id)
            .single();

        if (orgError || !org) {
            return new Response(JSON.stringify({ error: "Organization not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let customerId = org.stripe_customer_id;

        if (!customerId) {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: user.email,
                name: org.name,
                metadata: {
                    organization_id,
                    supabase_user_id: user.id,
                },
            });
            customerId = customer.id;

            // Save customer ID to organization
            await supabase
                .from("organizations")
                .update({ stripe_customer_id: customerId })
                .eq("id", organization_id);
        }

        // Get price ID for selected tier/cycle
        const priceId = PRICE_IDS[tier]?.[billing_cycle];
        if (!priceId) {
            return new Response(JSON.stringify({ error: `Invalid tier "${tier}" or billing cycle "${billing_cycle}"` }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Create Stripe checkout session
        const appUrl = Deno.env.get("APP_URL") ?? "https://keepflock.com";

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                metadata: {
                    organization_id,
                    tier,
                    billing_cycle,
                },
            },
            success_url: `${appUrl}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/pricing?cancelled=true`,
            metadata: {
                organization_id,
                tier,
                billing_cycle,
            },
            allow_promotion_codes: true,
        });

        return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Stripe checkout error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
