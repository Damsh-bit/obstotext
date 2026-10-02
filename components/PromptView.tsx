"use client";

import { useMemo } from "react";
import { buildChatPrompt } from "@/lib/prompt";
import { download, TranscriptSection, useCopy } from "./shared";

interface Props {
  transcript: string;
  fileBase: string;
  isDemo: boolean;
  onReset: () => void;
}

const CLAUDE_URL = "https://claude.ai/new";

export function PromptView({ transcript, fileBase, isDemo, onReset }: Props) {
  const { copied, copy } = useCopy();
  const prompt = useMemo(() => buildChatPrompt(transcript), [transcript]);

  return (
    <div className="results">
      {isDemo && (
        <div className="notice notice-info" role="status">
          Esto es un <strong>ejemplo</strong> con una transcripción ficticia. Sube un video para generar el prompt de una
          reunión real.
        </div>
      )}

      <header className="results-header">
        <h1 className="results-heading">Transcripción lista</h1>
        <div className="results-actions">
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Nueva reunión
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => download(`${fileBase}-prompt.txt`, prompt)}>
            Descargar prompt
          </button>
        </div>
      </header>

      <section className="form-section prompt-steps">
        <h2>Para que Claude responda el formulario</h2>
        <ol>
          <li>
            <div>
              <strong>Copia el prompt.</strong> Incluye la transcripción completa, las instrucciones y todas las
              preguntas del formulario.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => copy("prompt", prompt)}>
              {copied === "prompt" ? "¡Copiado!" : "Copiar prompt"}
            </button>
          </li>
          <li>
            <div>
              <strong>Abre Claude</strong> con tu cuenta (sirve la gratuita) en un chat nuevo.
            </div>
            <a className="btn btn-secondary" href={CLAUDE_URL} target="_blank" rel="noopener noreferrer">
              Abrir claude.ai ↗
            </a>
          </li>
          <li>
            <div>
              <strong>Pega con Ctrl+V y envía.</strong> Si el texto es largo, Claude lo convierte en un archivo adjunto:
              es normal, solo presiona enviar.
            </div>
          </li>
          <li>
            <div>
              <strong>Copia cada respuesta a tu formulario.</strong> Claude responde en el mismo orden que el CRM, con
              cada pregunta como título.
            </div>
          </li>
        </ol>
      </section>

      <details className="form-section transcript">
        <summary>
          <h2>Ver el prompt</h2>
          <span className="transcript-meta">{prompt.length.toLocaleString("es")} caracteres</span>
        </summary>
        <div className="transcript-text prompt-text">{prompt}</div>
      </details>

      <TranscriptSection transcript={transcript} fileBase={fileBase} />
    </div>
  );
}
