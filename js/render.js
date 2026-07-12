import { attachSpriteFallback, displayName } from "./sprites.js";

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function spriteImg(entry, className = "sprite") {
  const img = el("img", { class: className, alt: displayName(entry), loading: "lazy" });
  attachSpriteFallback(img, entry);
  return img;
}

export function typeChips(entry) {
  return el(
    "div",
    { class: "type-chips" },
    entry.types.map((t) => el("span", { class: `chip chip-type-${t}`, text: t }))
  );
}

export function entryCard(entry, { badge } = {}) {
  const card = el("div", { class: "poke-card" }, [
    badge ? el("span", { class: "badge", text: badge }) : null,
    spriteImg(entry),
    el("div", { class: "poke-name", text: displayName(entry) }),
    typeChips(entry),
  ]);
  return card;
}

export function pickableCard(entry, onPick, { badge } = {}) {
  const card = entryCard(entry, { badge });
  card.classList.add("pickable");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.addEventListener("click", () => onPick(entry));
  card.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onPick(entry);
    }
  });
  return card;
}

export function appendToLog(logContainer, node) {
  logContainer.appendChild(node);
  node.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
