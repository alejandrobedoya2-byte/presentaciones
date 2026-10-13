(() => {
  'use strict';

  const esc = document.getElementById('escenario');
  const laminas = [...esc.querySelectorAll('.lamina')];
  const contador = document.getElementById('contador');
  const hiloSvg = document.getElementById('hilo');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DESLIZA = { duracion: 550, curva: 'cubic-bezier(.65, 0, .35, 1)' };

  let actual = -1;
  let paso = 1;
  let escala = 1;

  /* ---------- Los pedazos del proyecto que andan sueltos en los chats ---------- */
  const BURBUJAS = [
    { k: 'b1', logo: 'chatgpt', nombre: 'ChatGPT', texto: 'Te cuento mi proyecto…' },
    { k: 'b2', logo: 'claude', nombre: 'Claude', texto: 'El objetivo es…' },
    { k: 'b3', logo: 'copilot', nombre: 'Copilot', texto: 'Lo que decidí y por qué…' },
    { k: 'b4', logo: 'chatgpt', nombre: 'ChatGPT', texto: 'Otra vez: te cuento mi proyecto…' },
    { k: 'b5', logo: 'copilot', nombre: 'Copilot', texto: 'Otra vez el objetivo…' },
    { k: 'b6', logo: 'claude', nombre: 'Claude', texto: 'Otra vez lo que decidí…' },
  ];
  // Dónde está cada burbuja en cada lámina: [izquierda, arriba, giro en grados]
  const LUGARES = {
    1: { b1: [150, 300, -3], b2: [1110, 288, 3], b3: [86, 432, 2], b4: [1046, 420, -2], b5: [214, 562, -2], b6: [1126, 556, 2] },
    2: { b1: [150, 556, -3], b2: [1176, 552, 3], b3: [392, 612, 2], b4: [882, 616, -2], b5: [690, 548, -2], b6: [1238, 614, 2] },
    // Adentro de la carpeta, ya ordenadas: una pila derecha que asoma por arriba
    3: { b1: [1138, 336, 0], b2: [1154, 346, 0], b3: [1170, 356, 0], b4: [1186, 366, 0], b5: [1202, 376, 0], b6: [1218, 386, 0] },
  };

  /* ---------- La línea de trabajo en cada lámina: [forma, visible, demora en ms] ---------- */
  const SUELTA = {
    'hilo-principal': ['M -20 700 L 520 700', 1, 0],
    'hilo-trozo-1': ['M 552 700 L 574 700', 1, 380],
    'hilo-trozo-2': ['M 600 700 L 610 700', 1, 480],
  };
  const HILO = {
    '0': { 'hilo-principal': ['M -20 600 L 1460 600', 1, 380], 'hilo-trozo-1': [null, 0], 'hilo-trozo-2': [null, 0] },
    '1': SUELTA,
    '2': SUELTA,
    '3': { 'hilo-principal': ['M -20 480 L 1620 480', 1, 0], 'hilo-trozo-1': [null, 0], 'hilo-trozo-2': [null, 0] },
    '3.2': { opacidad: 0.2 },
  };

  /* ---------- Armado ---------- */
  function armar() {
    // La agenda, que después queda arriba marcando en qué parte vamos
    const partes = ['El sistema', 'El sistema aplicado', 'El cierre'];
    laminas.filter((l) => l.dataset.parte).forEach((l) => {
      const nav = document.createElement('nav');
      nav.className = 'migas';
      nav.setAttribute('aria-label', 'Partes de la presentación');
      partes.forEach((p, i) => {
        const s = document.createElement('span');
        s.className = 'pastilla' + (Number(l.dataset.parte) === i + 1 ? ' actual' : '');
        s.dataset.k = 'ag-' + (i + 1);
        s.dataset.entra = 'pop';
        s.style.setProperty('--t', i * 80 + 'ms');
        s.textContent = p;
        nav.appendChild(s);
      });
      l.prepend(nav);
    });

    // Las burbujas de cada lámina
    esc.querySelectorAll('.burbujas').forEach((caja) => {
      const n = caja.closest('.lamina').dataset.n;
      const lugares = LUGARES[n];
      caja.style.fontSize = caja.dataset.tam + 'px';
      BURBUJAS.forEach((b, i) => {
        const [x, y, giro] = lugares[b.k];
        const d = document.createElement('div');
        d.className = 'burbuja';
        d.dataset.k = b.k;
        d.dataset.entra = 'pop';
        d.style.left = x + 'px';
        d.style.top = y + 'px';
        d.style.setProperty('--r', giro + 'deg');
        d.style.setProperty('--t', (n === '1' ? 500 + i * 180 : 900 + i * 60) + 'ms');
        const img = document.createElement('img');
        img.src = 'logos/' + b.logo + '.svg';
        img.alt = b.nombre;
        d.appendChild(img);
        d.appendChild(document.createTextNode(b.texto));
        caja.appendChild(d);
      });
    });

    // Cuánto mide cada palabra que se vuelve ícono
    esc.classList.add('midiendo');
    esc.querySelectorAll('.pi').forEach((pi) => {
      const t = pi.querySelector('.pi-texto');
      pi.style.setProperty('--w-texto', Math.ceil(t.offsetWidth) + 'px');
    });
    esc.classList.remove('midiendo');
  }

  function ajustar() {
    escala = Math.min(innerWidth / 1600, innerHeight / 900);
    esc.style.setProperty('--s', escala);
  }

  /* ---------- La línea ---------- */
  function ponerHilo(n, p) {
    const base = HILO[String(n)] || {};
    const extra = HILO[n + '.' + p] || {};
    const estado = { ...base, ...extra };
    hiloSvg.style.opacity = estado.opacidad ?? 1;
    ['hilo-principal', 'hilo-trozo-1', 'hilo-trozo-2'].forEach((id) => {
      const c = base[id];
      if (!c) return;
      const [forma, visible, demora] = c;
      const el = document.getElementById(id);
      el.style.transitionDelay = `0ms, ${visible ? demora : 0}ms, 0ms`;
      if (forma) el.style.d = `path("${forma}")`;
      el.style.strokeDashoffset = visible ? 0 : 1;
      el.style.opacity = visible ? 1 : 0;
    });
  }

  /* ---------- Deslizar lo que sigue de una lámina a la otra ---------- */
  function giroDe(el) {
    return parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0;
  }

  function fotografiar(lamina) {
    const fotos = new Map();
    lamina.querySelectorAll('[data-k]').forEach((el) => {
      const r = el.getBoundingClientRect();
      fotos.set(el.dataset.k, { cx: r.left + r.width / 2, cy: r.top + r.height / 2, ancho: el.offsetWidth, giro: giroDe(el) });
    });
    return fotos;
  }

  function demoraDe(el) {
    const propia = el.dataset.mueve;
    if (propia) return Number(propia);
    const caja = el.parentElement;
    const base = Number(caja.dataset.mueve || 0);
    const orden = [...caja.children].indexOf(el);
    return base + orden * 70;
  }

  function deslizar(el, antes) {
    const r = el.getBoundingClientRect();
    const dx = (antes.cx - (r.left + r.width / 2)) / escala;
    const dy = (antes.cy - (r.top + r.height / 2)) / escala;
    const k = el.offsetWidth ? antes.ancho / el.offsetWidth : 1;
    const giro = giroDe(el);
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(k - 1) < 0.01 && antes.giro === giro) return;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(${antes.giro}deg)` },
        { transform: `translate(0px, 0px) scale(1) rotate(${giro}deg)` },
      ],
      { duration: DESLIZA.duracion, delay: demoraDe(el), easing: DESLIZA.curva, fill: 'backwards' }
    );
  }

  /* ---------- Ir a una lámina y un paso ---------- */
  function pasosDe(n) {
    return Number(laminas[n].dataset.pasos || 1);
  }

  function ponerPaso(p) {
    paso = p;
    const l = laminas[actual];
    for (let i = 2; i <= 6; i++) l.classList.toggle('paso-' + i, p >= i);
    ponerHilo(actual, p);
    contador.textContent = actual;
    history.replaceState(null, '', '#' + actual + (p > 1 ? '.' + p : ''));
  }

  function irA(n, p = 1) {
    if (n < 0 || n >= laminas.length) return;
    const desde = laminas[actual];
    const hacia = laminas[n];
    if (desde === hacia) { ponerPaso(p); return; }
    const atras = actual > n;

    // Lo que sigue de una lámina a la otra
    const fotos = desde && !quieto ? fotografiar(desde) : new Map();
    hacia.classList.remove('saliendo', 'directo', 'paso-2', 'paso-3', 'paso-4', 'paso-5', 'paso-6');
    hacia.querySelectorAll('.flip').forEach((el) => el.classList.remove('flip'));
    // Si se vuelve rápido a una lámina que todavía se estaba apagando, lo escondido vuelve a verse
    hacia.querySelectorAll('[data-k]').forEach((el) => { el.style.visibility = ''; });
    const siguen = [...hacia.querySelectorAll('[data-k]')].filter((el) => fotos.has(el.dataset.k));
    siguen.forEach((el) => el.classList.add('flip'));
    if (atras) hacia.classList.add('directo');

    // La lámina que se va: lo que sigue se esconde ya; lo demás se apaga
    if (desde) {
      const llaves = new Set(siguen.map((el) => el.dataset.k));
      desde.querySelectorAll('[data-k]').forEach((el) => { if (llaves.has(el.dataset.k)) el.style.visibility = 'hidden'; });
      desde.classList.remove('activa');
      desde.classList.add('saliendo');
      desde.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        if (desde.classList.contains('activa')) return;
        desde.classList.remove('saliendo', 'directo');
        desde.querySelectorAll('[data-k]').forEach((el) => { el.style.visibility = ''; });
      }, quieto ? 0 : 320);
    }

    hacia.classList.add('activa');
    hacia.removeAttribute('aria-hidden');
    actual = n;
    ponerPaso(p);
    siguen.forEach((el) => deslizar(el, fotos.get(el.dataset.k)));
  }

  function siguiente() {
    if (paso < pasosDe(actual)) ponerPaso(paso + 1);
    else if (actual < laminas.length - 1) irA(actual + 1, 1);
  }

  function anterior() {
    if (paso > 1) ponerPaso(paso - 1);
    else if (actual > 0) irA(actual - 1, pasosDe(actual - 1));
  }

  /* ---------- Teclas y clic ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); siguiente(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); anterior(); }
    else if (e.key === 'Home') { e.preventDefault(); irA(0); }
    else if (e.key === 'f' || e.key === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });
  document.addEventListener('click', (e) => { if (e.button === 0) siguiente(); });
  addEventListener('resize', ajustar);

  /* ---------- Arranque ---------- */
  armar();
  ajustar();
  laminas.forEach((l) => l.setAttribute('aria-hidden', 'true'));
  const [n0, p0] = (location.hash.slice(1) || '0').split('.').map(Number);
  const inicio = Number.isInteger(n0) && laminas[n0] ? n0 : 0;
  const pasoInicio = Number.isInteger(p0) ? Math.min(Math.max(p0, 1), pasosDe(inicio)) : 1;
  // Dos cuadros de espera para que la línea se dibuje en vez de aparecer de golpe
  requestAnimationFrame(() => requestAnimationFrame(() => irA(inicio, pasoInicio)));
})();
