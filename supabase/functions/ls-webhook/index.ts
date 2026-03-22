import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET") ?? "";

// Map variant IDs to module names for identification
const VARIANT_TO_MODULE: Record<string, string> = {};
const moduleVariants = {
    engage: [
        Deno.env.get("LS_VARIANT_ENGAGE_MONTHLY") ?? "",
        Deno.env.get("LS_VARIANT_ENGAGE_ANNUAL") ?? "",
    ],
    reach: [
        Deno.env.get("LS_VARIANT_REACH_MONTHLY") ?? "",
        Deno.env.get("LS_VARIANT_REACH_ANNUAL") ?? "",
    ],
    attract: [
        Deno.env.get("LS_VARIANT_ATTRACT_MONTHLY") ?? "",
        Deno.env.get("LS_VARIANT_ATTRACT_ANNUAL") ?? "",
    ],
    empire: [
        Deno.env.get("LS_VARIANT_EMPIRE_MONTHLY") ?? "",
        Deno.env.get("LS_VARIANT_EMPIRE_ANNUAL") ?? "",
    ],
};

for (const [mod, variants] of Object.entries(moduleVariants)) {
    for (const v of variants) {
        if (v) VARIANT_TO_MODULE[v] = mod;
    }
}

// Module → what active_modules entries it grants
const MODULE_GRANTS: Record<string, string[]> = {
    engage: ["engage"],
    reach: ["reach"],
    attract: ["attract"],
    empire: ["engage", "reach", "attract"],
};

// Module → minutes included (persons called framing: ~50-80 calls ≈ 150-240 min)
const MODULE_MINUTES: Record<string, number> = {
    engage: 200,   // ~65 person calls
    reach: 0,
    attract: 0,
    empire: 200,   // same ENGAGE minutes
};

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
    if (!WEBHOOK_SECRET || !signature) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const digest = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    // Constant-time comparison
    if (digest.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < digest.length; i++) {
        result |= digest.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200 });
    }

    const signature = req.headers.get("X-Signature") ?? "";
    const eventName = req.headers.get("X-Event-Name") ?? "";

    const rawBody = await req.text();

    // Verify webhook signature
    const isValid = await verifySignature(rawBody, signature);
    if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }

    try {
        const payload = JSON.parse(rawBody);
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log(`Processing LS webhook: ${eventName}`);

        const attributes = payload.data?.attributes ?? {};
        const meta = payload.meta ?? {};
        const customData = meta.custom_data ?? attributes.first_subscription_item?.custom_data ?? {};

        // Try to get org ID from custom data or from stored ls_customer_id
        let organizationId = customData.organization_id;
        const lsCustomerId = String(attributes.customer_id ?? "");
        const lsSubscriptionId = String(payload.data?.id ?? "");
        const variantId = String(attributes.variant_id ?? "");
        const moduleName = customData.module || VARIANT_TO_MODULE[variantId] || "";

        // If no org ID in custom data, look up by ls_customer_id
        if (!organizationId && lsCustomerId) {
            const { data: org } = await supabase
                .from("organizations")
                .select("id")
                .eq("ls_customer_id", lsCustomerId)
                .single();
            if (org) organizationId = org.id;
        }

        if (!organizationId) {
            console.error("Could not determine organization_id from webhook payload");
            return new Response(JSON.stringify({ error: "Organization not found" }), { status: 400 });
        }

        switch (eventName) {
            case "subscription_created":
            case "subscription_updated": {
                const status = attributes.status; // on_trial, active, past_due, cancelled, expired, paused, unpaid
                const activeModules = MODULE_GRANTS[moduleName] || [];
                const minutesIncluded = MODULE_MINUTES[moduleName] || 0;
                const customerPortalUrl = attributes.urls?.customer_portal ?? "";
                const billingCycle = customData.billing_cycle || (attributes.variant_name?.toLowerCase().includes("annual") ? "annual" : "monthly");

                // Map LS status to our status
                let subscriptionStatus = "active";
                if (status === "on_trial") subscriptionStatus = "trialing";
                else if (status === "past_due") subscriptionStatus = "past_due";
                else if (status === "cancelled" || status === "expired" || status === "unpaid") subscriptionStatus = "canceled";
                else if (status === "paused") subscriptionStatus = "paused";

                // Build subscription IDs map
                const { data: existingOrg } = await supabase
                    .from("organizations")
                    .select("ls_subscription_ids, active_modules")
                    .eq("id", organizationId)
                    .single();

                const existingSubIds = existingOrg?.ls_subscription_ids || {};
                const updatedSubIds = { ...existingSubIds, [moduleName]: lsSubscriptionId };

                // Merge active modules (for multi-module subscriptions)
                const existingModules: string[] = existingOrg?.active_modules || [];
                const mergedModules = [...new Set([...existingModules, ...activeModules])];

                // For cancelled/expired, remove this module's entries
                if (["cancelled", "expired", "unpaid"].includes(status)) {
                    const modulesToRemove = MODULE_GRANTS[moduleName] || [];
                    const filteredModules = mergedModules.filter(m => !modulesToRemove.includes(m));

                    await supabase
                        .from("organizations")
                        .update({
                            active_modules: filteredModules,
                            subscription_status: filteredModules.length > 0 ? "active" : subscriptionStatus,
                            subscription_tier: filteredModules.length > 0
                                ? (filteredModules.length === 3 ? "empire" : filteredModules[0])
                                : "free",
                            ls_subscription_ids: updatedSubIds,
                            ls_customer_portal_url: customerPortalUrl || undefined,
                        })
                        .eq("id", organizationId);
                } else {
                    const trialEndsAt = attributes.trial_ends_at
                        ? new Date(attributes.trial_ends_at).toISOString()
                        : null;

                    await supabase
                        .from("organizations")
                        .update({
                            active_modules: mergedModules,
                            subscription_status: subscriptionStatus,
                            subscription_plan: moduleName,
                            subscription_tier: mergedModules.length === 3 ? "empire" : moduleName,
                            billing_cycle: billingCycle,
                            ls_customer_id: lsCustomerId,
                            ls_subscription_ids: updatedSubIds,
                            ls_customer_portal_url: customerPortalUrl || undefined,
                            minutes_included: minutesIncluded > 0 ? minutesIncluded : undefined,
                            trial_ends_at: trialEndsAt,
                            current_period_end: attributes.renews_at
                                ? new Date(attributes.renews_at).toISOString()
                                : undefined,
                        })
                        .eq("id", organizationId);
                }

                console.log(`Org ${organizationId}: ${eventName} → ${moduleName} (${subscriptionStatus}), modules: [${mergedModules}]`);
                break;
            }

            case "subscription_cancelled": {
                const modulesToRemove = MODULE_GRANTS[moduleName] || [];
                const { data: org } = await supabase
                    .from("organizations")
                    .select("active_modules")
                    .eq("id", organizationId)
                    .single();

                const remaining = (org?.active_modules || []).filter(
                    (m: string) => !modulesToRemove.includes(m)
                );

                await supabase
                    .from("organizations")
                    .update({
                        active_modules: remaining,
                        subscription_status: remaining.length > 0 ? "active" : "canceled",
                        subscription_tier: remaining.length === 3 ? "empire" : (remaining[0] || "free"),
                        subscription_plan: remaining[0] || "free",
                    })
                    .eq("id", organizationId);

                console.log(`Org ${organizationId}: subscription cancelled for ${moduleName}, remaining: [${remaining}]`);
                break;
            }

            case "subscription_payment_success": {
                // Reset minutes on new billing period
                await supabase
                    .from("organizations")
                    .update({
                        subscription_status: "active",
                        minutes_used: 0,
                    })
                    .eq("id", organizationId);

                console.log(`Payment success for org ${organizationId}, minutes reset`);
                break;
            }

            case "subscription_payment_failed": {
                await supabase
                    .from("organizations")
                    .update({ subscription_status: "past_due" })
                    .eq("id", organizationId);

                console.log(`Payment failed for org ${organizationId}`);
                break;
            }

            case "subscription_expired": {
                await supabase
                    .from("organizations")
                    .update({
                        active_modules: [],
                        subscription_status: "canceled",
                        subscription_tier: "free",
                        subscription_plan: "free",
                        minutes_included: 0,
                    })
                    .eq("id", organizationId);

                console.log(`Subscription expired for org ${organizationId}`);
                break;
            }

            default:
                console.log(`Unhandled LS event: ${eventName}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("LS webhook error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
});
