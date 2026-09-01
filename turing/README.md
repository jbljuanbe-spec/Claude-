# Turing Arena

Chat multiplayer 1-a-1 donde tu rival puede ser una persona real u otra IA que la imita.
Hablas un rato y al final adivinas: ¿humano o máquina? Aciertas → punto.

Todo corre dentro de Cloudflare, sin servidores que pagar:

- **Worker + Durable Object** (`src/index.js`): cola de emparejamiento y salas de chat en tiempo real por WebSocket.
- **Workers AI** (`@cf/meta/llama-3.1-8b-instruct`): el "humano artificial", con cuota diaria gratuita de tu plan Cloudflare.
- **Assets** (`public/`): el frontend estático lo sirve el propio Worker.

## Desplegar conectando GitHub (automático en cada push)

1. En el dashboard de Cloudflare: **Workers & Pages → Create → Workers → Connect to Git**.
2. Elige este repositorio y la rama de trabajo.
3. **Root directory (path):** `turing`  ← importante, el proyecto no está en la raíz del repo.
4. Deploy command: `npx wrangler deploy` (valor por defecto). Build command: déjalo vacío.
5. Guarda. Cloudflare crea el Worker, aplica la migración del Durable Object y activa el binding de Workers AI leyendo `wrangler.toml`. Cada push a la rama vuelve a desplegar solo.

No hay secretos ni variables de entorno que configurar.

## Desarrollo local

```
cd turing
npm install
npm run dev      # usa --remote para que Workers AI funcione en local
```

## Cómo se logra que cueste adivinar

La clave no es el tamaño del modelo, es el *timing* y el estilo:

- Indicador de "escribiendo…" con retardo de lectura antes de responder.
- Tiempo de tecleo proporcional a la longitud del mensaje, con ruido aleatorio.
- Respuestas cortas, informales, en minúsculas y a veces partidas en dos globos.
- Prompt que prohíbe al modelo sonar a asistente o revelarse como IA.

## Notas de coste

- Un único Durable Object global gestiona todo; a bajo volumen entra de sobra en el plan free.
- Workers AI tiene tope diario gratuito. Si se agota, las partidas contra IA fallan hasta el reset (el código responde con un mensaje corto de reserva). Subir volumen = pasar a pago por uso.
