import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

        const now = new Date().toISOString();

        // Fetch all scheduled outreaches that are due
        const { data: dueOutreaches, error: fetchError } = await supabase
            .from("scheduled_messages")
            .select("*")
            .eq("status", "scheduled")
            .lte("scheduled_for", now);

        if (fetchError) {
            console.error("Error fetching due outreaches:", fetchError);
            throw fetchError;
        }

        console.log(`Found ${dueOutreaches?.length || 0} outreaches due for execution`);

        const results: { id: string; success: boolean; error?: string }[] = [];

        for (const outreach of dueOutreaches || []) {
            console.log(`Processing outreach ${outreach.id} (type: ${outreach.message_type})`);

            try {
                // Mark as processing
                await supabase
                    .from("scheduled_messages")
                    .update({ status: "processing" })
                    .eq("id", outreach.id);

                // Get recipients
                let recipients: { id: string; phone: string; first_name: string }[] = [];

                if (outreach.recipient_type === "all") {
                    // Get all members with phone numbers
                    const { data: members } = await supabase
                        .from("people")
                        .select("id, phone, first_name")
                        .eq("organization_id", outreach.organization_id)
                        .not("phone", "is", null);
                    recipients = members || [];
                } else if (outreach.recipient_type === "group" && outreach.recipient_ids?.length > 0) {
                    // Get members of specific group(s)
                    const groupId = outreach.recipient_ids[0];
                    const { data: groupMembers } = await supabase
                        .from("group_members")
                        .select(`
              people:person_id (
                id,
                phone,
                first_name
              )
            `)
                        .eq("group_id", groupId);

                    recipients = (groupMembers || [])
                        .map((gm: any) => gm.people)
                        .filter((p: any) => p && p.phone);
                }

                console.log(`Found ${recipients.length} recipients for outreach ${outreach.id}`);

                let sentCount = 0;
                let failedCount = 0;

                if (outreach.message_type === "sms") {
                    // Send SMS to each recipient
                    for (const recipient of recipients) {
                        try {
                            // Personalize message
                            const personalizedContent = outreach.content.replace(
                                /\{Name\}/gi,
                                recipient.first_name || "Friend"
                            );

                            const { error: smsError } = await supabase.functions.invoke("send-sms", {
                                body: {
                                    to: recipient.phone,
                                    message: personalizedContent,
                                    organization_id: outreach.organization_id,
                                },
                            });

                            if (smsError) throw smsError;
                            sentCount++;
                        } catch (err) {
                            console.error(`Failed to send SMS to ${recipient.phone}:`, err);
                            failedCount++;
                        }
                    }
                } else if (outreach.message_type === "call") {
                    // Execute AI calls
                    const scriptId = outreach.subject; // Script ID is stored in subject field

                    if (!scriptId) {
                        throw new Error("No script ID found for AI call outreach");
                    }

                    // Get the script
                    const { data: script, error: scriptError } = await supabase
                        .from("call_scripts")
                        .select("*")
                        .eq("id", scriptId)
                        .single();

                    if (scriptError || !script) {
                        throw new Error(`Script not found: ${scriptId}`);
                    }

                    // Queue calls for each recipient via send-group-call
                    const recipientIds = recipients.map((r) => r.id);

                    if (recipientIds.length > 0) {
                        const { data: callResult, error: callError } = await supabase.functions.invoke(
                            "send-group-call",
                            {
                                body: {
                                    organization_id: outreach.organization_id,
                                    script_id: scriptId,
                                    recipient_ids: recipientIds,
                                },
                            }
                        );

                        if (callError) {
                            console.error("Error initiating group call:", callError);
                            failedCount = recipientIds.length;
                        } else {
                            sentCount = callResult?.successful || recipientIds.length;
                            failedCount = callResult?.failed || 0;
                        }
                    }
                }

                // Update outreach status
                const finalStatus = failedCount === 0 ? "completed" : sentCount > 0 ? "completed" : "failed";

                await supabase
                    .from("scheduled_messages")
                    .update({
                        status: finalStatus,
                        sent_count: sentCount,
                        failed_count: failedCount,
                    })
                    .eq("id", outreach.id);

                results.push({ id: outreach.id, success: true });
                console.log(`Outreach ${outreach.id} completed: ${sentCount} sent, ${failedCount} failed`);
            } catch (err) {
                console.error(`Error processing outreach ${outreach.id}:`, err);

                // Mark as failed
                await supabase
                    .from("scheduled_messages")
                    .update({ status: "failed" })
                    .eq("id", outreach.id);

                results.push({
                    id: outreach.id,
                    success: false,
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                results,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Execute scheduled outreach error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
