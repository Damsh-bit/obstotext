import type { Analysis } from "./questions";

// Resultado ficticio para mostrar cómo queda el formulario sin procesar un video real.
export const DEMO_TRANSCRIPT = `Buenas tardes, Laura, gracias por el espacio. Cuéntame un poco cómo están gestionando hoy la conciliación de pagos.
Hoy lo hacemos con hojas de Excel que arma el equipo de tesorería; son tres personas y nos toma casi una semana cerrar cada mes. El problema es que los errores los detectamos tarde.
Entiendo. ¿Han visto otras herramientas?
Sí, tuvimos una demo con Conciliador Pro. Nos gustó el precio, pero no se integra con nuestro ERP.
...
Perfecto, entonces quedamos en que les envío la propuesta el jueves y agendamos una demo técnica con Ricardo, su director de finanzas, la semana del 20.`;

export const DEMO_ANALYSIS: Analysis = {
  prospecto: { nombre: "Laura Méndez", empresa: "Grupo Ejemplo" },
  respuestas: {
    presupuesto:
      "Sí. Tienen una partida para automatización de finanzas de entre 15,000 y 20,000 USD anuales, aprobada para el próximo trimestre. El monto final depende del visto bueno del director de finanzas.",
    autoridad:
      "Laura Méndez (gerente de tesorería) lidera la evaluación, pero no decide sola: la aprobación final es de Ricardo, director de finanzas. El área de TI participa validando la integración con el ERP.",
    necesidad_problema:
      "Automatizar la conciliación de pagos. Hoy el cierre mensual les toma casi una semana y los errores se detectan tarde, lo que genera retrabajo y diferencias en los reportes.",
    necesidad_actual:
      "Concilian manualmente en hojas de Excel; lo hace un equipo de tres personas de tesorería. No tienen integración entre el banco y el ERP.",
    tiempo:
      "Quieren tener una solución funcionando antes del cierre del próximo trimestre. La decisión se tomaría después de la demo técnica de la semana del 20.",
    competencia_opciones: "Sí. Tuvieron una demo con Conciliador Pro.",
    competencia_comparacion:
      "De Conciliador Pro les gustó el precio; lo que no les convenció es que no se integra con su ERP, que es justamente donde nuestra solución les resultó más atractiva.",
    feedback_objeciones:
      "- Preocupación por el tiempo de implementación: el comercial explicó el plan de puesta en marcha en cuatro semanas.\n- Dudas sobre la seguridad de los datos bancarios: quedó pendiente enviar la documentación de seguridad.",
    feedback_interes:
      "La integración nativa con su ERP y los reportes automáticos de diferencias. Laura comentó que eso les \"ahorraría la semana de cierre\".",
    proximos_pasos:
      "- El comercial envía la propuesta económica el jueves.\n- Demo técnica con Ricardo (director de finanzas) y TI la semana del 20.\n- Enviar documentación de seguridad antes de la demo.",
    comentarios_adicionales:
      "La empresa está en expansión (abrirán dos sucursales este año), lo que aumentará el volumen de pagos. Buena señal de compra: Laura pidió referencias de clientes del mismo sector.",
  },
  calificacion: {
    estrellas: 4,
    justificacion:
      "Necesidad clara, presupuesto definido y próximos pasos concretos; falta involucrar al decisor final, que recién participará en la demo técnica.",
  },
};
