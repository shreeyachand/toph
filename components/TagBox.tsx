"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  fetchLogTags,
  fetchMeta,
  replaceRecordingTags,
  type RecordingTag,
  type TagEntryInput,
} from "@/lib/data";
import Icon from "./Icon";

/**
 * Notion-style tag editor, opened by the Add Tag button in the log detail
 * view. Works as a draft-then-confirm box:
 *
 *   - Loads the log's attached tags (suggestions were auto-applied at save
 *     time) and shows them as colored chips — the color encodes the category
 *     the suggestion model picked (pesticide/fertilizer/condition/other),
 *     but the category itself is never spelled out.
 *   - X removes a chip; the input adds new tags (Enter or Add); existing farm
 *     vocabulary from /api/meta is offered as one-click picks.
 *   - "Save tags" PUTs the final set in one call.
 *
 * Local-only logs (RecordPanel demo entries, id "local-*") and mock data
 * (tags endpoint unreachable/non-live) keep everything client-side so the
 * box never dead-ends.
 */

export interface TagItem {
  id: number | string;
  name: string;
  color: string | null;
}

const MAX_TAGS = 20;
const MAX_NAME = 40;

function normalize(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
}

/** Colored chip look from a stored hex color (null → neutral gray). */
export function chipStyle(color: string | null): CSSProperties | undefined {
  if (!color) return undefined;
  return { backgroundColor: `${color}14`, color, borderColor: `${color}66` };
}

/** Display-only chip (no remove button) — used outside the box. */
export function TagChip({ name, color }: { name: string; color: string | null }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${
        color ? "" : "border-[#e3e3e3] bg-[#f8f8f8] text-[#4d4d4d]"
      }`}
      style={chipStyle(color)}
    >
      <span className="max-w-[160px] truncate">{name}</span>
    </span>
  );
}

function RemovableChip({
  name,
  color,
  onRemove,
}: {
  name: string;
  color: string | null;
  onRemove: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border py-1 pl-2.5 pr-1.5 text-[12px] font-medium ${
        color ? "" : "border-[#e3e3e3] bg-[#f8f8f8] text-[#4d4d4d]"
      }`}
      style={chipStyle(color)}
    >
      <span className="max-w-[160px] truncate">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove tag ${name}`}
        className="rounded-full p-0.5 hover:bg-black/10"
      >
        <Icon name="x" size={10} />
      </button>
    </span>
  );
}

export default function TagBox({
  logId,
  onClose,
  onSaved,
}: {
  logId: string;
  onClose: () => void;
  onSaved: (tags: TagItem[]) => void;
}) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [allTags, setAllTags] = useState<RecordingTag[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLocal = logId.startsWith("local-");

  // Load the log's tags + the farm's tag vocabulary (for quick picks).
  useEffect(() => {
    if (isLocal) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [tagRes, metaRes] = await Promise.all([
        fetchLogTags(logId).catch(() => ({ data: [] as RecordingTag[], live: false })),
        fetchMeta().catch(() => null),
      ]);
      if (cancelled) return;
      setTags(tagRes.data.map((t) => ({ ...t })));
      setLive(tagRes.live);
      setAllTags(metaRes?.tags ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [logId, isLocal]);

  // Esc closes without saving; focus the input on open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);
  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const namesLower = useMemo(
    () => new Set(tags.map((t) => t.name.toLowerCase())),
    [tags]
  );

  /** Add by name — reuses the farm row (id + color) when one matches. */
  const addTag = (raw: string) => {
    const name = normalize(raw);
    if (!name) return;
    if (namesLower.has(name.toLowerCase())) {
      setInput("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setError(`Max ${MAX_TAGS} tags per log.`);
      return;
    }
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    setTags((prev) => [
      ...prev,
      existing
        ? { id: existing.id, name: existing.name, color: existing.color }
        : { id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, color: null },
    ]);
    setInput("");
    setError(null);
  };

  const quickPicks = useMemo(
    () => allTags.filter((t) => !namesLower.has(t.name.toLowerCase())).slice(0, 8),
    [allTags, namesLower]
  );

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (live && !isLocal) {
        const entries: TagEntryInput[] = tags.map((t) =>
          typeof t.id === "number" ? { tag_id: t.id } : { name: t.name }
        );
        const res = await replaceRecordingTags(logId, entries);
        onSaved(res.data.map((t) => ({ ...t })));
      } else {
        onSaved(tags);
      }
      onClose();
    } catch {
      setError("Couldn't save tags — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Edit tags"
      className="mt-3 overflow-hidden rounded-xl border border-[#ececec] bg-white"
    >
      <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-3.5 py-2.5">
        <Icon name="star" size={14} />
        <p className="text-[13px] font-medium text-black">Tags</p>
        <span className="ml-auto text-[12px] tabular-nums text-[#b3b3b3]">{tags.length}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tags editor"
          className="rounded-lg p-1 text-[#4d4d4d] hover:bg-[#f5f5f5]"
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="px-3.5 py-3">
        {loading ? (
          <p className="py-2 text-center text-[13px] text-[#b3b3b3]">Loading tags…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5" aria-live="polite">
              {tags.length === 0 ? (
                <p className="w-full py-1 text-[13px] text-[#b3b3b3]">
                  No tags yet — add one below{quickPicks.length > 0 ? " or tap a suggestion" : ""}.
                </p>
              ) : (
                tags.map((t) => (
                  <RemovableChip
                    key={t.id}
                    name={t.name}
                    color={t.color}
                    onRemove={() => setTags((prev) => prev.filter((x) => x.id !== t.id))}
                  />
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTag(input);
              }}
              className="mt-3 flex items-center gap-2 rounded-lg border border-[#e3e3e3] px-2.5 py-1.5 focus-within:border-[#b3b3b3]"
            >
              <Icon name="plus" size={13} className="text-[#808080]" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Add a tag…"
                aria-label="Add a tag by name"
                maxLength={MAX_NAME}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-black outline-none placeholder:text-[#b3b3b3]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-md bg-black px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-30"
              >
                Add
              </button>
            </form>

            {quickPicks.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                  All tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPicks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => addTag(t.name)}
                      aria-label={`Add tag ${t.name}`}
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium transition-opacity hover:opacity-75 ${
                        t.color ? "" : "border-[#e3e3e3] bg-[#f8f8f8] text-[#4d4d4d]"
                      }`}
                      style={chipStyle(t.color)}
                    >
                      <span className="max-w-[160px] truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="mt-2 text-[12px] text-[#b3261e]" role="alert">
                {error}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-lg border border-[#e3e3e3] bg-white py-2 text-[13px] font-medium text-black hover:bg-[#f8f8f8] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={saving}
                className="flex-1 rounded-lg bg-black py-2 text-[13px] font-medium text-white hover:bg-[#222] disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save tags"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
