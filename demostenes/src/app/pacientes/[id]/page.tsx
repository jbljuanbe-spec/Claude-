import Link from "next/link";
import { requireOwnedPatient, requireTherapist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import { Nav } from "@/components/Nav";
import { MOOD_LABEL } from "@/lib/mood";

export default async function PacientePage({ params }: PageProps<"/pacientes/[id]">) {
  const therapist = await requireTherapist();
  const { id } = await params;
  const patient = await requireOwnedPatient(therapist.id, id);

  const [entries, appointments] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: { startsAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <>
      <Nav
        name={therapist.user.name}
        links={[
          { href: "/agenda", label: "Agenda" },
          { href: "/pacientes", label: "Pacientes" },
        ]}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-6">
        <h1 className="text-xl font-semibold">{patient.user.name}</h1>

        <section className="space-y-2">
          <h2 className="font-medium">Objetivos activos</h2>
          {patient.goals.length === 0 ? (
            <p className="text-sm text-stone-600">Sin objetivos registrados.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {patient.goals.map((goal) => (
                <li key={goal.id} className="rounded border border-stone-200 bg-white px-3 py-2">
                  <span className="font-medium">{goal.title}</span>
                  {goal.description && <span className="text-stone-600"> — {goal.description}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Citas</h2>
          <ul className="space-y-1 text-sm">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <Link href={`/citas/${appointment.id}`} className="text-stone-700 hover:underline">
                  {formatDateTime(appointment.startsAt)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Diario del paciente</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-stone-600">El paciente no ha registrado entradas.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded border border-stone-200 bg-white px-3 py-2">
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>{formatDate(entry.createdAt)}</span>
                    <span>Ánimo: {MOOD_LABEL[entry.mood]}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{entry.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
