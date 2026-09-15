"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTherapist } from "@/lib/auth";
import { BriefError, generateBrief } from "@/lib/brief";
import { resolveWindow } from "@/lib/session-window";

async function loadOwnedAppointment(therapistId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, therapistId },
    include: {
      therapist: true,
      patient: { include: { user: true, goals: { where: { active: true } } } },
    },
  });
  if (!appointment) throw new Error("Cita no encontrada.");
  return appointment;
}

export async function generatePreSessionBrief(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const appointmentId = z.string().parse(formData.get("appointmentId"));
  const therapist = await requireTherapist();
  const appointment = await loadOwnedAppointment(therapist.id, appointmentId);

  const window = await resolveWindow(appointment.patientId, appointment.startsAt);

  const entries = await prisma.diaryEntry.findMany({
    where: {
      patientId: appointment.patientId,
      createdAt: { gte: window.from, lte: window.until },
    },
    orderBy: { createdAt: "asc" },
  });

  let summary: string;
  try {
    summary = await generateBrief({
      patientName: appointment.patient.user.name,
      discipline: appointment.therapist.discipline,
      goals: appointment.patient.goals,
      entries,
      previousSessionNotes: window.previous?.sessionNotes ?? null,
    });
  } catch (error) {
    if (error instanceof BriefError) return error.message;
    // Nunca devolvemos el error interno a la pantalla del profesional: puede
    // contener detalles del proveedor o del propio contenido clínico.
    console.error("[brief] fallo generando la ficha", { appointmentId, error });
    return "No se pudo generar la ficha. Vuelve a intentarlo en unos segundos.";
  }

  await prisma.preSessionBrief.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      summary,
      entryCount: entries.length,
      coveredFrom: window.from,
      coveredUntil: window.until,
    },
    update: {
      summary,
      entryCount: entries.length,
      coveredFrom: window.from,
      coveredUntil: window.until,
      generatedAt: new Date(),
    },
  });

  revalidatePath(`/citas/${appointmentId}`);
  return null;
}

export async function saveSessionNotes(formData: FormData) {
  const appointmentId = z.string().parse(formData.get("appointmentId"));
  const sessionNotes = z.string().max(20_000).parse(formData.get("sessionNotes"));

  const therapist = await requireTherapist();
  await loadOwnedAppointment(therapist.id, appointmentId);

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { sessionNotes },
  });

  revalidatePath(`/citas/${appointmentId}`);
}
