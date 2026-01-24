import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
            status: 400,
        });
    }

    try {
        const body = await req.text();
        const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log(`Processing Stripe event: ${event.type}`);

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const organizationId = session.metadata?.organization_id;
                const tier = session.metadata?.tier;

                if (organizationId && tier) {
                    await supabase
                        .from("organizations")
                        .update({
                            subscription_plan: tier,
                            subscription_status: "trialing",
                            stripe_subscription_id: session.subscription as string,
                            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                        })
                        .eq("id", organizationId);

                    console.log(`Organization ${organizationId} subscribed to ${tier}`);
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const organizationId = subscription.metadata?.organization_id;

                if (organizationId) {
                    const status = subscription.status;
                    let subscriptionStatus = "active";

                    if (status === "trialing") subscriptionStatus = "trialing";
                    else if (status === "past_due") subscriptionStatus = "past_due";
                    else if (status === "canceled" || status === "unpaid") subscriptionStatus = "canceled";

                    await supabase
                        .from("organizations")
                        .update({
                            subscription_status: subscriptionStatus,
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        })
                        .eq("id", organizationId);

                    console.log(`Subscription updated for org ${organizationId}: ${subscriptionStatus}`);
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const organizationId = subscription.metadata?.organization_id;

                if (organizationId) {
                    await supabase
                        .from("organizations")
                        .update({
                            subscription_status: "canceled",
                            subscription_plan: "free",
                        })
                        .eq("id", organizationId);

                    console.log(`Subscription canceled for org ${organizationId}`);
                }
                break;
            }

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = invoice.subscription as string;

                if (subscriptionId) {
                    // Get org by subscription ID
                    const { data: org } = await supabase
                        .from("organizations")
                        .select("id")
                        .eq("stripe_subscription_id", subscriptionId)
                        .single();

                    if (org) {
                        await supabase
                            .from("organizations")
                            .update({
                                subscription_status: "active",
                            })
                            .eq("id", org.id);

                        console.log(`Payment succeeded for org ${org.id}`);
                    }
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = invoice.subscription as string;

                if (subscriptionId) {
                    const { data: org } = await supabase
                        .from("organizations")
                        .select("id")
                        .eq("stripe_subscription_id", subscriptionId)
                        .single();

                    if (org) {
                        await supabase
                            .from("organizations")
                            .update({
                                subscription_status: "past_due",
                            })
                            .eq("id", org.id);

                        console.log(`Payment failed for org ${org.id}`);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("Webhook error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
        });
    }
});
