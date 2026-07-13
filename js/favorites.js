import { getAll, getById } from "./data.js";
import { el, clear, pickableCard } from "./render.js";

const TARGET_SIZES = [8, 16, 32, 64];

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

function perGroupFor(targetSize, numGroups) {
  return Math.max(1, Math.ceil(targetSize / Math.max(1, numGroups)));
}

export function renderSetup(container, meta, state, callbacks) {
  clear(container);

  const sizeRow = el(
    "div",
    { class: "mode-row" },
    TARGET_SIZES.map((size) =>
      el(
        "button",
        {
          type: "button",
          class: "mode-card size-card" + (state.targetSize === size ? " active" : ""),
          onclick: () => {
            state.targetSize = size;
            callbacks.onChange();
          },
        },
        [el("h3", { text: `Top ${size}` }), el("p", { text: `Cuadro de ${size} participantes` })]
      )
    )
  );

  const wrap = el("div", { class: "favorites-panel" }, [
    el("div", { class: "step-track" }, [
      el("span", { class: "step-pill active", text: "1. Tamaño" }),
      el("span", { class: "step-pill" + (state.targetSize ? " active" : ""), text: "2. Grupos" }),
      el("span", { class: "step-pill", text: "3. Favoritos" }),
      el("span", { class: "step-pill", text: "4. Torneo" }),
    ]),
    el("h2", { text: "1. ¿De cuántos participantes quieres el torneo?" }),
    el("p", {
      class: "phase-help",
      text: "Elige el tamaño del cuadro final. Nada de byes ni pases automáticos: vas a elegir exactamente los que hacen falta.",
    }),
    sizeRow,
  ]);

  if (state.targetSize) {
    const modeCard = (mode, title, desc) =>
      el(
        "button",
        {
          type: "button",
          class: "mode-card" + (state.groupMode === mode ? " active" : ""),
          onclick: () => {
            state.groupMode = mode;
            state.groupSelection = buildGroups(mode, meta).map((g) => g.id);
            callbacks.onChange();
          },
        },
        [el("h3", { text: title }), el("p", { text: desc })]
      );

    const modeRow = el("div", { class: "mode-row" }, [
      modeCard(
        "generacion",
        "Por generación",
        "Un grupo por cada una de las 9 generaciones."
      ),
      modeCard(
        "categoria",
        "Por categoría",
        "Iniciales, legendarios, míticos, Megas, pseudolegendarios y más."
      ),
    ]);

    wrap.appendChild(
      el("div", { class: "group-select-block" }, [
        el("h2", { text: "2. ¿Cómo se agrupan los Pokémon?" }),
        modeRow,
      ])
    );
  }

  if (state.targetSize && state.groupMode) {
    const groups = buildGroups(state.groupMode, meta);
    const numSelected = state.groupSelection.length;
    const perGroup = perGroupFor(state.targetSize, numSelected || 1);
    const rawTotal = perGroup * numSelected;
    const excess = Math.max(0, rawTotal - state.targetSize);

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
          callbacks.onChange();
        });
        return chip;
      })
    );

    const summaryText = numSelected < 2
      ? "Elige al menos 2 grupos."
      : `Vas a elegir ${perGroup} favorito${perGroup > 1 ? "s" : ""} de cada uno de los ${numSelected} grupos (${rawTotal} en total)` +
        (excess > 0
          ? `. Como sobran ${excess}, al final los recortarás tú a mano hasta dejar justo ${state.targetSize}.`
          : `, justo los ${state.targetSize} que hacen falta — sin recortes.`);

    const startBtn = el("button", {
      type: "button",
      class: "btn btn-primary",
      text: "Empezar a elegir favoritos",
      disabled: numSelected < 2,
      onclick: () => callbacks.onStart(groups.filter((g) => state.groupSelection.includes(g.id)), perGroup),
    });

    wrap.appendChild(
      el("div", { class: "group-select-block" }, [
        el("h3", { text: "¿Qué grupos entran al torneo?" }),
        checklist,
        el("p", { class: "phase-help summary-text", text: summaryText }),
        el("div", { class: "filter-actions" }, [startBtn]),
      ])
    );
  }

  container.appendChild(wrap);
}

export function renderGroupPicker(container, group, index, total, perGroup, selectedIds, callbacks) {
  const members = group.members.map(getById);
  const cap = Math.min(perGroup, members.length);
  const selected = [...selectedIds];

  const grid = el("div", { class: "favorites-grid" });
  const counter = el("p", { class: "phase-help favorites-counter" });

  function updateCounter() {
    counter.textContent =
      selected.length >= cap
        ? `¡Listo! ${selected.length}/${cap} elegidos.`
        : `Elige ${cap - selected.length} más (${selected.length}/${cap}).`;
  }

  function paint(filterText) {
    clear(grid);
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? members.filter((e) => `${e.nameEs} ${e.formLabel ?? ""}`.toLowerCase().includes(q))
      : members;
    filtered.forEach((entry) => {
      const card = pickableCard(entry, (picked) => {
        if (selected.includes(picked.id)) {
          selected.splice(selected.indexOf(picked.id), 1);
        } else if (selected.length < cap) {
          selected.push(picked.id);
        }
        callbacks.onSelectionChange(selected);
        card.classList.toggle("selected", selected.includes(picked.id));
        updateCounter();
        if (selected.length === cap) callbacks.onComplete(selected);
      });
      if (selected.includes(entry.id)) card.classList.add("selected");
      grid.appendChild(card);
    });
  }
  paint("");
  updateCounter();

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
      el("div", { class: "step-track" }, [
        el("span", { class: "step-pill active", text: "1. Tamaño" }),
        el("span", { class: "step-pill active", text: "2. Grupos" }),
        el("span", { class: "step-pill active", text: "3. Favoritos" }),
        el("span", { class: "step-pill", text: "4. Torneo" }),
      ]),
      el("h2", { text: `Grupo ${index + 1} de ${total}: ${group.label}` }),
      counter,
      search,
      grid,
      nav,
    ])
  );
}

export function renderTrimPhase(container, trimPool, target, onRemove) {
  const entries = trimPool.map(getById);
  const excess = trimPool.length - target;

  const grid = el(
    "div",
    { class: "favorites-grid trim-grid" },
    entries.map((entry) =>
      pickableCard(entry, () => onRemove(entry.id), {})
    )
  );

  container.replaceChildren(
    el("div", { class: "favorites-panel" }, [
      el("div", { class: "step-track" }, [
        el("span", { class: "step-pill active", text: "1. Tamaño" }),
        el("span", { class: "step-pill active", text: "2. Grupos" }),
        el("span", { class: "step-pill active", text: "3. Favoritos" }),
        el("span", { class: "step-pill active", text: "4. Torneo" }),
      ]),
      el("h2", { text: "Recorta hasta dejar el cuadro justo" }),
      el("p", {
        class: "phase-help",
        text: `Tienes ${trimPool.length}, hacen falta ${target}. Elimina ${excess} haciendo clic en quien no pase.`,
      }),
      grid,
    ])
  );
}
