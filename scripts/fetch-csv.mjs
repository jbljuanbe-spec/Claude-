// Descarga (una vez, con caché) los CSV públicos de PokeAPI que necesita build-data.mjs.
// Node >= 18 (usa fetch nativo). Sin dependencias externas.

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, ".cache");
const BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";

const FILES = [
  "pokemon.csv",
  "pokemon_species.csv",
  "pokemon_species_names.csv",
  "pokemon_types.csv",
  "types.csv",
  "type_names.csv",
  "pokemon_forms.csv",
  "pokemon_form_names.csv",
  "generation_names.csv",
];

const FORCE = process.argv.includes("--force");

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchOne(name) {
  const dest = path.join(CACHE_DIR, name);
  if (!FORCE && (await exists(dest))) {
    console.log(`  cache hit  ${name}`);
    return;
  }
  const url = BASE_URL + name;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${res.status}`);
  }
  const text = await res.text();
  await writeFile(dest, text, "utf8");
  console.log(`  descargado ${name} (${text.length} bytes)`);
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  console.log("Descargando CSV de PokeAPI...");
  for (const file of FILES) {
    await fetchOne(file);
  }
  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
