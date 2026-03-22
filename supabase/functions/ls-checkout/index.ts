import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LS_API_URL = "https://api.lemonsqueezy.com/v1";
const LS_API_KEY = Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "";
const LS_STORE_ID = Deno.env.get("LEMONSQUEEZY_STORE_ID") ?? "";

// Map module + billing cycle to LemonSqueezy variant IDs
const VARIANT_IDS: Record<string, Record<string, string>> = {
    engage: {
        monthly: Deno.env.get("LS_VARIANT_ENGAGE_MONTHLY") ?? "",
        annual: Deno.env.get("LS_VARIANT_ENGAGE_ANNUAL") ?? "",
    },
    reach: {
        monthly: Deno.env.get("LS_VARIANT_REACH_MONTHLY") ?? "",
        annual: Deno.env.get("LS_VARIANT_REACH_ANNUAL") ?? "",
    },
    attract: {
        monthly: Deno.env.get("LS_VARIANT_ATTRACT_MONTHLY") ?? "",
        annual: Deno.env.get("LS_VARIANT_ATTRACT_ANNUAL") ?? "",
    },
    empire: {
        monthly: Deno.env.get("LS_VARIANT_EMPIRE_MONTHLY") ?? "",
        annual: Deno.env.get("LS_VARIANT_EMPIRE_ANNUAL") ?? "",
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

        // Authenticate user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { module, billing_cycle, organization_id } = await req.json();

        if (!module || !billing_cycle || !organization_id) {
            return new Response(JSON.stringify({ error: "Missing required fields: module, billing_cycle, organization_id" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Verify user belongs to organization and is admin
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

        if (membership.role !== "admin") {
            return new Response(JSON.stringify({ error: "Only admins can manage billing" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get variant ID for selected module/cycle
        const variantId = VARIANT_IDS[module]?.[billing_cycle];
        if (!variantId) {
            return new Response(JSON.stringify({ error: `Invalid module "${module}" or billing cycle "${billing_cycle}"` }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get org name for checkout
        const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", organization_id)
            .single();

        const appUrl = Deno.env.get("APP_URL") ?? "https://keepflock.com";

        // Create LemonSqueezy checkout via API
        const checkoutRes = await fetch(`${LS_API_URL}/checkouts`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${LS_API_KEY}`,
                "Content-Type": "application/vnd.api+json",
                "Accept": "application/vnd.api+json",
            },
            body: JSON.stringify({
                data: {
                    type: "checkouts",
                    attributes: {
                        checkout_data: {
                            email: user.email,
                            name: org?.name || "",
                            custom: {
                                organization_id,
                                module,
                                billing_cycle,
                                user_id: user.id,
                            },
                        },
                        checkout_options: {
                            embed: false,
                            media: false,
                            logo: true,
                            desc: true,
                            discount: true,
                            subscription_preview: true,
                        },
                        product_options: {
                            redirect_url: `${appUrl}/settings?billing=success`,
                        },
                    },
                    relationships: {
                        store: {
                            data: {
                                type: "stores",
                                id: LS_STORE_ID,
                            },
                        },
                        variant: {
                            data: {
                                type: "variants",
                                id: variantId,
                            },
                        },
                    },
                },
            }),
        });

        if (!checkoutRes.ok) {
            const errText = await checkoutRes.text();
            console.error("LemonSqueezy checkout error:", checkoutRes.status, errText);
            return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const checkoutData = await checkoutRes.json();
        const checkoutUrl = checkoutData.data?.attributes?.url;

        if (!checkoutUrl) {
            console.error("No checkout URL in response:", JSON.stringify(checkoutData));
            return new Response(JSON.stringify({ error: "No checkout URL returned" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ url: checkoutUrl }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("ls-checkout error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
