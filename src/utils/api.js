// api.js — Max Left API utilities

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Generic Supabase edge function proxy
export const apiProxy = async (fn, params = {}) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status}`);
  return res.json();
};
