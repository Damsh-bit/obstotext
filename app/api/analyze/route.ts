import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { API_SYSTEM_PROMPT, buildApiPrompt } from "@/lib/prompt";
import { ALL_QUESTIONS, type Analysis, type QuestionId } from "@/lib/questions";
import { analysisConfig, rejectWithoutAccess } from "@/lib/server/config";

export const maxDuration = 300;

// ~3 horas de conversación; muy por encima de una reunión de 15-30 min.
const MAX_TRANSCRIPT_CHARS = 400_000;

const answersShape = Object.fromEntries(
  ALL_QUESTIONS.map((q) => [q.id, z.string().describe(q.label)]),
) as Record<QuestionId, z.ZodString>;

const AnalysisSchema = z.object({
  prospecto: z.object({
    nombre: z.string().describe("Nombre y apellido del prospecto principal (lado del cliente). Vacío si no se menciona."),
    empresa: z.string().describe("Empresa del prospecto. Vacío si no se menciona."),
  }),
  respuestas: z.object(answersShape),
  calificacion: z.object({
    estrellas: z.number().int().describe("Entero de 1 a 5."),
    justificacion: z.string().describe("Una o dos oraciones que expliquen la calificación."),
  }),
});

/**
 * Recibe la transcripción completa y devuelve las respuestas del formulario.
 * La transcripción no se guarda: solo viaja en este request hacia Claude.
 */
export async function POST(req: Request) {
  const denied = rejectWithoutAccess(req);
  if (denied) return denied;

  const config = analysisConfig();
  if (!config.configured) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY en el servidor para responder el formulario." },
      { status: 500 },
    );
  }

  const payload = (await req.json().catch(() => null)) as { transcript?: unknown } | null;
  const transcript = typeof payload?.transcript === "string" ? payload.transcript.trim() : "";
  if (!transcript) {
    return NextResponse.json({ error: "La transcripción está vacía." }, { status: 400 });
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json({ error: "La transcripción es demasiado larga para analizarla de una vez." }, { status: 413 });
  }

  const client = new Anthropic();

  try {
    const stream = client.beta.messages.stream({
      model: config.model,
      max_tokens: 16000,
      // Si un clasificador de seguridad rechaza por error, la API reintenta en el modelo recomendado.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(AnalysisSchema) },
      system: API_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildApiPrompt(transcript) }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "La IA no pudo procesar esta transcripción." }, { status: 422 });
    }
    if (message.stop_reason === "max_tokens" || !message.parsed_output) {
      return NextResponse.json({ error: "La respuesta de la IA quedó incompleta. Reintenta." }, { status: 502 });
    }

    const parsed = message.parsed_output;
    const analysis: Analysis = {
      ...parsed,
      calificacion: {
        ...parsed.calificacion,
        estrellas: Math.min(5, Math.max(1, Math.round(parsed.calificacion.estrellas))),
      },
    };
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "La clave ANTHROPIC_API_KEY no es válida." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Claude está limitando las solicitudes. Espera un minuto y reintenta." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      return NextResponse.json({ error: `Claude respondió con error ${error.status ?? ""}. Reintenta.`.trim() }, { status: 502 });
    }
    console.error("Analyze failed", error);
    return NextResponse.json({ error: "No se pudo generar el formulario. Reintenta." }, { status: 500 });
  }
}
