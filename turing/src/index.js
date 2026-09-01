// Turing Arena: chat multiplayer 1-a-1 donde tu rival puede ser humano u otra IA.
// Al terminar votas "humano" o "maquina" y ganas si aciertas.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("se esperaba una conexion websocket", { status: 426 });
      }
      const id = env.ARENA.idFromName("global");
      return env.ARENA.get(id).fetch(request);
    }
    // El resto de rutas las sirve [assets]; si llega aqui es que no existe.
    return new Response("no encontrado", { status: 404 });
  },
};

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `Estas en un chat anonimo hablando con un desconocido. Finge ser una persona real, joven, espanola.
Reglas de estilo, sin excepciones:
- Escribe informal, casi siempre en minusculas.
- Mensajes MUY cortos, normalmente menos de 12 palabras.
- Usa jerga y muletillas ("jaja", "bueno", "en plan", "q", "xd"), a veces alguna errata.
- Tienes opiniones, gustos y estado de animo. No eres servicial ni educado en exceso.
- No hagas listas, no expliques mucho, no te disculpes.
- Si no sabes algo responde con naturalidad ("ni idea jaja", "ns").
- NUNCA digas ni insinues que eres una IA, un modelo o un bot.
- Responde solo con el mensaje que escribirias, sin comillas ni prefijos.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

export class Arena {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // ws -> session
    this.queue = []; // sessions esperando rival humano
  }

  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const session = { ws: server, id: crypto.randomUUID(), game: null, score: 0 };
    this.sessions.set(server, session);

    server.addEventListener("message", (e) => this.onMessage(session, e.data));
    server.addEventListener("close", () => this.onClose(session));
    server.addEventListener("error", () => this.onClose(session));

    this.send(session, { t: "welcome" });
    return new Response(null, { status: 101, webSocket: client });
  }

  send(session, obj) {
    try {
      if (session.ws.readyState === 1) session.ws.send(JSON.stringify(obj));
    } catch (_) {}
  }

  onMessage(session, data) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.t === "join") return this.onJoin(session);
    if (msg.t === "msg") return this.onChat(session, String(msg.text || "").slice(0, 400));
    if (msg.t === "vote") return this.onVote(session, msg.guess);
  }

  onJoin(session) {
    if (session.game && !session.game.ended) return;
    session.game = null;

    // ?Hay otro humano esperando? Emparejalos (evento raro y valioso).
    let other = this.queue.shift();
    while (other && (other.ws.readyState !== 1 || other.game)) other = this.queue.shift();

    if (other) {
      clearTimeout(other.aiTimer);
      this.startHumanGame(session, other);
    } else {
      this.queue.push(session);
      this.send(session, { t: "status", text: "buscando rival..." });
      // Si nadie llega en unos segundos, entra la IA.
      session.aiTimer = setTimeout(() => this.startAIGame(session), rand(4000, 9000));
    }
  }

  startHumanGame(a, b) {
    const game = { ai: false, ended: false, players: [a, b], votes: new Map() };
    a.game = game;
    b.game = game;
    for (const p of [a, b]) this.send(p, { t: "start" });
  }

  startAIGame(session) {
    this.queue = this.queue.filter((s) => s !== session);
    if (session.game || session.ws.readyState !== 1) return;
    const game = { ai: true, ended: false, players: [session], history: [] };
    session.game = game;
    this.send(session, { t: "start" });
    // A veces la "persona" saluda primero.
    if (Math.random() < 0.5) {
      setTimeout(() => this.aiRespond(game, session, true), rand(1500, 4500));
    }
  }

  onChat(session, text) {
    const game = session.game;
    if (!game || game.ended || !text.trim()) return;

    if (game.ai) {
      game.history.push({ role: "user", content: text });
      this.aiRespond(game, session, false);
    } else {
      const opp = game.players.find((p) => p !== session);
      if (opp) this.send(opp, { t: "msg", text });
    }
  }

  async aiRespond(game, session, opener) {
    if (game.ended || session.ws.readyState !== 1) return;

    // Delay de "lectura" antes de ponerse a escribir.
    const lastLen = game.history.length ? game.history[game.history.length - 1].content.length : 0;
    await sleep(Math.min(2600, 500 + lastLen * 18));
    if (game.ended) return;
    this.send(session, { t: "typing" });

    let reply;
    try {
      const messages = [{ role: "system", content: SYSTEM_PROMPT }];
      if (opener) messages.push({ role: "user", content: "(acabas de entrar al chat, saluda breve)" });
      messages.push(...game.history.slice(-12));
      const out = await this.env.AI.run(MODEL, { messages, max_tokens: 60, temperature: 0.9 });
      reply = cleanReply(out.response || "");
    } catch (_) {
      reply = ["ns", "espera q", "jaja q", "ya ves"][Math.floor(Math.random() * 4)];
    }
    if (!reply) reply = "jaja";
    if (game.ended) return;

    game.history.push({ role: "assistant", content: reply });

    // Cadencia: tiempo de tecleo proporcional a la longitud, a veces en 2 globos.
    const parts = maybeSplit(reply);
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        this.send(session, { t: "typing" });
      }
      await sleep(Math.min(6000, parts[i].length * rand(45, 80) + rand(300, 900)));
      if (game.ended || session.ws.readyState !== 1) return;
      this.send(session, { t: "msg", text: parts[i] });
    }
  }

  onVote(session, guess) {
    const game = session.game;
    if (!game || game.ended) return;
    if (guess !== "human" && guess !== "ai") return;

    const truth = game.ai ? "ai" : "human";
    const correct = guess === truth;
    if (correct) session.score += 1;

    this.send(session, { t: "result", truth, guess, correct, score: session.score });

    if (game.ai) {
      game.ended = true;
    } else {
      game.votes.set(session, true);
      const opp = game.players.find((p) => p !== session);
      if (opp) this.send(opp, { t: "opponent_voted" });
      if (game.votes.size >= game.players.length) game.ended = true;
    }
  }

  onClose(session) {
    this.sessions.delete(session.ws);
    this.queue = this.queue.filter((s) => s !== session);
    clearTimeout(session.aiTimer);
    const game = session.game;
    if (game && !game.ai && !game.ended) {
      const opp = game.players.find((p) => p !== session);
      if (opp) this.send(opp, { t: "opponent_left" });
    }
  }
}

function cleanReply(s) {
  s = s.trim().replace(/^["'`]+|["'`]+$/g, "");
  // Quita prefijos tipo "asistente:" o "yo:" si el modelo los mete.
  s = s.replace(/^(asistente|assistant|bot|yo|persona)\s*:\s*/i, "");
  return s.slice(0, 300).trim();
}

function maybeSplit(s) {
  if (s.length > 50 && Math.random() < 0.35) {
    const mid = s.indexOf(" ", Math.floor(s.length / 2));
    if (mid > 0) return [s.slice(0, mid).trim(), s.slice(mid).trim()].filter(Boolean);
  }
  return [s];
}
