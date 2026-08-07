# ⚡ Hazte con Todos

Simulador de carrera de entrenador Pokémon al estilo *Copero*: eliges nombre, región,
inicial y estilo, y en un par de minutos vives veinte años de carrera a base de decisiones.

> Jugar: https://jbljuanbe-spec.github.io/Claude-/leyenda/

**Este juego es totalmente independiente de la app de japonés.** Vive en su propia carpeta
(`leyenda/`) y no comparte ni un solo fichero con ella: ni `index.html`, ni `js/`, ni `css/`,
ni los JSON de contenido. Se puede borrar entera sin que Kotoba se entere.

**La premisa**: un mundo donde la Liga es un deporte profesional de verdad. Empiezas con diez
años cazando bichos por las rutas y acabas en regionales con jueces, patrocinadores y control
de legalidad. Por eso la primera mitad de la carrera va de medallas y capturas, y la segunda
de circuito, puntos de campeonato y comunidad: es un arco, no una mezcla.

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

La carrera en curso **se guarda sola en el navegador**: si cierras la pestaña a mitad (o te
entra una llamada en el móvil), al volver te ofrece continuar donde lo dejaste. No sale nada
de tu dispositivo: es `localStorage`, sin servidor ni cuentas.

### Media y nivel

Tu **media** es el número grande de la barra superior, como el OVR de un juego de fútbol.
**No hay un techo calculado al empezar la partida**: cada temporada se tira un crecimiento
propio, con mucha varianza, y los años buenos y malos se acumulan. Dos carreras que empiezan
igual pueden separarse quince puntos: una acaba en 75 y otra en 90.

De crío se dan saltos, a partir de los 22 cuesta más, y pasados los treinta un buen año es
no perder nada. Lo único que se hereda entre temporadas es el **talento**, un multiplicador
que suben ciertos eventos (el programa del Profesor, el coaching de Riopaser, capturar un
legendario): no te da media hoy, te hace crecer más cada año a partir de ahí.

Repartido en tramos, una carrera típica acaba así: en torno al **42%** entre 65 y 75 (lo
más habitual), un **31%** entre 75 y 83, un **12%** entre 83 y 90, y solo un **7%** pasa de
90. El rango de Leyenda Inmortal exige justamente eso: media de 90 o más, además del
palmarés.

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
  contra la organización del circuito, el dualocke con Folagor, el coaching con Riopaser, el
  torneo del bar de Juanan en Talavera, la Creators Cup de Victory Road, la cola del hack
  check, el equipo filtrado dos días antes del regional, el piso compartido de ocho personas
  en un Internacional, la noche antes del torneo tocando el equipo a las dos de la mañana, el
  speed tie que te cuesta una final, perseguir puntos por media Europa para entrar al Mundial,
  el lío de Twitter por opinar de algo que no era Pokémon y el expediente por un retuit. Todo
  ficción y cariño: los creadores salen como cameos amables, nunca haciendo nada reprochable.
- **Ganar se celebra**: al llevarte un título o completar las ocho medallas salta una copa
  dibujada, con la cinta del color del torneo y confeti.
- **Efectos temporales**: algunas decisiones arriesgadas mueven la media al momento y se
  deshacen solas al cabo de una o dos temporadas (una indigestión, un subidón de doping, un
  cambio de última hora que funcionó). No todo lo que sube o baja es para siempre.
- **Retirarte antes de tiempo es una decisión, no un castigo**: desde los 28 años (seis antes
  del límite de 34) puede llegarte una oferta real — dirigir una academia, comentar el
  circuito, un asiento en el Alto Mando — para cerrar la carrera por tu cuenta.

Ninguna partida se repite: los eventos son aleatorios con pesos por etapa de carrera, hay
condiciones que solo se cumplen si tu carrera ha ido por cierto camino, y **nunca te sale la
misma decisión dos turnos seguidos**. Algunos eventos, además, solo aparecen a cierta edad
(al torneo del bar se va de cañas: mayores de 18).

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
