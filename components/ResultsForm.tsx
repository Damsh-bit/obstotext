"use client";

import { download, slug, TranscriptSection, useCopy } from "./shared";
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

export function ResultsForm({ analysis, onAnalysisChange, title, onTitleChange, transcript, isDemo, onReset }: Props) {
  const { copied, copy } = useCopy();

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

      <TranscriptSection transcript={transcript} fileBase={slug(title)} />
    </div>
  );
}
