// Copia ffmpeg.wasm (worker + core) a public/ffmpeg para servirlo desde el mismo origen.
// El worker tiene que ser same-origin y así evitamos depender de un CDN externo.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "ffmpeg");

const ffmpegDir = join(root, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
const coreDir = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");

const files = [
  [ffmpegDir, "worker.js"],
  [ffmpegDir, "const.js"],
  [ffmpegDir, "errors.js"],
  [coreDir, "ffmpeg-core.js"],
  [coreDir, "ffmpeg-core.wasm"],
];

mkdirSync(dest, { recursive: true });
for (const [dir, name] of files) {
  copyFileSync(join(dir, name), join(dest, name));
}
console.log(`ffmpeg.wasm copiado a ${dest}`);
