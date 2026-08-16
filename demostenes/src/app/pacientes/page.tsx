import Link from "next/link";
import { requireTherapist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";

export default async function PacientesPage() {
  const therapist = await requireTherapist();

  const patients = await prisma.patient.findMany({
    where: { therapistId: therapist.id },
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
      _count: { select: { entries: true } },
    },
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
        <h1 className="text-xl font-semibold">Pacientes</h1>

        {patients.length === 0 ? (
          <p className="text-stone-600">Todavía no tienes pacientes dados de alta.</p>
        ) : (
          <ul className="space-y-2">
            {patients.map((patient) => (
              <li key={patient.id}>
                <Link
                  href={`/pacientes/${patient.id}`}
                  className="flex items-center gap-4 rounded border border-stone-200 bg-white px-4 py-3 hover:border-stone-400"
                >
                  <span className="font-medium">{patient.user.name}</span>
                  <span className="ml-auto text-sm text-stone-500">
                    {patient._count.entries} entradas de diario
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
