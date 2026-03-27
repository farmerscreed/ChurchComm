import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GUARDIAN_API_KEY = Deno.env.get("GUARDIAN_API_KEY") ?? "";
const GUARDIAN_BASE_URL = Deno.env.get("GUARDIAN_BASE_URL") ?? "https://guardian.lawonecloud.com";

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

    // Supabase edge functions are invoked via POST with a JSON body.
    // The client sends { path: "/api/status/xxx-xxx-xxxx", method?: "POST" }
    // to tell us which Guardian endpoint to hit.
    let upstreamPath = url.pathname.replace(/^\/guardian-proxy/, "") || "/";
    let upstreamMethod = req.method;
    let forwardBody: string | undefined;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.path) {
          upstreamPath = body.path;
          upstreamMethod = body.method ?? "GET";
          // Forward any extra payload (excluding our routing fields)
          const { path: _p, method: _m, ...rest } = body;
          forwardBody = Object.keys(rest).length > 0 ? JSON.stringify(rest) : undefined;
        }
      } catch {
        // Not JSON — fall through to path-based routing
      }
    }

    const upstreamUrl = `${GUARDIAN_BASE_URL}${upstreamPath}${url.search}`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: upstreamMethod,
      headers: {
        "x-api-key": GUARDIAN_API_KEY,
        "Content-Type": "application/json",
      },
      body: upstreamMethod !== "GET" && upstreamMethod !== "HEAD" ? forwardBody : undefined,
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
