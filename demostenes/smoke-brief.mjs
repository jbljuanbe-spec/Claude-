import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const shots = "/tmp/claude-0/-home-user-Claude--/829d3f21-cfbf-5c90-bd09-3ae2adea5619/scratchpad";
const prisma = new PrismaClient();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FALLA"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

await page.goto("http://localhost:3000/login");
await page.fill('input[name="email"]', "logopeda@demostenes.test");
await page.fill('input[name="password"]', "demostenes");
await Promise.all([page.waitForURL(/agenda/), page.click('button[type="submit"]')]);

const cita = await prisma.appointment.findFirst({
  where: { startsAt: { gte: new Date() } },
  orderBy: { startsAt: "asc" },
});
await page.goto(`http://localhost:3000/citas/${cita.id}`);

// 1. Sin clave de API válida, el fallo debe mostrarse al usuario, no romper la página.
await page.click('button:has-text("Generar ficha")');
await page.waitForTimeout(8000);
const trasFallo = await page.locator("main").innerText();
check(
  "el fallo de la API se muestra al profesional sin romper la página",
  trasFallo.includes("Ficha pre-sesión") && /falta configurar|no se pudo|declin/i.test(trasFallo),
  trasFallo.split("\n").find((l) => /falta configurar|no se pudo|declin/i.test(l)) ??
    "(sin mensaje visible)",
);
check(
  "el mensaje de error no filtra detalles internos del SDK",
  !/apiKey|authToken|x-api-key|Could not resolve/i.test(trasFallo),
);
await page.screenshot({ path: `${shots}/5-ficha-error.png` });

// 2. Con una ficha ya guardada, la pantalla debe renderizarla con su metadato de cobertura.
const anterior = await prisma.appointment.findFirst({
  where: { patientId: cita.patientId, startsAt: { lt: cita.startsAt } },
  orderBy: { startsAt: "desc" },
});
const desde = anterior?.startsAt ?? new Date(cita.startsAt.getTime() - 30 * 864e5);
const entradas = await prisma.diaryEntry.count({
  where: { patientId: cita.patientId, createdAt: { gte: desde, lte: cita.startsAt } },
});

const ejemplo = `## Desde la última sesión
Marco ha trabajado los ejercicios cuatro de los últimos siete días (entradas del 7, 12 y 14 de agosto).

## Avance por objetivo
- Fonema /r/ en posición inicial: practicado el 7 de agosto, con frustración el 9.
- Fluidez en frases largas: leyó un cuento entero el 12 de agosto, con dos bloqueos.

## A tener en cuenta
- El 14 de agosto refiere vergüenza al hablar en clase: primera mención del contexto escolar.
- Adherencia irregular; el rechazo del 9 de agosto coincide con ánimo bajo.

## Para abrir la sesión
¿Qué pasó el día que no quiso hacer los ejercicios? ¿Cómo se siente al hablar en clase?`;

await prisma.preSessionBrief.upsert({
  where: { appointmentId: cita.id },
  create: {
    appointmentId: cita.id,
    summary: ejemplo,
    entryCount: entradas,
    coveredFrom: desde,
    coveredUntil: cita.startsAt,
  },
  update: { summary: ejemplo, entryCount: entradas, coveredFrom: desde, coveredUntil: cita.startsAt },
});

await page.reload();
await page.waitForLoadState("networkidle");
const conFicha = await page.locator("main").innerText();
check(
  "la ficha guardada se renderiza en la pantalla de cita",
  /avance por objetivo/i.test(conFicha) && conFicha.includes("leyó un cuento entero"),
);
check("muestra el número de entradas cubiertas", conFicha.includes(`${entradas} entradas`), `${entradas} entradas`);
check("el botón pasa a ofrecer regenerar", conFicha.includes("Regenerar ficha"));
check(
  "la agenda muestra la ficha en la tarjeta",
  await (async () => {
    await page.goto("http://localhost:3000/agenda");
    return (await page.locator("main").innerText()).includes("Ficha pre-sesión");
  })(),
);

await page.goto(`http://localhost:3000/citas/${cita.id}`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/6-ficha-ok.png`, fullPage: true });

console.log("\n=== " + (problems.length ? `${problems.length} PROBLEMA(S)` : "TODO OK") + " ===");
problems.forEach((p) => console.log("- " + p));
await browser.close();
await prisma.$disconnect();
