import Link from "next/link";
import { requireTherapist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import { Nav } from "@/components/Nav";
import { BriefContent } from "@/components/BriefContent";
import { buildSignals, resolveWindow, type Signal } from "@/lib/session-window";

const TONE_CLASS: Record<Signal["tone"], string> = {
  alerta: "bg-red-50 text-red-800 ring-1 ring-red-200",
  aviso: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  neutro: "bg-stone-100 text-stone-600",
};

export default async function AgendaPage() {
  const therapist = await requireTherapist();

  const appointments = await prisma.appointment.findMany({
    where: { therapistId: therapist.id, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 25,
    include: {
      brief: true,
      patient: {
        include: { user: true, goals: { where: { active: true } } },
      },
    },
  });

  // Las señales salen del diario, no de la ficha: la tarjeta dice la verdad
  // sobre la semana del paciente aunque el profesional no haya generado nada.
  const cards = await Promise.all(
    appointments.map(async (appointment) => {
      const window = await resolveWindow(appointment.patientId, appointment.startsAt);
      const entries = await prisma.diaryEntry.findMany({
        where: {
          patientId: appointment.patientId,
          createdAt: { gte: window.from, lte: window.until },
        },
        orderBy: { createdAt: "asc" },
      });
      return { appointment, signals: buildSignals(entries, window), window };
    }),
  );

  return (
    <>
      <Nav
        name={therapist.user.name}
        links={[
          { href: "/agenda", label: "Agenda" },
          { href: "/pacientes", label: "Pacientes" },
        ]}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 p-6">
        <h1 className="text-xl font-semibold">Próximas citas</h1>

        {cards.length === 0 ? (
          <p className="text-stone-600">No tienes citas programadas.</p>
        ) : (
          <ul className="space-y-4">
            {cards.map(({ appointment, signals, window }) => (
              <li key={appointment.id}>
                <Link
                  href={`/citas/${appointment.id}`}
                  className="block space-y-3 rounded-lg border border-stone-200 bg-white p-5 transition hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="font-medium">{appointment.patient.user.name}</h2>
                    <p className="text-sm text-stone-600">
                      {formatDateTime(appointment.startsAt)}
                    </p>
                  </div>

                  {signals.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {signals.map((signal) => (
                        <li
                          key={signal.label}
                          className={`rounded px-2 py-0.5 text-xs ${TONE_CLASS[signal.tone]}`}
                        >
                          {signal.label}
                        </li>
                      ))}
                    </ul>
                  )}

                  {appointment.patient.goals.length > 0 && (
                    <p className="text-sm text-stone-600">
                      <span className="text-stone-500">Objetivos: </span>
                      {appointment.patient.goals.map((goal) => goal.title).join(" · ")}
                    </p>
                  )}

                  {appointment.brief ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs text-stone-500">
                        Ficha pre-sesión · {appointment.brief.entryCount} entradas ·{" "}
                        {formatDate(appointment.brief.coveredFrom)} –{" "}
                        {formatDate(appointment.brief.coveredUntil)}
                      </p>
                      <BriefContent summary={appointment.brief.summary} />
                    </div>
                  ) : (
                    <p className="pt-1 text-sm text-stone-500">
                      Ficha sin generar · cubriría desde el {formatDate(window.from)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
