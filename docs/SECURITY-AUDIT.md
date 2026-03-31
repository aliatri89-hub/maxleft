# MANTL Security Audit
*Last reviewed: March 31, 2026*

---

## ✅ Passed

### Credentials & Secrets
- **No API keys or secrets in source code** — TMDB key, RAWG key, and service role key are environment variables only (`Deno.env.get()` in edge functions, `process.env` in scripts)
- **`.gitignore` correctly excludes** `.env`, `.env.local`, `*.env` — no risk of accidental commit
- **`.env.example` contains only placeholder values** — safe to commit
- **No Firebase / Google Services config files** committed (`google-services.json`, `GoogleService-Info.plist`)
- **No payment keys present** — Stripe/RevenueCat not yet integrated; no keys to leak
- **No GitHub tokens in source** — tokens used in session only, never written to files

### Database (Supabase RLS)
- **All 57 public tables have RLS enabled** — zero unprotected tables
- **Admin write policies** on sensitive tables (`community_items`, `community_miniseries`, `podcast_episodes`, `podcast_episode_films`, `admin_coverage_links`) are locked to a single admin UUID via `WITH CHECK (auth.uid() = '<admin-uuid>')`
- **User-scoped write policies** correctly use `auth.uid() = user_id` on personal data tables (`user_media_logs`, `user_notifications`, `device_tokens`, `profiles`, etc.)

### Infrastructure
- **Supabase anon key in `src/supabase.js`** is intentional and safe — it's a public JWT granting only anon-role permissions, which are constrained by RLS. This is the standard Supabase pattern.

---

## 🔴 Real Issues — Fix Before Launch

### 1. `user_badges` — Users Can Self-Award Badges
**Table:** `user_badges`
**Policy:** `user_badges_insert` — `WITH CHECK (auth.uid() = user_id)`

Any authenticated user can `INSERT` a row into `user_badges` for themselves, awarding any badge_id they choose. Badges should only be created server-side via the service role (edge functions), never directly by clients.

**Fix:** Drop the client INSERT policy. Badge awarding already flows through edge functions with the service role — the client policy is unnecessary and dangerous.

```sql
DROP POLICY IF EXISTS "user_badges_insert" ON user_badges;
DROP POLICY IF EXISTS "user_badges_delete" ON user_badges;
```

> Note: Also audit whether any client-side code calls `supabase.from('user_badges').insert(...)` directly — if so, reroute through an edge function.

---

### 2. `media` — Any Authenticated User Can Insert Arbitrary Records
**Table:** `media`
**Policy:** `Authenticated can insert media` — `WITH CHECK (auth.uid() IS NOT NULL)`

Any logged-in user can insert a new row into the `media` table with any `tmdb_id`, `title`, or metadata they choose. This is used legitimately for client-side logging flows, but it also means users can pollute the media catalog.

**Risk level:** Medium. RLS protects other tables from being poisoned via a bad `media_id`, but junk data in `media` could affect search, browse feed, and community matching.

**Fix options:**
- Tighten to only allow insert of `media_type = 'film'` with a valid `tmdb_id` (enforce via `WITH CHECK`)
- Or move media creation entirely server-side and drop the client policy

```sql
-- Tighter version: only allow film inserts with a tmdb_id present
ALTER POLICY "Authenticated can insert media" ON media
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL AND tmdb_id IS NOT NULL AND media_type = 'film');
```

---

## 🟡 Worth Watching

### 3. Admin UUID Hardcoded in RLS Policies
The admin user ID (`19410e64-...`) is hardcoded directly into ~15 RLS policies. This works fine, but if the admin account ever needs to change (email compromise, account migration), every policy would need to be manually updated.

**Recommended fix (post-launch):** Create an `is_admin()` function or an `admin_users` table and reference that instead.

```sql
-- Example: create a reusable admin check
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696'::uuid;
$$;
-- Then policies become: WITH CHECK (is_admin())
```

---

### 4. All Edge Functions Have `verify_jwt: false`
Every deployed edge function skips Supabase's built-in JWT verification. This is intentional (functions use the service role key internally), but it means each function is responsible for its own auth checks. 

**Confirm each function that mutates user data** validates the caller:
- `sync-letterboxd-batch` ✅ — validates JWT manually via `userClient.auth.getUser()`
- `import-letterboxd-csv` — confirm it validates user identity before writing
- `check-new-film-coverage` — called server-to-server only; acceptable
- `send-push` — called server-to-server only; acceptable

---

### 5. `profiles` Table Is Fully Public
**Policy:** `Anyone can read profiles` — `SELECT` for `{public}` with `USING (true)`

All user profiles are readable by anyone, including unauthenticated users. This is probably intentional for social features, but confirm that `profiles` does not store sensitive fields like email, phone, or private settings that should be gated.

**Check:** `SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'` — verify no PII is exposed.

---

## 📋 Pre-Launch Security Checklist

- [ ] Drop `user_badges_insert` and `user_badges_delete` client-side policies
- [ ] Tighten `media` INSERT policy with `tmdb_id IS NOT NULL` constraint
- [ ] Audit `import-letterboxd-csv` for proper user identity validation
- [ ] Confirm `profiles` table contains no sensitive PII in public-readable columns
- [ ] Before adding payments: rotate the Supabase anon key as a precaution (it has been in the repo since day one)
- [ ] When RevenueCat is integrated: ensure webhook secret is in Supabase Vault, not hardcoded
- [ ] Post-launch: replace hardcoded admin UUID in RLS policies with `is_admin()` function

---

## 🔑 Secret Inventory

| Secret | Location | Rotation needed? |
|---|---|---|
| Supabase anon key | `src/supabase.js` (intentional, public-safe) | Before payments launch |
| Supabase service role key | Supabase Vault / edge function env only | No |
| TMDB API key | Supabase Vault / edge function env only | No |
| RAWG API key | Dev memory only — not used (games killed) | Can delete |
| Push notification keys (APNs/FCM) | Supabase Vault | No |
| GitHub deploy token | Session-only, 1hr expiry | N/A |
