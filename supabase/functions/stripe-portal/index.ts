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
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace("Bearer ", "")
        );

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { organization_id } = await req.json();

        if (!organization_id) {
            return new Response(JSON.stringify({ error: "Missing organization_id" }), {
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

        // Only admins can access billing portal
        if (membership.role !== "admin") {
            return new Response(JSON.stringify({ error: "Only admins can access billing" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get organization's Stripe customer ID
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("stripe_customer_id")
            .eq("id", organization_id)
            .single();

        if (orgError || !org) {
            return new Response(JSON.stringify({ error: "Organization not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!org.stripe_customer_id) {
            return new Response(JSON.stringify({ error: "No billing account found. Please subscribe to a plan first." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Create Stripe billing portal session
        const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:8080";

        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripe_customer_id,
            return_url: `${appUrl}/settings?tab=billing`,
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Stripe portal error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
