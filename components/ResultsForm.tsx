"use client";

import { useState } from "react";
import { formatAsText, RATING_LABEL, SECTIONS, type Analysis, type QuestionId } from "@/lib/questions";

interface Props {
  analysis: Analysis;
  onAnalysisChange: (analysis: Analysis) => void;
  title: string;
  onTitleChange: (title: string) => void;
  transcript: string;
  isDemo: boolean;
  onReset: () => void;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback para contextos sin Clipboard API (http en LAN, permisos).
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
  }
  return { copied, copy };
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "reunion"
  );
}

export function ResultsForm({ analysis, onAnalysisChange, title, onTitleChange, transcript, isDemo, onReset }: Props) {
  const { copied, copy } = useCopy();
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  function setAnswer(id: QuestionId, value: string) {
    onAnalysisChange({ ...analysis, respuestas: { ...analysis.respuestas, [id]: value } });
  }

  function setRating(estrellas: number) {
    onAnalysisChange({ ...analysis, calificacion: { ...analysis.calificacion, estrellas } });
  }

  const fullText = formatAsText(analysis, title);

  return (
    <div className="results">
      {isDemo && (
        <div className="notice notice-info" role="status">
          Esto es un <strong>ejemplo ficticio</strong> de cómo queda el formulario. Sube un video para generar uno real.
        </div>
      )}

      <header className="results-header">
        <input
          className="results-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label="Título del formulario"
        />
        <div className="results-actions">
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Nueva reunión
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => download(`${slug(title)}.txt`, fullText)}>
            Descargar .txt
          </button>
          <button type="button" className="btn btn-primary" onClick={() => copy("all", fullText)}>
            {copied === "all" ? "¡Copiado!" : "Copiar todo"}
          </button>
        </div>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="form-section">
          <h2>{section.title}</h2>
          {section.questions.map((q) => (
            <div key={q.id} className="field">
              <div className="field-head">
                <label htmlFor={q.id}>{q.label}</label>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => copy(q.id, analysis.respuestas[q.id])}
                  aria-label={`Copiar respuesta: ${q.label}`}
                >
                  {copied === q.id ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              {q.hint && <p className="hint">{q.hint}</p>}
              <textarea
                id={q.id}
                value={analysis.respuestas[q.id]}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={3}
              />
            </div>
          ))}
          {section.title === "Comentarios adicionales" && (
            <div className="field">
              <div className="field-head">
                <span className="label">{RATING_LABEL}</span>
              </div>
              <div className="stars" role="radiogroup" aria-label={RATING_LABEL}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={analysis.calificacion.estrellas === n}
                    aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                    className={n <= analysis.calificacion.estrellas ? "star on" : "star"}
                    onClick={() => setRating(n)}
                  >
                    ★
                  </button>
                ))}
                <span className="stars-value">{analysis.calificacion.estrellas}/5 sugerido por la IA</span>
              </div>
              {analysis.calificacion.justificacion && <p className="hint">{analysis.calificacion.justificacion}</p>}
            </div>
          )}
        </section>
      ))}

      <details className="form-section transcript">
        <summary>
          <h2>Transcripción completa</h2>
          <span className="transcript-meta">{words.toLocaleString("es")} palabras</span>
        </summary>
        <div className="transcript-actions">
          <button type="button" className="copy-btn" onClick={() => copy("transcript", transcript)}>
            {copied === "transcript" ? "¡Copiado!" : "Copiar"}
          </button>
          <button
            type="button"
            className="copy-btn"
            onClick={() => download(`${slug(title)}-transcripcion.txt`, transcript)}
          >
            Descargar
          </button>
        </div>
        <div className="transcript-text">{transcript}</div>
      </details>
    </div>
  );
}
