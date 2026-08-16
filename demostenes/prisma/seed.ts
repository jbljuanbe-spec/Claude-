import { PrismaClient, Mood } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysAhead = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  const passwordHash = await bcrypt.hash("demostenes", 10);

  const therapistUser = await prisma.user.upsert({
    where: { email: "logopeda@demostenes.test" },
    update: {},
    create: {
      email: "logopeda@demostenes.test",
      passwordHash,
      name: "Ana Ruiz",
      role: "THERAPIST",
      therapistProfile: { create: { discipline: "LOGOPEDIA" } },
    },
    include: { therapistProfile: true },
  });

  const therapistId = therapistUser.therapistProfile!.id;

  const patientUser = await prisma.user.upsert({
    where: { email: "paciente@demostenes.test" },
    update: {},
    create: {
      email: "paciente@demostenes.test",
      passwordHash,
      name: "Marco Díaz",
      role: "PATIENT",
      patientProfile: { create: { therapistId, birthDate: new Date("2016-04-11") } },
    },
    include: { patientProfile: true },
  });

  const patientId = patientUser.patientProfile!.id;

  // El seed se ejecuta más de una vez (al reinstalar, al reiniciar la base de
  // datos). Sin este borrado, cada pasada duplicaba el diario y las citas:
  // `skipDuplicates` no lo evita porque estas tablas no tienen clave única.
  await prisma.preSessionBrief.deleteMany({ where: { appointment: { patientId } } });
  await prisma.appointment.deleteMany({ where: { patientId } });
  await prisma.diaryEntry.deleteMany({ where: { patientId } });
  await prisma.goal.deleteMany({ where: { patientId } });

  await prisma.goal.createMany({
    data: [
      { patientId, title: "Fonema /r/ en posición inicial", description: "Praxias diarias y lectura en voz alta" },
      { patientId, title: "Fluidez en frases largas", description: "Reducir bloqueos al contar algo espontáneo" },
    ],
    skipDuplicates: true,
  });

  await prisma.diaryEntry.createMany({
    data: [
      { patientId, body: "Hemos hecho los ejercicios de la /r/ tres veces. Le costó al principio pero acabó contento.", mood: Mood.BIEN, createdAt: daysAgo(9) },
      { patientId, body: "Hoy no ha querido hacer los ejercicios. Se frustró y acabamos dejándolo.", mood: Mood.MAL, createdAt: daysAgo(7) },
      { patientId, body: "Leyó un cuento entero en voz alta. Se trabó en dos frases largas pero siguió.", mood: Mood.MUY_BIEN, createdAt: daysAgo(4) },
      { patientId, body: "Ejercicios hechos por la mañana. En el cole dice que le da vergüenza hablar en clase.", mood: Mood.NEUTRO, createdAt: daysAgo(2) },
    ],
    skipDuplicates: true,
  });

  await prisma.appointment.create({
    data: { patientId, therapistId, startsAt: daysAgo(10), sessionNotes: "Trabajamos praxias de /r/. Pautamos 5 min diarios en casa." },
  });
  await prisma.appointment.create({
    data: { patientId, therapistId, startsAt: daysAhead(1) },
  });

  console.log("Datos de ejemplo listos. Contraseña de ambas cuentas: demostenes");
}

main().finally(() => prisma.$disconnect());
