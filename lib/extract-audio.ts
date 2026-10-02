// Extrae el audio del video en el navegador con ffmpeg.wasm.
// El video nunca se sube: se lee directo del disco (WORKERFS) y solo sale el audio comprimido,
// partido en fragmentos que entran holgados en el límite de 4.5 MB por request de Vercel.

// 8 min a 48 kbps ≈ 2.9 MB por fragmento.
const CHUNK_SECONDS = 480;

export type ExtractProgress = { stage: "loading" } | { stage: "extracting"; ratio: number | null };

export interface ExtractedAudio {
  chunks: Blob[];
  durationSec: number | null;
}

function parseClock(h: string, m: string, s: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

export async function extractAudioChunks(
  file: File,
  onProgress: (progress: ExtractProgress) => void,
  signal?: AbortSignal,
): Promise<ExtractedAudio> {
  const { FFmpeg, FFFSType } = await import("@ffmpeg/ffmpeg");
  const ffmpeg = new FFmpeg();
  const base = new URL("/ffmpeg/", window.location.origin).href;

  let durationSec: number | null = null;
  const log: string[] = [];
  ffmpeg.on("log", ({ message }) => {
    log.push(message);
    if (log.length > 40) log.shift();
    if (durationSec === null) {
      const d = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (d) durationSec = parseClock(d[1], d[2], d[3]);
    }
    const t = message.match(/time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (t) {
      const ratio = durationSec ? Math.min(1, parseClock(t[1], t[2], t[3]) / durationSec) : null;
      onProgress({ stage: "extracting", ratio });
    }
  });

  try {
    onProgress({ stage: "loading" });
    await ffmpeg.load(
      {
        classWorkerURL: `${base}worker.js`,
        coreURL: `${base}ffmpeg-core.js`,
        wasmURL: `${base}ffmpeg-core.wasm`,
      },
      { signal },
    );

    const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".mp4";
    const inputName = `input${ext.toLowerCase()}`;
    await ffmpeg.createDir("/in");
    await ffmpeg.createDir("/out");
    await ffmpeg.mount(FFFSType.WORKERFS, { blobs: [{ name: inputName, data: file }] }, "/in");

    onProgress({ stage: "extracting", ratio: 0 });
    // Primera pista de audio (en OBS es la mezcla), mono, 16 kHz: lo que espera Whisper.
    const code = await ffmpeg.exec(
      [
        "-hide_banner",
        "-i", `/in/${inputName}`,
        "-map", "0:a:0",
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "libmp3lame",
        "-b:a", "48k",
        "-f", "segment",
        "-segment_format", "mp3",
        "-segment_time", String(CHUNK_SECONDS),
        "-reset_timestamps", "1",
        "/out/chunk_%03d.mp3",
      ],
      -1,
      { signal },
    );

    if (code !== 0) {
      const output = log.join("\n");
      if (/matches no streams|does not contain any stream|Output file .* does not contain/i.test(output)) {
        throw new Error("El video no tiene pista de audio.");
      }
      if (/Invalid data found|moov atom not found/i.test(output)) {
        throw new Error("No se pudo leer el video. ¿La grabación de OBS terminó bien? Prueba remuxearla en OBS (Archivo → Remux).");
      }
      throw new Error("No se pudo extraer el audio del video.");
    }

    const names = (await ffmpeg.listDir("/out"))
      .filter((node) => !node.isDir && node.name.endsWith(".mp3"))
      .map((node) => node.name)
      .sort();

    const chunks: Blob[] = [];
    for (const name of names) {
      const data = await ffmpeg.readFile(`/out/${name}`);
      if (typeof data !== "string" && data.byteLength > 0) {
        chunks.push(new Blob([new Uint8Array(data)], { type: "audio/mpeg" }));
      }
    }
    if (chunks.length === 0) throw new Error("El video no tiene audio que transcribir.");

    onProgress({ stage: "extracting", ratio: 1 });
    return { chunks, durationSec };
  } finally {
    // Libera el worker y toda la memoria de ffmpeg.wasm.
    ffmpeg.terminate();
  }
}
