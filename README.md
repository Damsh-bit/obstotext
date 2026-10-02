# ObsToText

Web app que toma la grabación de una reunión comercial hecha con OBS (MP4), transcribe todo el audio y responde
automáticamente el formulario de calificación de la reunión (Presupuesto, Autoridad, Necesidad, Tiempo, Competencia,
Feedback, Próximos pasos, Comentarios adicionales y calificación de 1 a 5 estrellas).

## Cómo funciona

1. **Extracción de audio en el navegador** — con [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) se lee el video
   directo del disco (no se sube) y se saca solo la primera pista de audio, en mono 16 kHz MP3, partida en fragmentos
   de 8 minutos (~2.9 MB cada uno). Un video de 30 min se procesa en segundos.
2. **Transcripción** — cada fragmento pasa por `/api/transcribe`, que lo reenvía a Whisper (Groq u OpenAI). El final
   de cada fragmento se usa como contexto del siguiente para que los nombres y frases cortadas queden consistentes.
3. **Respuestas**, en uno de dos modos:
   - **Gratis (sin `ANTHROPIC_API_KEY`)** — la app arma un prompt con la transcripción, las instrucciones y todas las
     preguntas. Se copia con un botón, se pega en [claude.ai](https://claude.ai) (sirve la cuenta gratuita) y Claude
     devuelve el formulario respondido en el mismo orden que el CRM.
   - **Automático (con `ANTHROPIC_API_KEY`)** — la transcripción va a `/api/analyze`, que usa Claude
     (`claude-opus-5-5`) con salida estructurada. El formulario aparece en la app, cada respuesta es editable y tiene
     su botón **Copiar**; también se puede copiar todo o descargarlo como `.txt`.

Las instrucciones para Claude son las mismas en los dos modos y están en [`lib/prompt.ts`](lib/prompt.ts).

**Nada se guarda.** El audio y la transcripción solo existen en memoria durante el proceso; al tocar
«Nueva reunión» o cerrar la pestaña, se borra todo. No hay base de datos.

La definición del formulario (preguntas, ayudas y guía para la IA) está en [`lib/questions.ts`](lib/questions.ts):
para cambiar una pregunta basta con editar ese archivo.

## Correr en local

Requisitos: Node 20+.

```bash
npm install
cp .env.example .env.local   # completar las claves
npm run dev
```

Abrir http://localhost:3000. Sin claves la app igual abre y se puede ver un ejemplo del resultado.

> En Windows, `dev` y `build` usan webpack (`--webpack`) porque el binario nativo de Turbopack puede estar
> bloqueado por el Control de aplicaciones de Windows.

## Variables de entorno

| Variable | Requerida | Para qué |
| --- | --- | --- |
| `GROQ_API_KEY` | una de las dos | Transcripción con Whisper large-v3 en Groq (recomendado: rápido y barato). |
| `OPENAI_API_KEY` | una de las dos | Transcripción con Whisper en OpenAI. |
| `ANTHROPIC_API_KEY` | no | Si está, la app responde el formulario sola con Claude. Si no, entrega el prompt para claude.ai (gratis). |
| `ACCESS_CODE` | recomendada al publicar | Si se define, la app pide este código antes de procesar (evita que cualquiera con el link use tus créditos). |
| `TRANSCRIPTION_PROVIDER` | no | Fuerza `groq` u `openai`. |
| `TRANSCRIPTION_MODEL` | no | Cambia el modelo de transcripción. |
| `ANTHROPIC_MODEL` | no | Cambia el modelo de Claude (por defecto `claude-opus-5-5`). |

Costo: en modo gratis, solo la transcripción (el plan gratuito de Groq alcanza para varias reuniones por día). En modo
automático se suman ~USD 0.10 de Claude por reunión de 30 min.

## Publicar en Vercel

1. Importar el repo en Vercel (framework: Next.js; el build usa `npm run build`).
2. Cargar las variables de entorno de arriba.
3. Deploy. `npm install` corre `scripts/copy-ffmpeg.mjs`, que copia ffmpeg.wasm a `public/ffmpeg`.

Los fragmentos de audio están dimensionados para el límite de 4.5 MB por request de Vercel, y `/api/analyze` tiene
`maxDuration = 300` s para dar tiempo a Claude.

## Notas

- OBS puede grabar varias pistas de audio; se usa la primera (en OBS es la mezcla por defecto).
- Si el MP4 quedó corrupto (OBS se cerró mientras grababa), remuxearlo desde OBS: *Archivo → Remux de grabaciones*.
- Funciona en Chrome, Edge y Firefox de escritorio actuales.
