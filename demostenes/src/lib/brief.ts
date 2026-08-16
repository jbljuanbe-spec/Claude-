import Anthropic from "@anthropic-ai/sdk";
import type { Discipline, DiaryEntry, Goal } from "@prisma/client";
import { MOOD_LABEL } from "@/lib/mood";

const MODEL = "claude-opus-5";

const client = new Anthropic();

const SYSTEM = `Eres el copiloto clínico de un profesional de psicología o logopedia en consulta privada.

<tarea>
A partir del diario que el paciente ha registrado entre sesiones, redactas una ficha ejecutiva "pre-sesión" que el profesional lee en menos de un minuto justo antes de la cita.
</tarea>

<formato>
Devuelve Markdown con exactamente estas secciones, en este orden:

## Desde la última sesión
Dos o tres frases con lo que ha pasado. Hechos concretos con fecha, no generalidades.

## Avance por objetivo
Una línea por objetivo terapéutico activo, indicando qué evidencia hay en el diario. Si un objetivo no aparece en las entradas, dilo explícitamente.

## A tener en cuenta
Dos o tres puntos sobre patrones, cambios de ánimo o adherencia a los ejercicios. Si detectas algo que merece atención clínica prioritaria, ponlo primero.

## Para abrir la sesión
Una o dos preguntas concretas que el profesional puede hacer al empezar.
</formato>

<limites>
No diagnostiques, no propongas tratamientos ni medicación, y no interpretes más allá de lo que dicen las entradas. Cita siempre la fecha de la entrada en la que te apoyas. Si el diario está vacío o es demasiado escaso para una sección, escribe "Sin datos suficientes" en esa sección en lugar de inferir.
</limites>`;

function formatEntries(entries: DiaryEntry[]) {
  return entries
    .map(
      (entry) =>
        `[${entry.createdAt.toISOString().slice(0, 10)}] (ánimo: ${MOOD_LABEL[entry.mood]}) ${entry.body}`,
    )
    .join("\n\n");
}

export type BriefInput = {
  patientName: string;
  discipline: Discipline;
  goals: Goal[];
  entries: DiaryEntry[];
  previousSessionNotes: string | null;
};

export async function generateBrief(input: BriefInput): Promise<string> {
  const disciplineLabel = input.discipline === "LOGOPEDIA" ? "logopedia" : "psicología";

  const userContent = [
    `<paciente>${input.patientName}</paciente>`,
    `<disciplina>${disciplineLabel}</disciplina>`,
    `<objetivos_activos>\n${
      input.goals.length
        ? input.goals.map((g) => `- ${g.title}${g.description ? `: ${g.description}` : ""}`).join("\n")
        : "Ninguno registrado."
    }\n</objetivos_activos>`,
    `<notas_sesion_anterior>\n${input.previousSessionNotes ?? "No hay notas de la sesión anterior."}\n</notas_sesion_anterior>`,
    `<diario_paciente>\n${
      input.entries.length ? formatEntries(input.entries) : "El paciente no ha registrado entradas."
    }\n</diario_paciente>`,
  ].join("\n\n");

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: userContent }],
  } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);

  if (response.stop_reason === "refusal") {
    throw new Error("El modelo declinó generar la ficha para este contenido.");
  }

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("La respuesta del modelo llegó vacía.");
  return text;
}
