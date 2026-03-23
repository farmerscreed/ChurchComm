import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GUARDIAN_API_KEY = Deno.env.get("GUARDIAN_API_KEY") ?? "";
const GUARDIAN_BASE_URL = "http://localhost:8001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Strip /guardian-proxy prefix; forward the rest to GUARDIAN
    const upstreamPath = url.pathname.replace(/^\/guardian-proxy/, "") || "/";
    const upstreamUrl = `${GUARDIAN_BASE_URL}${upstreamPath}${url.search}`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${GUARDIAN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    const data = await upstreamRes.json();

    return new Response(JSON.stringify(data), {
      status: upstreamRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("guardian-proxy error:", err);
    // Return 503 so the client knows the upstream is unreachable
    return new Response(
      JSON.stringify({ error: "GUARDIAN unreachable", detail: String(err) }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
