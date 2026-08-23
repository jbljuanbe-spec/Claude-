// game.js — Motor de "ICEX Milán: El Simulador de Becarios"

const $ = (sel) => document.querySelector(sel);
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;

// ---------- Estado global ----------
const state = {
  becario: null,      // objeto de BECARIOS
  modo: "campania",   // "campania" | "infinito"
  dia: 1,
  hora: 9 * 60,       // minutos desde medianoche (09:00)
  finJornada: 17 * 60,
  dinero: 0,
  strikes: 0,
  hambre: 0,          // 0 bien, 100 desmayo
  estres: 0,          // 0 zen, 100 colapso
  reputacion: 50,     // 0-100
  enviadosHoy: 0,
  cuotaDiaria: 4,     // informes a enviar para no perder reputación
  tarea: null,        // TaskState actual con documento
  marcados: new Set(),// índices de frases marcadas por el jugador
  reglasActivas: [],
  gameOver: false,
};

// ---------- Utilidades de tiempo ----------
function horaTexto(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------- Generación de tareas ----------
let taskCounter = 0;

function generarTarea() {
  taskCounter++;
  const sector = rnd(SECTORES);
  const region = rnd(REGIONES);
  const empresa = rnd(EMPRESAS);
  const tipo = rnd(Object.keys(TIPOS_DOC));

  // Post-it: instrucciones que el jugador debe verificar contra el documento.
  const postit = { empresa, sector, region, ciudad: CIUDADES_OK[region], tipo };

  // Decidir gazapos. Más difícil según el día.
  const dificultad = Math.min(0.25 + state.dia * 0.04, 0.7);
  const parrafos = construirDocumento(postit, dificultad);

  return {
    taskId: `task_${String(taskCounter).padStart(5, "0")}`,
    postit,
    parrafos,        // array de {texto, gazapo|null, discrepancia|null}
    minutos: 0,      // se rellena al mostrarlo
  };
}

// Construye los párrafos del documento, algunos con gazapos marcables.
function construirDocumento(postit, dificultad) {
  const parrafos = [];
  const { empresa, sector, region, ciudad } = postit;

  // Intro (correcta o con discrepancia de empresa/sector).
  parrafos.push({ texto: `Estudio elaborado para ${empresa}, empresa del sector ${sector.toLowerCase()}.`, gazapo: null, discrepancia: null });

  // Frase geográfica: puede ser correcta o meter una ciudad de otra región.
  if (chance(dificultad)) {
    const mala = rnd(CIUDADES_MAL);
    parrafos.push({ texto: `El mercado se concentra especialmente en la ciudad de ${mala}, dentro de ${region}.`, gazapo: null, discrepancia: "GEO", info: `${mala} no pertenece a ${region} (sería ${ciudad}).` });
  } else {
    parrafos.push({ texto: `El mercado se concentra en ${ciudad} y su área metropolitana, dentro de ${region}.`, gazapo: null, discrepancia: null });
  }

  // Cuerpo neutro.
  parrafos.push({ texto: `La demanda de productos del sector ${sector.toLowerCase()} muestra una tendencia estable con oportunidades de exportación.`, gazapo: null, discrepancia: null });

  // Inyectar de 1 a 3 gazapos de IA.
  const claves = Object.keys(GAZAPOS);
  const nGazapos = 1 + (chance(dificultad) ? 1 : 0) + (chance(dificultad * 0.7) ? 1 : 0);
  const usadas = new Set();
  for (let i = 0; i < nGazapos; i++) {
    let k = rnd(claves);
    if (usadas.has(k)) continue;
    usadas.add(k);
    parrafos.push({ texto: rnd(GAZAPOS[k].frases), gazapo: k, discrepancia: null });
  }

  // Cierre.
  parrafos.push({ texto: `En conclusión, se recomienda una misión comercial para ${empresa} en la próxima feria del sector.`, gazapo: null, discrepancia: null });

  // Barajar solo el cuerpo (mantener intro primera y cierre último).
  const medio = parrafos.slice(1, -1);
  for (let i = medio.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [medio[i], medio[j]] = [medio[j], medio[i]];
  }
  return [parrafos[0], ...medio, parrafos[parrafos.length - 1]];
}

// Nº de problemas reales en la tarea actual.
function problemasReales(tarea) {
  return tarea.parrafos.filter((p) => p.gazapo || p.discrepancia).length;
}

// ---------- Pantallas ----------
function mostrar(pantalla) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("activa"));
  $("#" + pantalla).classList.add("activa");
}

function renderSeleccion() {
  const cont = $("#lista-becarios");
  cont.innerHTML = "";
  BECARIOS.forEach((b) => {
    const jefe = JEFES[b.jefe];
    const div = document.createElement("div");
    div.className = "becario-card";
    div.innerHTML = `
      <div class="foto-marco"><img src="${b.img}" alt="${b.nombre}" class="foto-retro"></div>
      <div class="becario-nombre">${b.nombre}</div>
      <div class="becario-jefe">Jefe: ${jefe.nombre}</div>`;
    div.onclick = () => { state.becario = b; iniciarPartida(); };
    cont.appendChild(div);
  });
}

// ---------- Inicio de partida ----------
function iniciarPartida() {
  state.modo = $("#modo-infinito").checked ? "infinito" : "campania";
  state.dia = 1;
  state.dinero = 0;
  state.strikes = 0;
  state.hambre = 10;
  state.estres = 10;
  state.reputacion = 50;
  state.gameOver = false;
  mostrar("juego");
  $("#foto-escritorio").src = state.becario.img;
  $("#nombre-escritorio").textContent = state.becario.nombre;
  const jefe = JEFES[state.becario.jefe];
  $("#jefe-escritorio").textContent = `Reporta a: ${jefe.nombre}`;
  empezarDia();
}

// ---------- Día ----------
function empezarDia() {
  state.hora = 9 * 60;
  state.enviadosHoy = 0;
  state.reglasActivas = REGLAS_PROGRESIVAS.filter((r) => r.dia <= state.dia);
  renderWhatsapp();
}

function renderWhatsapp() {
  mostrar("whatsapp");
  $("#wa-dia").textContent = `Día ${state.dia}` + (state.modo === "campania" ? ` / ${ECONOMIA.diasCampania}` : "");
  const cont = $("#wa-mensajes");
  cont.innerHTML = "";
  const eventos = EVENTOS_WHATSAPP[state.dia] || [];
  if (eventos.length === 0) {
    eventos.push({ autor: rnd(BECARIOS).nombre, texto: rnd([
      "buenos días, alguien ha visto mi grapadora",
      "café?",
      "hoy Luis tiene cara de pocos amigos, ojito",
      "el ascensor vuelve a estar roto",
      "quien se apunta al aperitivo luego",
    ]) });
  }
  eventos.forEach((m) => {
    const el = document.createElement("div");
    el.className = "wa-msg" + (m.autor === state.becario.nombre ? " propio" : "");
    el.innerHTML = `<span class="wa-autor">${m.autor}</span><span class="wa-texto">${m.texto}</span>`;
    cont.appendChild(el);
  });
  // Reglas nuevas del día.
  const nuevas = REGLAS_PROGRESIVAS.filter((r) => r.dia === state.dia);
  const rc = $("#wa-reglas");
  rc.innerHTML = "";
  if (nuevas.length) {
    rc.innerHTML = "<div class='wa-regla-tit'>📋 Regla nueva de la oficina:</div>" +
      nuevas.map((r) => `<div class="wa-regla">• ${r.texto}</div>`).join("");
  }
}

function entrarOficina() {
  mostrar("juego");
  actualizarHUD();
  nuevaTarea();
}

// ---------- Tarea en pantalla ----------
function nuevaTarea() {
  if (state.hora >= state.finJornada) { finDia(); return; }
  state.tarea = generarTarea();
  state.marcados = new Set();
  $("#documento").innerHTML = `<div class="doc-vacio">Bandeja de entrada: 1 tarea nueva.<br>Pulsa <b>“Generar con IA”</b> para redactar el documento.</div>`;
  $("#btn-generar").style.display = "inline-block";
  $("#acciones-doc").style.display = "none";
  renderPostit();
  actualizarHUD();
}

function renderPostit() {
  const p = state.tarea.postit;
  $("#postit").innerHTML = `
    <div class="postit-tit">POST-IT · ${TIPOS_DOC[p.tipo]}</div>
    <div class="postit-linea"><b>Empresa:</b> ${p.empresa}</div>
    <div class="postit-linea"><b>Sector:</b> ${p.sector}</div>
    <div class="postit-linea"><b>Región:</b> ${p.region}</div>
    <div class="postit-linea small">Redacta el documento y revísalo antes de enviarlo a ${JEFES[state.becario.jefe].nombre}.</div>`;
  // Reglas activas visibles como recordatorio.
  $("#reglas-panel").innerHTML = state.reglasActivas.map((r) => `<div class="regla-item">• ${r.texto}</div>`).join("");
}

function generarConIA() {
  const t = state.tarea;
  const doc = $("#documento");
  doc.innerHTML = "";
  t.parrafos.forEach((par, i) => {
    const el = document.createElement("p");
    el.className = "doc-par";
    el.textContent = par.texto;
    el.dataset.idx = i;
    el.onclick = () => toggleMarca(i, el);
    doc.appendChild(el);
  });
  // Coste de tiempo: leer/generar consume 12-20 min.
  t.minutos = 12 + Math.floor(Math.random() * 9);
  avanzarTiempo(t.minutos);
  $("#btn-generar").style.display = "none";
  $("#acciones-doc").style.display = "flex";
  actualizarHUD();
}

function toggleMarca(i, el) {
  if (state.marcados.has(i)) { state.marcados.delete(i); el.classList.remove("marcado"); }
  else { state.marcados.add(i); el.classList.add("marcado"); }
}

// Herramienta: filtro anti-IA resalta candidatos (no dice cuáles son reales, solo "sospechosos").
function usarFiltroIA() {
  avanzarTiempo(4); // cuesta tiempo
  state.estres = Math.min(100, state.estres + 2);
  document.querySelectorAll(".doc-par").forEach((el) => {
    const idx = +el.dataset.idx;
    const par = state.tarea.parrafos[idx];
    // El filtro señala gazapos de IA con alta fiabilidad y a veces da falso positivo.
    if (par.gazapo || (par.discrepancia && chance(0.6)) || chance(0.1)) {
      el.classList.add("sospechoso");
      setTimeout(() => el.classList.remove("sospechoso"), 2500);
    }
  });
  actualizarHUD();
}

// ---------- Envío / rehacer ----------
function enviarDoc() {
  const t = state.tarea;
  const reales = t.parrafos.map((p, i) => ({ i, es: !!(p.gazapo || p.discrepancia), critico: p.gazapo ? GAZAPOS[p.gazapo].critico : false }));
  const problemasNoMarcados = reales.filter((r) => r.es && !state.marcados.has(r.i));
  const criticosSueltos = problemasNoMarcados.filter((r) => r.critico).length;

  // Filtro de jefes: probabilidad de ser pillado sube con nº y criticidad de fallos.
  const jefe = JEFES[state.becario.jefe];
  const nFallos = problemasNoMarcados.length;
  let pPillado = 1 - Math.pow(1 - jefe.severidad, nFallos);
  pPillado = Math.min(0.98, pPillado + criticosSueltos * 0.25);

  // Luis (Jefe Supremo) hace una segunda pasada aleatoria en informes importantes.
  const revisaLuis = chance(0.25 + state.dia * 0.02);
  let mensaje, tipo;

  if (nFallos === 0) {
    // Documento limpio.
    state.reputacion = Math.min(100, state.reputacion + 3);
    state.enviadosHoy++;
    ganarDinero(18);
    mensaje = `${jefe.nombre}: "Correcto. Buen trabajo." (+18€ productividad)`;
    tipo = "ok";
  } else if (chance(pPillado) || (revisaLuis && criticosSueltos > 0 && chance(JEFES.luis.severidad))) {
    // Pillado.
    const quien = (revisaLuis && criticosSueltos > 0) ? JEFES.luis : jefe;
    state.reputacion = Math.max(0, state.reputacion - 15);
    state.estres = Math.min(100, state.estres + 18);
    if (criticosSueltos > 0) { state.strikes++; }
    mensaje = `${quien.nombre}: "¿¿Esto lo ha escrito una IA?? ${criticosSueltos > 0 ? "STRIKE." : "Broncazo."}" (reputación -15)`;
    tipo = "malo";
  } else {
    // Colaba con fallos menores.
    state.reputacion = Math.max(0, state.reputacion - 4);
    state.enviadosHoy++;
    ganarDinero(10);
    mensaje = `${jefe.nombre}: "Vale, pasa... pero revísalo mejor." (coló con fallos, +10€)`;
    tipo = "regular";
  }

  // Marcar de más (falsos positivos) cuesta tiempo de credibilidad leve.
  const falsosPos = [...state.marcados].filter((i) => {
    const p = state.tarea.parrafos[i];
    return !(p.gazapo || p.discrepancia);
  }).length;
  if (falsosPos > 0 && tipo === "ok") {
    mensaje += `  (${falsosPos} marca(s) de más, sé más preciso)`;
  }

  feedback(mensaje, tipo);
  chequearGameOver();
  if (!state.gameOver) setTimeout(nuevaTarea, 1400);
}

function rehacerDoc() {
  // Rehacer: cuesta tiempo pero evita el riesgo. Genera un documento nuevo de la MISMA tarea.
  avanzarTiempo(10);
  state.estres = Math.min(100, state.estres + 4);
  state.tarea.parrafos = construirDocumento(state.tarea.postit, Math.min(0.2 + state.dia * 0.03, 0.6));
  state.marcados = new Set();
  feedback(`Has pulsado "Rehacer". La IA regenera el documento (-10 min).`, "regular");
  generarConIA();
}

function editarDoc() {
  // Editar: elimina los párrafos marcados (los borra del documento) y reintenta envío directo.
  if (state.marcados.size === 0) { feedback("No has marcado nada que editar.", "regular"); return; }
  avanzarTiempo(3 + state.marcados.size * 2);
  state.tarea.parrafos = state.tarea.parrafos.filter((_, i) => !state.marcados.has(i));
  state.marcados = new Set();
  // Re-render.
  const doc = $("#documento");
  doc.innerHTML = "";
  state.tarea.parrafos.forEach((par, i) => {
    const el = document.createElement("p");
    el.className = "doc-par"; el.textContent = par.texto; el.dataset.idx = i;
    el.onclick = () => toggleMarca(i, el);
    doc.appendChild(el);
  });
  feedback("Has borrado las líneas marcadas. Ahora envía el documento limpio.", "ok");
}

// ---------- Economía / tiempo ----------
function ganarDinero(x) { state.dinero += x; }

function avanzarTiempo(min) {
  state.hora += min;
  if (state.hora > state.finJornada) {
    // Horas extra: el estrés sube exponencialmente.
    const extra = state.hora - state.finJornada;
    state.estres = Math.min(100, state.estres + Math.pow(extra / 30, 1.6) + 2);
  }
  actualizarHUD();
}

function finDia() {
  // Cálculo económico diario (prorrateo mensual).
  const e = ECONOMIA;
  const ingresoDia = Math.round(e.becaMensual / e.diasCampania);
  const gastoDia = Math.round(e.alquilerMensual / e.diasCampania) + e.transporteMensual / e.diasCampania + e.comidaDiaria;
  const aperitivo = state.hora <= state.finJornada + 15 ? e.aperitivoDiario : 0; // si sales a tiempo, aperitivo
  state.dinero += ingresoDia;
  state.dinero -= Math.round(gastoDia + aperitivo);

  // Hambre/estrés según cómo fue el día.
  state.hambre = Math.min(100, state.hambre + (state.enviadosHoy < state.cuotaDiaria ? 14 : 6));
  if (aperitivo) state.estres = Math.max(0, state.estres - 12); // el spritz cura
  if (state.enviadosHoy < state.cuotaDiaria) state.reputacion = Math.max(0, state.reputacion - 8);

  mostrar("resumen");
  $("#res-titulo").textContent = `Fin del día ${state.dia}`;
  $("#res-cuerpo").innerHTML = `
    <div class="res-linea"><span>Informes enviados</span><b>${state.enviadosHoy} / ${state.cuotaDiaria} (cuota)</b></div>
    <div class="res-linea"><span>Salida</span><b>${horaTexto(Math.min(state.hora, 22*60))} ${aperitivo ? "🍸 aperitivo en Navigli" : "😓 horas extra, sin aperitivo"}</b></div>
    <div class="res-linea ingreso"><span>Beca (prorrateo)</span><b>+${ingresoDia}€</b></div>
    <div class="res-linea gasto"><span>Alquiler + transporte + comida${aperitivo ? " + aperitivo" : ""}</span><b>-${Math.round(gastoDia + aperitivo)}€</b></div>
    <div class="res-linea total"><span>Dinero acumulado</span><b>${state.dinero}€</b></div>
    <div class="res-linea"><span>Reputación</span><b>${state.reputacion}/100</b></div>
    <div class="res-linea"><span>Strikes</span><b>${state.strikes}/3</b></div>
    <div class="res-linea"><span>Hambre / Estrés</span><b>${Math.round(state.hambre)} / ${Math.round(state.estres)}</b></div>`;

  chequearGameOver(true);
  const btn = $("#btn-siguiente-dia");
  if (state.modo === "campania" && state.dia >= ECONOMIA.diasCampania && !state.gameOver) {
    finCampania(); return;
  }
  btn.style.display = state.gameOver ? "none" : "inline-block";
}

function siguienteDia() {
  state.dia++;
  empezarDia();
}

// ---------- Condiciones de derrota / victoria ----------
function chequearGameOver(finDeDia = false) {
  let motivo = null;
  if (state.strikes >= 3) motivo = "3 strikes. Luis te ha despedido. La beca ha terminado.";
  else if (state.reputacion <= 0) motivo = "Tu reputación llegó a 0. No te renuevan la beca.";
  else if (state.hambre >= 100) motivo = "Hambre extrema: te has desmayado en el escritorio.";
  else if (state.estres >= 100) motivo = "Colapso por estrés. Te vas de Milán en el primer tren.";
  else if (finDeDia && state.dinero < -300) motivo = "Ruina total en Milán: no puedes pagar el alquiler.";
  if (motivo && !state.gameOver) { state.gameOver = true; gameOver(motivo); }
}

function gameOver(motivo) {
  mostrar("final");
  $("#final-tit").textContent = "GAME OVER";
  $("#final-tit").className = "final-tit derrota";
  $("#final-cuerpo").innerHTML = `
    <p>${motivo}</p>
    <div class="final-stats">
      <div>Días sobrevividos: <b>${state.dia}</b></div>
      <div>Dinero final: <b>${state.dinero}€</b></div>
      <div>Reputación: <b>${state.reputacion}/100</b></div>
    </div>`;
}

function finCampania() {
  state.gameOver = true;
  mostrar("final");
  const bien = state.reputacion >= 40 && state.strikes < 3;
  $("#final-tit").textContent = bien ? "BECA COMPLETADA" : "BECA TERMINADA";
  $("#final-tit").className = "final-tit " + (bien ? "victoria" : "derrota");
  $("#final-cuerpo").innerHTML = `
    <p>${bien
      ? `Has sobrevivido los 6 meses de beca en el ICEX Milán sin que te pillen del todo. ${state.dinero >= 0 ? "Incluso has ahorrado algo." : "Vuelves a casa arruinado pero con experiencia."}`
      : "Terminas la beca de milagro, con la reputación por los suelos y sin carta de recomendación."}</p>
    <div class="final-stats">
      <div>Dinero final: <b>${state.dinero}€</b></div>
      <div>Reputación: <b>${state.reputacion}/100</b></div>
      <div>Strikes: <b>${state.strikes}/3</b></div>
    </div>`;
}

// ---------- HUD / feedback ----------
function actualizarHUD() {
  $("#hud-dia").textContent = `Día ${state.dia}`;
  $("#hud-hora").textContent = horaTexto(Math.min(state.hora, 22 * 60));
  $("#hud-dinero").textContent = `${state.dinero}€`;
  $("#hud-rep").textContent = `Rep ${state.reputacion}`;
  $("#hud-strikes").textContent = `⚠ ${state.strikes}/3`;
  setBarra("#barra-hambre", state.hambre);
  setBarra("#barra-estres", state.estres);
  // Reloj: color según cercanía a las 17:00.
  const rel = $("#hud-hora");
  rel.classList.toggle("tarde", state.hora >= 16 * 60);
  rel.classList.toggle("extra", state.hora > state.finJornada);
}

function setBarra(sel, val) {
  const b = $(sel);
  if (!b) return;
  b.style.width = Math.min(100, val) + "%";
  b.style.background = val > 75 ? "#b23b3b" : val > 45 ? "#c8912f" : "#5a8f4d";
}

function feedback(msg, tipo) {
  const f = $("#feedback");
  f.textContent = msg;
  f.className = "feedback " + tipo + " visible";
  clearTimeout(f._t);
  f._t = setTimeout(() => f.classList.remove("visible"), 3200);
}

// ---------- Wiring ----------
window.addEventListener("DOMContentLoaded", () => {
  renderSeleccion();
  $("#btn-jugar").onclick = () => mostrar("seleccion");
  $("#btn-wa-entrar").onclick = entrarOficina;
  $("#btn-generar").onclick = generarConIA;
  $("#btn-enviar").onclick = enviarDoc;
  $("#btn-rehacer").onclick = rehacerDoc;
  $("#btn-editar").onclick = editarDoc;
  $("#btn-filtro").onclick = usarFiltroIA;
  $("#btn-siguiente-dia").onclick = siguienteDia;
  $("#btn-reiniciar").onclick = () => location.reload();
  $("#btn-volver-menu").onclick = () => location.reload();
});
