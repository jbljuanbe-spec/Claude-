import { getApiKey, setApiKey, checkApiKey, fetchPopularPool, fetchBackdrop, searchMovies, IMG_BASE } from './api.js';

const ZOOM_STAGES = [5, 3, 1.8, 1];
const SEGUNDOS_POR_ETAPA = 7;
const PUNTOS_POR_ETAPA = [100, 70, 45, 25];
const RACHA_RECORD_KEY = 'zoomcine_racha_record';

const el = id => document.getElementById(id);

const estado = {
  jugadores: [],
  turnoActual: 0,
  rondasPorJugador: 5,
  rondaNumero: 0,
  rondasTotales: 0,
  pool: [],
  peliculaActual: null,
  imagenUrl: null,
  etapa: 0,
  originX: 50,
  originY: 50,
  timerId: null,
  finEtapaTs: 0,
  rondaActiva: false,
};

function mostrarPantalla(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('activa'));
  el(id).classList.add('activa');
}

// --- Configuración ---

function initConfig() {
  el('input-clave').value = getApiKey();
  actualizarEstadoClave();

  el('btn-guardar-clave').addEventListener('click', async () => {
    const clave = el('input-clave').value.trim();
    if (!clave) return;
    el('estado-clave').textContent = 'Comprobando…';
    const ok = await checkApiKey(clave).catch(() => false);
    if (ok) {
      setApiKey(clave);
      actualizarEstadoClave();
    } else {
      el('estado-clave').textContent = 'Clave inválida. ';
    }
  });

  let numJugadores = 1;
  const selJug = el('selector-jugadores');
  [1, 2, 3, 4].forEach(n => {
    const b = document.createElement('button');
    b.textContent = n;
    b.type = 'button';
    if (n === numJugadores) b.classList.add('activo');
    b.addEventListener('click', () => {
      numJugadores = n;
      selJug.querySelectorAll('button').forEach(x => x.classList.remove('activo'));
      b.classList.add('activo');
      renderNombres(numJugadores);
    });
    selJug.appendChild(b);
  });
  renderNombres(numJugadores);

  let rondas = 5;
  const selRondas = el('selector-rondas');
  [3, 5, 8].forEach(n => {
    const b = document.createElement('button');
    b.textContent = n;
    b.type = 'button';
    if (n === rondas) b.classList.add('activo');
    b.addEventListener('click', () => {
      rondas = n;
      selRondas.querySelectorAll('button').forEach(x => x.classList.remove('activo'));
      b.classList.add('activo');
    });
    selRondas.appendChild(b);
  });

  const record = localStorage.getItem(RACHA_RECORD_KEY);
  if (record) {
    el('racha-record').textContent = `🔥 Racha récord en este dispositivo: ${record}`;
    el('racha-record').classList.remove('oculto');
  }

  el('btn-empezar').addEventListener('click', async () => {
    if (!getApiKey()) {
      mostrarErrorConfig('Guarda antes una clave válida de TMDb.');
      return;
    }
    const nombres = Array.from(el('nombres-jugadores').querySelectorAll('input'))
      .map(i => i.value.trim() || i.placeholder);
    estado.jugadores = nombres.map(n => ({ nombre: n, puntos: 0, racha: 0, mejorRacha: 0 }));
    estado.rondasPorJugador = rondas;
    estado.rondasTotales = rondas * nombres.length;
    estado.turnoActual = 0;
    estado.rondaNumero = 0;

    mostrarErrorConfig('');
    mostrarPantalla('pantalla-cargando');
    try {
      estado.pool = barajar(await fetchPopularPool());
      if (estado.pool.length < 5) throw new Error('pool insuficiente');
    } catch (e) {
      mostrarPantalla('pantalla-config');
      mostrarErrorConfig('No se pudo cargar la cartelera de TMDb. Revisa la clave o tu conexión.');
      return;
    }
    mostrarPantalla('pantalla-juego');
    siguienteRonda();
  });
}

function actualizarEstadoClave() {
  el('estado-clave').textContent = getApiKey() ? '✔ clave guardada. ' : '';
}

function mostrarErrorConfig(msg) {
  const p = el('error-config');
  p.textContent = msg;
  p.classList.toggle('oculto', !msg);
}

function renderNombres(n) {
  const cont = el('nombres-jugadores');
  const actuales = Array.from(cont.querySelectorAll('input')).map(i => i.value);
  cont.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Jugador ${i + 1}`;
    input.value = actuales[i] || '';
    cont.appendChild(input);
  }
}

function barajar(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// --- Juego ---

async function siguienteRonda() {
  estado.rondaNumero++;
  if (estado.rondaNumero > estado.rondasTotales) {
    mostrarFinal();
    return;
  }

  el('panel-resultado').classList.add('oculto');
  el('input-respuesta').value = '';
  el('input-respuesta').disabled = false;
  el('sugerencias').innerHTML = '';
  el('img-zoom').style.transition = 'none';

  const jugador = estado.jugadores[estado.turnoActual];
  el('hud-turno').textContent = `🎬 Turno de ${jugador.nombre}`;
  el('hud-ronda').textContent = `Ronda ${estado.rondaNumero} / ${estado.rondasTotales}`;
  el('hud-racha').textContent = `Racha: ${jugador.racha}`;
  renderMarcadorMini();

  let peli = estado.pool.pop();
  let backdrop = peli ? await fetchBackdrop(peli.id).catch(() => null) : null;
  let intentos = 0;
  while ((!backdrop || !peli) && estado.pool.length && intentos < 5) {
    peli = estado.pool.pop();
    backdrop = await fetchBackdrop(peli.id).catch(() => null);
    intentos++;
  }
  if (!backdrop) {
    // sin imagen válida: saltamos la ronda sin penalizar
    siguienteRonda();
    return;
  }

  estado.peliculaActual = peli;
  estado.imagenUrl = backdrop;
  estado.etapa = 0;
  estado.originX = 15 + Math.random() * 70;
  estado.originY = 15 + Math.random() * 70;
  estado.rondaActiva = true;

  const img = el('img-zoom');
  img.src = backdrop;
  img.style.transformOrigin = `${estado.originX}% ${estado.originY}%`;
  requestAnimationFrame(() => {
    img.style.transition = 'transform 1.1s ease-out';
    aplicarEtapaZoom();
  });

  iniciarTemporizadorEtapa();
  el('input-respuesta').focus();
}

function renderMarcadorMini() {
  const cont = el('marcador-mini');
  cont.innerHTML = '';
  estado.jugadores.forEach((j, i) => {
    const span = document.createElement('span');
    span.textContent = `${j.nombre}: ${j.puntos}pt`;
    if (i === estado.turnoActual) span.classList.add('actual');
    cont.appendChild(span);
  });
}

function aplicarEtapaZoom() {
  el('img-zoom').style.transform = `scale(${ZOOM_STAGES[estado.etapa]})`;
}

function iniciarTemporizadorEtapa() {
  clearTimeout(estado.timerId);
  estado.finEtapaTs = Date.now() + SEGUNDOS_POR_ETAPA * 1000;
  const barra = el('barra-tiempo');
  barra.style.transition = 'none';
  barra.style.width = '100%';
  requestAnimationFrame(() => {
    barra.style.transition = `width ${SEGUNDOS_POR_ETAPA}s linear`;
    barra.style.width = '0%';
  });
  estado.timerId = setTimeout(avanzarEtapa, SEGUNDOS_POR_ETAPA * 1000);
}

function avanzarEtapa() {
  if (!estado.rondaActiva) return;
  if (estado.etapa < ZOOM_STAGES.length - 1) {
    estado.etapa++;
    aplicarEtapaZoom();
    iniciarTemporizadorEtapa();
  } else {
    resolverRonda(null); // se acabó el tiempo en la última etapa: fallo
  }
}

function initRespuesta() {
  const input = el('input-respuesta');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value;
    if (!q.trim()) { el('sugerencias').innerHTML = ''; return; }
    debounce = setTimeout(async () => {
      if (!estado.rondaActiva) return;
      const resultados = await searchMovies(q).catch(() => []);
      renderSugerencias(resultados);
    }, 300);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const primero = el('sugerencias').querySelector('button');
      if (primero) primero.click();
    }
  });

  el('btn-saltar').addEventListener('click', () => resolverRonda(null));
  el('btn-siguiente').addEventListener('click', () => {
    estado.turnoActual = (estado.turnoActual + 1) % estado.jugadores.length;
    siguienteRonda();
  });
}

function renderSugerencias(resultados) {
  const cont = el('sugerencias');
  cont.innerHTML = '';
  resultados.forEach(m => {
    const b = document.createElement('button');
    const anio = (m.release_date || '').slice(0, 4);
    b.textContent = anio ? `${m.title} (${anio})` : m.title;
    b.type = 'button';
    b.addEventListener('click', () => resolverRonda(m));
    cont.appendChild(b);
  });
}

function resolverRonda(elegida) {
  if (!estado.rondaActiva) return;
  estado.rondaActiva = false;
  clearTimeout(estado.timerId);

  const jugador = estado.jugadores[estado.turnoActual];
  const acierto = elegida && elegida.id === estado.peliculaActual.id;

  el('img-zoom').style.transform = 'scale(1)';
  el('input-respuesta').disabled = true;
  el('sugerencias').innerHTML = '';

  if (acierto) {
    const puntosBase = PUNTOS_POR_ETAPA[estado.etapa];
    const bonusRacha = Math.min(jugador.racha * 5, 50);
    const puntos = puntosBase + bonusRacha;
    jugador.puntos += puntos;
    jugador.racha += 1;
    jugador.mejorRacha = Math.max(jugador.mejorRacha, jugador.racha);
    guardarRachaRecord(jugador.mejorRacha);
    el('resultado-titulo').textContent = `¡Correcto! ${estado.peliculaActual.title}`;
    el('resultado-puntos').textContent = `+${puntos} puntos (racha x${jugador.racha})`;
  } else {
    jugador.racha = 0;
    el('resultado-titulo').textContent = `Era: ${estado.peliculaActual.title}`;
    el('resultado-puntos').textContent = 'Racha reiniciada a 0';
  }

  const poster = estado.peliculaActual.poster_path;
  el('resultado-poster').src = poster ? `${IMG_BASE}/w200${poster}` : '';
  el('resultado-poster').style.visibility = poster ? 'visible' : 'hidden';
  el('panel-resultado').classList.remove('oculto');
  el('hud-racha').textContent = `Racha: ${jugador.racha}`;
  renderMarcadorMini();
}

function guardarRachaRecord(valor) {
  const actual = parseInt(localStorage.getItem(RACHA_RECORD_KEY) || '0', 10);
  if (valor > actual) localStorage.setItem(RACHA_RECORD_KEY, String(valor));
}

// --- Final ---

function mostrarFinal() {
  mostrarPantalla('pantalla-final');
  const cont = el('tabla-final');
  cont.innerHTML = '';
  const ordenados = [...estado.jugadores].sort((a, b) => b.puntos - a.puntos);
  ordenados.forEach((j, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-final' + (i === 0 ? ' ganador' : '');
    fila.innerHTML = `<span>${i === 0 ? '🏆 ' : ''}${j.nombre}</span><span>${j.puntos}pt · mejor racha ${j.mejorRacha}</span>`;
    cont.appendChild(fila);
  });

  el('btn-revancha').onclick = () => {
    estado.jugadores.forEach(j => { j.puntos = 0; j.racha = 0; j.mejorRacha = 0; });
    estado.turnoActual = 0;
    estado.rondaNumero = 0;
    mostrarPantalla('pantalla-cargando');
    fetchPopularPool().then(pool => {
      estado.pool = barajar(pool);
      mostrarPantalla('pantalla-juego');
      siguienteRonda();
    });
  };
  el('btn-nueva-partida').onclick = () => mostrarPantalla('pantalla-config');
}

initConfig();
initRespuesta();
