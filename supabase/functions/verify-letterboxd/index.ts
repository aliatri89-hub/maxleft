import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();
    if (!username || username.length < 2) {
      return new Response(JSON.stringify({ error: "Invalid username" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rssUrl = `https://letterboxd.com/${username}/rss/`;
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "MANTL/1.0" },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await res.text();

    // Parse film titles and poster images from RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const films = [];
    let match;

    while ((match = itemRegex.exec(text)) !== null && films.length < 3) {
      const item = match[1];

      const titleMatch = item.match(/<letterboxd:filmTitle>(.*?)<\/letterboxd:filmTitle>/);
      const imgMatch = item.match(/src="(https:\/\/[^"]+\.jpg[^"]*)"/);

      if (titleMatch) {
        films.push({
          title: titleMatch[1],
          poster: imgMatch?.[1] || null,
        });
      }
    }

    return new Response(JSON.stringify({ found: true, films }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
