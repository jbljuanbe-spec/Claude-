"use client";

import { useActionState } from "react";
import { generatePreSessionBrief } from "./actions";

export function GenerateBriefButton({
  appointmentId,
  hasBrief,
}: {
  appointmentId: string;
  hasBrief: boolean;
}) {
  const [error, formAction, pending] = useActionState(generatePreSessionBrief, null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Generando…" : hasBrief ? "Regenerar ficha" : "Generar ficha pre-sesión"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
