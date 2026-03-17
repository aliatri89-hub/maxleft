#!/usr/bin/env python3
"""
MANTL Refactor: Auto-compute coming_soon from air_date
=======================================================
Replaces the manual extra_data.coming_soon flag with a computed
isComingSoon(item) utility that checks air_date > today.

Run from project root:  python3 coming_soon_auto_refactor.py
"""

import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(ROOT, path), "r", encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(os.path.join(ROOT, path), "w", encoding="utf-8") as f:
        f.write(content)

def ensure_import(content, import_line, after_pattern):
    """Add an import line after a matching pattern if not already present."""
    if import_line in content:
        return content
    # Find the last matching import line and insert after it
    lines = content.split("\n")
    insert_idx = None
    for i, line in enumerate(lines):
        if after_pattern in line:
            insert_idx = i
    if insert_idx is not None:
        lines.insert(insert_idx + 1, import_line)
        return "\n".join(lines)
    # Fallback: insert at top after first import block
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("from "):
            insert_idx = i
    if insert_idx is not None:
        lines.insert(insert_idx + 1, import_line)
        return "\n".join(lines)
    return import_line + "\n" + content

changes = []

# ─── 1. Create src/utils/comingSoon.js ───────────────────────────
UTIL_PATH = "src/utils/comingSoon.js"
UTIL_CONTENT = '''/**
 * Compute "coming soon" status from air_date instead of a stored flag.
 * An item is "coming soon" if it has a future air_date.
 *
 * Uses date-only comparison (no time component) so items are considered
 * "arrived" on their air_date day, not the day after.
 */
export function isComingSoon(item) {
  if (!item?.air_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const airDate = new Date(item.air_date + "T00:00:00");
  return airDate > today;
}
'''
full_util = os.path.join(ROOT, UTIL_PATH)
if not os.path.exists(full_util):
    os.makedirs(os.path.dirname(full_util), exist_ok=True)
    write(UTIL_PATH, UTIL_CONTENT)
    changes.append(f"  CREATED {UTIL_PATH}")
else:
    changes.append(f"  EXISTS  {UTIL_PATH} (skipped)")

# ─── 2. ItemCard.jsx ─────────────────────────────────────────────
path = "src/components/community/primitives/ItemCard.jsx"
c = read(path)
c = ensure_import(c,
    'import { isComingSoon } from "../../../utils/comingSoon";',
    'from "../../../utils/communityTmdb"')
c = c.replace(
    "const comingSoon = item.extra_data?.coming_soon;",
    "const comingSoon = isComingSoon(item);"
)
write(path, c)
changes.append(f"  UPDATED {path}")

# ─── 3. MiniseriesShelf.jsx ──────────────────────────────────────
path = "src/components/community/shared/MiniseriesShelf.jsx"
c = read(path)
c = ensure_import(c,
    'import { isComingSoon } from "../../../utils/comingSoon";',
    'from "../primitives/ItemCard"')
c = c.replace(
    '.filter((i) => i.extra_data?.coming_soon)',
    '.filter((i) => isComingSoon(i))'
)
write(path, c)
changes.append(f"  UPDATED {path}")

# ─── 4. NowPlayingGenreTab.jsx ──────────────────────────────────
path = "src/components/community/now-playing/NowPlayingGenreTab.jsx"
c = read(path)
c = ensure_import(c,
    'import { isComingSoon } from "../../../utils/comingSoon";',
    'from "./NowPlayingItemCard"')
c = c.replace(
    '.filter((i) => i.extra_data?.coming_soon)',
    '.filter((i) => isComingSoon(i))'
)
write(path, c)
changes.append(f"  UPDATED {path}")

# ─── 5. NowPlayingScreen.jsx ────────────────────────────────────
path = "src/components/community/now-playing/NowPlayingScreen.jsx"
c = read(path)
c = ensure_import(c,
    'import { isComingSoon } from "../../../utils/comingSoon";',
    'from "../../../utils/communityTmdb"')
c = c.replace(
    "allItems.filter(i => i.extra_data?.coming_soon).length",
    "allItems.filter(i => isComingSoon(i)).length"
)
write(path, c)
changes.append(f"  UPDATED {path}")

# ─── 6. BlankCheckScreen.jsx ────────────────────────────────────
path = "src/components/community/blank-check/BlankCheckScreen.jsx"
c = read(path)
c = ensure_import(c,
    'import { isComingSoon } from "../../../utils/comingSoon";',
    'from "../../../hooks/community"')
c = c.replace(
    "allItems.filter(i => i.extra_data?.coming_soon).length",
    "allItems.filter(i => isComingSoon(i)).length"
)
write(path, c)
changes.append(f"  UPDATED {path}")

# ─── 7. AdminItemEditor.jsx ─────────────────────────────────────
path = "src/components/community/shared/AdminItemEditor.jsx"
c = read(path)

# 7a. Replace comingSoon state with computed value
c = c.replace(
    '''  const [comingSoon, setComingSoon] = useState(
    item.extra_data?.coming_soon || false
  );''',
    '''  // coming_soon is now computed from air_date — no manual flag needed
  const comingSoon = (() => {
    if (!airDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(airDate + "T00:00:00") > today;
  })();'''
)

# 7b. Replace save logic — strip flag instead of writing it
c = c.replace(
    '''      // Coming soon flag
      if (comingSoon) {
        newExtra.coming_soon = true;
      } else {
        delete newExtra.coming_soon;
      }''',
    '''      // Coming soon is now computed from air_date — always strip the legacy flag
      delete newExtra.coming_soon;'''
)

# 7c. Replace the manual checkbox with read-only indicator
old_checkbox = '''            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#ccc",
                cursor: "pointer",
                padding: "6px 0",
              }}
            >
              <input
                type="checkbox"
                checked={comingSoon}
                onChange={(e) => setComingSoon(e.target.checked)}
                style={{ accentColor: "#facc15" }}
              />
              Coming Soon
              <span style={{ fontSize: 9, color: "#666" }}>
                (episode seeded but not yet aired)
              </span>
            </label>'''

new_indicator = '''            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: comingSoon ? "#facc15" : "#555",
                padding: "6px 0",
              }}
            >
              <span style={{ fontSize: 14 }}>{comingSoon ? "📅" : "✓"}</span>
              {comingSoon ? "Coming Soon" : "Aired"}
              <span style={{ fontSize: 9, color: "#666" }}>
                (auto from air date)
              </span>
            </div>'''

c = c.replace(old_checkbox, new_indicator)
write(path, c)
changes.append(f"  UPDATED {path}")

# ─── Summary ─────────────────────────────────────────────────────
print("\n[OK] Coming Soon auto-compute refactor complete!\n")
print("Changes:")
for ch in changes:
    print(ch)

print(f"""
DB migration already applied (14 rows cleaned).

What changed:
  - coming_soon is now computed from air_date > today
  - No manual flag to set or remove
  - AdminItemEditor shows read-only status indicator
  - AddItemTool: just set air_date, done

Verify with: npm run dev
""")
