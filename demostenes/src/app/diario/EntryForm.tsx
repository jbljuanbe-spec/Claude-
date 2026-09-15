"use client";

import { useActionState } from "react";
import { MOOD_LABEL, MOOD_OPTIONS } from "@/lib/mood";
import { addDiaryEntry } from "./actions";

export function EntryForm() {
  const [error, formAction, pending] = useActionState(addDiaryEntry, null);

  return (
    <form action={formAction} className="space-y-3 rounded border border-stone-200 bg-white p-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">¿Qué tal ha ido hoy?</span>
        <textarea
          name="body"
          rows={4}
          required
          className="w-full rounded border border-stone-300 p-2 text-sm"
          placeholder="Los ejercicios, cómo te has sentido, algo que quieras contar en la próxima sesión…"
        />
      </label>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Cómo te has sentido</legend>
        <div className="flex flex-wrap gap-3">
          {MOOD_OPTIONS.map((mood, index) => (
            <label key={mood} className="flex items-center gap-1 text-sm">
              <input type="radio" name="mood" value={mood} required defaultChecked={index === 2} />
              {MOOD_LABEL[mood]}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar entrada"}
      </button>
    </form>
  );
}
