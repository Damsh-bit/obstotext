import type { Analysis } from "./questions";

export interface AppStatus {
  accessCodeRequired: boolean;
  transcription: { provider: string; model: string; configured: boolean; keyEnv: string };
  analysis: { model: string; configured: boolean; keyEnv: string };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit, accessCode: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessCode) headers.set("x-access-code", accessCode);
  const res = await fetch(url, { ...init, headers });
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Error ${res.status}`, res.status, data?.code);
  }
  return data as T;
}

export function fetchStatus(): Promise<AppStatus> {
  return request<AppStatus>("/api/status", { method: "GET" }, "");
}

// 500 queda afuera: es configuración faltante y reintentar no lo arregla.
const RETRYABLE = new Set([429, 502, 503, 504]);

export async function transcribeChunk(
  chunk: Blob,
  previousText: string,
  accessCode: string,
  signal: AbortSignal,
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const body = new FormData();
    body.append("audio", chunk, "audio.mp3");
    if (previousText) body.append("prompt", previousText);
    try {
      const { text } = await request<{ text: string }>("/api/transcribe", { method: "POST", body, signal }, accessCode);
      return text;
    } catch (error) {
      const retryable = error instanceof ApiError ? RETRYABLE.has(error.status) : !signal.aborted;
      if (attempt >= 2 || !retryable || signal.aborted) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
}

export function analyzeTranscript(transcript: string, accessCode: string, signal: AbortSignal): Promise<Analysis> {
  return request<Analysis>(
    "/api/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
      signal,
    },
    accessCode,
  );
}
