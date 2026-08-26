"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return "Introduce un email y una contraseña válidos.";

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return "Email o contraseña incorrectos.";
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(user.role === "THERAPIST" ? "/agenda" : "/diario");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
