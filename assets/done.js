/* Atividade concluída: toast de confirmação + setas de navegação no player embutido — v2026-11-21c */
(() => {
  const boot = setInterval(() => {
    if (window.__hooks && window.__openE) { clearInterval(boot); init(); }
  }, 120);

  const strip = (s) => { const d = document.createElement("div"); d.innerHTML = s || ""; return d.textContent.trim(); };

  function init() {
    const H = window.__hooks;
    const nextOf = (id) => { const i = H.lessons.findIndex((e) => e.id === id); return i >= 0 && i < H.lessons.length - 1 ? H.lessons[i + 1] : null; };
    const prevOf = (id) => { const i = H.lessons.findIndex((e) => e.id === id); return i > 0 ? H.lessons[i - 1] : null; };

    // --- toast "Atividade concluída!" ---
    let toast = null, timer = 0;
    const hide = () => { toast && toast.classList.remove("is-on"); };
    H.onDone.push((id) => {
      if (!toast) { toast = document.createElement("div"); toast.className = "done-toast"; toast.setAttribute("role", "status"); document.body.append(toast); }
      const n = nextOf(id);
      toast.innerHTML = "";
      const chk = document.createElement("div"); chk.className = "dt-check"; chk.textContent = "✓";
      const body = document.createElement("div"); body.className = "dt-body";
      const st = document.createElement("strong"); st.textContent = "Atividade concluída!";
      const sp = document.createElement("span"); sp.textContent = H.doneCount() + " de " + H.total + " projetos";
      body.append(st, sp); toast.append(chk, body);
      if (n) {
        const b = document.createElement("button"); b.type = "button"; b.className = "dt-next";
        b.textContent = "Próxima: " + strip(n.cardTitle || n.title);
        b.onclick = () => { hide(); H.select(n.id); };
        toast.append(b);
      }
      const x = document.createElement("button"); x.type = "button"; x.className = "dt-x"; x.setAttribute("aria-label", "Fechar"); x.textContent = "×"; x.onclick = hide;
      toast.append(x);
      const rail = document.querySelector(".lessons");
      let bottom = document.documentElement.classList.contains("compact") ? 82 : 26;
      if (rail && !document.documentElement.classList.contains("compact")) {
        const rr = rail.getBoundingClientRect();
        if (rr.height) bottom = Math.max(14, Math.round(window.innerHeight - rr.top + 12));
      }
      toast.style.bottom = bottom + "px";
      requestAnimationFrame(() => toast.classList.add("is-on"));
      clearTimeout(timer); timer = setTimeout(hide, 14000);
    });

    // --- setas ‹ › sobre o player embutido (lições e101/robolab/roverkit) ---
    const nav = document.createElement("div"); nav.className = "e101-nav";
    const bp = document.createElement("button"); bp.type = "button"; bp.className = "e101-prev"; bp.setAttribute("aria-label", "Lição anterior"); bp.textContent = "‹";
    const bn = document.createElement("button"); bn.type = "button"; bn.className = "e101-next"; bn.setAttribute("aria-label", "Próxima lição"); bn.textContent = "›";
    nav.append(bp, bn); document.body.append(nav);
    const syncNav = () => {
      const t = window.__E && window.__E.t;
      if (!t) { nav.classList.remove("is-on"); return; }
      nav.classList.add("is-on");
      const p = prevOf(t.id), n = nextOf(t.id);
      bp.disabled = !p; bn.disabled = !n;
      bp.onclick = () => p && H.select(p.id);
      bn.onclick = () => n && H.select(n.id);
    };
    const oo = window.__openE, oc = window.__closeE;
    window.__openE = (t, l) => { oo(t, l); syncNav(); };
    window.__closeE = () => { const r = oc(); syncNav(); return r; };
    syncNav();
  }
})();
