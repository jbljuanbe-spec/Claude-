import { chromium } from "playwright";

const shots = "/tmp/claude-0/-home-user-Claude--/829d3f21-cfbf-5c90-bd09-3ae2adea5619/scratchpad";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FALLA"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

async function login(email) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "demostenes");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("login")),
    page.click('button[type="submit"]'),
  ]);
}

// --- Profesional ---
await login("logopeda@demostenes.test");
check("el logopeda aterriza en la agenda", page.url().endsWith("/agenda"), page.url());
await page.screenshot({ path: `${shots}/1-agenda.png` });

const citas = await page.locator('a[href^="/citas/"]').count();
check("la agenda lista la cita próxima", citas === 1, `${citas} cita(s)`);

await Promise.all([
  page.waitForURL(/\/citas\//),
  page.locator('a[href^="/citas/"]').first().click(),
]);
check("abre la página de la cita", /\/citas\//.test(page.url()), page.url());
await page.screenshot({ path: `${shots}/2-cita.png` });

const marca = `Notas de prueba ${Date.now()}`;
await page.fill('textarea[name="sessionNotes"]', marca);
await page.click('button:has-text("Guardar notas")');
await page.waitForTimeout(2500);
await page.reload();
check(
  "las notas de sesión persisten tras recargar",
  (await page.inputValue('textarea[name="sessionNotes"]')) === marca,
);

// ficha de paciente
await page.goto("http://localhost:3000/pacientes");
await Promise.all([
  page.waitForURL(/\/pacientes\/\w/),
  page.locator('a[href^="/pacientes/"]').first().click(),
]);
const fichaTexto = await page.locator("main").innerText();
check("el profesional ve los objetivos activos", fichaTexto.includes("Fonema /r/"));
check(
  "el profesional ve el diario del paciente",
  fichaTexto.includes("Leyó un cuento entero en voz alta"),
);
await page.screenshot({ path: `${shots}/3-paciente.png`, fullPage: true });

// --- Paciente ---
await page.click('button:has-text("Salir")');
await page.waitForURL(/login/);
await login("paciente@demostenes.test");
check("el paciente aterriza en su diario", page.url().endsWith("/diario"), page.url());

const entrada = `Entrada de prueba ${Date.now()}`;
await page.fill('textarea[name="body"]', entrada);
await page.check('input[value="BIEN"]');
await page.click('button:has-text("Guardar entrada")');
await page.waitForTimeout(2500);
check(
  "la entrada nueva aparece en el diario",
  (await page.locator("main").innerText()).includes(entrada),
);
await page.screenshot({ path: `${shots}/4-diario.png`, fullPage: true });

// --- Aislamiento de roles ---
await page.goto("http://localhost:3000/agenda");
await page.waitForLoadState("networkidle");
check(
  "un paciente NO puede abrir la agenda del profesional",
  page.url().includes("/login"),
  page.url(),
);

await page.goto("http://localhost:3000/pacientes");
await page.waitForLoadState("networkidle");
check(
  "un paciente NO puede listar pacientes",
  page.url().includes("/login"),
  page.url(),
);

console.log("\n=== " + (problems.length ? `${problems.length} PROBLEMA(S)` : "TODO OK") + " ===");
problems.forEach((p) => console.log("- " + p));
await browser.close();
process.exit(problems.length ? 1 : 0);
