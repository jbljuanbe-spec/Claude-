// Carga y expone el dataset generado por scripts/build-data.mjs.

let pokemonList = null;
let groups = null;
let meta = null;
let byId = null;

export async function loadData() {
  if (pokemonList) return { pokemonList, groups, meta };

  const [pokemonRes, groupsRes, metaRes] = await Promise.all([
    fetch("./data/pokemon.json"),
    fetch("./data/groups.json"),
    fetch("./data/meta.json"),
  ]);

  if (!pokemonRes.ok || !groupsRes.ok || !metaRes.ok) {
    throw new Error("No se pudieron cargar los datos de Pokémon.");
  }

  pokemonList = await pokemonRes.json();
  groups = await groupsRes.json();
  meta = await metaRes.json();
  byId = new Map(pokemonList.map((p) => [p.id, p]));

  return { pokemonList, groups, meta };
}

export function getById(id) {
  return byId.get(id);
}

export function getAll() {
  return pokemonList;
}

export function getGroups() {
  return groups;
}

export function getMeta() {
  return meta;
}
