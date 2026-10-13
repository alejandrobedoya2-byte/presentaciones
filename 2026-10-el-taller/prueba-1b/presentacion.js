(() => {
  'use strict';

  const escenario = document.getElementById('escenario');
  const numero = document.getElementById('numero');
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)');

  const piezas = {};
  document.querySelectorAll('[data-pieza]').forEach((el) => { piezas[el.dataset.pieza] = el; });
  const carpeta = piezas.carpeta;
  const palabraTaller = document.getElementById('palabra-taller');

  // ---------- Escala: el escenario llena la pantalla sin deformarse ----------
  function escalar() {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    escenario.style.setProperty('--escala', s);
  }
  window.addEventListener('resize', escalar);
  escalar();

  // ---------- Medidas que dependen del texto (se toman una vez, antes de animar) ----------
  const tam = (id) => ({ w: piezas[id].offsetWidth, h: piezas[id].offsetHeight });

  // Centro de un elemento interior, medido desde la esquina de su pieza
  function centroDentro(el, pieza) {
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el;
    while (n && n !== pieza) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y };
  }

  // Dónde queda el centro de la ranura del logo de una burbuja girada
  function ranuraGirada(idBurbuja, b) {
    const el = piezas[idBurbuja];
    const { w, h } = tam(idBurbuja);
    const c = centroDentro(el.querySelector('.ranura'), el);
    const rad = (b.r || 0) * Math.PI / 180;
    const lx = c.x - w / 2, ly = c.y - h / 2;
    const cx = b.x + w / 2 + lx * Math.cos(rad) - ly * Math.sin(rad);
    const cy = b.y + h / 2 + lx * Math.sin(rad) + ly * Math.cos(rad);
    return { x: cx - 20, y: cy - 20, r: b.r || 0 };
  }

  // Ubicar una pieza escalada (el giro y la escala van alrededor de su centro) por su esquina visible
  function porEsquina(id, px, py, s) {
    const { w, h } = tam(id);
    return { x: px - (w * (1 - s)) / 2, y: py - (h * (1 - s)) / 2, s };
  }

  // ---------- Geometría ----------
  const LINEA_ABAJO = 760;     // la línea de trabajo, en las láminas 0 a 2
  const LINEA_GRAFICO = 370;   // la misma línea, convertida en la cadena tú → agente → carpeta
  const AGENDA = { y: 320, xs: [86, 570, 1054] };
  const TARJ = { y: 112, xs: [110, 590, 1070] };
  const CHAT = { x: 150, y: 236 };
  const BURB = [ // lámina 1: sueltas y desordenadas alrededor del chat vacío
    { x: 40, y: 108, r: -3 },
    { x: 452, y: 160, r: 3 },
    { x: 548, y: 380, r: 2 },
    { x: 430, y: 628, r: -2 },
    { x: 40, y: 652, r: -3 },
  ];
  // Lámina 2: siguen sueltas, más chicas y apagadas, pasado el corte de la línea (esquina visible de cada una)
  const ESC_SUELTA = 0.6;
  const SUELTAS = [{ x: 790, y: 700 }, { x: 880, y: 770 }, { x: 1010, y: 694 }, { x: 1080, y: 772 }, { x: 1232, y: 702 }];

  let L = []; // las láminas; se arman después de medir

  function armar() {
    // Títulos de la agenda: dentro de su tarjeta (lámina 0) y como indicador de la parte (de la 1 en adelante)
    const enTarjeta = (i) => ({ x: AGENDA.xs[i] + 36 - 30, y: AGENDA.y + 70 - 12 });
    const ESC_P = 0.42;
    const pastilla = [];
    let px = 1570;
    for (let i = 2; i >= 0; i--) {
      const { w } = tam('parte-' + (i + 1));
      px -= w * ESC_P;
      pastilla[i] = porEsquina('parte-' + (i + 1), px, 24, ESC_P);
      px -= 8;
    }
    const partes = (activa, extra = {}) => ({
      'parte-1': { ...pastilla[0], c: activa === 0 ? 'pastilla activa' : 'pastilla', ...extra },
      'parte-2': { ...pastilla[1], c: activa === 1 ? 'pastilla activa' : 'pastilla', ...extra },
      'parte-3': { ...pastilla[2], c: activa === 2 ? 'pastilla activa' : 'pastilla', ...extra },
    });

    // Logos: en su burbuja (1), en el círculo de su tarjeta (2) y el de Claude en el agente (3)
    const enBurbuja = BURB.slice(0, 3).map((b, i) => ranuraGirada('burbuja-' + (i + 1), b));
    const enTarjetaLogo = ['tarjeta-chatgpt', 'tarjeta-claude', 'tarjeta-copilot'].map((id, i) => {
      const c = centroDentro(piezas[id].querySelector('.circulo'), piezas[id]);
      return { x: TARJ.xs[i] + c.x - 20, y: TARJ.y + c.y - 20, r: 0 };
    });
    const AGENTE = { x: 400, y: 190 };
    const cA = centroDentro(piezas.agente.querySelector('.ranura-logo'), piezas.agente);
    const enAgente = { x: AGENTE.x + cA.x - 20, y: AGENTE.y + cA.y - 20, r: 0 };

    // La carpeta en la lámina 3: lo suelto cae en ella y desaparece adentro
    const CARP = { x: 1080, y: 240, w: 400, h: 260 };
    const centroCarpeta = { x: CARP.x + CARP.w / 2, y: CARP.y + CARP.h * 0.42 };
    const alaCarpeta = (i) => {
      const { w, h } = tam('burbuja-' + (i + 1));
      return {
        x: centroCarpeta.x - w / 2 + (i - 2) * 14, y: centroCarpeta.y - h / 2, s: 0.22, r: 0, blur: 0, o: 0,
        d: 650 + i * 70, dur: 600, dO: 650 + i * 70 + 360, durO: 240,
      };
    };
    const suelta = (i, b) => ({
      ...porEsquina('burbuja-' + (i + 1), SUELTAS[i].x, SUELTAS[i].y, ESC_SUELTA),
      r: b.r, blur: 1.5, o: 0.55, d: i * 40, dur: 600,
    });

    // Lámina 3b: la hoja de adentro y sus cuatro líneas
    const HOJA = { x: 250, y: 140, w: 1100, h: 600 };
    const metaY = [];
    let my = HOJA.y + 190;
    for (let i = 1; i <= 4; i++) { metaY.push(my); my += tam('meta-' + i).h + 34; }
    const altoLista = my - 34 - (HOJA.y + 190);
    const desplaza = Math.round((HOJA.h - 190 - altoLista - 70) / 2); // centra la lista en lo que queda de la hoja
    const linea = (y, a, b, extra = {}) => ({ x: 0, y: y - 12, seg: [a, b], ...extra });

    L = [
      // ---------------- 0 · Agenda ----------------
      {
        num: '0',
        estados: {
          'agenda-1': { x: AGENDA.xs[0], y: AGENDA.y, e: 'sube', d: 0 },
          'agenda-2': { x: AGENDA.xs[1], y: AGENDA.y, e: 'sube', d: 120 },
          'agenda-3': { x: AGENDA.xs[2], y: AGENDA.y, e: 'sube', d: 240 },
          'parte-1': { ...enTarjeta(0), s: 1, c: '', e: 'sube', d: 0 },
          'parte-2': { ...enTarjeta(1), s: 1, c: '', e: 'sube', d: 120 },
          'parte-3': { ...enTarjeta(2), s: 1, c: '', e: 'sube', d: 240 },
          'linea': linea(LINEA_ABAJO, 122, 546, { dSeg: 750, durSeg: 700 }),
          'linea-inicio': { x: 122 - 8, y: LINEA_ABAJO - 8, e: 'rebote', d: 650 },
        },
      },

      // ---------------- 1 · El problema ----------------
      {
        num: '1',
        estados: {
          ...partes(0, { d: 0, dur: 600 }),
          'linea': linea(LINEA_ABAJO, 122, 700, { dSeg: 250, durSeg: 550 }),
          'linea-inicio': { x: 122 - 8, y: LINEA_ABAJO - 8 },
          'linea-corte': { x: 714, y: LINEA_ABAJO - 18, e: 'rebote', d: 800 },
          'chat': { x: CHAT.x, y: CHAT.y, e: 'sube', d: 150 },
          'burbuja-1': { ...BURB[0], e: 'rebote', d: 550 },
          'burbuja-2': { ...BURB[1], e: 'rebote', d: 700 },
          'burbuja-3': { ...BURB[2], e: 'rebote', d: 850 },
          'burbuja-4': { ...BURB[3], e: 'rebote', d: 1000 },
          'burbuja-5': { ...BURB[4], e: 'rebote', d: 1150 },
          'logo-chatgpt': { ...enBurbuja[0], e: 'rebote', d: 650 },
          'logo-claude': { ...enBurbuja[1], e: 'rebote', d: 800 },
          'logo-copilot': { ...enBurbuja[2], e: 'rebote', d: 950 },
          'frase-1': { x: 924, y: 290, e: 'sube', d: 1450 },
        },
      },

      // ---------------- 2 · ChatGPT, Claude y Copilot ----------------
      {
        num: '2',
        estados: {
          ...partes(0),
          'linea': linea(LINEA_ABAJO, 122, 700),
          'linea-inicio': { x: 122 - 8, y: LINEA_ABAJO - 8 },
          'linea-corte': { x: 714, y: LINEA_ABAJO - 18 },
          // las burbujas siguen sueltas: se achican y se apagan pasado el corte de la línea
          ...Object.fromEntries(BURB.map((b, i) => ['burbuja-' + (i + 1), suelta(i, b)])),
          'tarjeta-chatgpt': { x: TARJ.xs[0], y: TARJ.y, e: 'sube', d: 250 },
          'tarjeta-claude': { x: TARJ.xs[1], y: TARJ.y, e: 'sube', d: 350 },
          'tarjeta-copilot': { x: TARJ.xs[2], y: TARJ.y, e: 'sube', d: 450 },
          // los logos dejan su burbuja y se deslizan a la tarjeta de su herramienta
          'logo-chatgpt': { ...enTarjetaLogo[0], d: 120, dur: 750 },
          'logo-claude': { ...enTarjetaLogo[1], d: 190, dur: 750 },
          'logo-copilot': { ...enTarjetaLogo[2], d: 260, dur: 750 },
          'frase-2': { x: 0, y: 566, e: 'sube', d: 1150 },
          'fuente-2': { x: 0, y: 644, d: 1450 },
        },
      },

      // ---------------- 3 · Dónde nos ubicamos ----------------
      {
        num: '3',
        estados: {
          ...partes(0),
          'linea': linea(LINEA_GRAFICO, 210, CARP.x + CARP.w / 2, { d: 150, dur: 600, dSeg: 150, durSeg: 650 }),
          'tu': { x: 210 - 90, y: LINEA_GRAFICO - 64, e: 'rebote', d: 100 },
          'agente': { x: AGENTE.x, y: AGENTE.y, e: 'sube', d: 150 },
          'logo-claude': { ...enAgente, d: 300, dur: 550 },
          'carpeta': { x: CARP.x, y: CARP.y, w: CARP.w, h: CARP.h, e: 'sube', d: 350 },
          'conectores-3': { x: 0, y: 0, d: 750 },
          // lo que estaba suelto cae dentro de la carpeta
          ...Object.fromEntries(BURB.map((b, i) => ['burbuja-' + (i + 1), alaCarpeta(i)])),
          'subagente': { x: 450, y: 556, e: 'sube', d: 1000 },
          'frase-3': { x: 0, y: 772, e: 'sube', d: 1150 },
        },
        pasos: [
          [0, () => { carpeta.classList.remove('llena', 'abierta', 'adentro'); palabraTaller.classList.remove('pastilla', 'icono'); }],
          [1300, () => carpeta.classList.add('llena')],
          [1650, () => palabraTaller.classList.add('pastilla')],
          [1950, () => { palabraTaller.classList.remove('pastilla'); palabraTaller.classList.add('icono'); }],
        ],
      },

      // ---------------- 3b · Dentro de la carpeta: lo que quiero lograr ----------------
      {
        num: '3b',
        estados: {
          ...partes(0),
          'carpeta': { x: 32, y: 86, w: 1536, h: 766, d: 450, dur: 650 },
          'hoja-meta': { x: HOJA.x, y: HOJA.y, e: 'sube', d: 1100 },
          'meta-titulo': { x: HOJA.x + 100, y: HOJA.y + 96 + desplaza, e: 'sube', d: 1200 },
          'meta-1': { x: HOJA.x + 100, y: metaY[0] + desplaza, e: 'sube', d: 1320 },
          'meta-2': { x: HOJA.x + 100, y: metaY[1] + desplaza, e: 'sube', d: 1420 },
          'meta-3': { x: HOJA.x + 100, y: metaY[2] + desplaza, e: 'sube', d: 1520 },
          'meta-4': { x: HOJA.x + 100, y: metaY[3] + desplaza, e: 'sube', d: 1620 },
        },
        pasos: [
          [0, () => { palabraTaller.classList.remove('pastilla'); palabraTaller.classList.add('icono'); carpeta.classList.add('llena'); }],
          [150, () => carpeta.classList.add('abierta')],
          [350, () => carpeta.classList.add('adentro')],
        ],
      },
    ];
  }

  // ---------- Aplicar el estado de una pieza ----------
  const visible = (st) => !!st && (st.o ?? 1) > 0;
  const ms = (v) => (v ?? 0) + 'ms';

  // El tramo dibujado de la línea, de x = seg[0] a x = seg[1]
  function ponerSeg(el, seg, sinAnim) {
    const path = el.querySelector('path');
    if (sinAnim) path.style.transition = 'none';
    path.style.strokeDasharray = `${Math.max(0, seg[1] - seg[0])} 4000`;
    path.style.strokeDashoffset = `${-seg[0]}`;
    if (sinAnim) { void path.getBoundingClientRect(); path.style.transition = ''; }
  }

  function ponerVars(el, st) {
    el.style.setProperty('--retraso', ms(st.d));
    el.style.setProperty('--dur', (st.dur ?? 500) + 'ms');
    if (st.dO != null) el.style.setProperty('--retraso-o', ms(st.dO)); else el.style.removeProperty('--retraso-o');
    if (st.durO != null) el.style.setProperty('--dur-o', st.durO + 'ms'); else el.style.removeProperty('--dur-o');
    el.style.setProperty('--retraso-seg', ms(st.dSeg ?? st.d));
    el.style.setProperty('--dur-seg', (st.durSeg ?? 600) + 'ms');
  }

  function ponerClases(el, c) {
    (el._clases || []).forEach((k) => el.classList.remove(k));
    el._clases = (c || '').split(' ').filter(Boolean);
    el._clases.forEach((k) => el.classList.add(k));
  }

  function aplicar(id, st, stPrev, sinMov) {
    const el = piezas[id];
    const cuerpo = el.firstElementChild;
    cuerpo.classList.remove('entra-rebote', 'entra-sube');
    cuerpo.style.animationDelay = '';

    if (!st) { // la pieza sale: se desvanece donde está
      el.style.setProperty('--retraso', '0ms');
      el.style.removeProperty('--retraso-o');
      el.style.setProperty('--dur-o', '300ms');
      el.style.opacity = 0;
      el.style.pointerEvents = 'none';
      return;
    }

    const t = `translate(${st.x}px, ${st.y}px) rotate(${st.r || 0}deg) scale(${st.s ?? 1})`;
    const o = st.o ?? 1;
    const entra = !sinMov && visible(st) && !visible(stPrev);
    if ('c' in st) ponerClases(el, st.c);

    if (entra) {
      // Ubicar sin animar, y que la entrada la haga el cuerpo
      el.style.transition = 'none';
      el.style.transform = t;
      el.style.filter = `blur(${st.blur || 0}px)`;
      if (st.w != null) el.style.width = st.w + 'px';
      if (st.h != null) el.style.height = st.h + 'px';
      if (st.seg) ponerSeg(el, [st.seg[0], st.seg[0]], true);
      el.style.opacity = st.e ? o : 0;
      void el.offsetWidth;
      el.style.transition = '';
      ponerVars(el, st);
      if (st.e) {
        cuerpo.style.animationDelay = ms(st.d);
        cuerpo.classList.add('entra-' + st.e);
      } else {
        el.style.opacity = o; // aparece con un fundido corto
      }
      if (st.seg) ponerSeg(el, st.seg);
    } else {
      ponerVars(el, st);
      el.style.transform = t;
      el.style.filter = `blur(${st.blur || 0}px)`;
      if (st.w != null) el.style.width = st.w + 'px';
      if (st.h != null) el.style.height = st.h + 'px';
      if (st.seg) ponerSeg(el, st.seg);
      el.style.opacity = o;
    }
    el.style.pointerEvents = 'none';
  }

  // ---------- Navegar ----------
  let actual = -1;
  let relojes = [];

  function ir(n, animar) {
    n = Math.max(0, Math.min(L.length - 1, n));
    if (n === actual) return;
    relojes.forEach(clearTimeout);
    relojes = [];
    const previa = actual >= 0 ? L[actual] : null;
    const lam = L[n];
    const sinMov = reducir.matches || !animar;

    if (sinMov) escenario.classList.add('instante');
    for (const id of Object.keys(piezas)) aplicar(id, lam.estados[id], previa ? previa.estados[id] : null, sinMov);
    for (const [espera, fn] of lam.pasos || []) {
      if (sinMov) fn(); else relojes.push(setTimeout(fn, espera));
    }
    if (sinMov) { void escenario.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => escenario.classList.remove('instante'))); }

    actual = n;
    numero.textContent = lam.num;
    try { history.replaceState(null, '', '#' + lam.num); } catch (e) { /* en algunos navegadores, file:// no deja cambiar la dirección */ }
  }

  const siguiente = () => ir(actual + 1, true);
  const anterior = () => ir(actual - 1, false);

  window.addEventListener('keydown', (ev) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    switch (ev.key) {
      case 'ArrowRight': case ' ': case 'PageDown': case 'Enter': ev.preventDefault(); siguiente(); break;
      case 'ArrowLeft': case 'PageUp': case 'Backspace': ev.preventDefault(); anterior(); break;
      case 'Home': ev.preventDefault(); ir(0, false); break;
      case 'End': ev.preventDefault(); ir(L.length - 1, false); break;
      case 'f': case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        break;
    }
  });
  document.getElementById('marco').addEventListener('click', siguiente);

  // ---------- Arranque ----------
  const listo = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  listo.then(() => {
    armar();
    const pedida = decodeURIComponent((location.hash || '').slice(1));
    const i = L.findIndex((l) => l.num === pedida);
    if (i > 0) ir(i, false); else ir(0, true);
  });
})();
