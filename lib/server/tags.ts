import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_COLORS, type SuggestedTag } from "./suggest-tags";

/**
 * Server-only tag persistence. Tags live in the shared `tags` table (unique
 * name, nullable color) joined to logs through `log_tags`; the color column
 * carries the suggestion category's color (see suggest-tags.ts). New tag
 * names are created on first use so the vocabulary grows with the farm —
 * same tags are reusable across logs and show up in /api/meta.
 */

export interface TagRow {
  id: number;
  name: string;
  color: string | null;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX_COLOR.test(v);
}

export function normalizeTagName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 40);
}

export interface TagEntry {
  name: string;
  color: string | null;
}

/**
 * Resolve tag names to `tags` rows, creating any that don't exist (with the
 * given color). Matching is case-insensitive against the existing vocabulary
 * so "roundup" reuses the "Roundup" row instead of forking it. Existing rows
 * keep their color — except colorless ones, which adopt the entry's color so
 * category colors backfill over time.
 */
export async function resolveOrCreateTags(
  supabase: SupabaseClient,
  entries: TagEntry[]
): Promise<TagRow[]> {
  const wanted = new Map<string, TagEntry>();
  for (const e of entries) {
    const name = normalizeTagName(e.name);
    if (name) wanted.set(name.toLowerCase(), { name, color: isHexColor(e.color) ? e.color : null });
  }
  if (wanted.size === 0) return [];

  const byLower = await fetchTagIndex(supabase);

  // Create names the farm hasn't used yet (skip races via on-conflict-do-nothing).
  const missing = [...wanted.values()].filter((w) => !byLower.has(w.name.toLowerCase()));
  if (missing.length > 0) {
    const { data: inserted, error } = await supabase
      .from("tags")
      .upsert(
        missing.map((m) => ({ name: m.name, color: m.color })),
        { onConflict: "name", ignoreDuplicates: true }
      )
      .select("id, name, color");
    if (error) throw error;
    for (const row of (inserted ?? []) as TagRow[]) byLower.set(row.name.toLowerCase(), row);
    // A concurrent insert may have won the race — re-index if anything is off.
    if ([...wanted.keys()].some((k) => !byLower.has(k))) {
      const refetch = await fetchTagIndex(supabase);
      for (const [k, v] of refetch) byLower.set(k, v);
    }
  }

  // Backfill colors on colorless existing rows so categories stay visible.
  const rows: TagRow[] = [];
  for (const entry of wanted.values()) {
    const row = byLower.get(entry.name.toLowerCase());
    if (!row) continue;
    if (entry.color && !row.color) {
      const { error } = await supabase.from("tags").update({ color: entry.color }).eq("id", row.id);
      if (!error) rows.push({ ...row, color: entry.color });
      else rows.push(row);
    } else {
      rows.push(row);
    }
  }
  return rows;
}

async function fetchTagIndex(supabase: SupabaseClient): Promise<Map<string, TagRow>> {
  const { data, error } = await supabase.from("tags").select("id, name, color");
  if (error) throw error;
  return new Map(((data ?? []) as TagRow[]).map((t) => [t.name.toLowerCase(), t]));
}

/**
 * Set exactly these tags on a log (diff-based: delete removed, upsert added).
 * `log_tags` PK is (log_id, tag_id) so upserts are idempotent.
 */
export async function setLogTags(
  supabase: SupabaseClient,
  logId: string,
  tagIds: number[]
): Promise<void> {
  const want = new Set(tagIds);
  const { data: current, error } = await supabase
    .from("log_tags")
    .select("tag_id")
    .eq("log_id", logId);
  if (error) throw error;
  const have = new Set(((current ?? []) as Array<{ tag_id: number }>).map((r) => r.tag_id));

  const toDelete = [...have].filter((id) => !want.has(id));
  const toInsert = [...want].filter((id) => !have.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("log_tags")
      .delete()
      .eq("log_id", logId)
      .in("tag_id", toDelete);
    if (delErr) throw delErr;
  }
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from("log_tags")
      .upsert(
        toInsert.map((tag_id) => ({ log_id: logId, tag_id })),
        { onConflict: "log_id,tag_id" }
      );
    if (insErr) throw insErr;
  }
}

/**
 * Save-time smart-tag flow: model suggestions → tag rows (created with the
 * category color) → attached to the fresh log. Suggestions are auto-applied;
 * the Add Tag box later lets anyone prune or extend the set.
 */
export async function applySuggestedTags(
  supabase: SupabaseClient,
  logId: string,
  suggested: SuggestedTag[]
): Promise<TagRow[]> {
  if (suggested.length === 0) return [];
  const rows = await resolveOrCreateTags(
    supabase,
    suggested.map((s) => ({ name: s.name, color: CATEGORY_COLORS[s.category] }))
  );
  await setLogTags(supabase, logId, rows.map((r) => r.id));
  return rows;
}
