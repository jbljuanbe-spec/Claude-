import { requirePatient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import { MOOD_LABEL } from "@/lib/mood";
import { Nav } from "@/components/Nav";
import { EntryForm } from "./EntryForm";

export default async function DiarioPage() {
  const patient = await requirePatient();

  const [entries, nextAppointment] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.appointment.findFirst({
      where: { patientId: patient.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <>
      <Nav name={patient.user.name} links={[{ href: "/diario", label: "Mi diario" }]} />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">Mi diario</h1>
          {nextAppointment && (
            <p className="text-sm text-stone-600">
              Próxima sesión: {formatDateTime(nextAppointment.startsAt)}
            </p>
          )}
        </div>

        <EntryForm />

        <section className="space-y-2">
          <h2 className="font-medium">Entradas anteriores</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-stone-600">Todavía no has escrito nada.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded border border-stone-200 bg-white px-3 py-2">
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>{formatDate(entry.createdAt)}</span>
                    <span>{MOOD_LABEL[entry.mood]}</span>
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
