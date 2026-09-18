/**
 * Server-only smart-tag suggestions. One Groq chat call over the transcript
 * and/or worker note, using structured outputs (json_schema) so the response
 * is guaranteed to parse into fixed broad categories with free-form tag
 * strings inside each:
 *
 *   pesticide  — sprays & crop-protection treatments (color red)
 *   fertilizer — fertilizers & soil amendments      (color amber)
 *   condition  — pests, disease, weather, field state (color blue)
 *   crop       — the crop(s) being worked on        (color green)
 *   other      — supplies, equipment, tasks         (color gray)
 *
 * The category is never shown in the UI — it only picks the tag color, which
 * is stored on the `tags.color` column when the tag row is created (no schema
 * change). Tag names themselves are entirely model-chosen strings.
 *
 *   TAG_SUGGESTION_MODEL=model (default openai/gpt-oss-120b; must support
 *   structured outputs — e.g. llama-3.3-70b-versatile also works)
 *   GROQ_API_KEY=...  (shared with the Whisper transcription pass)
 *
 * Missing key / empty text / call failure → [] — never fails the upload.
 */

export type TagCategory = "pesticide" | "fertilizer" | "condition" | "crop" | "other";

export interface SuggestedTag {
  name: string;
  category: TagCategory;
}

/** Chip color per category — hex so `${color}14`-style alpha suffixes work. */
export const CATEGORY_COLORS: Record<TagCategory, string> = {
  pesticide: "#b3261e",
  fertilizer: "#a16207",
  condition: "#1d4ed8",
  crop: "#047857",
  other: "#4f5660",
};

const CATEGORIES: TagCategory[] = ["pesticide", "fertilizer", "condition", "crop", "other"];

const MAX_PER_CATEGORY = 5;
const MAX_TOTAL = 12;
const MAX_NAME_LEN = 40;

export function tagSuggestionConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

const SYSTEM_PROMPT = `You tag farm voice logs for an agriculture dashboard. Read the worker's log and extract tags, classifying each into exactly one category:
- "pesticide": crop-protection sprays and treatments — pesticides, herbicides, fungicides (e.g. "Roundup", "Warrior II", "copper spray").
- "fertilizer": fertilizers and soil amendments, including branded products. Products commonly used on this farm: YaraMila, YaraBela, MicroEssentials, Anvol, Pro-Germinator, Pivot Bio Proven (also e.g. "ammonium sulfate", "gypsum", "UAN-28"). Tag branded products by product name.
- "condition": pests, diseases, weather and field conditions observed (e.g. "aphid pressure", "powdery mildew", "frost damage", "wet soil").
- "crop": the crop(s) being worked on or mentioned, singular Title Case (e.g. "Tomato", "Almond", "Spinach").
- "other": other notable supplies, equipment or tasks worth tracking (e.g. "drip line", "irrigation pump"), including application methods the worker mentions as tasks: "Side Dressing", "Top Dressing", "Banding", "Broadcasting", "Fertigation", "Foliar Feeding", "Split Application", "Starter Fertilizer", "Pre-Plant".
Rules: only items explicitly mentioned in the log; short noun phrases of 1-3 words in Title Case; at most ${MAX_PER_CATEGORY} per category; never include people's names, field names, dates or bare quantities; use an empty array when nothing fits a category.`;

const JSON_SHAPE = `{"pesticide": string[], "fertilizer": string[], "condition": string[], "crop": string[], "other": string[]}`;

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export async function suggestTags(input: {
  transcript?: string | null;
  note?: string | null;
}): Promise<SuggestedTag[]> {
  const key = process.env.GROQ_API_KEY;
  const transcript = input.transcript?.trim() ?? "";
  const note = input.note?.trim() ?? "";
  const text = [transcript, note].filter(Boolean).join("\n\n");
  if (!key || !text) return [];

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        transcript ? `Transcript:\n${transcript}` : "",
        note ? `Worker note:\n${note}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  let raw: Record<string, unknown> | null = await callGroq(key, messages, true);
  if (!raw) raw = await callGroq(key, messages, false);
  return raw ? normalizeSuggested(raw) : [];
}

/**
 * One chat-completions call. `structured` uses json_schema mode; the fallback
 * path asks for plain JSON in the message content (models without structured
 * outputs, or unexpected 400s). Returns null so the caller can try the other
 * mode — never throws (a failed suggestion is skippable).
 */
async function callGroq(
  key: string,
  messages: ChatMessage[],
  structured: boolean
): Promise<Record<string, unknown> | null> {
  const model = process.env.TAG_SUGGESTION_MODEL ?? "openai/gpt-oss-120b";
  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    max_completion_tokens: 1024,
    messages: structured
      ? messages
      : [
          { ...messages[0], content: `${messages[0].content}\nRespond with only minified JSON of shape ${JSON_SHAPE}.` },
          ...messages.slice(1),
        ],
    response_format: structured
      ? {
          type: "json_schema",
          json_schema: {
            name: "farm_log_tags",
            strict: true,
            schema: {
              type: "object",
              properties: Object.fromEntries(
                CATEGORIES.map((c) => [c, { type: "array", items: { type: "string" } }])
              ),
              required: CATEGORIES,
              additionalProperties: false,
            },
          },
        }
      : { type: "json_object" },
  };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error(`groq tags (${structured ? "json_schema" : "json_object"}) failed: ${res.status}`);
      return null;
    }
    const parsed = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    const json = extractJson(content);
    return json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  } catch (e) {
    console.error("groq tags request failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Models sometimes wrap JSON in fences or prose — find the outermost object. */
function extractJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Coerce whatever came back into a bounded, deduped SuggestedTag list. */
function normalizeSuggested(raw: Record<string, unknown>): SuggestedTag[] {
  const out: SuggestedTag[] = [];
  const seen = new Set<string>();
  for (const category of CATEGORIES) {
    const list = raw[category];
    if (!Array.isArray(list)) continue;
    for (const item of list.slice(0, MAX_PER_CATEGORY)) {
      if (typeof item !== "string") continue;
      const name = item
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^["'「]|["'」]$/g, "")
        .slice(0, MAX_NAME_LEN);
      if (!name || /^\d+([.,]\d+)?$/.test(name)) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ name, category });
    }
  }
  return out.slice(0, MAX_TOTAL);
}
