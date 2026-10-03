// French -> English translation for the "Racing Notes" paragraph, with
// proper names (horses, jockeys, trainers) protected so they come through
// untouched — "Cool Cat" must never become "Chat Cool", "Holds The Key"
// must never become "Tient la clé", and so on.
//
// Two engines, picked automatically:
//   1. Claude (ANTHROPIC_API_KEY in .env.local) — best quality. Names are
//      passed as an explicit "keep exactly as written" list, and the output
//      is checked to make sure every name that was in the French survived.
//   2. MyMemory (free, no key) — names are swapped for opaque tokens before
//      translating and swapped back after; if any token gets lost or
//      mangled the translation is discarded rather than risk a wrong name.
//
// Returns null when nothing trustworthy could be produced — the site then
// just shows the original text, which is always safe.

const CLAUDE_MODEL = process.env.ANTHROPIC_TRANSLATE_MODEL || "claude-haiku-4-5-20251001";

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Unique, longest-first list of names worth protecting. */
function cleanNames(names) {
  const seen = new Set();
  return names
    .map((n) => (n ?? "").trim())
    .filter((n) => n.length > 1 && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
    .sort((a, b) => b.length - a.length);
}

/** Every protected name present in `source` must still be present in `output`. */
function namesSurvived(source, output, names) {
  const src = source.toLowerCase();
  const out = output.toLowerCase();
  return names.every((n) => !src.includes(n.toLowerCase()) || out.includes(n.toLowerCase()));
}

async function viaClaude(text, names) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system:
        "You translate French horse-racing commentary into natural, concise English for a racing website. " +
        "Rules: (1) These are proper names of horses, jockeys and trainers — copy them EXACTLY as written, never translate, " +
        "re-order or inflect them, even when they look like ordinary words: " + JSON.stringify(names) + ". " +
        "(2) Keep numbers and distances accurate (e.g. 6,40 longueurs -> 6.40 lengths, 990 m stays 990 m). " +
        "(3) Output only the translation, no preface, no quotes, no notes.",
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

// MyMemory accepts ~500 chars per request, so translate sentence by sentence.
function chunkSentences(text, max = 450) {
  const sentences = text.match(/[^.!?]+[.!?]+["»)]*\s*|[^.!?]+$/g) ?? [text];
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) { chunks.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function viaMyMemory(text, names) {
  // Opaque alphanumeric tokens survive machine translation far better than brackets or markup.
  const tokens = names.map((_, i) => `QXZ${i}QXZ`);
  let masked = text;
  names.forEach((n, i) => {
    masked = masked.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(n)}(?![\\p{L}\\p{N}])`, "giu"), tokens[i]);
  });

  const parts = [];
  for (const chunk of chunkSentences(masked)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=fr|en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory ${res.status}`);
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (!out || data.responseStatus !== 200) throw new Error(`MyMemory: ${data?.responseDetails ?? "no result"}`);
    parts.push(out);
  }

  let result = parts.join(" ");
  // Every token that went in must come out, or we can't trust where the names ended up.
  tokens.forEach((tok, i) => {
    if (masked.includes(tok) && !new RegExp(tok, "i").test(result)) throw new Error(`name token lost for "${names[i]}"`);
    result = result.replace(new RegExp(tok, "gi"), names[i]);
  });
  return result.trim();
}

export async function translateNotes(text, protectedNames = []) {
  if (!text || !text.trim()) return null;
  const names = cleanNames(protectedNames);
  try {
    const out = process.env.ANTHROPIC_API_KEY ? await viaClaude(text, names) : await viaMyMemory(text, names);
    if (!out) return null;
    if (!namesSurvived(text, out, names)) {
      console.warn("  Translation changed a protected name — keeping the original text instead.");
      return null;
    }
    return out;
  } catch (err) {
    console.warn(`  Could not translate racing notes (${err.message}) — keeping the original text.`);
    return null;
  }
}
