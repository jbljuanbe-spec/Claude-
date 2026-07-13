// Resolución de sprites: intenta el sprite estilo Pokémon Showdown más
// específico posible (por forma) y va cayendo a alternativas menos
// específicas si la imagen no existe. Todo del mirror público de
// PokeAPI/sprites, sin alojar imágenes en este repo.

const SHOWDOWN_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/";
const ARTWORK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";
const PLACEHOLDER = "./assets/placeholder.svg";

export function spriteCandidates(entry) {
  // OJO: no se usa entry.id (la clave propia de pokemon_forms.csv) para
  // construir la URL del sprite. Esa numeración es independiente de la de
  // pokemon.csv y coincide por pura casualidad con IDs de otros Pokémon
  // (p. ej. el id de forma de "arceus-flying" coincidía con el id de
  // pokemon.csv de "heracross-mega", mostrando el sprite equivocado).
  // pokemonId sí es seguro: es el id real del recurso "pokemon" con el que
  // está nombrado el sprite.
  return [
    `${SHOWDOWN_BASE}${entry.pokemonId}.gif`,
    `${ARTWORK_BASE}${entry.speciesId}.png`,
    PLACEHOLDER,
  ];
}

// Aplica una cadena de fallback vía onerror a un <img> ya existente.
export function attachSpriteFallback(imgEl, entry) {
  const candidates = spriteCandidates(entry);
  let idx = 0;
  imgEl.src = candidates[idx];
  imgEl.onerror = () => {
    idx += 1;
    if (idx < candidates.length) {
      imgEl.src = candidates[idx];
    } else {
      imgEl.onerror = null;
    }
  };
}

export function displayName(entry) {
  return entry.formLabel ? `${entry.nameEs} (${entry.formLabel})` : entry.nameEs;
}
