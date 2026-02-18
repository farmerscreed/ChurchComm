import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEnhancedPrompt } from "../_shared/context-injection.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voice ID mapping: convert friendly names to ElevenLabs IDs
const VOICE_MAP: Record<string, string> = {
    'rachel': '21m00Tcm4TlvDq8ikWAM',
    'josh': 'TxGEqnHWrfWFTfGW9XjX',
    'bella': 'EXAVITQu4vr4xnSDxMaL',
    'adam': 'pNInz6obpgDQGcFmaJgB',
    'domi': 'AZnzlk1XvdvUeBnXmlld',
    'paula': '21m00Tcm4TlvDq8ikWAM',
};
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

function resolveVoiceId(voiceId: string | null): string {
    if (!voiceId) return DEFAULT_VOICE_ID;
    if (VOICE_MAP[voiceId.toLowerCase()]) return VOICE_MAP[voiceId.toLowerCase()];
    if (voiceId.length > 10) return voiceId;
    return DEFAULT_VOICE_ID;
}

function formatPhone(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, "");
    if (!cleaned.startsWith("1") && cleaned.length === 10) {
        cleaned = "1" + cleaned;
    }
    return "+" + cleaned;
}

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
                let recipients: { id: string; phone_number: string; first_name: string; last_name?: string }[] = [];

                if (outreach.recipient_type === "all") {
                    const { data: members } = await supabase
                        .from("people")
                        .select("id, phone_number, first_name, last_name")
                        .eq("organization_id", outreach.organization_id)
                        .not("phone_number", "is", null);
                    recipients = members || [];
                } else if (outreach.recipient_type === "group" && outreach.recipient_ids?.length > 0) {
                    const groupId = outreach.recipient_ids[0];
                    const { data: groupMembers } = await supabase
                        .from("group_members")
                        .select(`
              people:person_id (
                id,
                phone_number,
                first_name,
                last_name
              )
            `)
                        .eq("group_id", groupId);

                    recipients = (groupMembers || [])
                        .map((gm: any) => gm.people)
                        .filter((p: any) => p && p.phone_number);
                }

                console.log(`Found ${recipients.length} recipients for outreach ${outreach.id}`);

                let sentCount = 0;
                let failedCount = 0;

                if (outreach.message_type === "sms") {
                    // ---- Direct Twilio SMS (no more supabase.functions.invoke) ----
                    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
                    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
                    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

                    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
                        throw new Error("Twilio credentials not configured");
                    }

                    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

                    for (const recipient of recipients) {
                        try {
                            const personalizedContent = outreach.content.replace(
                                /\{Name\}/gi,
                                recipient.first_name || "Friend"
                            );

                            const response = await fetch(twilioUrl, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded",
                                    Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
                                },
                                body: new URLSearchParams({
                                    To: formatPhone(recipient.phone_number),
                                    From: twilioPhoneNumber,
                                    Body: personalizedContent,
                                }),
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.message || `Twilio error: ${response.status}`);
                            }

                            sentCount++;
                        } catch (err) {
                            console.error(`Failed to send SMS to ${recipient.phone_number}:`, err);
                            failedCount++;
                        }
                    }
                } else if (outreach.message_type === "call") {
                    // ---- Direct VAPI call (no more supabase.functions.invoke) ----
                    const scriptId = outreach.subject; // Script ID stored in subject field

                    if (!scriptId) {
                        throw new Error("No script ID found for AI call outreach");
                    }

                    const { data: script, error: scriptError } = await supabase
                        .from("call_scripts")
                        .select("*")
                        .eq("id", scriptId)
                        .single();

                    if (scriptError || !script) {
                        throw new Error(`Script not found: ${scriptId}`);
                    }

                    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
                    const defaultPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID");

                    if (!vapiApiKey || !defaultPhoneNumberId) {
                        throw new Error("VAPI configuration incomplete");
                    }

                    // Get org details for call setup
                    const { data: orgData } = await supabase
                        .from("organizations")
                        .select("name, vapi_phone_number_id, minutes_used, minutes_included")
                        .eq("id", outreach.organization_id)
                        .single();

                    const phoneNumberId = orgData?.vapi_phone_number_id || defaultPhoneNumberId;
                    const orgName = orgData?.name || "your church";
                    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
                    const webhookUrl = `${SUPABASE_URL}/functions/v1/vapi-webhook`;
                    const webhookSecret = Deno.env.get("VAPI_WEBHOOK_SECRET") || "";

                    const INTER_CALL_DELAY_MS = 10000;

                    for (const recipient of recipients) {
                        try {
                            // Check minute limits before each call
                            const { data: currentOrg } = await supabase
                                .from("organizations")
                                .select("minutes_used, minutes_included, overage_approved")
                                .eq("id", outreach.organization_id)
                                .single();

                            if (currentOrg) {
                                const used = parseFloat(String(currentOrg.minutes_used)) || 0;
                                const included = currentOrg.minutes_included || 0;
                                if (used >= included && !currentOrg.overage_approved) {
                                    console.log(`Minute limit reached, stopping calls`);
                                    failedCount += recipients.length - sentCount - failedCount;
                                    break;
                                }
                            }

                            const formattedPhone = formatPhone(recipient.phone_number);
                            const firstName = recipient.first_name || "there";

                            // Create call_attempts record
                            const { data: attempt } = await supabase
                                .from("call_attempts")
                                .insert({
                                    person_id: recipient.id,
                                    phone_number: recipient.phone_number,
                                    provider: "vapi",
                                    status: "in_progress",
                                    organization_id: outreach.organization_id,
                                    script_id: scriptId,
                                })
                                .select()
                                .single();

                            // Build prompt
                            let conversationGuide = script.content.replace(
                                /\{first_name\}/gi,
                                firstName
                            ).replace(
                                /\{church_name\}/gi,
                                orgName
                            );

                            try {
                                conversationGuide = await buildEnhancedPrompt(
                                    conversationGuide,
                                    supabase,
                                    recipient.id,
                                    outreach.organization_id
                                );
                            } catch (_err) {
                                // Fall back to base prompt
                            }

                            const firstGreeting = `Hi ${firstName}, this is a call from ${orgName}. How are you doing today?`;
                            const systemPrompt = `You are a church assistant calling on behalf of ${orgName}.

CRITICAL RULES:
1. Get to the point IMMEDIATELY. Do NOT ask "how are you" or make small talk before stating the purpose.
2. State the purpose of the call in your FIRST response after the greeting.
3. Keep responses SHORT (1-2 sentences max). Do not ramble.
4. If they respond positively, wrap up quickly.
5. If they mention crisis/needs, acknowledge it briefly and note it.
6. The entire call should ideally last under 2 minutes.
7. Use ${firstName}'s name once, not repeatedly.

YOUR SCRIPT/PURPOSE:
${conversationGuide}

Follow the script purpose directly.`;

                            const remainingMinutes = Math.max(1, (currentOrg?.minutes_included || 0) - (parseFloat(String(currentOrg?.minutes_used)) || 0));
                            const maxDurationSeconds = Math.floor(remainingMinutes * 60);

                            const vapiResponse = await fetch("https://api.vapi.ai/call", {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${vapiApiKey}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    phoneNumberId: phoneNumberId,
                                    customer: { number: formattedPhone, name: firstName },
                                    assistantOverrides: {
                                        metadata: {
                                            organization_id: outreach.organization_id,
                                            person_id: recipient.id,
                                        },
                                        serverUrl: webhookUrl,
                                        serverUrlSecret: webhookSecret,
                                    },
                                    assistant: {
                                        name: "Church Connect Assistant",
                                        firstMessage: firstGreeting,
                                        model: {
                                            provider: "openai",
                                            model: "gpt-4o-mini",
                                            messages: [{ role: "system", content: systemPrompt }],
                                        },
                                        voice: {
                                            provider: "11labs",
                                            voiceId: resolveVoiceId(script.voice_id),
                                        },
                                        serverUrl: webhookUrl,
                                        serverUrlSecret: webhookSecret,
                                        analysisPlan: {
                                            summaryPrompt: "Summarize the key points of this conversation in 2-3 sentences.",
                                            structuredDataPrompt: "Extract: 1) Overall sentiment, 2) Any prayer requests, 3) Signs of crisis or need for pastoral care, 4) Specific interests or needs",
                                            structuredDataSchema: {
                                                type: "object",
                                                properties: {
                                                    response_type: { type: "string", enum: ["positive", "neutral", "negative"] },
                                                    crisis_detected: { type: "boolean" },
                                                    crisis_reason: { type: "string" },
                                                    needs_follow_up: { type: "boolean" },
                                                    needs_pastoral_care: { type: "boolean" },
                                                    prayer_requests: { type: "array", items: { type: "string" } },
                                                    interests: { type: "array", items: { type: "string" } },
                                                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                                                },
                                            },
                                        },
                                    },
                                    maxDurationSeconds: maxDurationSeconds,
                                }),
                            });

                            if (vapiResponse.ok) {
                                const vapiData = await vapiResponse.json();

                                // Update call_attempts with call_sid (matching vapi-webhook lookup)
                                await supabase
                                    .from("call_attempts")
                                    .update({
                                        call_sid: vapiData.id,
                                        status: "in_progress",
                                    })
                                    .eq("id", attempt?.id);

                                // Create vapi_call_logs entry (so webhook can find and update it)
                                await supabase
                                    .from("vapi_call_logs")
                                    .insert({
                                        organization_id: outreach.organization_id,
                                        member_id: recipient.id,
                                        vapi_call_id: vapiData.id,
                                        phone_number_used: formattedPhone,
                                        call_status: vapiData.status || "initiated",
                                        assistant_id: scriptId,
                                        raw_vapi_data: vapiData,
                                    });

                                console.log(`Started call for ${recipient.first_name}, VAPI ID: ${vapiData.id}`);
                                sentCount++;
                            } else {
                                const errorText = await vapiResponse.text();
                                throw new Error(`VAPI error: ${vapiResponse.status} - ${errorText}`);
                            }

                            // Delay between calls
                            await new Promise((resolve) => setTimeout(resolve, INTER_CALL_DELAY_MS));
                        } catch (err) {
                            console.error(`Failed to call ${recipient.phone_number}:`, err);
                            failedCount++;
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
