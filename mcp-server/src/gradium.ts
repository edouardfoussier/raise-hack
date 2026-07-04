/**
 * Minimal Gradium TTS client — ported from Keynoter's `ttsOnce` (see
 * core/pipeline/audio/audio-utils.ts). No cloning: uses a default flagship
 * English voice. Exposes a single `ttsToFile(text, outPath)` that writes a WAV.
 *
 * API shape (verbatim from Keynoter):
 *   POST https://api.gradium.ai/api/post/speech/tts
 *   headers: { "x-api-key": <key>, "Content-Type": "application/json" }
 *   body:    { text, voice_id, output_format: "wav", only_audio: true, model_name }
 *
 * The English flagship voice id ("Emma") is pulled from Keynoter's
 * DEFAULT_GRADIUM_VOICE_BY_LANGUAGE map. If that id is ever rejected we fall
 * back to GETting the voices list and picking the first English-looking voice.
 */
import "./env.js";
import { writeFile } from "node:fs/promises";

const GRADIUM_BASE = "https://api.gradium.ai";
const TTS_URL = `${GRADIUM_BASE}/api/post/speech/tts`;
const VOICES_URL = `${GRADIUM_BASE}/api/voices/`;

// Emma — Gradium flagship EN (from Keynoter default-voices.ts).
const DEFAULT_EN_VOICE_ID = "YTpq7expH9539ERJ";

function apiKey(): string {
  const key = process.env.GRADIUM_API_KEY;
  if (!key) throw new Error("GRADIUM_API_KEY missing (mcp-server/.env)");
  return key;
}

/** One raw TTS call → WAV bytes. Throws with the server body on non-2xx. */
async function ttsOnce(text: string, voiceId: string): Promise<Buffer> {
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      output_format: "wav",
      only_audio: true,
      model_name: "default",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gradium TTS ${res.status}: ${body.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * GET the account's voices and return the id of a clear English voice, or the
 * first available voice if none is obviously English. Used only as a fallback
 * when the hard-coded flagship id is rejected.
 */
async function pickEnglishVoiceId(): Promise<string> {
  const res = await fetch(VOICES_URL, { headers: { "x-api-key": apiKey() } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gradium voices ${res.status}: ${body.slice(0, 400)}`);
  }
  const data: unknown = await res.json();
  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.voices)
      ? (data as any).voices
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
  const idOf = (v: any): string | undefined =>
    v?.uid ?? v?.voice_id ?? v?.id ?? undefined;
  const isEnglish = (v: any): boolean => {
    const lang = String(v?.language ?? v?.lang ?? "").toLowerCase();
    const name = String(v?.name ?? "").toLowerCase();
    return lang.startsWith("en") || /english|\ben\b|emma/.test(name);
  };
  const english = list.find((v) => isEnglish(v) && idOf(v));
  const chosen = idOf(english) ?? (list.map(idOf).find(Boolean) as string | undefined);
  if (!chosen) throw new Error("Gradium voices: no usable voice id in list");
  return chosen;
}

/**
 * Synthesize `text` to a WAV at `outPath` using a default English Gradium
 * voice. Tries the flagship id first; on failure, discovers a voice from the
 * account's voices list and retries once.
 */
export async function ttsToFile(text: string, outPath: string): Promise<void> {
  let buf: Buffer;
  try {
    buf = await ttsOnce(text, DEFAULT_EN_VOICE_ID);
  } catch (err) {
    // Flagship id may not exist on this account — discover one and retry.
    const voiceId = await pickEnglishVoiceId();
    buf = await ttsOnce(text, voiceId);
  }
  await writeFile(outPath, buf);
}
