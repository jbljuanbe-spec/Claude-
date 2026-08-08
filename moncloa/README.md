# A la Moncloa en Cercanías

Simulador satírico de carrera política española. Misma arquitectura que *Hazte con Todos*:
100% cliente, sin backend, sin framework y sin paso de build.

**Esto es sátira.** Ficción sin ánimo de lucro y **sin relación ni afiliación** con ningún
partido, medio, empresa ni institución. Los partidos y las figuras públicas aparecen por su
papel político o mediático y **todas las situaciones están inventadas**: nadie ha dicho ni
hecho nada de lo que aquí se cuenta, y no se atribuye a nadie ningún hecho delictivo. Los
compañeros y rivales internos del juego son personajes ficticios.

## Cómo se ejecuta

Es estático. Sirve la carpeta con cualquier servidor (hace falta un servidor porque usa
módulos ES, no vale abrir el `index.html` a pelo):

```
npx http-server -p 8080 .
```

Despliegue: subir la carpeta tal cual a Cloudflare Pages, GitHub Pages o similar. El
`_headers` está pensado para Cloudflare Pages.

## Ficheros

```
index.html          meta tags OG/Twitter, preload de fuentes, un solo script módulo
css/estilo.css      todo el estilo; el fondo se pinta con las variables --partido*
js/datos.js         partidos, ejes ideológicos, leyes, medios, logros, rangos
js/motor.js         media, encuestas, elecciones, votación de leyes, transfuguismo, legado
js/eventos.js       catálogo de decisiones + las 17 leyes generadas como plenos
js/juego.js         interfaz, bucle de juego, ruleta, pantalla final
js/tarjeta.js       tarjeta PNG final dibujada en canvas
fuentes/            Space Grotesk y Silkscreen (OFL), autoalojadas. Cero CDN.
portada.png         1200x630 para la previsualización al compartir
```

Todos los imports y los enlaces internos llevan `?v=N` para cache-busting. Al tocar
cualquier fichero hay que subir el número **en todos los sitios a la vez**: `index.html`,
las `@font-face` del CSS y los `import` de los cinco módulos.

## Cómo funciona el motor

**Peso político (la "media").** Un número de 0 a 100, tipo OVR. No hay techo calculado al
empezar: cada año se tira un crecimiento con mucha varianza multiplicado por un factor de
*proyección* que suben ciertos eventos. Los años buenos y los malos se acumulan, así que dos
carreras que empiezan igual acaban a quince puntos de distancia. La etapa de la carrera la
marca el peso, no la edad: a partir de **81** eres líder nacional y es cuando te llaman de
los platós grandes.

**Efectos temporales.** `mediaTemporal()` aplica un cambio ya mismo y lo marca para
revertirse solo al cabo de N años: una crisis de imagen pasa, una traición no.

**Ejes ideológicos.** Cada partido y cada ley son un vector de tres ejes (`eco`, `soc`,
`ter`), de -100 a +100. La afinidad entre los dos es un coseno, de -1 a 1. De ahí sale todo
lo que hace que las decisiones tengan coherencia en vez de ser chistes al azar: votar la
misma ley tiene consecuencias distintas según en qué bancada estés sentado. Una ley puede ser
coherente contigo y aun así costarte votos (`popular` es un valor aparte), que es
exactamente lo que pasa en la realidad.

**Encuestas y elecciones.** Se lleva la intención de voto de los cinco partidos. La tuya se
mueve con tu peso, tu credibilidad y tu presencia mediática, más el desgaste de gobernar; las
de los demás revierten a su media histórica con ruido. Cada cuatro años hay generales: el
reparto de escaños es un D'Hondt aproximado calibrado con resultados reales, con el bloque
nacionalista y un comodín de siete escaños que cae de un lado o de otro. Según cómo quede el
bloque y cuánto peso tengas, sales de ahí como presidente, ministro, líder de la oposición o
diputado de la fila de atrás.

**Transfuguismo.** Mecánica central. Lo que te ofrecen y lo que te cuesta salen de la
*distancia ideológica* entre tu partido y el que te llama: cuanto más escandaloso el salto,
más dinero encima de la mesa y más caro en credibilidad y en peso. La alternativa siempre es
quedarte a arreglar esto, que da menos dinero y más credibilidad. También puedes fundar tu
propio partido, y entonces el color de la web pasa a ser el tuyo.

**El fondo es el color de tu partido.** Lo escribe el JS en `--partido` / `--partido-osc` /
`--partido-claro`. `background-color` transiciona, así que un cambio de bancada se ve como un
fundido de color en toda la página.

**Eventos.** Peso por etapa, algunos únicos, algunos condicionados, y nunca sale el mismo dos
turnos seguidos. Las opciones con `riesgo` giran una ruleta animada delante del jugador antes
de saber nada, y lo que marca la aguja es exactamente lo que se aplica. Las consecuencias van
en rango aleatorio, nunca en número fijo.

**Guardado.** La partida en curso se guarda en `localStorage` en cada decisión, así que
puedes cerrar la pestaña y continuar al volver. No sale de tu dispositivo: no hay servidor ni
cuentas.

## Añadir contenido

**Una ley nueva:** un objeto más en `LEYES` (`datos.js`) con su vector de ejes y su
`popular`. Se convierte sola en un pleno con tres opciones y se calcula sola la coherencia
con cada partido.

**Un evento nuevo:** un objeto más en `EVENTOS` (`eventos.js`) con `etapas`, `peso` y de dos
a tres `opciones`. `unico: true` para que salga una sola vez, `cond` para condicionarlo,
`riesgo` en una opción para que gire la ruleta.

**Un partido nuevo:** una entrada más en `PARTIDOS` con su color, su vector de ejes, su
electorado y su intención de voto de partida.
