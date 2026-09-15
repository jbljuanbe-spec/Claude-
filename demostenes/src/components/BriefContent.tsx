import { Fragment, type ReactNode } from "react";

/// El prompt de la ficha (src/lib/brief.ts) fija un Markdown muy estrecho:
/// encabezados `## `, viñetas `- ` y párrafos sueltos, con `**negrita**` dentro.
/// Renderizamos justo eso: traer un parser completo sería desproporcionado, y
/// dejar el texto en crudo le enseña los `##` al profesional.

function inline(text: string, key: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((trozo, i) =>
    trozo.startsWith("**") && trozo.endsWith("**") ? (
      <strong key={`${key}-${i}`} className="font-medium text-stone-900">
        {trozo.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${key}-${i}`}>{trozo}</Fragment>
    ),
  );
}

type Bloque =
  | { tipo: "titulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; puntos: string[] };

function parsear(markdown: string): Bloque[] {
  const bloques: Bloque[] = [];

  for (const linea of markdown.split("\n")) {
    const texto = linea.trim();
    if (!texto) continue;

    if (texto.startsWith("#")) {
      bloques.push({ tipo: "titulo", texto: texto.replace(/^#+\s*/, "") });
      continue;
    }

    if (/^[-*]\s+/.test(texto)) {
      const punto = texto.replace(/^[-*]\s+/, "");
      const ultimo = bloques.at(-1);
      if (ultimo?.tipo === "lista") ultimo.puntos.push(punto);
      else bloques.push({ tipo: "lista", puntos: [punto] });
      continue;
    }

    bloques.push({ tipo: "parrafo", texto });
  }

  return bloques;
}

export function BriefContent({ summary }: { summary: string }) {
  const bloques = parsear(summary);

  return (
    <article className="space-y-4 rounded border border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-700">
      {bloques.map((bloque, i) => {
        if (bloque.tipo === "titulo") {
          return (
            <h3
              key={i}
              className="text-xs font-medium uppercase tracking-wide text-stone-500 not-first:pt-1"
            >
              {bloque.texto}
            </h3>
          );
        }

        if (bloque.tipo === "lista") {
          return (
            <ul key={i} className="space-y-1.5">
              {bloque.puntos.map((punto, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="select-none text-stone-400">
                    ·
                  </span>
                  <span>{inline(punto, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{inline(bloque.texto, String(i))}</p>;
      })}
    </article>
  );
}
