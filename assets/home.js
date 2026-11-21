/* Home limpa do ESP32 Interativo (Academe) — v2026-11-21a
   Tela inicial organizada por cima do app: uma chamada principal,
   escolha simples de trilha e "Explorar a placa". Nada é removido do
   app: tudo continua acessível depois da escolha. */
(() => {
  const VER = "2026-11-21e";
  const $ = (s, r = document) => r.querySelector(s);

  const STR = {
    pt: {
      titleB: "Interativo",
      sub: "Monte circuitos, robôs e projetos de verdade em uma placa 3D. Passo a passo, grátis, direto no navegador.",
      pick: "Comece por uma trilha",
      progress: (x, t) => `Você já concluiu ${x} de ${t} projetos`,
      ctaStart: "Começar do início",
      ctaGo: "Continuar de onde parei",
      explore: "Explorar a placa 3D livremente",
      foot: (t) => `${t} projetos gratuitos · 3 trilhas · do básico ao avançado`,
      projects: (n) => (n === 1 ? "1 projeto" : `${n} projetos`),
      levels: (n) => (n === 1 ? "1 nível" : `${n} níveis`),
      desc: {
        ESP32: "A placa, sensores e Wi-Fi",
        "Eletrônica": "Circuitos e componentes",
        "Robótica": "Monte e pilote robôs",
      },
      close: "Explorar a placa",
    },
    en: {
      titleB: "Interactive",
      sub: "Build circuits, robots and real projects on a 3D board. Step by step, free, right in your browser.",
      pick: "Start with a track",
      progress: (x, t) => `You have finished ${x} of ${t} projects`,
      ctaStart: "Start from the beginning",
      ctaGo: "Pick up where I left off",
      explore: "Explore the 3D board freely",
      foot: (t) => `${t} free projects · 3 tracks · beginner to advanced`,
      projects: (n) => (n === 1 ? "1 project" : `${n} projects`),
      levels: (n) => (n === 1 ? "1 level" : `${n} levels`),
      desc: {
        ESP32: "The board, sensors and Wi-Fi",
        "Eletrônica": "Circuits and components",
        "Robótica": "Build and drive robots",
      },
      close: "Explore the board",
    },
  };

  const ICONS = {
    ESP32:
      '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="9" width="14" height="14" rx="2"/><rect x="13" y="13" width="6" height="6" rx="1"/><path d="M12 4v5M16 4v5M20 4v5M12 23v5M16 23v5M20 23v5M4 12h5M4 16h5M4 20h5M23 12h5M23 16h5M23 20h5"/></svg>',
    "Eletrônica":
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 3 8 18h6l-2 11 12-16h-7l3-10z"/></svg>',
    "Robótica":
      '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="11" width="18" height="13" rx="3"/><path d="M16 11V6M16 6h0"/><circle cx="16" cy="5" r="1.6"/><circle cx="12.5" cy="16.5" r="1.4"/><circle cx="19.5" cy="16.5" r="1.4"/><path d="M12.5 20.5h7M3 15v6M29 15v6"/></svg>',
  };

  const lang = () =>
    String(document.documentElement.lang || navigator.language || "pt")
      .toLowerCase()
      .startsWith("pt")
      ? "pt"
      : "en";

  const readDone = (key) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const doneSet = () =>
    new Set([...readDone("learn-esp32:done"), ...readDone("learn-electronics:done")]);
  const lessonItems = () => [...document.querySelectorAll(".lesson")];

  const h = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };

  // ---------- build ----------
  const root = h("div", "home-screen");
  root.id = "home-screen";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");

  const card = h("div", "hs-card");
  const logo = $(".brand-logo");
  if (logo) {
    const lg = logo.cloneNode(true);
    lg.setAttribute("class", "hs-logo");
    card.append(lg);
  }

  const title = h("h1", "hs-title");
  title.append("ESP32 ", Object.assign(h("span"), { textContent: "Interativo" }));
  const sub = h("p", "hs-sub");
  const prog = h("div", "hs-progress");
  prog.style.display = "none";
  const pick = h("p", "hs-pick");
  const grid = h("div", "hs-trilhas");
  const actions = h("div", "hs-actions");
  const cta = h("button", "hs-cta");
  cta.type = "button";
  cta.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 4.8v14.4L19 12z"/></svg><span></span>';
  const explore = h("button", "hs-link");
  explore.type = "button";
  const foot = h("p", "hs-foot");
  actions.append(cta, explore);
  card.append(title, sub, prog, pick, grid, actions, foot);

  const closeBtn = h("button", "hs-close", "✕");
  closeBtn.type = "button";
  const ver = h("span", "hs-version", "v" + VER);
  root.append(card, closeBtn, ver);
  document.body.append(root);

  const setStrings = () => {
    const t = STR[lang()];
    title.lastElementChild.textContent = t.titleB;
    sub.textContent = t.sub;
    pick.textContent = t.pick;
    explore.textContent = t.explore;
    closeBtn.title = t.close;
    closeBtn.setAttribute("aria-label", t.close);
    return t;
  };

  // ---------- trilha cards ----------
  const paintTrilhas = () => {
    const t = setStrings();
    grid.innerHTML = "";
    const api = window.__trilha;
    if (!api) return false;
    foot.textContent = t.foot(lessonItems().length || 99);
    api.segs.forEach((sg, i) => {
      const b = h("button", "hs-trilha");
      b.type = "button";
      const lv0 = api.LV[sg.levels[0]] || {};
      b.innerHTML = ICONS[sg.t] || ICONS.ESP32;
      const txt = h("div", "hs-txt");
      txt.append(
        h("span", "hs-tname", sg.t),
        h("span", "hs-tcount", `${t.projects(sg.count)} · ${t.levels(sg.levels.length)}`),
        h("span", "hs-tdesc", t.desc[sg.t] || ""),
        h("span", "hs-tage", lv0.af || "")
      );
      b.append(txt);
      b.addEventListener("click", () => {
        api.set(i, -1);
        dismiss();
        const first = lessonItems().find((el) => el.style.display !== "none");
        first?.click();
      });
      grid.append(b);
    });
    return true;
  };

  const paintProgress = () => {
    const t = STR[lang()];
    const items = lessonItems();
    const total = items.length || 99;
    const n = doneSet().size;
    if (n > 0) {
      prog.style.display = "";
      prog.innerHTML = "";
      const track = h("span", "hs-ptrack");
      const fill = h("span", "hs-pfill");
      fill.style.width = `${Math.min(100, (n / total) * 100)}%`;
      track.append(fill);
      prog.append(track, h("span", null, t.progress(n, total)));
      cta.querySelector("span").textContent = t.ctaGo;
    } else {
      prog.style.display = "none";
      cta.querySelector("span").textContent = t.ctaStart;
    }
  };

  // ---------- show / dismiss ----------
  let visible = false;
  const show = () => {
    if (visible) return;
    visible = true;
    paintTrilhas();
    paintProgress();
    root.classList.add("is-on");
    setTimeout(() => cta.focus({ preventScroll: true }), 380);
  };
  const dismiss = () => {
    if (!visible) return;
    visible = false;
    root.classList.remove("is-on");
  };

  cta.addEventListener("click", () => {
    const done = doneSet();
    window.__trilha?.set(-1, -1);
    const items = lessonItems();
    const next = items.find((el) => !done.has(el.dataset.id)) || items[0];
    dismiss();
    next?.click();
  });
  explore.addEventListener("click", () => {
    window.__trilha?.set(-1, -1);
    dismiss();
    $('.lesson[data-id="board"]')?.click();
  });
  closeBtn.addEventListener("click", () => {
    window.__trilha?.set(-1, -1);
    dismiss();
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dismiss();
  });

  // Início na barra lateral reabre a Home
  document.querySelector('[data-nav="home"]')?.addEventListener("click", () => {
    setTimeout(show, 60);
  });

  // ---------- auto-show depois do loader ----------
  // Link direto para uma lição externa (#e101-..., #rl-..., #rk-...): não mostrar.
  if (!window.__bootE) {
    let tries = 0;
    const wait = setInterval(() => {
      tries++;
      const loader = document.getElementById("loader");
      const doneLoading = !loader || loader.classList.contains("is-done");
      if (doneLoading) {
        clearInterval(wait);
        show();
      } else if (tries > 120) {
        clearInterval(wait);
      }
    }, 250);
  }
})();
