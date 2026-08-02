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

1. **📍 El Viaje**: mapa real de Japón **a pantalla completa e interactivo** (zoom con rueda/pinza, arrastre y vuelo de cámara a la ciudad seleccionada; botones ＋ / − / ⌂), con **un solo punto por ciudad** (no por lección: todas las lecciones de Tokio son barrios/hitos *dentro* de Tokio, no ciudades distantes). Cada lección superada da la **insignia de su barrio, comida o festival**; al completar **todas** las lecciones de una ciudad se conquista entera (nodo dorado ★ + confeti) y se gana un **billete de Shinkansen** 🎫 — los billetes son la única forma de viajar antes de tiempo a la siguiente ciudad, o de desbloquearla al conquistar la anterior. Dentro de una ciudad desbloqueada, todas sus lecciones están disponibles a la vez. Las ciudades futuras se ven en gris ("Próximamente"). **Al tocar una prefectura** aparece su nombre (kanji + romaji + tipo). Al **conquistar una ciudad, el fondo de su prefectura se ilumina** en dorado con destello; con lecciones en marcha lleva un tinte suave.

2. **📖 Lecciones**: el temario ordenado. Teoría de cada lección (vocabulario, gramática, conjugación con audio) y sus ejercicios prácticos: partículas, ordenar frases, traducción, lectura de kanji, conjugación y vocabulario escrito. Aprobado = 80%. El fallo da +0 XP (nunca resta).
3. **⚔️ Repaso**: la sesión SRS diaria (SM-2 adaptado, interleaving, corrección tolerante con romaji→kana). Se puede filtrar por ciudad desde el mapa.
4. **🏆 Perfil**: racha con congeladores automáticos (1 cada 4 días activos, máx. 4, se usan solos), nivel y XP, **galería de insignias locales** (una por hito, consultable como logros de videojuego, con fecha), tarjetas sanguijuela (5+ fallos), actividad y copia de seguridad.

### Notas de las piezas

- **SRS**: fallar una tarjeta la resetea a minutos; acertarla varias veces la espacia hasta 180 días, sin eliminarla nunca. Dominada = intervalo ≥ 21 días (retención real). Los repasos de lo ya aprendido nunca se bloquean; solo el contenido nuevo respeta el orden del viaje.
- **Gamificación no punitiva**: XP e insignias solo suben; las medallas y las lecciones superadas son permanentes; la racha se pausa con congeladores, no se rompe; las barras de progreso nunca arrancan visualmente de cero.
- **Audio**: voz japonesa neuronal **pre-generada con VOICEVOX** (`data/audio/*.mp3`), que suena mucho más natural y con el acento tonal correcto. Si un texto no tiene audio propio, se cae automáticamente a la Web Speech API del navegador, así que nunca hay silencio. Ver [Regenerar el audio](#regenerar-el-audio).
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
js/tts.js               Pronunciación (audio VOICEVOX + Web Speech de reserva)
js/kanji.js             🈴 Kanji: lecturas, mnemotecnia y orden de trazos
tools/inventario_audio.py  Extrae los textos japoneses que la app pronuncia
tools/generar_audio.py     Pre-genera esos textos con VOICEVOX (paso manual)
data/audio/             mp3 pre-generados + manifest.json (índice texto -> mp3)
data/kanji.json         Kanji N5+N4 (lecturas, ejemplos, mnemotecnia)
data/kanjivg/           Orden de trazos (subconjunto de KanjiVG, CC BY-SA 3.0)
js/lottie.js            Carga diferida de animaciones Lottie
data/ejercicios.json    Ejercicios de partículas / ordenar / traducción
contenido_japones.json  Contenido de las lecciones (se reemplaza al actualizar)
```

Para añadir lecciones nuevas solo tocas `contenido_japones.json`: aparecen solas como estaciones en el mapa y como lecciones jugables (agrupadas bajo "Nuevas lecciones" si aún no las has asignado a una ciudad en `js/curriculum.js`, que es opcional y solo sirve para ponerles nombre de hito e insignia bonitos).

Para trastear en local basta cualquier servidor estático, por ejemplo `python3 -m http.server` en la raíz.

Notas de los ejercicios de ordenar: se acepta solo el orden canónico de la frase; los adverbios de tiempo van al principio.

## Regenerar el audio

El audio japonés está **pre-generado con [VOICEVOX](https://voicevox.hiroshiba.jp/)** y servido como `.mp3` estáticos desde `data/audio/`. Esto da voz neuronal japonesa de verdad (con acento tonal correcto), instantánea, sin gastar batería y disponible sin conexión — en vez de depender de la voz que traiga cada dispositivo.

Funciona en dos capas, así que **nunca hay silencio**: si un texto tiene su `.mp3`, se reproduce ese; si no (por ejemplo, contenido nuevo aún sin generar), la app cae sola a la Web Speech API del navegador, como antes.

Solo hace falta regenerar cuando añades contenido nuevo, y es un paso **manual y opcional** que se hace en tu ordenador, no en el navegador:

```bash
# Preparación (una sola vez) — ver la cabecera de tools/generar_audio.py
curl -L -o vv.whl https://github.com/VOICEVOX/voicevox_core/releases/download/0.15.7/voicevox_core-0.15.7+cpu-cp38-abi3-linux_x86_64.whl
python3 -m venv venv && ./venv/bin/pip install ./vv.whl imageio-ffmpeg
curl -L -o onnx.tgz https://github.com/microsoft/onnxruntime/releases/download/v1.13.1/onnxruntime-linux-x64-1.13.1.tgz
curl -L -o ojt.tar.gz https://github.com/r9y9/open_jtalk/releases/download/v1.11.1/open_jtalk_dic_utf_8-1.11.tar.gz
tar xzf onnx.tgz && tar xzf ojt.tar.gz

# Generar (incremental: solo sintetiza lo que falte)
export LD_LIBRARY_PATH=$PWD/onnxruntime-linux-x64-1.13.1/lib:$LD_LIBRARY_PATH
./venv/bin/python tools/generar_audio.py --dic ./open_jtalk_dic_utf_8-1.11
```

Los `.mp3` **no** se precachean al instalar la PWA (son ~20 MB): se guardan solos según se van escuchando, así que la primera carga sigue siendo ligera y lo que ya has escuchado queda disponible offline.

> **Crédito de voz (obligatorio por la licencia de VOICEVOX):** `VOICEVOX:四国めたん`. Aparece también dentro de la app, en la pestaña de Shadowing.
