# ⚡ Conviértete en Leyenda

Simulador de carrera de entrenador Pokémon al estilo *Copero*: eliges nombre, región,
inicial y estilo, y en un par de minutos vives veinte años de carrera a base de decisiones.

> Jugar: https://jbljuanbe-spec.github.io/Claude-/leyenda/

**Este juego es totalmente independiente de la app de japonés.** Vive en su propia carpeta
(`leyenda/`) y no comparte ni un solo fichero con ella: ni `index.html`, ni `js/`, ni `css/`,
ni los JSON de contenido. Se puede borrar entera sin que Kotoba se entere.

## Cómo funciona

1. **Creas al entrenador**: nombre, región natal (9 disponibles), Pokémon inicial de esa
   región, estilo de entrenador y ritmo de partida (una decisión cada 1, 2 o 3 temporadas).
2. **Decides**: cada evento tiene 3 opciones con consecuencias reales sobre tus estadísticas,
   tu equipo y tu reputación. Hay lesiones, ofertas de dopaje, mafias, amaños, patrocinios,
   intercambios, legendarios, quemarte y tener que parar, y retiradas de compañeros.
3. **Se simulan las temporadas**: torneos, medallas, títulos, duelos con tu rival y dinero.
   Tus Pokémon evolucionan solos según los años que lleven contigo y el vínculo que tengáis.
4. **Te retiras** (por edad, salud, desmotivación, olvido o decisión propia) y recibes una
   **tarjeta final** con rango, palmarés, equipo, momentos de tu vida y un resumen copiable
   para compartir.

Ninguna partida se repite: los eventos son aleatorios con pesos por etapa de carrera, y hay
condiciones que solo se cumplen si tu carrera ha ido por cierto camino.

## Estructura

```
leyenda/
  index.html          Punto de entrada (una sola pantalla, sin dependencias)
  css/estilo.css      Estilos + tipografías autoalojadas
  js/datos.js         Regiones, estilos, ~75 líneas evolutivas, tipos y rangos finales
  js/motor.js         Estado, simulación de temporada, evoluciones, retiro y legado
  js/eventos.js       Catálogo de decisiones con sus consecuencias
  js/juego.js         Interfaz, bucle de juego y tarjeta final
  fuentes/            Pixelify Sans, Space Grotesk y Silkscreen (OFL, ver licencias)
  sprites/            200 sprites de github.com/PokeAPI/sprites
```

## Créditos y licencias

- Tipografías tomadas de [github.com/google/fonts](https://github.com/google/fonts):
  **Pixelify Sans**, **Space Grotesk** y **Silkscreen**, todas bajo
  [SIL Open Font License 1.1](fuentes/OFL-PixelifySans.txt). Se sirven autoalojadas
  (subconjunto latino en `woff2`), así que el juego no llama a ningún CDN externo.
- Sprites de [github.com/PokeAPI/sprites](https://github.com/PokeAPI/sprites), copiados al
  repo para que todo funcione sin conexión y sin depender de terceros.
- Pokémon es marca registrada de Nintendo / Game Freak / The Pokémon Company. Esto es un
  proyecto personal sin ánimo de lucro y sin ninguna relación con ellos.
