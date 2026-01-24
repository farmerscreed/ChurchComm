import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createEmbedding1536 } from "../_shared/embeddings.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { text } = await req.json();

        if (!text || typeof text !== "string") {
            return new Response(
                JSON.stringify({ error: "Missing or invalid 'text' field" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
            );
        }

        // Use 1536 dimensions for church_memories compatibility
        const embedding = await createEmbedding1536(text);

        return new Response(
            JSON.stringify({ embedding }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Generate embedding error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
