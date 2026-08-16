import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const dir = "/tmp/claude-0/-home-user-Claude--/829d3f21-cfbf-5c90-bd09-3ae2adea5619/scratchpad/tour";
const prisma = new PrismaClient();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const escritorio = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await escritorio.newPage();
let n = 0;
const shot = async (nombre, opts = {}) => {
  const file = `${dir}/${String(++n).padStart(2, "0")}-${nombre}.png`;
  await page.screenshot({ path: file, ...opts });
  console.log("capturada", file.split("/").pop());
};

async function login(p, email) {
  await p.goto("http://localhost:3000/login");
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', "demostenes");
  await Promise.all([p.waitForURL((u) => !u.pathname.includes("login")), p.click('button[type="submit"]')]);
  await p.waitForLoadState("networkidle");
}

// 1. Pantalla de entrada, vacía y luego rellenada
await page.goto("http://localhost:3000/login");
await shot("login-vacio");
await page.fill('input[name="email"]', "logopeda@demostenes.test");
await page.fill('input[name="password"]', "demostenes");
await shot("login-relleno");

// 2. Agenda del profesional
await Promise.all([page.waitForURL(/agenda/), page.click('button[type="submit"]')]);
await page.waitForLoadState("networkidle");
await shot("agenda", { fullPage: true });

// 3. Pantalla de cita, antes de generar la ficha
const cita = await prisma.appointment.findFirst({
  where: { startsAt: { gte: new Date() } },
  orderBy: { startsAt: "asc" },
});
await page.goto(`http://localhost:3000/citas/${cita.id}`);
await page.waitForLoadState("networkidle");
await shot("cita-sin-ficha", { fullPage: true });

// 4. El aviso cuando falta la clave de IA
await page.click('button:has-text("Generar ficha")');
await page.waitForTimeout(3500);
await shot("cita-aviso-sin-clave", { fullPage: true });

// 5. La ficha ya generada (contenido de ejemplo: aquí no hay clave de API)
const anterior = await prisma.appointment.findFirst({
  where: { patientId: cita.patientId, startsAt: { lt: cita.startsAt } },
  orderBy: { startsAt: "desc" },
});
const desde = anterior?.startsAt ?? new Date(cita.startsAt.getTime() - 30 * 864e5);
const entradas = await prisma.diaryEntry.count({
  where: { patientId: cita.patientId, createdAt: { gte: desde, lte: cita.startsAt } },
});
await prisma.preSessionBrief.upsert({
  where: { appointmentId: cita.id },
  create: {
    appointmentId: cita.id,
    entryCount: entradas,
    coveredFrom: desde,
    coveredUntil: cita.startsAt,
    summary: `## Desde la última sesión
Marco ha registrado cuatro entradas desde la sesión anterior. Practicó los ejercicios los días 7, 12 y 14 de agosto; el 9 de agosto los rechazó.

## Avance por objetivo
- **Fonema /r/ en posición inicial**: trabajado el 7 de agosto ("le costó al principio pero acabó contento"). Sin menciones posteriores.
- **Fluidez en frases largas**: el 12 de agosto leyó un cuento entero en voz alta, con dos bloqueos en frases largas.

## A tener en cuenta
- El 14 de agosto aparece por primera vez el contexto escolar: "en el cole dice que le da vergüenza hablar en clase".
- La adherencia es irregular. El rechazo del 9 de agosto coincide con el único día de ánimo bajo registrado.

## Para abrir la sesión
- ¿Qué pasó el día que no quiso hacer los ejercicios?
- ¿Cómo se siente al hablar delante de sus compañeros?`,
  },
  update: { entryCount: entradas, coveredFrom: desde, coveredUntil: cita.startsAt },
});
await page.reload();
await page.waitForLoadState("networkidle");
await shot("cita-con-ficha", { fullPage: true });

// 6. Notas de sesión escritas
await page.fill(
  'textarea[name="sessionNotes"]',
  "Trabajamos /r/ inicial con apoyo visual. Abordamos la vergüenza en clase: acordamos que lea en voz alta a su hermana esta semana.",
);
await page.click('button:has-text("Guardar notas")');
await page.waitForTimeout(2500);
await shot("cita-notas-guardadas", { fullPage: true });

// 7. Listado de pacientes y ficha completa
await page.goto("http://localhost:3000/pacientes");
await page.waitForLoadState("networkidle");
await shot("pacientes-listado", { fullPage: true });

await Promise.all([
  page.waitForURL(/\/pacientes\/\w/),
  page.locator('a[href^="/pacientes/"]').first().click(),
]);
await page.waitForLoadState("networkidle");
await shot("paciente-ficha", { fullPage: true });

// --- Lado paciente ---
await page.click('button:has-text("Salir")');
await page.waitForURL(/login/);
await login(page, "paciente@demostenes.test");
await shot("diario-paciente", { fullPage: true });

await page.fill(
  'textarea[name="body"]',
  "Hoy ha leído en voz alta a su hermana sin que se lo pidiéramos. Se atascó una vez pero siguió.",
);
await page.check('input[value="MUY_BIEN"]');
await shot("diario-escribiendo");

await page.click('button:has-text("Guardar entrada")');
await page.waitForTimeout(2500);
await shot("diario-entrada-guardada", { fullPage: true });

// 8. El diario del paciente en un móvil, que es como lo usarán de verdad
const movil = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const mp = await movil.newPage();
await login(mp, "paciente@demostenes.test");
await mp.screenshot({ path: `${dir}/${String(++n).padStart(2, "0")}-diario-movil.png`, fullPage: true });
console.log("capturada diario-movil");

console.log(`\n${n} capturas en ${dir}`);
await browser.close();
await prisma.$disconnect();
