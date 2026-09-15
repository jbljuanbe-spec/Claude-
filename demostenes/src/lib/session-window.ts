import type { DiaryEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/// Ventana de diario que entra en la ficha: desde la cita anterior, o los 30
/// días previos si es la primera. La agenda y la ficha comparten este cálculo a
/// propósito: si divergen, la tarjeta cuenta unos días y la ficha resume otros.
export const DEFAULT_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SessionWindow = {
  from: Date;
  until: Date;
  /// Cita anterior del mismo paciente, si la hay. Sus notas alimentan la ficha.
  previous: { startsAt: Date; sessionNotes: string | null } | null;
};

export async function resolveWindow(
  patientId: string,
  startsAt: Date,
): Promise<SessionWindow> {
  const previous = await prisma.appointment.findFirst({
    where: { patientId, startsAt: { lt: startsAt } },
    orderBy: { startsAt: "desc" },
    select: { startsAt: true, sessionNotes: true },
  });

  return {
    from: previous?.startsAt ?? new Date(startsAt.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS),
    until: startsAt,
    previous,
  };
}

/// Señales que el profesional debe ver sin abrir la cita. Todas se derivan del
/// diario: ninguna es una inferencia del modelo, para que la tarjeta siga
/// siendo cierta aunque no haya ficha generada.
export type Signal = {
  tone: "alerta" | "aviso" | "neutro";
  label: string;
};

export function buildSignals(entries: DiaryEntry[], window: SessionWindow): Signal[] {
  const señales: Signal[] = [];

  // Los días de la ventana que ya han transcurrido: sin este tope, una cita a
  // dos semanas vista mostraría "2 de 14 días" el mismo día de darla de alta.
  const finTranscurrido = Math.min(window.until.getTime(), Date.now());
  const diasTranscurridos = Math.max(
    1,
    Math.ceil((finTranscurrido - window.from.getTime()) / DAY_MS),
  );

  if (entries.length === 0) {
    señales.push({ tone: "alerta", label: "Sin entradas de diario" });
    return señales;
  }

  const diasConRegistro = new Set(entries.map((e) => e.createdAt.toDateString())).size;
  const bajos = entries.filter((e) => e.mood === "MAL" || e.mood === "MUY_MAL").length;

  if (bajos > 0) {
    señales.push({
      tone: bajos >= 3 ? "alerta" : "aviso",
      label: bajos === 1 ? "1 día de ánimo bajo" : `${bajos} días de ánimo bajo`,
    });
  }

  // Menos de un tercio de los días con registro es la señal de adherencia que
  // el profesional quiere ver antes de entrar, no después.
  const adherenciaBaja = diasConRegistro * 3 < diasTranscurridos;
  señales.push({
    tone: adherenciaBaja ? "aviso" : "neutro",
    label: `${diasConRegistro} de ${diasTranscurridos} días con registro`,
  });

  return señales;
}
