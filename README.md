# Torneo Pokémon: Duelo de Homólogos

Sitio estático (HTML/CSS/JS puro, sin build ni framework) inspirado en
[cajunavenger.github.io](https://cajunavenger.github.io), pero con una mecánica
de selección distinta: en vez de elegir por tipo/generación, se comparan
**Pokémon parecidos entre sí ("homólogos")** cabeza a cabeza hasta llegar a 32
finalistas, que compiten en una **eliminación directa** clásica (dieciseisavos
→ octavos → cuartos → semis → final), terminando en un **Hall de la Fama** con
tus 8 cuartofinalistas favoritos.

## Cómo funciona

1. **Filtra el repositorio completo** (nombre, tipo, generación, categoría:
   iniciales, legendarios, pseudolegendarios, Megas, Gigamax, formas
   regionales, Eeveelutions, Pokémon paradójicos...) y decide cuántos entran
   al torneo.
2. **Duelos de homólogos**: mientras haya más de 32 en pie, la web va
   enfrentando de uno en uno a los Pokémon más "parecidos" disponibles
   (primero de la misma familia evolutiva, luego iniciales entre sí,
   pseudolegendarios entre sí, mismo tipo y generación, etc.) hasta dejar
   exactamente 32.
3. **Eliminación directa**: con 32 finalistas, bracket clásico con nombres de
   ronda en español hasta coronar un campeón.
4. **Hall de la Fama**: los 8 cuartofinalistas quedan inmortalizados, con
   medalla especial para semifinalistas, subcampeón y campeón.

Todo el progreso se guarda en `localStorage` del navegador — puedes cerrar la
pestaña y seguir después donde lo dejaste, o pulsar "Reiniciar torneo" para
empezar de cero.

## Datos y sprites

Los datos (nombres en español, tipos, generación, familia evolutiva, formas)
se generan una vez a partir de los CSV públicos de
[PokeAPI](https://github.com/PokeAPI/pokeapi) con:

```
node scripts/fetch-csv.mjs   # descarga y cachea los CSV en scripts/.cache/
node scripts/build-data.mjs  # cruza los CSV -> data/pokemon.json, groups.json, meta.json
```

No hace falta ninguna dependencia externa (usa el `fetch`/`fs` nativos de
Node ≥ 18). Solo hay que volver a ejecutar estos scripts si PokeAPI actualiza
sus datos (nueva generación, nuevas formas...).

Los sprites **no se alojan en este repositorio**: se referencian en vivo desde
el mirror público [PokeAPI/sprites](https://github.com/PokeAPI/sprites),
carpeta `sprites/pokemon/other/showdown/` (el mismo estilo de pixel-art de
Pokémon Showdown / Smogon Sprite Project que usa el sitio de referencia). Si
una forma concreta no tiene sprite propio en ese estilo (por ejemplo, la
mayoría de los sabores decorativos de Alcremie comparten un único sprite base),
la web cae automáticamente al artwork oficial y, en último caso, a un icono
de repuesto.

**Limitaciones de cobertura conocidas** (por disponibilidad real de datos,
no por elección de diseño):

- **Spinda** se incluye una sola vez: sus manchas se generan de forma
  procedural en los juegos (más de 4 mil millones de combinaciones) y PokeAPI
  no las enumera como formas distintas.
- Algunas variantes puramente cosméticas de **Alcremie** comparten el mismo
  sprite base porque Pokémon Showdown no tiene arte único para cada
  combinación de nata/decoración.

## Diseño

- **Tipografía uniforme**: [Titan One](https://fonts.google.com/specimen/Titan+One)
  (Google Fonts, licencia SIL OFL) en toda la web — deliberadamente no la
  fuente por defecto del navegador.
- **Fondo**: patrón original en SVG (`assets/bg-pattern.svg`) con siluetas de
  Poké Ball, dibujado para este proyecto — no se ha usado ningún arte oficial
  con copyright para el fondo.

## Desplegar en GitHub Pages

Este repo incluye `.github/workflows/deploy-pages.yml`, listo para desplegar
en cuanto se habilite GitHub Pages (Settings → Pages → Source: "GitHub
Actions") — ese paso es manual y hay que hacerlo una vez desde la
configuración del repositorio.

## Aviso

Proyecto de fans sin ánimo de lucro. Pokémon y todos los nombres, sprites y
datos asociados son propiedad de Nintendo, Game Freak y The Pokémon Company;
este sitio no tiene ninguna afiliación con ellos.
