# Liga Pokémon: Torneo de Favoritos

Sitio estático (HTML/CSS/JS puro, sin build ni framework) inspirado en
[cajunavenger.github.io](https://cajunavenger.github.io), pero con una mecánica
de selección distinta: en vez de elegir por tipo/generación con cientos de
comparaciones, eliges **un solo favorito por grupo** (por generación o por
categoría) y con esas elecciones se arma automáticamente un cuadro de
**eliminación directa** al estilo de la Liga Pokémon del anime, terminando en
un **Hall de la Fama** con tus favoritos según cómo de lejos llegaron.

## Cómo funciona

1. **Elige tus favoritos**: escoges el modo (por generación, 9 grupos; o por
   categoría: iniciales, legendarios, míticos, pseudolegendarios, Megas,
   Gigamax, formas regionales, Eeveelutions, Pokémon paradójicos...), decides
   qué grupos entran al torneo y marcas un único favorito por grupo (con
   buscador si el grupo es grande). Nada de enfrentamientos en esta fase.
2. **Liga Pokémon**: con esos favoritos se arma un cuadro de eliminación
   directa (dieciseisavos/octavos/cuartos/semis/final, según cuántos
   participantes haya) mostrando **todas las rondas a la vez**, como un
   tablero de torneo: eliges quién avanza en cada enfrentamiento y ves la
   progresión completa en pantalla. Si el número de favoritos no es potencia
   de 2, se reparten "byes" (pases automáticos) en la primera ronda.
3. **Hall de la Fama**: tus favoritos quedan inmortalizados según hasta dónde
   llegaron, con medalla especial para semifinalistas, subcampeón y campeón.

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

- **Tipografía uniforme**: [Russo One](https://fonts.google.com/specimen/Russo+One)
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
