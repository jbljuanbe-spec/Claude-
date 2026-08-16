import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";

export async function requireTherapist() {
  const session = await readSession();
  if (!session || session.role !== "THERAPIST") redirect("/login");

  const therapist = await prisma.therapist.findUnique({
    where: { userId: session.userId },
    include: { user: true },
  });
  if (!therapist) redirect("/login");

  return therapist;
}

export async function requirePatient() {
  const session = await readSession();
  if (!session || session.role !== "PATIENT") redirect("/login");

  const patient = await prisma.patient.findUnique({
    where: { userId: session.userId },
    include: { user: true },
  });
  if (!patient) redirect("/login");

  return patient;
}

/// Comprueba que el paciente pertenece a este terapeuta antes de exponer datos clínicos.
export async function requireOwnedPatient(therapistId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId },
    include: { user: true, goals: { where: { active: true } } },
  });
  if (!patient) redirect("/agenda");
  return patient;
}
