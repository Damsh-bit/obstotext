"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeTranscript, ApiError, fetchStatus, transcribeChunk, type AppStatus } from "@/lib/client-api";
import { DEMO_ANALYSIS, DEMO_TRANSCRIPT } from "@/lib/demo";
import { extractAudioChunks } from "@/lib/extract-audio";
import { formTitle, type Analysis } from "@/lib/questions";
import { PromptView } from "./PromptView";
import { ResultsForm } from "./ResultsForm";
import { slug } from "./shared";

const STEPS = [
  { key: "load", label: "Preparando el extractor de audio" },
  { key: "extract", label: "Extrayendo el audio del video" },
  { key: "transcribe", label: "Transcribiendo la reunión" },
  { key: "analyze", label: "Respondiendo el formulario" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

// "done": formulario respondido por la API de Claude.
// "prompt": sin ANTHROPIC_API_KEY, se entrega el prompt para pegar en claude.ai.
type Phase =
  | { kind: "idle" }
  | { kind: "working"; step: StepKey; detail: string; ratio: number | null }
  | { kind: "error"; message: string }
  | { kind: "done" }
  | { kind: "prompt" };

const ACCESS_CODE_KEY = "obstotext:access-code";

function readStoredCode(): string {
  try {
    return localStorage.getItem(ACCESS_CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeCode(code: string) {
  try {
    localStorage.setItem(ACCESS_CODE_KEY, code);
  } catch {
    // Sin storage (modo privado): el código solo dura esta sesión.
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m} min ${s.toString().padStart(2, "0")} s`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Ocurrió un error inesperado.";
}

export function ObsToText() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [title, setTitle] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAccessCode(readStoredCode());
    fetchStatus().then(setStatus, () => setStatus(null));
  }, []);

  // Con ANTHROPIC_API_KEY la app responde sola; sin ella, entrega el prompt para claude.ai (gratis).
  const autoMode = status?.analysis.configured === true;
  const hasResult = !isDemo && (analysis !== null || phase.kind === "prompt");

  // Evita perder el trabajo (o cortar el proceso) cerrando la pestaña sin querer.
  const hasWork = phase.kind === "working" || hasResult;
  useEffect(() => {
    if (!hasWork) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasWork]);

  const runAnalysis = useCallback(
    async (text: string, signal: AbortSignal) => {
      setPhase({ kind: "working", step: "analyze", detail: "La IA está leyendo la transcripción (1-2 min)…", ratio: null });
      const result = await analyzeTranscript(text, accessCode, signal);
      setAnalysis(result);
      setTitle(formTitle(result.prospecto));
      setPhase({ kind: "done" });
    },
    [accessCode],
  );

  const handleError = useCallback((error: unknown, signal: AbortSignal) => {
    if (signal.aborted) {
      setPhase({ kind: "idle" });
      return;
    }
    console.error(error);
    setPhase({ kind: "error", message: errorMessage(error) });
  }, []);

  async function processFile() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    setTranscript("");
    setAnalysis(null);
    setIsDemo(false);

    try {
      const { chunks, durationSec } = await extractAudioChunks(
        file,
        (p) =>
          setPhase(
            p.stage === "loading"
              ? { kind: "working", step: "load", detail: "Descargando el motor de audio (solo la primera vez)…", ratio: null }
              : { kind: "working", step: "extract", detail: "Leyendo el video en tu navegador…", ratio: p.ratio },
          ),
        signal,
      );

      const parts: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        setPhase({
          kind: "working",
          step: "transcribe",
          detail:
            `Fragmento ${i + 1} de ${chunks.length}` + (durationSec ? ` · audio de ${formatDuration(durationSec)}` : ""),
          ratio: i / chunks.length,
        });
        // El final del fragmento anterior le da contexto a Whisper (nombres, frases cortadas).
        const previous = parts.join(" ").slice(-600);
        const text = await transcribeChunk(chunks[i], previous, accessCode, signal);
        if (text) parts.push(text);
      }
      const fullText = parts.join("\n\n").trim();
      if (!fullText) throw new Error("No se detectó voz en el audio del video.");
      setTranscript(fullText);

      if (autoMode) {
        await runAnalysis(fullText, signal);
      } else {
        setPhase({ kind: "prompt" });
      }
    } catch (error) {
      handleError(error, signal);
    }
  }

  async function retryAnalysis() {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runAnalysis(transcript, controller.signal);
    } catch (error) {
      handleError(error, controller.signal);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setPhase({ kind: "idle" });
  }

  function reset() {
    if (hasResult && !window.confirm("¿Borrar esta reunión y empezar con otra?")) return;
    abortRef.current?.abort();
    setFile(null);
    setTranscript("");
    setAnalysis(null);
    setTitle("");
    setIsDemo(false);
    setPhase({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function showDemo() {
    setTranscript(DEMO_TRANSCRIPT);
    setIsDemo(true);
    if (autoMode) {
      setAnalysis(structuredClone(DEMO_ANALYSIS));
      setTitle(formTitle(DEMO_ANALYSIS.prospecto));
      setPhase({ kind: "done" });
    } else {
      setPhase({ kind: "prompt" });
    }
  }

  function pickFile(candidate: File | undefined | null) {
    if (!candidate) return;
    setFile(candidate);
    setPhase({ kind: "idle" });
  }

  if (phase.kind === "done" && analysis) {
    return (
      <ResultsForm
        analysis={analysis}
        onAnalysisChange={setAnalysis}
        title={title}
        onTitleChange={setTitle}
        transcript={transcript}
        isDemo={isDemo}
        onReset={reset}
      />
    );
  }

  if (phase.kind === "prompt") {
    const fileBase = file ? slug(file.name.replace(/\.[^.]+$/, "")) : "reunion";
    return <PromptView transcript={transcript} fileBase={fileBase} isDemo={isDemo} onReset={reset} />;
  }

  // Solo la transcripción es imprescindible: sin la clave de Claude se usa el modo prompt.
  const missingKey = status && !status.transcription.configured ? status.transcription.keyEnv : null;
  const working = phase.kind === "working";
  const steps = autoMode ? STEPS : STEPS.filter((s) => s.key !== "analyze");
  const currentStep = working ? steps.findIndex((s) => s.key === phase.step) : -1;
  const canRetryAnalysis = autoMode && phase.kind === "error" && transcript.length > 0;

  return (
    <div className="upload-page">
      <header className="hero">
        <h1>Del video al formulario</h1>
        <p>
          {autoMode
            ? "Sube la grabación de la reunión (MP4 de OBS). Se extrae el audio, se transcribe completo y la IA responde las preguntas del formulario de calificación."
            : "Sube la grabación de la reunión (MP4 de OBS). Se extrae el audio, se transcribe completo y te damos un prompt listo para pegar en Claude (gratis en claude.ai), que responde todas las preguntas del formulario."}
        </p>
      </header>

      {missingKey && (
        <div className="notice notice-warn" role="status">
          <strong>Falta configuración en el servidor.</strong> Agrega {missingKey} en <code>.env.local</code> (o en las
          variables de entorno de Vercel) para poder transcribir videos.
        </div>
      )}

      {status?.accessCodeRequired && (
        <label className="access">
          <span>Código de acceso</span>
          <input
            type="password"
            value={accessCode}
            autoComplete="off"
            onChange={(e) => {
              setAccessCode(e.target.value);
              storeCode(e.target.value);
            }}
            placeholder="Pídeselo a quien administra la app"
          />
        </label>
      )}

      {!working && (
        <div
          className={`dropzone${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*,audio/*,.mp4,.mkv,.mov,.m4a"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <svg className="dropzone-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V9l4-2.5v11L16 15v3.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 18.5z" />
          </svg>
          {file ? (
            <>
              <p className="dropzone-title">{file.name}</p>
              <p className="dropzone-sub">{formatBytes(file.size)} · haz clic para elegir otro archivo</p>
            </>
          ) : (
            <>
              <p className="dropzone-title">Arrastra aquí el video de la reunión</p>
              <p className="dropzone-sub">o haz clic para elegirlo · MP4 de OBS (15-30 min, cualquier tamaño)</p>
            </>
          )}
        </div>
      )}

      {working && (
        <div className="progress-card" aria-live="polite">
          <ol className="steps">
            {steps.map((step, i) => {
              const state = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
              return (
                <li key={step.key} className={`step step-${state}`}>
                  <span className="step-dot" aria-hidden="true">
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <div className="step-body">
                    <span className="step-label">{step.label}</span>
                    {state === "active" && (
                      <>
                        <span className="step-detail">{phase.detail}</span>
                        <div className={`bar${phase.ratio === null ? " bar-indeterminate" : ""}`}>
                          <div style={{ width: `${Math.round((phase.ratio ?? 0) * 100)}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="progress-footer">
            <span>No cierres esta pestaña mientras se procesa.</span>
            <button type="button" className="btn btn-ghost" onClick={cancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="notice notice-error" role="alert">
          <strong>No se pudo completar.</strong> {phase.message}
        </div>
      )}

      {!working && (
        <div className="actions">
          {canRetryAnalysis && (
            <button type="button" className="btn btn-primary" onClick={retryAnalysis}>
              Reintentar respuestas (sin volver a transcribir)
            </button>
          )}
          <button
            type="button"
            className={`btn ${canRetryAnalysis ? "btn-secondary" : "btn-primary"}`}
            disabled={!file}
            onClick={processFile}
          >
            {phase.kind === "error" ? "Procesar de nuevo" : "Procesar reunión"}
          </button>
          {!file && (
            <button type="button" className="btn btn-link" onClick={showDemo}>
              Ver un ejemplo del resultado
            </button>
          )}
        </div>
      )}

      <p className="privacy">
        El video no se sube: el audio se extrae en tu navegador. El audio y la transcripción solo se usan para generar
        las respuestas; la app no guarda nada y todo se borra al cerrar o al empezar otra reunión.
      </p>
    </div>
  );
}
