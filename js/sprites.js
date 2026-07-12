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
  const urls = [];
  if (entry.id !== entry.pokemonId) {
    urls.push(`${SHOWDOWN_BASE}${entry.id}.gif`);
  }
  urls.push(`${SHOWDOWN_BASE}${entry.pokemonId}.gif`);
  urls.push(`${ARTWORK_BASE}${entry.speciesId}.png`);
  urls.push(PLACEHOLDER);
  return urls;
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
