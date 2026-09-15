"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Demóstenes</h1>
          <p className="text-sm text-stone-600">Copiloto clínico para tu consulta.</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded border border-stone-300 bg-white px-3 py-2"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded border border-stone-300 bg-white px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-stone-900 px-3 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
