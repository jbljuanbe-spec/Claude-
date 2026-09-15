"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Mood } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";

const entry = z.object({
  body: z.string().trim().min(1).max(5000),
  mood: z.nativeEnum(Mood),
});

export async function addDiaryEntry(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const parsed = entry.safeParse({
    body: formData.get("body"),
    mood: formData.get("mood"),
  });
  if (!parsed.success) return "Escribe algo y elige cómo te has sentido.";

  const patient = await requirePatient();
  await prisma.diaryEntry.create({
    data: { patientId: patient.id, body: parsed.data.body, mood: parsed.data.mood },
  });

  revalidatePath("/diario");
  return null;
}
