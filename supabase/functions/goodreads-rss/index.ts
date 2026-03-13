import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  const shelf = url.searchParams.get("shelf") || "read";
  if (!userId) return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const rssUrl = `https://www.goodreads.com/review/list_rss/${encodeURIComponent(userId)}?shelf=${encodeURIComponent(shelf)}`;
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "MANTL/1.0 (RSS Reader)" },
    });
    if (!res.ok) return new Response(JSON.stringify({ error: `Goodreads returned ${res.status}` }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const xml = await res.text();
    return new Response(JSON.stringify({ contents: xml }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
