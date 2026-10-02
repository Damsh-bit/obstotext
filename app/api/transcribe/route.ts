import { NextResponse } from "next/server";
import { rejectWithoutAccess, transcriptionConfig } from "@/lib/server/config";

export const maxDuration = 120;

// Whisper acepta como mucho 224 tokens de prompt; con el final del fragmento anterior alcanza
// para que nombres propios y frases cortadas entre fragmentos se transcriban de forma consistente.
const PROMPT_CHARS = 600;

/**
 * Recibe un fragmento de audio (mp3 de ~8 min) y devuelve su texto.
 * El audio solo vive en memoria durante el request: no se escribe en disco ni se guarda.
 */
export async function POST(req: Request) {
  const denied = rejectWithoutAccess(req);
  if (denied) return denied;

  const config = transcriptionConfig();
  if (!config.apiKey) {
    return NextResponse.json(
      { error: `Falta configurar ${config.keyEnv} en el servidor para poder transcribir.` },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No llegó ningún audio." }, { status: 400 });
  }
  const previous = form.get("prompt");

  const body = new FormData();
  body.append("file", audio, "audio.mp3");
  body.append("model", config.model);
  body.append("language", "es");
  body.append("response_format", "json");
  body.append("temperature", "0");
  if (typeof previous === "string" && previous.trim()) {
    body.append("prompt", previous.slice(-PROMPT_CHARS));
  }

  let res: Response;
  try {
    res = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con el servicio de transcripción." }, { status: 502 });
  }

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400);
    const error =
      res.status === 401
        ? `La clave ${config.keyEnv} no es válida.`
        : res.status === 429
          ? "El servicio de transcripción está limitando las solicitudes. Espera un minuto y reintenta."
          : `El servicio de transcripción respondió con error ${res.status}.`;
    // Clave inválida es configuración: 500 para que el cliente no reintente.
    const status = res.status === 401 ? 500 : res.status === 429 ? 429 : 502;
    return NextResponse.json({ error, detail }, { status });
  }

  const data = (await res.json()) as { text?: string };
  return NextResponse.json({ text: (data.text ?? "").trim() });
}
