import { getAll } from "./data.js";
import { el, clear } from "./render.js";

const MIN_POOL = 32;

export function computeFilteredIds(filters) {
  const q = filters.query.trim().toLowerCase();
  return getAll()
    .filter((e) => {
      if (q) {
        const haystack = `${e.nameEs} ${e.formLabel ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.types.length && !e.types.some((t) => filters.types.includes(t)))
        return false;
      if (
        filters.generations.length &&
        !filters.generations.includes(e.generation)
      )
        return false;
      if (
        filters.categories.length &&
        !e.categories.some((c) => filters.categories.includes(c))
      )
        return false;
      return true;
    })
    .map((e) => e.id);
}

function toggleValue(list, value) {
  const idx = list.indexOf(value);
  if (idx === -1) list.push(value);
  else list.splice(idx, 1);
  return list;
}

export function renderFilterPhase(container, meta, filters, callbacks) {
  clear(container);

  const countLabel = el("p", { class: "filter-count" });

  const updateCount = () => {
    const matched = computeFilteredIds(filters).length;
    const duelsNeeded = Math.max(0, matched - MIN_POOL);
    if (matched < MIN_POOL) {
      countLabel.textContent = `${matched} Pokémon seleccionados — hacen falta al menos ${MIN_POOL} para empezar el torneo.`;
      countLabel.classList.add("warn");
      startBtn.disabled = true;
    } else if (matched === MIN_POOL) {
      countLabel.textContent = `${matched} Pokémon seleccionados — justo 32: se saltará la fase de duelos y empezará directo la eliminación directa.`;
      countLabel.classList.remove("warn");
      startBtn.disabled = false;
    } else {
      countLabel.textContent = `${matched} Pokémon seleccionados — se necesitarán ${duelsNeeded} duelos de homólogos para llegar a los 32 finalistas.`;
      countLabel.classList.remove("warn");
      startBtn.disabled = false;
    }
  };

  const searchInput = el("input", {
    type: "search",
    class: "filter-search",
    placeholder: "Buscar por nombre...",
    value: filters.query,
    oninput: (ev) => {
      filters.query = ev.target.value;
      updateCount();
    },
  });

  function chipGroup(title, options, selected, labelFn = (o) => o) {
    const wrap = el("div", { class: "filter-group" }, [
      el("h3", { text: title }),
    ]);
    const chipsRow = el("div", { class: "filter-chips" });
    options.forEach((opt) => {
      const chip = el("button", {
        type: "button",
        class: "filter-chip" + (selected.includes(opt) ? " active" : ""),
        text: labelFn(opt),
      });
      chip.addEventListener("click", () => {
        toggleValue(selected, opt);
        chip.classList.toggle("active");
        updateCount();
      });
      chipsRow.appendChild(chip);
    });
    wrap.appendChild(chipsRow);
    return wrap;
  }

  const typeGroup = chipGroup("Tipo", meta.types, filters.types);
  const genGroup = chipGroup(
    "Generación",
    meta.generations,
    filters.generations,
    (g) => `Gen ${g}`
  );
  const catGroup = chipGroup(
    "Categoría",
    meta.categories.map((c) => c.id),
    filters.categories,
    (id) => meta.categories.find((c) => c.id === id)?.label ?? id
  );

  const startBtn = el("button", {
    type: "button",
    class: "btn btn-primary",
    text: "Comenzar torneo",
    onclick: () => callbacks.onStart(computeFilteredIds(filters)),
  });

  const clearBtn = el("button", {
    type: "button",
    class: "btn btn-ghost",
    text: "Limpiar filtros",
    onclick: () => {
      filters.query = "";
      filters.types.length = 0;
      filters.generations.length = 0;
      filters.categories.length = 0;
      renderFilterPhase(container, meta, filters, callbacks);
    },
  });

  container.appendChild(
    el("div", { class: "filter-panel" }, [
      el("h2", { text: "1. Elige quién entra al torneo" }),
      el("p", {
        class: "phase-help",
        text:
          "Filtra el repositorio completo de Pokémon (todas las generaciones, formas regionales, Megas, Gigamax y variantes) y decide cuántos entran a competir.",
      }),
      searchInput,
      typeGroup,
      genGroup,
      catGroup,
      countLabel,
      el("div", { class: "filter-actions" }, [startBtn, clearBtn]),
    ])
  );

  updateCount();
}
