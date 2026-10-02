import { NextResponse } from "next/server";
import { accessCodeRequired, analysisConfig, transcriptionConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/** Le dice a la UI qué falta configurar, sin exponer ninguna clave. */
export function GET() {
  const transcription = transcriptionConfig();
  const analysis = analysisConfig();
  return NextResponse.json({
    accessCodeRequired: accessCodeRequired(),
    transcription: {
      provider: transcription.name,
      model: transcription.model,
      configured: Boolean(transcription.apiKey),
      keyEnv: transcription.keyEnv,
    },
    analysis: { model: analysis.model, configured: analysis.configured, keyEnv: "ANTHROPIC_API_KEY" },
  });
}
