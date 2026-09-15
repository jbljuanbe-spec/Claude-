const ZOOM_STAGES = [5, 3, 1.8, 1];
const SEGUNDOS_POR_ETAPA = 7;
const PUNTOS_POR_ETAPA = [100, 70, 45, 25];

const el = id => document.getElementById(id);

function medalla(posicion) {
  return posicion === 0 ? '🥇' : posicion === 1 ? '🥈' : posicion === 2 ? '🥉' : `${posicion + 1}º`;
}

function renderTablaFinal(contenedorId, jugadores) {
  const cont = el(contenedorId);
  cont.innerHTML = '';
  const ordenados = [...jugadores].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
  ordenados.forEach((j, i) => {
    const fila = document.createElement('div');
    fila.className = 'fila-final' + (i === 0 ? ' ganador' : '');
    const aciertos = j.aciertos || 0;
    fila.innerHTML = `<span class="pos">${medalla(i)}</span><span class="nombre">${j.nombre}</span>` +
      `<span class="stats"><strong>${j.puntos || 0}</strong>pt · ${aciertos} ${aciertos === 1 ? 'acierto' : 'aciertos'}</span>`;
    cont.appendChild(fila);
  });
}

const estado = {
  modo: 'todas',
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
  const selModo = el('selector-modo');
  Object.entries(MODOS).forEach(([clave, modo], i) => {
    const b = document.createElement('button');
    b.textContent = modo.nombre;
    b.type = 'button';
    if (i === 0) b.classList.add('activo');
    b.addEventListener('click', () => {
      estado.modo = clave;
      selModo.querySelectorAll('button').forEach(x => x.classList.remove('activo'));
      b.classList.add('activo');
    });
    selModo.appendChild(b);
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

  el('btn-config-volver').addEventListener('click', () => mostrarPantalla('pantalla-inicio'));

  el('btn-empezar').addEventListener('click', async () => {
    const nombres = Array.from(el('nombres-jugadores').querySelectorAll('input'))
      .map(i => i.value.trim() || i.placeholder);
    estado.jugadores = nombres.map(n => ({ nombre: n, puntos: 0, aciertos: 0 }));
    estado.rondasPorJugador = rondas;
    estado.rondasTotales = rondas * nombres.length;
    estado.turnoActual = 0;
    estado.rondaNumero = 0;

    mostrarErrorConfig('');
    el('texto-cargando').textContent = `Cargando cartelera de ${MODOS[estado.modo].nombre}…`;
    mostrarPantalla('pantalla-cargando');
    try {
      estado.pool = barajar(await fetchMoviePool(estado.modo));
      if (estado.pool.length < 3) throw new Error('pool insuficiente');
    } catch (e) {
      mostrarPantalla('pantalla-config');
      mostrarErrorConfig('No se pudo cargar la cartelera de TMDb. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    estado.rondasTotales = Math.min(estado.rondasTotales, estado.pool.length);
    mostrarPantalla('pantalla-juego');
    siguienteRonda();
  });
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
    const puntos = PUNTOS_POR_ETAPA[estado.etapa];
    jugador.puntos += puntos;
    jugador.aciertos += 1;
    el('resultado-titulo').textContent = `¡Correcto! ${estado.peliculaActual.title}`;
    el('resultado-puntos').textContent = `+${puntos} puntos`;
  } else {
    el('resultado-titulo').textContent = `Era: ${estado.peliculaActual.title}`;
    el('resultado-puntos').textContent = 'Sin puntos';
  }

  const poster = estado.peliculaActual.poster_path;
  el('resultado-poster').src = poster ? `${IMG_BASE}/w200${poster}` : '';
  el('resultado-poster').style.visibility = poster ? 'visible' : 'hidden';
  el('panel-resultado').classList.remove('oculto');
  renderMarcadorMini();
}

// --- Final ---

function mostrarFinal() {
  mostrarPantalla('pantalla-final');
  renderTablaFinal('tabla-final', estado.jugadores);

  el('btn-revancha').onclick = () => {
    estado.jugadores.forEach(j => { j.puntos = 0; j.aciertos = 0; });
    estado.turnoActual = 0;
    estado.rondaNumero = 0;
    estado.rondasTotales = estado.rondasPorJugador * estado.jugadores.length;
    mostrarPantalla('pantalla-cargando');
    fetchMoviePool(estado.modo).then(pool => {
      estado.pool = barajar(pool);
      estado.rondasTotales = Math.min(estado.rondasTotales, estado.pool.length);
      mostrarPantalla('pantalla-juego');
      siguienteRonda();
    });
  };
  el('btn-nueva-partida').onclick = () => mostrarPantalla('pantalla-config');
}

// --- Inicio / navegación entre modos ---

function initInicio() {
  el('btn-modo-local').addEventListener('click', () => mostrarPantalla('pantalla-config'));
  el('btn-modo-multi').addEventListener('click', () => mostrarPantalla('pantalla-multi-inicio'));
}

// --- Multijugador: crear/unirse ---

let multiModo = 'todas';
let multiRondas = 5;
let salaCodigo = null;
let miId = null;
let salaActual = null;
let etapaTimerId = null;
let barraRafId = null;
let miTurnoIniciado = -1;

function initMultiInicio() {
  if (!firebaseListo()) mostrarMultiError('El multijugador todavía no está configurado en esta app.');

  const selModo = el('multi-selector-modo');
  Object.entries(MODOS).forEach(([clave, modo], i) => {
    const b = document.createElement('button');
    b.textContent = modo.nombre;
    b.type = 'button';
    if (i === 0) b.classList.add('activo');
    b.addEventListener('click', () => {
      multiModo = clave;
      selModo.querySelectorAll('button').forEach(x => x.classList.remove('activo'));
      b.classList.add('activo');
    });
    selModo.appendChild(b);
  });

  const selRondas = el('multi-selector-rondas');
  [3, 5, 8].forEach(n => {
    const b = document.createElement('button');
    b.textContent = n;
    b.type = 'button';
    if (n === multiRondas) b.classList.add('activo');
    b.addEventListener('click', () => {
      multiRondas = n;
      selRondas.querySelectorAll('button').forEach(x => x.classList.remove('activo'));
      b.classList.add('activo');
    });
    selRondas.appendChild(b);
  });

  el('btn-multi-volver').addEventListener('click', () => mostrarPantalla('pantalla-inicio'));

  el('btn-crear-sala').addEventListener('click', async () => {
    const nombre = el('multi-nombre').value.trim();
    if (!nombre) return mostrarMultiError('Escribe tu nombre primero.');
    if (!firebaseListo()) return mostrarMultiError('El multijugador todavía no está configurado en esta app.');
    try {
      const { codigo, miId: id } = await crearSala(nombre, multiModo, multiRondas);
      entrarEnSala(codigo, id);
    } catch (e) {
      mostrarMultiError('No se pudo crear la sala. Revisa tu conexión.');
    }
  });

  el('btn-unirse-sala').addEventListener('click', async () => {
    const nombre = el('multi-nombre').value.trim();
    const codigo = el('multi-codigo').value.trim();
    if (!nombre) return mostrarMultiError('Escribe tu nombre primero.');
    if (!codigo) return mostrarMultiError('Escribe el código de la sala.');
    if (!firebaseListo()) return mostrarMultiError('El multijugador todavía no está configurado en esta app.');
    try {
      const { codigo: cod, miId: id } = await unirseSala(codigo, nombre);
      entrarEnSala(cod, id);
    } catch (e) {
      const msg = e.message === 'sala-no-existe' ? 'No existe ninguna sala con ese código.'
        : e.message === 'sala-empezada' ? 'Esa partida ya ha empezado.'
        : 'No se pudo unir a la sala.';
      mostrarMultiError(msg);
    }
  });
}

function mostrarMultiError(msg) {
  const p = el('multi-error');
  p.textContent = msg;
  p.classList.remove('oculto');
}

function entrarEnSala(codigo, id) {
  salaCodigo = codigo;
  miId = id;
  miTurnoIniciado = -1;
  mostrarPantalla('pantalla-lobby');
  escucharSala(codigo, onCambioSala);
}

function ordenJugadoresArray(sala) {
  return (sala.ordenJugadores || [])
    .map(id => sala.jugadores && sala.jugadores[id] ? { id, ...sala.jugadores[id] } : null)
    .filter(Boolean);
}

function onCambioSala(sala) {
  if (!sala) return;
  salaActual = sala;
  if (sala.estadoSala === 'lobby') renderLobby(sala);
  else if (sala.estadoSala === 'jugando') renderRondaMulti(sala);
  else if (sala.estadoSala === 'final') renderFinalMulti(sala);
}

// --- Lobby ---

function initLobby() {
  el('btn-lobby-empezar').addEventListener('click', async () => {
    if (!salaActual) return;
    el('btn-lobby-empezar').disabled = true;
    try {
      const pool = barajar(await fetchMoviePool(salaActual.modo))
        .map(m => ({ id: m.id, title: m.title, poster_path: m.poster_path || null }));
      const orden = salaActual.ordenJugadores;
      const rondasTotales = Math.min(salaActual.rondasPorJugador * orden.length, pool.length);
      await actualizarSala(salaCodigo, {
        estadoSala: 'jugando',
        pool,
        rondasTotales,
        rondaNumero: 0,
        turnoActual: 0,
        ronda: null,
      });
    } catch (e) {
      el('btn-lobby-empezar').disabled = false;
    }
  });
}

function renderLobby(sala) {
  mostrarPantalla('pantalla-lobby');
  el('lobby-codigo').textContent = salaCodigo;
  const cont = el('lobby-jugadores');
  cont.innerHTML = '';
  ordenJugadoresArray(sala).forEach(j => {
    const div = document.createElement('div');
    div.className = 'fila-final';
    const estadoConexion = j.conectado === false ? 'desconectado' : 'listo';
    div.innerHTML = `<span>${j.nombre}${j.id === sala.anfitrionId ? ' 👑' : ''}</span><span>${estadoConexion}</span>`;
    cont.appendChild(div);
  });
  const soyAnfitrion = miId === sala.anfitrionId;
  el('btn-lobby-empezar').classList.toggle('oculto', !soyAnfitrion);
  el('lobby-espera').classList.toggle('oculto', soyAnfitrion);
}

// --- Ronda multijugador ---

function esMiTurno(sala) {
  const orden = sala.ordenJugadores || [];
  return orden[sala.turnoActual] === miId;
}

async function iniciarMiRonda(sala) {
  miTurnoIniciado = sala.rondaNumero;
  const pool = [...(sala.pool || [])];
  let peli = pool.pop();
  let backdrop = peli ? await fetchBackdrop(peli.id).catch(() => null) : null;
  let intentos = 0;
  while (!backdrop && pool.length && intentos < 5) {
    peli = pool.pop();
    backdrop = await fetchBackdrop(peli.id).catch(() => null);
    intentos++;
  }
  if (!backdrop) {
    await actualizarSala(salaCodigo, { estadoSala: 'final', pool });
    return;
  }
  await actualizarSala(salaCodigo, {
    pool,
    ronda: {
      peliculaId: peli.id,
      titulo: peli.title,
      posterPath: peli.poster_path || null,
      imagenUrl: backdrop,
      etapa: 0,
      stageEndsAt: Date.now() + SEGUNDOS_POR_ETAPA * 1000,
      originX: 15 + Math.random() * 70,
      originY: 15 + Math.random() * 70,
      resuelta: false,
      acierto: null,
      puntosGanados: 0,
    },
  });
}

function programarTemporizadorMulti(sala) {
  clearTimeout(etapaTimerId);
  if (!sala.ronda || sala.ronda.resuelta || !esMiTurno(sala)) return;
  const restante = sala.ronda.stageEndsAt - Date.now();
  etapaTimerId = setTimeout(() => avanzarEtapaMulti(), Math.max(restante, 0));
}

async function avanzarEtapaMulti() {
  const sala = salaActual;
  if (!sala || !sala.ronda || sala.ronda.resuelta || !esMiTurno(sala)) return;
  const etapaActual = sala.ronda.etapa;
  if (etapaActual < ZOOM_STAGES.length - 1) {
    await actualizarSala(salaCodigo, {
      'ronda/etapa': etapaActual + 1,
      'ronda/stageEndsAt': Date.now() + SEGUNDOS_POR_ETAPA * 1000,
    });
  } else {
    await resolverRondaMulti(null);
  }
}

async function resolverRondaMulti(elegida) {
  const sala = salaActual;
  if (!sala || !sala.ronda || sala.ronda.resuelta || !esMiTurno(sala)) return;
  clearTimeout(etapaTimerId);
  const acierto = elegida && elegida.id === sala.ronda.peliculaId;
  const miJugador = sala.jugadores[miId] || { puntos: 0, aciertos: 0 };
  const cambios = {
    'ronda/resuelta': true,
    'ronda/acierto': !!acierto,
  };
  if (acierto) {
    const puntos = PUNTOS_POR_ETAPA[sala.ronda.etapa];
    cambios['ronda/puntosGanados'] = puntos;
    cambios[`jugadores/${miId}/puntos`] = (miJugador.puntos || 0) + puntos;
    cambios[`jugadores/${miId}/aciertos`] = (miJugador.aciertos || 0) + 1;
  }
  await actualizarSala(salaCodigo, cambios);
}

async function avanzarTurnoMulti() {
  const sala = salaActual;
  if (!sala) return;
  const siguienteRondaNum = sala.rondaNumero + 1;
  if (siguienteRondaNum >= sala.rondasTotales) {
    await actualizarSala(salaCodigo, { estadoSala: 'final' });
    return;
  }
  const siguienteTurno = (sala.turnoActual + 1) % sala.ordenJugadores.length;
  await actualizarSala(salaCodigo, {
    rondaNumero: siguienteRondaNum,
    turnoActual: siguienteTurno,
    ronda: null,
  });
}

function renderRondaMulti(sala) {
  mostrarPantalla('pantalla-multi-juego');
  const orden = ordenJugadoresArray(sala);
  const activo = orden[sala.turnoActual];
  el('multi-hud-turno').textContent = activo ? `🎬 Turno de ${activo.nombre}` : '';
  el('multi-hud-ronda').textContent = `Ronda ${sala.rondaNumero + 1} / ${sala.rondasTotales}`;

  const cont = el('multi-marcador');
  cont.innerHTML = '';
  orden.forEach(j => {
    const span = document.createElement('span');
    span.textContent = `${j.nombre}: ${j.puntos || 0}pt`;
    if (activo && j.id === activo.id) span.classList.add('actual');
    cont.appendChild(span);
  });

  if (!sala.ronda) {
    el('multi-panel-resultado').classList.add('oculto');
    el('multi-zona-respuesta').classList.add('oculto');
    el('multi-espera-turno').classList.add('oculto');
    if (esMiTurno(sala) && miTurnoIniciado !== sala.rondaNumero) {
      miTurnoIniciado = sala.rondaNumero;
      iniciarMiRonda(sala);
    }
    return;
  }

  const img = el('multi-img-zoom');
  if (img.src !== sala.ronda.imagenUrl) {
    img.style.transition = 'none';
    img.src = sala.ronda.imagenUrl;
    img.style.transformOrigin = `${sala.ronda.originX}% ${sala.ronda.originY}%`;
    requestAnimationFrame(() => { img.style.transition = 'transform 1.1s ease-out'; });
  }
  img.style.transform = `scale(${sala.ronda.resuelta ? 1 : ZOOM_STAGES[sala.ronda.etapa]})`;

  const soyActivo = esMiTurno(sala);
  el('multi-zona-respuesta').classList.toggle('oculto', sala.ronda.resuelta || !soyActivo);
  el('multi-espera-turno').classList.toggle('oculto', sala.ronda.resuelta || soyActivo);
  if (!sala.ronda.resuelta && !soyActivo) el('multi-espera-nombre').textContent = activo ? activo.nombre : '';

  el('multi-panel-resultado').classList.toggle('oculto', !sala.ronda.resuelta);
  if (sala.ronda.resuelta) {
    el('multi-resultado-titulo').textContent = sala.ronda.acierto ? `¡Correcto! ${sala.ronda.titulo}` : `Era: ${sala.ronda.titulo}`;
    el('multi-resultado-puntos').textContent = sala.ronda.acierto ? `+${sala.ronda.puntosGanados} puntos` : 'Sin puntos';
    el('multi-resultado-poster').src = sala.ronda.posterPath ? `${IMG_BASE}/w200${sala.ronda.posterPath}` : '';
    el('multi-resultado-poster').style.visibility = sala.ronda.posterPath ? 'visible' : 'hidden';
    el('multi-btn-siguiente').classList.remove('oculto');
  } else {
    if (el('multi-input-respuesta').value === '') el('multi-sugerencias').innerHTML = '';
    if (soyActivo) programarTemporizadorMulti(sala);
  }
}

function iniciarBarraLoopMulti() {
  function tick() {
    const sala = salaActual;
    const barra = el('multi-barra-tiempo');
    if (sala && sala.ronda && !sala.ronda.resuelta) {
      const restante = sala.ronda.stageEndsAt - Date.now();
      const pct = Math.max(0, Math.min(1, restante / (SEGUNDOS_POR_ETAPA * 1000)));
      barra.style.width = (pct * 100) + '%';
    } else {
      barra.style.width = '0%';
    }
    barraRafId = requestAnimationFrame(tick);
  }
  tick();
}

function initMultiRespuesta() {
  const input = el('multi-input-respuesta');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value;
    if (!q.trim()) { el('multi-sugerencias').innerHTML = ''; return; }
    debounce = setTimeout(async () => {
      const resultados = await searchMovies(q).catch(() => []);
      renderSugerenciasMulti(resultados);
    }, 300);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const primero = el('multi-sugerencias').querySelector('button');
      if (primero) primero.click();
    }
  });
  el('multi-btn-saltar').addEventListener('click', () => resolverRondaMulti(null));
  el('multi-btn-siguiente').addEventListener('click', avanzarTurnoMulti);
}

function renderSugerenciasMulti(resultados) {
  const cont = el('multi-sugerencias');
  cont.innerHTML = '';
  resultados.forEach(m => {
    const b = document.createElement('button');
    const anio = (m.release_date || '').slice(0, 4);
    b.textContent = anio ? `${m.title} (${anio})` : m.title;
    b.type = 'button';
    b.addEventListener('click', () => {
      el('multi-input-respuesta').value = '';
      cont.innerHTML = '';
      resolverRondaMulti(m);
    });
    cont.appendChild(b);
  });
}

// --- Final multijugador ---

function renderFinalMulti(sala) {
  mostrarPantalla('pantalla-multi-final');
  renderTablaFinal('multi-tabla-final', ordenJugadoresArray(sala));
}

function initFinalMulti() {
  el('btn-multi-otra').addEventListener('click', () => {
    if (salaCodigo) dejarDeEscuchar(salaCodigo);
    salaCodigo = null;
    miId = null;
    salaActual = null;
    miTurnoIniciado = -1;
    mostrarPantalla('pantalla-inicio');
  });
}

initInicio();
initConfig();
initRespuesta();
initMultiInicio();
initLobby();
initMultiRespuesta();
initFinalMulti();
iniciarBarraLoopMulti();
