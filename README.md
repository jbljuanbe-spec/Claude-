# 言葉 Kotoba

App personal de estudio de japonés (Genki I/II + Minna no Nihongo). Repetición espaciada real, recall activo y ejercicios estilo Duolingo, alimentada por el `contenido_japones.json` exportado del chat de lecciones.

**No hay nada que instalar.** La app es 100% estática y se publica sola en GitHub Pages con cada cambio:

> https://jbljuanbe-spec.github.io/Claude-/

El progreso se guarda en el navegador (IndexedDB) y se puede descargar/restaurar como copia de seguridad desde la pestaña Progreso.

## Actualizar el contenido tras nuevas lecciones

1. En GitHub, abre `contenido_japones.json` y pulsa el lápiz (o sube el archivo nuevo encima, con el mismo nombre).
2. Guarda el commit. GitHub Pages se redespliega solo en un minuto.
3. En la app, pestaña **📖 Lecciones**, pulsa **Actualizar contenido**.

Las tarjetas con id nuevo entran con progreso desde cero; las existentes actualizan su texto pero **conservan intervalos, racha e historial**. Reimportar nunca resetea nada. (Al abrir la app también se sincroniza sola.)

## Qué hay dentro

La app se organiza en cuatro pestañas:

1. **📍 El Viaje**: mapa real de Japón **a pantalla completa e interactivo** (zoom con rueda/pinza, arrastre y vuelo de cámara ~2.5× a la parada conquistada; botones ＋ / − / ⌂). Las estaciones (lecciones) se **reparten solas** a lo largo de la vía principal (curva Bézier entre 11 hitos madre) por interpolación con `getPointAtLength()`: da igual que haya 6, 86 o 300 lecciones, el mapa crece y se redistribuye sin tocar coordenadas. Cada lección es un *hito* de una ciudad (estación, barrio, comida, festival) y superarla da su **insignia local**; completar todos los hitos **conquista la ciudad** (estación dorada + vía que se rellena + confeti). Las estaciones futuras salen como puntos grises "en construcción" hasta la ~L300. **Al tocar una prefectura** aparece su nombre (kanji + romaji + tipo), para aprender geografía y cultura mientras juegas. Al **conquistar una ciudad, el fondo de su prefectura se ilumina** (dorado, con destello); las que tienen lecciones en marcha llevan un tinte suave.

2. **📖 Lecciones**: el temario ordenado. Teoría de cada lección (vocabulario, gramática, conjugación con audio) y sus ejercicios prácticos: partículas, ordenar frases, traducción, lectura de kanji, conjugación y vocabulario escrito. Aprobado = 80%. El fallo da +0 XP (nunca resta).
3. **⚔️ Repaso**: la sesión SRS diaria (SM-2 adaptado, interleaving, corrección tolerante con romaji→kana). Se puede filtrar por ciudad desde el mapa.
4. **🏆 Perfil**: racha con congeladores automáticos (1 cada 4 días activos, máx. 4, se usan solos), nivel y XP, **galería de insignias locales** (una por hito, consultable como logros de videojuego, con fecha), tarjetas sanguijuela (5+ fallos), actividad y copia de seguridad.

### Notas de las piezas

- **SRS**: fallar una tarjeta la resetea a minutos; acertarla varias veces la espacia hasta 180 días, sin eliminarla nunca. Dominada = intervalo ≥ 21 días (retención real). Los repasos de lo ya aprendido nunca se bloquean; solo el contenido nuevo respeta el orden del viaje.
- **Gamificación no punitiva**: XP e insignias solo suben; las medallas y las lecciones superadas son permanentes; la racha se pausa con congeladores, no se rompe; las barras de progreso nunca arrancan visualmente de cero.
- **Audio**: Web Speech API del navegador con voz `ja-JP` (mejor soporte en Chrome/Edge).
- **Animaciones**: Lottie ligeras (té matcha, conejos de la luna, Japón) con `lottie_light` vendorizado y carga diferida.

## Estructura

```
index.html              Punto de entrada + pestañas
js/app.js               Enrutado por hash de las 4 pestañas
js/motor.js             SRS, importación idempotente, viaje, racha y estadísticas
js/almacen.js           Persistencia en IndexedDB
js/api.js               Fachada que usan las vistas
js/curriculum.js        Jerarquía Región › Prefectura › Ciudad › Hito + hitos madre del mapa
js/mapa-render.js       Vía Bézier + reparto automático de estaciones (getPointAtLength)
js/mapa-japon.js        Geometría de las 47 prefecturas (GeoJSON simplificado, con romaji)
js/viaje.js             📍 El Viaje: mapa interactivo + línea de tren
js/lecciones.js         📖 Lecciones: teoría + ejercicios que superan la lección
js/review.js            ⚔️ Repaso: sesión SRS
js/perfil.js            🏆 Perfil: nivel, insignias, sanguijuelas, copia de seguridad
js/ciudades.js          Niveles de viajero y tiers de dominio
js/kana.js              Romaji -> kana, normalización y corrección tolerante
js/tts.js               Pronunciación (Web Speech API)
js/lottie.js            Carga diferida de animaciones Lottie
data/ejercicios.json    Ejercicios de partículas / ordenar / traducción
contenido_japones.json  Contenido de las lecciones (se reemplaza al actualizar)
```

Para añadir lecciones nuevas solo tocas `contenido_japones.json`: aparecen solas como estaciones en el mapa y como lecciones jugables (agrupadas bajo "Nuevas lecciones" si aún no las has asignado a una ciudad en `js/curriculum.js`, que es opcional y solo sirve para ponerles nombre de hito e insignia bonitos).

Para trastear en local basta cualquier servidor estático, por ejemplo `python3 -m http.server` en la raíz.

Notas de los ejercicios de ordenar: se acepta solo el orden canónico de la frase; los adverbios de tiempo van al principio.
