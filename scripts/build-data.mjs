// Cruza los CSV de PokeAPI descargados por fetch-csv.mjs y genera:
//   data/pokemon.json  -> una entrada por "aspecto" seleccionable (especie, forma,
//                          regional, mega, gigamax, variante cosmética...)
//   data/groups.json   -> grupos curados para el emparejamiento de "homólogos"
//   data/meta.json     -> listas de tipos/generaciones/categorías para la UI de filtros
//
// Fuente de datos: PokeAPI (https://github.com/PokeAPI/pokeapi), CSVs en
// data/v2/csv/. No hay ninguna afiliación con Nintendo / Game Freak / The Pokémon
// Company; este es un proyecto de fans sin fines de lucro.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, ".cache");
const DATA_DIR = path.join(__dirname, "..", "data");

const ES = "7"; // local_language_id para español en PokeAPI

// ---------------------------------------------------------------------------
// Parser CSV mínimo (los CSV de PokeAPI no usan comillas ni comas dentro de
// campos, así que un split simple es seguro y evita añadir una dependencia).
// ---------------------------------------------------------------------------
async function readCsv(name) {
  const text = await readFile(path.join(CACHE_DIR, name), "utf8");
  const lines = text.split("\n").filter((l) => l.length > 0);
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {};
    header.forEach((h, idx) => (row[h] = cols[idx] ?? ""));
    rows.push(row);
  }
  return rows;
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Grupos curados a mano: no derivables de un simple booleano en la API.
// Los IDs se verificaron contra pokemon_species.csv en un fetch manual previo.
// ---------------------------------------------------------------------------
const STARTER_CHAIN_IDS = [
  1, 2, 3, 79, 80, 81, 130, 131, 132, 203, 204, 205, 256, 257, 258, 337, 338,
  339, 374, 375, 376, 430, 431, 432, 478, 479, 480,
];

const PSEUDO_LEGENDARY_CHAIN_IDS = [
  76, 126, 191, 192, 230, 323, 362, 408, 466, 527,
];

const EEVEELUTION_CHAIN_ID = 67;

const PARADOX_SPECIES_IDS = [
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006,
  1009, 1010, 1020, 1021, 1022, 1023,
];

const LEGENDARY_GROUPS = [
  { name: "Aves legendarias de Kanto", species: [144, 145, 146] },
  { name: "Bestias legendarias de Johto", species: [243, 244, 245] },
  { name: "Titanes de roca de Hoenn", species: [377, 378, 379] },
  { name: "Trío del lago de Sinnoh", species: [480, 481, 482] },
  { name: "Espadachines legendarios", species: [638, 639, 640, 647] },
  { name: "Trío Tao", species: [643, 644, 646] },
  { name: "Genios de la fuerza", species: [641, 642, 645] },
  { name: "Deidades guardianas de Alola", species: [785, 786, 787, 788] },
  { name: "Tesoros de la desgracia", species: [1001, 1002, 1003, 1004] },
  { name: "Trío leal", species: [1014, 1015, 1016] },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Leyendo CSVs...");
  const [
    pokemonRows,
    speciesRows,
    speciesNameRows,
    pokemonTypeRows,
    typeRows,
    typeNameRows,
    formRows,
    formNameRows,
    generationNameRows,
  ] = await Promise.all([
    readCsv("pokemon.csv"),
    readCsv("pokemon_species.csv"),
    readCsv("pokemon_species_names.csv"),
    readCsv("pokemon_types.csv"),
    readCsv("types.csv"),
    readCsv("type_names.csv"),
    readCsv("pokemon_forms.csv"),
    readCsv("pokemon_form_names.csv"),
    readCsv("generation_names.csv"),
  ]);

  // --- índices -------------------------------------------------------------
  const pokemonById = new Map(pokemonRows.map((r) => [r.id, r]));

  const speciesById = new Map(speciesRows.map((r) => [r.id, r]));

  const speciesNameEsById = new Map(
    speciesNameRows
      .filter((r) => r.local_language_id === ES)
      .map((r) => [r.pokemon_species_id, r.name])
  );

  const typeNameEsById = new Map(
    typeNameRows
      .filter((r) => r.local_language_id === ES)
      .map((r) => [r.type_id, r.name.toLowerCase()])
  );

  const typesByPokemonId = new Map();
  for (const row of pokemonTypeRows) {
    const list = typesByPokemonId.get(row.pokemon_id) ?? [];
    list[Number(row.slot) - 1] = typeNameEsById.get(row.type_id) ?? row.type_id;
    typesByPokemonId.set(row.pokemon_id, list);
  }

  const formNameEsById = new Map(
    formNameRows
      .filter((r) => r.local_language_id === ES && r.form_name)
      .map((r) => [r.pokemon_form_id, r.form_name])
  );

  // pokemon_types.csv no registra el tipo por-forma de Arceus/Silvally (todas
  // sus formas comparten un único pokemon_id, así que la tabla solo trae el
  // tipo por defecto). Como el slug de la forma ES el nombre del tipo
  // ("arceus-fire", "silvally-water"...), lo resolvemos aparte.
  const typeIdByEnglishSlug = new Map(typeRows.map((r) => [r.identifier, r.id]));
  const typeEsByEnglishSlug = new Map(
    [...typeIdByEnglishSlug.entries()].map(([slug, typeId]) => [
      slug,
      typeNameEsById.get(typeId) ?? slug,
    ])
  );

  const generationEsById = new Map(
    generationNameRows
      .filter((r) => r.local_language_id === ES)
      .map((r) => [r.generation_id, r.name])
  );

  // Categorías curadas por chain / species id
  const starterChainSet = new Set(STARTER_CHAIN_IDS.map(String));
  const pseudoChainSet = new Set(PSEUDO_LEGENDARY_CHAIN_IDS.map(String));
  const paradoxSpeciesSet = new Set(PARADOX_SPECIES_IDS.map(String));
  const legendaryGroupBySpecies = new Map();
  LEGENDARY_GROUPS.forEach((group, idx) => {
    group.species.forEach((id) => legendaryGroupBySpecies.set(String(id), idx));
  });

  // --- construir data/pokemon.json -----------------------------------------
  const entries = [];
  const typesSeen = new Set();
  const generationsSeen = new Set();
  const categoriesSeen = new Set();

  for (const form of formRows) {
    const pokemon = pokemonById.get(form.pokemon_id);
    if (!pokemon) continue; // fila huérfana, no debería pasar
    const species = speciesById.get(pokemon.species_id);
    if (!species) continue;

    const nameEs =
      speciesNameEsById.get(pokemon.species_id) ?? titleCase(species.identifier);

    const isDefaultForm = form.is_default === "1";
    let formLabel = formNameEsById.get(form.id) ?? null;
    if (!formLabel && !isDefaultForm && form.form_identifier) {
      formLabel = titleCase(form.form_identifier);
    }

    let types = typesByPokemonId.get(pokemon.id) ?? [];
    if (
      (species.identifier === "arceus" || species.identifier === "silvally") &&
      typeEsByEnglishSlug.has(form.form_identifier)
    ) {
      types = [typeEsByEnglishSlug.get(form.form_identifier)];
    }
    const generation = Number(species.generation_id);
    const generationEs =
      generationEsById.get(species.generation_id) ?? `Generación ${generation}`;
    const evolutionChainId = species.evolution_chain_id
      ? Number(species.evolution_chain_id)
      : null;
    const isLegendary = species.is_legendary === "1";
    const isMythical = species.is_mythical === "1";

    const slug = form.identifier;
    const categories = [];
    if (isLegendary) categories.push("legendario");
    if (isMythical) categories.push("mitico");
    if (form.is_mega === "1" || /-mega(-[xy])?$/.test(slug))
      categories.push("mega");
    if (/-gmax$/.test(slug)) categories.push("gigamax");
    if (/-(alola|galar|hisui|paldea)(-|$)/.test(slug))
      categories.push("regional");
    if (form.is_battle_only === "1") categories.push("forma-de-combate");
    if (starterChainSet.has(String(evolutionChainId)))
      categories.push("inicial");
    if (pseudoChainSet.has(String(evolutionChainId)))
      categories.push("pseudolegendario");
    if (evolutionChainId === EEVEELUTION_CHAIN_ID) categories.push("eeveelution");
    if (paradoxSpeciesSet.has(pokemon.species_id)) categories.push("paradojico");
    if (legendaryGroupBySpecies.has(pokemon.species_id))
      categories.push("grupo-legendario");

    const entry = {
      id: Number(form.id),
      pokemonId: Number(pokemon.id),
      speciesId: Number(pokemon.species_id),
      slug,
      nameEs,
      formLabel,
      isDefault: isDefaultForm,
      types,
      generation,
      generationEs,
      evolutionChainId,
      categories,
    };

    entries.push(entry);
    types.forEach((t) => typesSeen.add(t));
    generationsSeen.add(generation);
    categories.forEach((c) => categoriesSeen.add(c));
  }

  entries.sort((a, b) => a.id - b.id);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "pokemon.json"),
    JSON.stringify(entries),
    "utf8"
  );
  console.log(`data/pokemon.json escrito: ${entries.length} entradas`);

  // --- data/groups.json ------------------------------------------------------
  const groups = {
    starterChainIds: STARTER_CHAIN_IDS,
    pseudoLegendaryChainIds: PSEUDO_LEGENDARY_CHAIN_IDS,
    eeveelutionChainId: EEVEELUTION_CHAIN_ID,
    paradoxSpeciesIds: PARADOX_SPECIES_IDS,
    legendaryGroups: LEGENDARY_GROUPS,
  };
  await writeFile(
    path.join(DATA_DIR, "groups.json"),
    JSON.stringify(groups, null, 2),
    "utf8"
  );
  console.log("data/groups.json escrito");

  // --- data/meta.json ----------------------------------------------------------
  const CATEGORY_LABELS = {
    legendario: "Legendario",
    mitico: "Mítico",
    mega: "Mega",
    gigamax: "Gigamax",
    regional: "Forma regional",
    "forma-de-combate": "Forma de combate",
    inicial: "Inicial",
    pseudolegendario: "Pseudolegendario",
    eeveelution: "Eeveelution",
    paradojico: "Paradójico",
    "grupo-legendario": "Trío/dúo legendario",
  };
  const meta = {
    types: [...typesSeen].sort(),
    generations: [...generationsSeen].sort((a, b) => a - b),
    categories: [...categoriesSeen]
      .sort()
      .map((id) => ({ id, label: CATEGORY_LABELS[id] ?? titleCase(id) })),
    total: entries.length,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(DATA_DIR, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8"
  );
  console.log("data/meta.json escrito:", meta);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
