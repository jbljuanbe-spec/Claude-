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
2. **Decides**: cada evento ofrece 3 opciones en horizontal. Las arriesgadas llevan una
   **barra de ruleta** que reparte lo que puede salir bien y lo que puede salir mal (60/40,
   45/55…). Al elegir, la ruleta **gira delante de ti** y la aguja frena donde toca. Las
   consecuencias caen dentro de un rango aleatorio, así que nunca dan lo mismo dos veces.
3. **Se simulan las temporadas**: torneos, medallas, títulos, duelos con tu rival y dinero.
   Tus Pokémon **suben de nivel** (1-100, como en los juegos) y evolucionan al alcanzar su
   propio umbral, que es distinto para cada ejemplar; se narra quién evolucionó en quién.
4. **Te retiras** y recibes la pantalla final con rango, palmarés, equipo, **premios de
   carrera** y una tarjeta que puedes **guardar como imagen** (o compartir desde el móvil).

### Media y nivel

Tu **media** es el número grande de la barra superior, como el OVR de un juego de fútbol.
Sube sola cada temporada por experiencia: rápido de crío, más despacio a partir de los 22 y
casi nada pasados los 26. Cada partida tiene un potencial distinto y **el juego nunca te lo
dice**: simplemente notarás que un año dejas de crecer. Algunos eventos concretos (el
programa del Profesor, capturar un legendario, invertir en instalaciones) lo empujan hacia
arriba, y ahí está la gracia.

Tus Pokémon tienen su propio **nivel del 1 al 100**, que sube cada temporada según tu media,
su vínculo contigo y cómo entrenéis. La fuerza en combate sale de combinar el potencial de
su etapa evolutiva con el nivel al que esté: un Charizard de nivel 30 no pelea como uno de
nivel 90.

### Objetos, personajes y regiones

- **Objetos reales de Pokémon** que aplican su efecto **cada temporada** mientras los lleves:
  el huerto de Bayas Aranja da salud, la Vidasfera sube media a costa de salud, el Huevo
  Suerte acelera tu ritmo de mejora, el Amuleto Moneda añade dinero fijo al año… En la
  mochila de tu ficha se ve cada objeto con su efecto y el total acumulado.
- **Personajes de la versión española**: te llama el Profesor Oak, el Profesor Serbal o la
  Profesora Encina; te plantan cara Giovanni, Helio, Ghechis, Lysson o Guzmán; te retan
  Cintia, Lance o Lionel; y los gimnasios los llevan Brock, Misty, Erika, Fantina o Kabu.
- **Cambiar de región es una decisión más**: te ofrecen el gimnasio de tu región para
  hacerte líder, o te pagan por irte a competir a otra liga (con su riesgo de no adaptarte).
- **Guiños a la escena competitiva española**: la dieta de Sekiam, el manifiesto de Kasty
  contra la organización del circuito, el dualocke con Folagor, la Creators Cup de Victory
  Road, el speed tie que te cuesta una final, perseguir puntos por media Europa para entrar
  al Mundial y el expediente por retuitear un meme. Todo ficción y cariño: los creadores
  salen como cameos amables, nunca haciendo nada reprochable.
- **Ganar se celebra**: al llevarte un título o completar las ocho medallas salta una copa
  dibujada, con la cinta del color del torneo y confeti.

Ninguna partida se repite: los eventos son aleatorios con pesos por etapa de carrera, y hay
condiciones que solo se cumplen si tu carrera ha ido por cierto camino.

## Estructura

```
leyenda/
  index.html          Punto de entrada (una sola pantalla, sin dependencias)
  css/estilo.css      Estilos + tipografías autoalojadas
  js/datos.js         Regiones, 82 líneas evolutivas (tipos por etapa), objetos,
                      personajes, logros y rangos finales
  js/motor.js         Media/techo, temporadas, evoluciones, objetos, retiro y legado
  js/eventos.js       Decisiones con probabilidad y efectos en rango aleatorio
  js/juego.js         Interfaz de dos pestañas (Carrera / Ficha) y bucle de juego
  js/tarjeta.js       Dibuja la tarjeta final en canvas y la guarda como PNG
  fuentes/            Pixelify Sans, Space Grotesk y Silkscreen (OFL, ver licencias)
  sprites/            200 sprites de github.com/PokeAPI/sprites
  objetos/            26 iconos de objetos de github.com/msikma/pokesprite
```

## Créditos y licencias

- Tipografías tomadas de [github.com/google/fonts](https://github.com/google/fonts):
  **Pixelify Sans**, **Space Grotesk** y **Silkscreen**, todas bajo
  [SIL Open Font License 1.1](fuentes/OFL-PixelifySans.txt). Se sirven autoalojadas
  (subconjunto latino en `woff2`), así que el juego no llama a ningún CDN externo.
- Sprites de [github.com/PokeAPI/sprites](https://github.com/PokeAPI/sprites) e iconos de
  objetos de [github.com/msikma/pokesprite](https://github.com/msikma/pokesprite) (que
  además pone la Poké Ball del fondo), copiados al repo para que todo funcione sin conexión
  y sin depender de terceros.
- Pokémon es marca registrada de Nintendo / Game Freak / The Pokémon Company. Esto es un
  proyecto personal sin ánimo de lucro y sin ninguna relación con ellos.
