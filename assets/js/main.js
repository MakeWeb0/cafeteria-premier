/* Cafetería Premier */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = $(".nav");

  /* ---------- menu ---------- */
  const burger = $(".nav__burger");
  const menu = $("#menu");
  const dentro = $(".menu__dentro");
  const flota = $$(".menu__dentro nav a, .menu__tel");
  const liquido = $(".menu__liquido");
  const espuma = $(".menu__espuma");
  const svgBebida = $(".menu__bebida");
  const burbujas = Array.from({ length: 14 }, (_, i) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    $(".menu__burbujas").appendChild(c);
    return { c, x: (i * .618 + .07) % 1, o: (i * .381) % 1, v: .55 + ((i * .73) % 1) * .6, r: 1.6 + (i % 3) * 1.1 };
  });
  const vaso = { nivel: 1.15, agita: 1 };
  let tlMenu = null;
  let menuLleno = false;

  /* every frame comes from the timeline's time, so it can be scrubbed and replayed */
  function pintaBebida(t) {
    const W = menu.clientWidth, H = menu.clientHeight;
    svgBebida.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const sup = vaso.nivel * H;
    const amp = Math.min(H * .016, 13) * vaso.agita;
    const F = Math.min(H * .05, 40);
    const PASOS = 110;
    let l = `M0 ${H}`, e = `M0 ${H}`;
    for (let i = 0; i <= PASOS; i++) {
      const u = i / PASOS, x = (W * u).toFixed(1);
      const yl = sup + Math.sin(u * 9.4 + t * 6) * amp + Math.sin(u * 21 - t * 9) * amp * .35;
      const ye = yl - F * (.68 + .32 * Math.abs(Math.sin(u * 38 + t * 1.6)));
      l += `L${x} ${yl.toFixed(1)}`;
      e += `L${x} ${ye.toFixed(1)}`;
    }
    liquido.setAttribute("d", l + `L${W} ${H}Z`);
    espuma.setAttribute("d", e + `L${W} ${H}Z`);

    burbujas.forEach((b) => {
      const y = H - ((b.v * t * H * .8 + b.o * H) % H);
      const dentroDelLiquido = y > sup + amp + 6;
      b.c.setAttribute("r", dentroDelLiquido ? b.r : 0);
      b.c.setAttribute("cx", b.x * W + Math.sin(t * 5 + b.o * 9) * 5);
      b.c.setAttribute("cy", y);
    });
    dentro.style.clipPath = `inset(${Math.max(0, sup + amp)}px 0 0 0)`;
  }

  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.documentElement.style.overflow = open ? "hidden" : "";
    const conMovimiento = window.gsap && !reduce;
    const vuelveNav = () => {
      menuLleno = false;
      nav.classList.toggle("logo-visible", scrollY >= (window.__heroFin || 0) - 1);
      syncNav();
      dispatchEvent(new Event("scroll"));
    };
    if (tlMenu) tlMenu.kill();

    if (open) {
      const tono = nav.dataset.tone;
      /* only choose the drink on a fresh open, not when reopening while it drains */
      if (menu.hidden) menu.dataset.bebida = tono === "noche" ? "cana" : "cafe";
      const tonoLleno = menu.dataset.bebida === "cana" ? "dia" : "noche";
      const llena = () => {
        menuLleno = true;
        nav.dataset.tone = tonoLleno;
        nav.classList.add("logo-visible");
      };
      nav.classList.remove("is-solida", "is-oculta");
      menu.hidden = false;
      if (!conMovimiento) { menu.classList.add("is-llena"); dentro.style.clipPath = ""; llena(); return; }
      menu.classList.remove("is-llena");
      vaso.agita = 1;
      tlMenu = gsap.timeline({
        onUpdate: () => pintaBebida(tlMenu.time()),
        onComplete: () => { menu.classList.add("is-llena"); dentro.style.clipPath = ""; },
      });
      tlMenu
        .to(vaso, { nivel: -.12, duration: .72, ease: "power1.inOut" }, 0)
        .fromTo(flota, { y: 30 }, { y: 0, duration: .55, ease: "power2.out", stagger: { each: .04, from: "end" } }, .06)
        .call(llena, null, .6);
      pintaBebida(0);
      return;
    }

    if (!conMovimiento) { menu.hidden = true; menu.classList.remove("is-llena"); vuelveNav(); return; }
    menu.classList.remove("is-llena");
    tlMenu = gsap.timeline({
      onUpdate: () => pintaBebida(1 + tlMenu.time()),
      onComplete: () => { menu.hidden = true; },
    });
    tlMenu.to(vaso, { nivel: 1.15, duration: .5, ease: "power2.in" }, 0).call(vuelveNav, null, .06);
    pintaBebida(1);
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (ev) => { if (ev.key === "Escape" && burger.getAttribute("aria-expanded") === "true") { setMenu(false); burger.focus(); } });

  /* ---------- tostada builder ---------- */
  const { tops, panes, ings } = window.PREMIER;
  const estado = { pan: "normal", ing: new Set() };
  const frase = $("#tuya-frase");
  const nota = $("#tuya-nota");
  const foto = $("#tostada-foto .foto-base");
  const capas = $$("#tostada-foto .foto-capa");
  const lista = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " y " + a[a.length - 1];
  const ORDEN = Object.keys(ings);
  const EXTRA = { semillas: "0,30", singluten: "0,60" };

  function pinta() {
    $$("[data-pan]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.pan === estado.pan));
    $$("[data-ing]").forEach((b) => b.setAttribute("aria-pressed", estado.ing.has(b.dataset.ing)));
    const elegidos = ORDEN.filter((k) => estado.ing.has(k));
    const pan = panes[estado.pan];
    const cap = pan[0].toUpperCase() + pan.slice(1);
    frase.textContent = elegidos.length ? `${cap} con ${lista(elegidos.map((k) => ings[k]))}.` : `${cap}, de momento solo.`;

    const top = tops.find((t) => t.ing.length === elegidos.length && t.ing.every((k) => estado.ing.has(k)));
    $$("[data-top]").forEach((b) => b.setAttribute("aria-pressed", !!top && b.dataset.top === top.id));
    if (!elegidos.length) nota.textContent = "Ponle algo encima.";
    else if (top) {
      const extra = EXTRA[estado.pan] ? ` más ${EXTRA[estado.pan]} € del pan` : "";
      const otroPan = (estado.pan === "molde" || estado.pan === "croissant") ? " con otro pan" : "";
      nota.textContent = `Eso ya tiene nombre: ${top.n}${otroPan}. ${top.p} €${extra}.`;
    } else nota.textContent = "Aún no tiene nombre. Pídela así en barra.";

    /* Nórdica and Gym have their own photo; Americana zooms into the shot of four plates */
    capas.forEach((c) => c.classList.toggle("is-visible", !!top && c.dataset.foto === top.id));
    if (top && top.id === "americana") foto.style.transform = "scale(2.4) translateY(-12.5%)";
    else foto.style.transform = "";
  }

  $$("[data-pan]").forEach((b) => b.addEventListener("click", () => { estado.pan = b.dataset.pan; pinta(); }));
  $$("[data-ing]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.ing;
    estado.ing.has(k) ? estado.ing.delete(k) : estado.ing.add(k);
    pinta();
  }));
  const ponTop = (t) => { estado.pan = t.pan; estado.ing = new Set(t.ing); pinta(); };
  $$("[data-top]").forEach((b) => b.addEventListener("click", () => ponTop(tops.find((t) => t.id === b.dataset.top))));
  let ultimo = "nordica";
  $("#decide").addEventListener("click", () => {
    const resto = tops.filter((t) => t.id !== ultimo);
    const t = resto[Math.floor(Math.random() * resto.length)];
    ultimo = t.id;
    ponTop(t);
  });
  ponTop(tops.find((t) => t.id === ultimo));

  /* ---------- carta tabs ---------- */
  const tabs = $$(".carta__tab");
  const activa = (tab, foco) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (foco) tab.focus();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => activa(t));
    t.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") activa(tabs[(i + 1) % tabs.length], true);
      if (ev.key === "ArrowLeft") activa(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  });

  /* ---------- hours: mark today ---------- */
  const fila = $(`.tabla tr[data-dia="${new Date().getDay()}"]`);
  if (fila) fila.classList.add("es-hoy");

  /* ---------- nav tone, hide on scroll down ---------- */
  const secciones = $$("main > section, .pie").filter((s) => !s.classList.contains("hero"));
  let tonoHero = "noche";
  /* the tone comes from whatever sits under the nav bar: the hero while it is pinned, then each section */
  function syncNav() {
    if (burger.getAttribute("aria-expanded") === "true") return;
    const fin = window.__heroFin || innerHeight;
    if (scrollY < fin - 1) { nav.dataset.tone = tonoHero; return; }
    let actual = secciones[0];
    for (const s of secciones) if (s.getBoundingClientRect().top <= 40) actual = s;
    nav.dataset.tone = scrollY < fin + 40 ? "dia" : actual.dataset.tone;
    nav.style.setProperty("--nav-dia", actual.id === "carta" ? "var(--crema)" : "var(--pared)");
  }
  let ultimoY = 0;
  addEventListener("scroll", () => {
    if (burger.getAttribute("aria-expanded") === "true") return;
    const y = scrollY;
    const fin = window.__heroFin || innerHeight;
    if (y > fin + 40) {
      nav.classList.add("is-solida");
      nav.classList.toggle("is-oculta", y > ultimoY && y > fin + 200);
    } else nav.classList.remove("is-solida", "is-oculta");
    ultimoY = y;
    syncNav();
  }, { passive: true });

  /* ---------- hero: the saucer of the logo floods the screen with the wall's yellow ---------- */
  const pared = $(".hero__pared");
  const logos = $$(".hero__logo");
  const oro = $(".hero__logo--oro");

  /* logo centre position, in hero coordinates */
  function base() {
    const w = oro.offsetWidth;
    const h = w * (260 / 990);
    const x = innerWidth / 2 - w / 2;
    const y = innerHeight * (innerWidth < 640 ? .42 : .46) - h / 2;
    return { w, h, x, y };
  }
  /* inner oval of the saucer, read from the trace (viewBox 990 x 260) */
  function platillo() {
    const b = base();
    const k = b.w / 990;
    return { cx: b.x + 492 * k, cy: b.y + 172 * k, rx: 470 * k, ry: 66 * k };
  }
  const elipse = (o) => { pared.style.clipPath = `ellipse(${o.rx}px ${o.ry}px at ${o.cx}px ${o.cy}px)`; };
  const colocaLogos = () => { const b = base(); logos.forEach((l) => { l.style.left = 0; l.style.top = 0; }); return b; };

  if (!window.gsap || reduce) {
    /* no motion: the finished hero, no pin */
    const n = $(".nav__logo").getBoundingClientRect();
    const b = colocaLogos();
    logos.forEach((l) => { l.style.transform = `translate(${n.left}px, ${n.top}px)`; l.style.width = n.width + "px"; });
    pared.style.clipPath = "none";
    oro.style.visibility = "hidden";
    tonoHero = "dia"; window.__heroFin = 0;
    nav.classList.add("logo-visible");
    logos.forEach((l) => { l.style.visibility = "hidden"; });
    $(".hero__linea").hidden = true;
    syncNav();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const b0 = colocaLogos();
  gsap.set(logos, { x: () => base().x, y: () => base().y });
  gsap.set(".hero__video", { y: () => innerHeight * 1.1 });
  gsap.set(".hero__t--a", { xPercent: -14, autoAlpha: 0 });
  gsap.set(".hero__t--b", { xPercent: 14, autoAlpha: 0 });

  /* one load moment: the logo wipes in from the cup, the saucer fills */
  const e0 = { ...platillo(), rx: 0, ry: 0 };
  elipse(e0);
  const carga = gsap.timeline();
  carga.fromTo(oro, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power2.inOut" })
    .from(".hero__linea", { autoAlpha: 0, y: 12, duration: .6, ease: "power2.out" }, .7);

  const estadoE = { p: 0 };
  function aplicaE() {
    const pl = platillo();
    /* always wider than tall, like the saucer, also on a phone */
    const ry = Math.max(pl.cy, innerHeight - pl.cy) * 1.7;
    const rx = Math.max(Math.max(pl.cx, innerWidth - pl.cx) * 1.7, ry * 1.5);
    const p = estadoE.p;
    elipse({ cx: pl.cx, cy: pl.cy, rx: rx * p, ry: ry * p });
  }

  const movil = () => innerWidth < 640;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: ".hero", start: "top top", end: () => "+=" + innerHeight * 2.4, pin: true, scrub: .5, invalidateOnRefresh: true,
      onUpdate(st) {
        window.__heroFin = st.end;
        const fin = st.progress > .985;
        nav.classList.toggle("logo-visible", fin || menuLleno);
        $$(".hero__logo").forEach((l) => { l.style.visibility = fin ? "hidden" : ""; });
        tonoHero = st.progress > .38 ? "dia" : "noche";
        syncNav();
      },
      onRefresh(st) { window.__heroFin = st.end; aplicaE(); },
    },
  });

  tl.to(".hero__linea", { autoAlpha: 0, duration: .08 }, 0)
    .to(estadoE, { p: 1, duration: .46, ease: "power2.in", onUpdate: aplicaE }, 0)
    .to(logos, {
      x: () => $(".nav__logo").getBoundingClientRect().left,
      y: () => $(".nav__logo").getBoundingClientRect().top,
      width: () => $(".nav__logo").offsetWidth,
      duration: .3, ease: "power2.inOut",
    }, .44)
    .to(".hero__video", { y: 0, duration: .34, ease: "power3.out" }, .5)
    .to(".hero__t--a", { xPercent: 0, autoAlpha: 1, duration: .24, ease: "power2.out" }, .62)
    .to(".hero__t--b", { xPercent: 0, autoAlpha: 1, duration: .24, ease: "power2.out" }, .68)
    .to({}, { duration: .1 }, .92);

  /* the gallery drifts at three speeds */
  if (!matchMedia("(max-width: 40rem)").matches) {
    $$(".local__col").forEach((c) => {
      gsap.to(c, { yPercent: +c.dataset.speed, ease: "none", scrollTrigger: { trigger: ".local__galeria", start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
