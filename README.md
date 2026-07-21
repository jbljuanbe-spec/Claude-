# 言葉 Kotoba

App personal de estudio de japonés (Genki I/II + Minna no Nihongo). Repetición espaciada real, recall activo y ejercicios estilo Duolingo, alimentada por el `contenido_japones.json` exportado del chat de lecciones.

**No hay nada que instalar.** La app es 100% estática y se publica sola en GitHub Pages con cada cambio:

> https://jbljuanbe-spec.github.io/Claude-/

El progreso se guarda en el navegador (IndexedDB) y se puede descargar/restaurar como copia de seguridad desde la pestaña Progreso.

## Actualizar el contenido tras nuevas lecciones

1. En GitHub, abre `contenido_japones.json` y pulsa el lápiz (o sube el archivo nuevo encima, con el mismo nombre).
2. Guarda el commit. GitHub Pages se redespliega solo en un minuto.
3. En la app, pestaña **Biblioteca**, pulsa **Actualizar contenido**.

Las tarjetas con id nuevo entran con progreso desde cero; las existentes actualizan su texto pero **conservan intervalos, racha e historial**. Reimportar nunca resetea nada. (Al abrir la app también se sincroniza sola.)

## Qué hay dentro

- **Repaso**: motor SRS (SM-2 adaptado) que mezcla vocabulario, gramática y conjugación en la misma sesión. Vocab y conjugación se responden escribiendo (acepta kanji, kana o romaji, que se convierte solo); la gramática se autoevalúa tras leer la explicación. Fallar una tarjeta la resetea a minutos; acertarla varias veces la espacia hasta 180 días, sin eliminarla nunca.
- **Ejercicios**: partículas (rellenar hueco), ordenar frases (refuerza el orden SOV) y traducción libre con corrección aproximada. Los datos viven en `data/ejercicios.json`.
- **Biblioteca**: todo el contenido por lección, con kanji en grande, furigana conmutable, audio y estado de cada tarjeta. Aquí está el botón de actualizar contenido.
- **Progreso (Tu viaje por Japón)**: mapa real de Japón (GeoJSON de las 47 prefecturas simplificado) con las lecciones como paradas ordenadas de un viaje: cada ciudad se completa antes de abrir la siguiente (los repasos de lo ya aprendido nunca se bloquean; solo el contenido nuevo respeta el orden). Clic en una parada para ver su estado, estudiar solo esa ciudad o hacer una "pausa para el té" cuando tiene repasos pendientes. Completar y conquistar ciudades da **billetes de Shinkansen** 🎫 con los que adelantar el viaje. Gamificación no punitiva: XP que solo sube (responder siempre suma, también al fallar), niveles de viajero, insignias bronce/plata/oro por retención real que nunca se retiran, racha con congeladores automáticos gratuitos, y barras que nunca arrancan de cero. Nada de lo ganado se pierde jamás. Animaciones Lottie ligeras (té matcha, conejos de la luna, Japón) cargadas en diferido.
- **Audio**: Web Speech API del navegador con voz `ja-JP` (mejor soporte en Chrome/Edge).

## Estructura

```
index.html              Punto de entrada
js/motor.js             SRS, importación idempotente, racha y estadísticas
js/almacen.js           Persistencia en IndexedDB
js/api.js               Fachada que usan las vistas
js/review.js            Vista de Repaso
js/exercises.js         Vista de Ejercicios
js/library.js           Vista de Biblioteca
js/dashboard.js         Vista de Progreso + copia de seguridad
js/kana.js              Romaji -> kana, normalización y corrección tolerante
js/tts.js               Pronunciación (Web Speech API)
data/ejercicios.json    Ejercicios de partículas / ordenar / traducción
contenido_japones.json  Contenido de las lecciones (se reemplaza al actualizar)
```

Para trastear en local basta cualquier servidor estático, por ejemplo `python3 -m http.server` en la raíz.

Notas de los ejercicios de ordenar: se acepta solo el orden canónico de la frase; los adverbios de tiempo van al principio.
