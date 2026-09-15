import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTherapist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import { Nav } from "@/components/Nav";
import { BriefContent } from "@/components/BriefContent";
import { GenerateBriefButton } from "./GenerateBriefButton";
import { saveSessionNotes } from "./actions";

export default async function CitaPage({ params }: PageProps<"/citas/[id]">) {
  const therapist = await requireTherapist();
  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, therapistId: therapist.id },
    include: { patient: { include: { user: true } }, brief: true },
  });
  if (!appointment) notFound();

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
        <div>
          <h1 className="text-xl font-semibold">
            <Link href={`/pacientes/${appointment.patientId}`} className="hover:underline">
              {appointment.patient.user.name}
            </Link>
          </h1>
          <p className="text-sm text-stone-600">{formatDateTime(appointment.startsAt)}</p>
        </div>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Ficha pre-sesión</h2>
            {appointment.brief && (
              <p className="text-xs text-stone-500">
                {appointment.brief.entryCount} entradas · {formatDate(appointment.brief.coveredFrom)} –{" "}
                {formatDate(appointment.brief.coveredUntil)}
              </p>
            )}
          </div>

          {appointment.brief ? (
            <BriefContent summary={appointment.brief.summary} />
          ) : (
            <p className="text-sm text-stone-600">
              Todavía no has generado la ficha para esta cita.
            </p>
          )}

          <GenerateBriefButton appointmentId={appointment.id} hasBrief={Boolean(appointment.brief)} />
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Notas de la sesión</h2>
          <form action={saveSessionNotes} className="space-y-2">
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <textarea
              name="sessionNotes"
              rows={8}
              defaultValue={appointment.sessionNotes ?? ""}
              className="w-full rounded border border-stone-300 bg-white p-3 text-sm"
            />
            <button type="submit" className="rounded border border-stone-300 px-3 py-2 text-sm">
              Guardar notas
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
