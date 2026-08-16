# Demóstenes

Copiloto clínico para consultas privadas de **psicología y logopedia**. Une en un solo flujo la agenda del profesional, el diario que el paciente registra entre sesiones, y una **ficha ejecutiva pre-sesión** generada con IA que el profesional lee en menos de un minuto antes de cada cita.

## Qué hace el MVP

**Lado profesional**
- Agenda de próximas citas, con indicación de si la ficha pre-sesión está lista.
- Ficha de paciente: objetivos terapéuticos activos, historial de citas y diario completo.
- Pantalla de cita: genera (o regenera) la ficha pre-sesión y guarda las notas de la sesión.

**Lado paciente**
- Diario entre sesiones: texto libre más una escala de ánimo de cinco puntos.
- Vista de sus entradas anteriores y de la próxima sesión.

**La ficha pre-sesión** toma el diario registrado desde la cita anterior (o los 30 días previos si es la primera), los objetivos activos y las notas de la sesión anterior, y devuelve cuatro secciones: qué ha pasado desde la última sesión, avance por objetivo, puntos a tener en cuenta, y preguntas para abrir la sesión. El prompt prohíbe diagnosticar o proponer tratamiento, y exige citar la fecha de la entrada en la que se apoya cada afirmación.

## Stack

Next.js (App Router, TypeScript) · Prisma + PostgreSQL · Tailwind · SDK de Anthropic · sesión propia con JWT en cookie httpOnly y contraseñas con bcrypt.

## Puesta en marcha

```bash
cp .env.example .env      # rellena DATABASE_URL, SESSION_SECRET y ANTHROPIC_API_KEY
npm install
npm run db:push           # crea el esquema en la base de datos
npm run db:seed           # datos de ejemplo (contraseña de ambas cuentas: demostenes)
npm run dev
```

Cuentas de ejemplo tras el seed:

| Rol | Email |
|---|---|
| Logopeda | `logopeda@demostenes.test` |
| Paciente | `paciente@demostenes.test` |

## Antes de usarlo con pacientes reales

Este es un prototipo funcional, no un producto sanitario listo para producción. Maneja datos de salud, así que como mínimo faltan: cifrado en reposo, registro de auditoría de accesos, política de retención y borrado, contrato de encargado de tratamiento con cada proveedor implicado (incluido el de IA), y una evaluación de impacto conforme al RGPD.

## Siguientes pasos previstos

- Mapa de calor emocional a partir del análisis de sentimiento del diario, con alertas de patrón para el profesional.
- Análisis acústico de grabaciones de voz para logopedia.
- Generador de informes trimestrales en PDF a partir del historial.
