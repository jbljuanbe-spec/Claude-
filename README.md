# 言葉 Kotoba

App personal de estudio de japonés (Genki I/II + Minna no Nihongo). Repetición espaciada real, recall activo y ejercicios estilo Duolingo, alimentada por el `contenido_japones.json` que exporto desde mi chat de lecciones.

## Arrancar

```bash
npm install   # solo la primera vez
npm run dev
```

Abre `http://localhost:3000`. El progreso se guarda en `progreso.db` (SQLite, en la raíz del proyecto; está fuera de git).

## Actualizar el contenido

1. Sustituye `contenido_japones.json` en la raíz por la versión nueva exportada del chat.
2. En la app, ve a **Biblioteca** y pulsa **Actualizar contenido**.

Las tarjetas con id nuevo entran con progreso desde cero; las que ya existían actualizan su texto pero **conservan intervalos, racha e historial**. Reimportar nunca resetea nada.

## Qué hay dentro

- **Repaso**: motor SRS (SM-2 adaptado) que mezcla vocabulario, gramática y conjugación en la misma sesión. Vocab y conjugación se responden escribiendo (acepta kanji, kana o romaji, que se convierte solo); la gramática se autoevalúa tras leer la explicación. Fallar una tarjeta la resetea a minutos; acertarla varias veces la espacia hasta 180 días, sin eliminarla nunca.
- **Ejercicios**: partículas (rellenar hueco), ordenar frases (refuerza el orden SOV) y traducción libre con corrección aproximada. Los datos viven en `data/ejercicios.json`, generados en el estilo del contenido de las lecciones.
- **Biblioteca**: todo el contenido por lección, con kanji en grande, furigana conmutable, audio y estado de cada tarjeta. Aquí está el botón de actualizar contenido.
- **Progreso**: racha de días, actividad de las últimas dos semanas, dominadas por lección y hora del próximo repaso.
- **Audio**: Web Speech API del navegador con voz `ja-JP` (mejor soporte en Chrome/Edge).

## Estructura

```
server.js               Express: API + estáticos
src/db.js               SQLite (better-sqlite3), importación idempotente, racha
src/srs.js              Algoritmo SM-2 adaptado, cola con interleaving
public/                 Frontend (vanilla JS, ES modules)
data/ejercicios.json    Ejercicios de partículas / ordenar / traducción
contenido_japones.json  Contenido de las lecciones (se reemplaza al actualizar)
progreso.db             Tu progreso (no tocar, no está en git)
```

Notas de los ejercicios de ordenar: se acepta solo el orden canónico de la frase; los adverbios de tiempo van al principio.
