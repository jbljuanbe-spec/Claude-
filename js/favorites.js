import { getAll, getById } from "./data.js";
import { el, clear, pickableCard } from "./render.js";

export function buildGroups(mode, meta) {
  const all = getAll();
  if (mode === "generacion") {
    return meta.generations
      .map((gen) => {
        // Solo la especie canónica (no Megas/formas regionales/Gigamax, que
        // tienen su propio pokemonId distinto del de la especie base): así
        // "por generación" no se llena de variantes del mismo Pokémon.
        const members = all.filter(
          (e) => e.isDefault && e.pokemonId === e.speciesId && e.generation === gen
        );
        const sample = members[0];
        return {
          id: `gen-${gen}`,
          label: sample ? sample.generationEs : `Generación ${gen}`,
          members: members.map((e) => e.id),
        };
      })
      .filter((g) => g.members.length > 0);
  }
  // categoria
  return meta.categories
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      members: all.filter((e) => e.categories.includes(cat.id)).map((e) => e.id),
    }))
    .filter((g) => g.members.length > 0);
}

function toggleValue(list, value) {
  const idx = list.indexOf(value);
  if (idx === -1) list.push(value);
  else list.splice(idx, 1);
  return list;
}

export function renderModeAndGroupSelection(container, meta, state, callbacks) {
  clear(container);

  const modeCard = (mode, title, desc) =>
    el(
      "button",
      {
        type: "button",
        class: "mode-card" + (state.groupMode === mode ? " active" : ""),
        onclick: () => {
          state.groupMode = mode;
          state.groupSelection = buildGroups(mode, meta).map((g) => g.id);
          callbacks.onModeChange();
        },
      },
      [el("h3", { text: title }), el("p", { text: desc })]
    );

  const modeRow = el("div", { class: "mode-row" }, [
    modeCard(
      "generacion",
      "Por generación",
      "Elige tu Pokémon favorito de cada una de las 9 generaciones."
    ),
    modeCard(
      "categoria",
      "Por categoría",
      "Elige tu favorito entre iniciales, legendarios, míticos, Megas, pseudolegendarios y más."
    ),
  ]);

  const wrap = el("div", { class: "favorites-panel" }, [
    el("h2", { text: "1. Elige a tus favoritos" }),
    el("p", {
      class: "phase-help",
      text: "Nada de enfrentamientos todavía: elige un solo favorito por grupo y con esas elecciones se arma el torneo.",
    }),
    modeRow,
  ]);

  if (state.groupMode) {
    const groups = buildGroups(state.groupMode, meta);
    const checklist = el(
      "div",
      { class: "group-checklist" },
      groups.map((g) => {
        const checked = state.groupSelection.includes(g.id);
        const chip = el("button", {
          type: "button",
          class: "filter-chip" + (checked ? " active" : ""),
          text: `${g.label} (${g.members.length})`,
        });
        chip.addEventListener("click", () => {
          toggleValue(state.groupSelection, g.id);
          chip.classList.toggle("active");
          startBtn.disabled = state.groupSelection.length < 2;
        });
        return chip;
      })
    );

    const startBtn = el("button", {
      type: "button",
      class: "btn btn-primary",
      text: "Empezar a elegir favoritos",
      disabled: state.groupSelection.length < 2,
      onclick: () => callbacks.onStart(groups.filter((g) => state.groupSelection.includes(g.id))),
    });

    wrap.appendChild(
      el("div", { class: "group-select-block" }, [
        el("h3", { text: "¿Qué grupos entran al torneo?" }),
        el("p", {
          class: "phase-help",
          text: "Desmarca los que no te interesen. Hacen falta al menos 2 para armar un torneo.",
        }),
        checklist,
        el("div", { class: "filter-actions" }, [startBtn]),
      ])
    );
  }

  container.appendChild(wrap);
}

export function renderGroupPicker(container, group, index, total, existingPick, callbacks) {
  const members = group.members.map(getById);

  const grid = el("div", { class: "favorites-grid" });

  function paint(filterText) {
    clear(grid);
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? members.filter((e) => `${e.nameEs} ${e.formLabel ?? ""}`.toLowerCase().includes(q))
      : members;
    filtered.forEach((entry) => {
      const card = pickableCard(entry, (picked) => callbacks.onPick(group.id, picked.id));
      if (existingPick === entry.id) card.classList.add("selected");
      grid.appendChild(card);
    });
  }
  paint("");

  const search = el("input", {
    type: "search",
    class: "filter-search",
    placeholder: `Buscar en ${group.label}...`,
    oninput: (ev) => paint(ev.target.value),
  });

  const nav = el("div", { class: "filter-actions" }, [
    index > 0
      ? el("button", {
          type: "button",
          class: "btn btn-ghost",
          text: "← Grupo anterior",
          onclick: () => callbacks.onBack(),
        })
      : null,
  ]);

  container.replaceChildren(
    el("div", { class: "favorites-panel" }, [
      el("h2", { text: `Grupo ${index + 1} de ${total}: ${group.label}` }),
      el("p", {
        class: "phase-help",
        text: `${members.length} Pokémon en este grupo. Elige tu favorito para avanzar.`,
      }),
      search,
      grid,
      nav,
    ])
  );
}
