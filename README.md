# Liga Pokémon: Torneo de Favoritos

Sitio estático (HTML/CSS/JS puro, sin build ni framework) inspirado en
[cajunavenger.github.io](https://cajunavenger.github.io), pero con una mecánica
de selección distinta: en vez de elegir por tipo/generación con cientos de
comparaciones, eliges cuántos favoritos por grupo hacen falta (por generación
o por categoría) para llegar exactamente al tamaño de torneo que quieras, y
con esas elecciones se arma un cuadro de **eliminación directa** al estilo de
la Liga Pokémon del anime, terminando en una pantalla de **Hall de la Fama**
al estilo de los juegos clásicos.

## Cómo funciona

1. **Tamaño del torneo**: eliges cuántos participantes quieres (Top 8, 16, 32
   o 64) — nada de "byes" ni pases automáticos, vas a elegir justo los que
   hacen falta.
2. **Grupos**: eliges el modo (por generación, 9 grupos; o por categoría:
   iniciales, legendarios, míticos, pseudolegendarios, Megas, Gigamax, formas
   regionales, Eeveelutions, Pokémon paradójicos...) y qué grupos entran. La
   web calcula sola cuántos favoritos hace falta elegir de cada grupo para
   acercarse al tamaño elegido.
3. **Favoritos**: marcas esos favoritos por grupo (con buscador si el grupo es
   grande). Si al final sobran candidatos (por ejemplo, 9 generaciones para un
   Top 8), pasas a una fase de **recorte manual**: ves a todos los elegidos
   juntos y haces clic en quien no pase, hasta dejar el número exacto.
4. **Liga Pokémon**: con el cuadro ya cerrado (potencia de 2, sin byes) se
   arma la eliminación directa (dieciseisavos/octavos/cuartos/semis/final,
   según el tamaño) mostrando **todas las rondas a la vez**, como un tablero
   de torneo real: eliges quién avanza y ves la progresión completa en
   pantalla.
5. **Hall de la Fama**: al coronar campeón, tus favoritos quedan
   inmortalizados en una pantalla al estilo del Hall de la Fama de los juegos
   clásicos (fondo azul de puntos, sprites en fila, medalla según cómo de
   lejos llegó cada uno).

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
