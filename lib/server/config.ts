import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const TRANSCRIPTION_PROVIDERS = {
  groq: {
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    keyEnv: "GROQ_API_KEY",
    defaultModel: "whisper-large-v3",
  },
  openai: {
    url: "https://api.openai.com/v1/audio/transcriptions",
    keyEnv: "OPENAI_API_KEY",
    defaultModel: "whisper-1",
  },
} as const;

type ProviderName = keyof typeof TRANSCRIPTION_PROVIDERS;

export function transcriptionConfig() {
  const forced = process.env.TRANSCRIPTION_PROVIDER?.trim().toLowerCase();
  // Sin proveedor forzado: el que tenga clave, con Groq como preferido.
  const name: ProviderName =
    forced === "groq" || forced === "openai"
      ? forced
      : !process.env.GROQ_API_KEY && process.env.OPENAI_API_KEY
        ? "openai"
        : "groq";
  const provider = TRANSCRIPTION_PROVIDERS[name];
  return {
    name,
    url: provider.url,
    keyEnv: provider.keyEnv,
    apiKey: process.env[provider.keyEnv]?.trim() || null,
    model: process.env.TRANSCRIPTION_MODEL?.trim() || provider.defaultModel,
  };
}

export function analysisConfig() {
  return {
    model: process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5",
    configured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
  };
}

export function accessCodeRequired(): boolean {
  return Boolean(process.env.ACCESS_CODE);
}

/** Devuelve una respuesta 401 si la app tiene ACCESS_CODE y el request no lo trae. */
export function rejectWithoutAccess(req: Request): NextResponse | null {
  const expected = process.env.ACCESS_CODE;
  if (!expected) return null;
  const given = Buffer.from(req.headers.get("x-access-code") ?? "");
  const wanted = Buffer.from(expected);
  if (given.length === wanted.length && timingSafeEqual(given, wanted)) return null;
  return NextResponse.json({ error: "Código de acceso incorrecto.", code: "ACCESS_DENIED" }, { status: 401 });
}
