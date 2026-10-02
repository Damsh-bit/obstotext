// Definición única del formulario: la UI lo dibuja y el análisis con Claude lo usa como esquema.
// `label` y `hint` replican el formulario del CRM; `guide` es la instrucción extra para la IA.

export type QuestionId =
  | "presupuesto"
  | "autoridad"
  | "necesidad_problema"
  | "necesidad_actual"
  | "tiempo"
  | "competencia_opciones"
  | "competencia_comparacion"
  | "feedback_objeciones"
  | "feedback_interes"
  | "proximos_pasos"
  | "comentarios_adicionales";

export interface Question {
  id: QuestionId;
  label: string;
  hint?: string;
  guide: string;
}

export interface Section {
  title: string;
  questions: Question[];
}

export const SECTIONS: Section[] = [
  {
    title: "Presupuesto",
    questions: [
      {
        id: "presupuesto",
        label: "¿El prospecto tiene un presupuesto asignado para esta solución?",
        hint: "Detalla sobre el rango o cifra exacta si es posible.",
        guide:
          "Indica si hay presupuesto asignado, el monto o rango exacto si se dijo, quién lo aprueba y de qué partida o ciclo depende.",
      },
    ],
  },
  {
    title: "Autoridad",
    questions: [
      {
        id: "autoridad",
        label: "¿Quiénes están involucrados en la toma de decisión del avance de este proyecto?",
        hint: "El objetivo es detectar escuchando la reunión si el prospecto con el que estamos hablando es quien toma la decisión o si debe pasar por alguien más (e identificar quién es).",
        guide:
          "Di explícitamente si la persona de la reunión decide o no, y nombra (con cargo o área) a quienes deben aprobar o participar en la decisión.",
      },
    ],
  },
  {
    title: "Necesidad",
    questions: [
      {
        id: "necesidad_problema",
        label: "¿Cuál es el principal problema o necesidad que buscan resolver con nuestra solución?",
        guide: "Describe el dolor principal y su impacto en el negocio con los datos concretos que se dieron.",
      },
      {
        id: "necesidad_actual",
        label: "¿Cómo están manejando este problema o necesidad actualmente?",
        hint: "Se debe recolectar información suficiente sobre la necesidad o el dolor que está teniendo el prospecto.",
        guide: "Proceso, herramientas o proveedores actuales y qué limitaciones tienen.",
      },
    ],
  },
  {
    title: "Tiempo",
    questions: [
      {
        id: "tiempo",
        label: "¿Para cuándo necesitan implementar una solución o tomar la decisión?",
        hint: "Se debe recolectar información suficiente sobre la necesidad o el dolor que está teniendo el prospecto.",
        guide: "Fechas, plazos o eventos que marcan la urgencia, tanto para decidir como para implementar.",
      },
    ],
  },
  {
    title: "Competencia",
    questions: [
      {
        id: "competencia_opciones",
        label: "¿Están evaluando otras soluciones? Si es así, ¿cuáles?",
        guide: "Nombra los competidores, proveedores o alternativas internas mencionadas.",
      },
      {
        id: "competencia_comparacion",
        label: "¿Qué les gusta y qué no les gusta de esas soluciones comparado con la nuestra?",
        guide: "Ventajas y desventajas percibidas frente a nuestra propuesta.",
      },
    ],
  },
  {
    title: "Feedback",
    questions: [
      {
        id: "feedback_objeciones",
        label: "¿Hubo alguna objeción o preocupación destacada durante la reunión?",
        hint: "Detalles sobre cómo se abordaron.",
        guide: "Cada objeción y cómo respondió el comercial; indica si quedó resuelta o pendiente.",
      },
      {
        id: "feedback_interes",
        label: "¿Qué aspectos de nuestra solución o propuesta generaron mayor interés o entusiasmo?",
        guide: "Funcionalidades, beneficios o momentos de la reunión que generaron interés.",
      },
    ],
  },
  {
    title: "Próximos pasos",
    questions: [
      {
        id: "proximos_pasos",
        label: "¿Cuáles fueron los próximos pasos establecidos en la reunión entre el comercial y el prospecto?",
        guide: "Acciones acordadas, responsable de cada una y fechas.",
      },
    ],
  },
  {
    title: "Comentarios adicionales",
    questions: [
      {
        id: "comentarios_adicionales",
        label: "Escribe aquí cualquier comentario adicional que no haya sido cubierto en las preguntas anteriores.",
        guide:
          "Información relevante que no entra en las otras preguntas: contexto de la empresa, señales de compra o de riesgo, datos de contacto, acuerdos puntuales.",
      },
    ],
  },
];

export const RATING_LABEL = "Califica de 1 a 5 estrellas la calidad de la reunión generada";

export const ALL_QUESTIONS: Question[] = SECTIONS.flatMap((s) => s.questions);

export type Answers = Record<QuestionId, string>;

export interface Analysis {
  prospecto: { nombre: string; empresa: string };
  respuestas: Answers;
  calificacion: { estrellas: number; justificacion: string };
}

export function formTitle(prospecto: Analysis["prospecto"]): string {
  const nombre = prospecto.nombre.trim();
  const empresa = prospecto.empresa.trim();
  if (nombre && empresa) return `${nombre} de ${empresa}`;
  return nombre || empresa || "Reunión sin identificar";
}

/** Texto plano con todo el formulario, listo para pegar o descargar. */
export function formatAsText(analysis: Analysis, title: string): string {
  const lines: string[] = [title, ""];
  for (const section of SECTIONS) {
    lines.push(section.title.toUpperCase());
    for (const q of section.questions) {
      lines.push(q.label, analysis.respuestas[q.id].trim() || "—", "");
    }
  }
  const { estrellas, justificacion } = analysis.calificacion;
  lines.push(`${RATING_LABEL}: ${"★".repeat(estrellas)}${"☆".repeat(5 - estrellas)} (${estrellas}/5)`);
  if (justificacion.trim()) lines.push(justificacion.trim());
  return lines.join("\n");
}
