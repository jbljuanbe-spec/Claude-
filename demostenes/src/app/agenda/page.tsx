import Link from "next/link";
import { requireTherapist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Nav } from "@/components/Nav";

export default async function AgendaPage() {
  const therapist = await requireTherapist();

  const appointments = await prisma.appointment.findMany({
    where: { therapistId: therapist.id, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 25,
    include: { patient: { include: { user: true } }, brief: true },
  });

  return (
    <>
      <Nav
        name={therapist.user.name}
        links={[
          { href: "/agenda", label: "Agenda" },
          { href: "/pacientes", label: "Pacientes" },
        ]}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 p-6">
        <h1 className="text-xl font-semibold">Próximas citas</h1>

        {appointments.length === 0 ? (
          <p className="text-stone-600">No tienes citas programadas.</p>
        ) : (
          <ul className="space-y-2">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  href={`/citas/${appointment.id}`}
                  className="flex items-center gap-4 rounded border border-stone-200 bg-white px-4 py-3 hover:border-stone-400"
                >
                  <span className="w-48 text-sm text-stone-600">
                    {formatDateTime(appointment.startsAt)}
                  </span>
                  <span className="font-medium">{appointment.patient.user.name}</span>
                  <span className="ml-auto text-xs text-stone-500">
                    {appointment.brief ? "Ficha lista" : "Sin ficha"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
