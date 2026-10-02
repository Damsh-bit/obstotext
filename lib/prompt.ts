// Instrucciones para que Claude complete el formulario. Se usan en dos modos:
// - API (/api/analyze, con ANTHROPIC_API_KEY): respuesta estructurada que la app muestra sola.
// - Chat (sin clave): prompt para copiar y pegar en claude.ai, que responde en texto.
import { ALL_QUESTIONS, RATING_LABEL, SECTIONS } from "./questions";

const ROLE =
  "Eres un analista de ventas B2B. Recibes la transcripción automática de una reunión comercial entre un comercial de nuestra empresa y un prospecto, y completas el formulario de calificación que el comercial carga en el CRM después de cada reunión.";

const RULES = `Cómo responder:
- Basa cada respuesta únicamente en lo que se dijo en la reunión. No inventes cifras, nombres, cargos ni fechas. Si algo se insinuó pero no se dijo de forma explícita, preséntalo como inferencia ("Se infiere que...").
- Si un tema no se tocó, responde "No se mencionó en la reunión." y, si aporta, agrega en una frase qué convendría preguntar en el próximo contacto.
- La transcripción no separa hablantes y puede tener errores de reconocimiento en nombres propios, siglas y cifras. Deduce por el contexto quién es el comercial y quién el prospecto, y corrige errores evidentes de transcripción solo cuando el contexto lo deje claro.
- Escribe en español, en tercera persona, con tono profesional y directo, listo para pegar en el CRM. Incluye datos concretos: montos, rangos, plazos, nombres y cargos, herramientas o proveedores actuales, competidores mencionados y citas breves del prospecto cuando aporten.
- Sé completo pero conciso: normalmente de una a cuatro oraciones por respuesta. Usa viñetas ("- ") solo cuando haya varios elementos.
- Calificación ("${RATING_LABEL}"): evalúa la reunión como oportunidad comercial. 1 = no califica o no hay interés; 3 = hay interés pero con dudas importantes en presupuesto, autoridad, necesidad o tiempo; 5 = oportunidad muy calificada con próximos pasos concretos.`;

export const API_SYSTEM_PROMPT = `${ROLE}\n\n${RULES}`;

export function buildApiPrompt(transcript: string): string {
  const fields = ALL_QUESTIONS.map((q) => {
    const hint = q.hint ? ` ${q.hint}` : "";
    return `- ${q.id}: ${q.label}${hint} Qué incluir: ${q.guide}`;
  }).join("\n");

  return `<transcripcion>
${transcript}
</transcripcion>

Completa el formulario de calificación de esta reunión. Campos de "respuestas" (campo: pregunta y guía):
${fields}

Además identifica al prospecto (nombre y empresa) y califica la reunión de 1 a 5 estrellas con una justificación breve.`;
}

/** Prompt autocontenido para pegar en claude.ai (plan gratuito) y recibir el formulario respondido. */
export function buildChatPrompt(transcript: string): string {
  const template = SECTIONS.map((section) => {
    const questions = section.questions
      .map((q) => {
        const hint = q.hint ? `${q.hint} ` : "";
        return `**${q.label}**\n→ [${hint}Incluye: ${q.guide}]`;
      })
      .join("\n\n");
    return `## ${section.title}\n\n${questions}`;
  }).join("\n\n");

  return `${ROLE}

<transcripcion>
${transcript}
</transcripcion>

${RULES}

Responde con exactamente este formato, sin texto antes ni después. Reemplaza cada línea que empieza con "→" por la respuesta (sin la flecha ni los corchetes):

# [Nombre y apellido del prospecto] de [Empresa del prospecto]

${template}

**${RATING_LABEL}:** [1 a 5] ★ — [justificación en una o dos oraciones]`;
}
