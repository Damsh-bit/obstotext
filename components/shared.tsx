"use client";

import { useState } from "react";

export function useCopy() {
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

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slug(text: string): string {
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

export function TranscriptSection({ transcript, fileBase }: { transcript: string; fileBase: string }) {
  const { copied, copy } = useCopy();
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <details className="form-section transcript">
      <summary>
        <h2>Transcripción completa</h2>
        <span className="transcript-meta">{words.toLocaleString("es")} palabras</span>
      </summary>
      <div className="transcript-actions">
        <button type="button" className="copy-btn" onClick={() => copy("transcript", transcript)}>
          {copied === "transcript" ? "¡Copiado!" : "Copiar"}
        </button>
        <button type="button" className="copy-btn" onClick={() => download(`${fileBase}-transcripcion.txt`, transcript)}>
          Descargar
        </button>
      </div>
      <div className="transcript-text">{transcript}</div>
    </details>
  );
}
