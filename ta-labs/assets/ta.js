/* ============================================================================
   TA LABS — Interacción
   Todo es progresivo: si GSAP o Lenis no cargan (CDN caído, red lenta, bloqueo
   del navegador), la página sigue siendo perfectamente usable. Ninguna función
   de negocio — calculadora, agenda, chat — depende de la capa de animación.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  /* ── Tema ─────────────────────────────────────────────────────────────── */
  var themeBtn = $('#themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ta-theme', next); } catch (e) {}
    });
  }

  /* ── Nav ──────────────────────────────────────────────────────────────── */
  var nav = $('#nav');
  var onScroll = function () { nav.classList.toggle('stuck', scrollY > 12); };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  var navToggle = $('#navToggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    $$('#navLinks a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  $('#year').textContent = new Date().getFullYear();

  /* ── Scroll suave ─────────────────────────────────────────────────────── */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (hasGSAP && window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
  }

  // Los anclajes se manejan a mano para descontar la altura de la barra fija;
  // si no, el título de cada sección queda escondido detrás de ella.
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var y = el.getBoundingClientRect().top + scrollY - 78;
      if (lenis) lenis.scrollTo(y, { duration: 1.2 });
      else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ══ RED DE NODOS ═════════════════════════════════════════════════════ */
  /* Puntos que derivan y se unen con una línea cuando están cerca. Se dibuja
     en canvas porque son cientos de segmentos recalculados cada frame.
     Tres cosas lo mantienen barato: la densidad se calcula por área (una
     pantalla grande no multiplica el coste sin tope), el bucle se detiene
     cuando el hero sale de pantalla, y no se dibuja nada si el visitante
     pidió movimiento reducido. */
  var canvas = document.getElementById('net');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d', { alpha: true });
    var hero = canvas.parentElement;
    var pts = [];
    var w = 0, h = 0, dpr = 1;
    var LINK = 132;      // distancia máxima para unir dos puntos
    var running = true;
    var raf2 = null;

    function palette() {
      var light = document.documentElement.getAttribute('data-theme') === 'light';
      return light ? { r: 98, g: 24, b: 224 } : { r: 155, g: 110, b: 255 };
    }
    var col = palette();

    function resize() {
      var r = hero.getBoundingClientRect();
      // El DPR se limita a 2: por encima se triplican los píxeles a pintar
      // sin diferencia visible en una animación tan sutil.
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var target = Math.min(Math.round((w * h) / 15000), 110);
      pts = [];
      for (var i = 0; i < target; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.5 + 0.8,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var rgb = col.r + ',' + col.g + ',' + col.b;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        // Rebote en los bordes: mantiene la nube encuadrada sin teletransportes.
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          // La línea se desvanece con la distancia: sin esto aparecerían y
          // desaparecerían de golpe al cruzar el umbral.
          var a = (1 - Math.sqrt(d2) / LINK) * 0.42;
          ctx.strokeStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(' + rgb + ',.72)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running) raf2 = requestAnimationFrame(draw);
    }

    resize();
    draw();

    var rt;
    addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 180);
    }, { passive: true });

    // Fuera de pantalla no hay nada que mirar: parar el bucle libera CPU y
    // batería mientras el visitante lee el resto de la página.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        if (vis && !running) { running = true; draw(); }
        else if (!vis && running) { running = false; cancelAnimationFrame(raf2); }
      }, { threshold: 0 }).observe(hero);
    }

    // El color de los nodos sigue al tema.
    new MutationObserver(function () { col = palette(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ── Animaciones ──────────────────────────────────────────────────────── */
  if (hasGSAP && !reduce) {
    gsap.registerPlugin(ScrollTrigger);

    // Titular: cada palabra sube desde debajo de su propia máscara.
    var h1 = $('[data-split]');
    if (h1) {
      var html = h1.innerHTML.split(/(<[^>]+>)/).map(function (chunk) {
        if (chunk.charAt(0) === '<') return chunk;
        return chunk.replace(/(\S+)/g, '<span class="w"><span>$1</span></span>');
      }).join('');
      h1.innerHTML = html;
      gsap.from(h1.querySelectorAll('.w > span'), {
        yPercent: 118, duration: 1.15, ease: 'power4.out', stagger: 0.055, delay: 0.12,
      });
    }

    gsap.from('.badge',       { opacity: 0, y: 16, duration: .9, ease: 'power3.out' });
    gsap.from('.hero .lead',  { opacity: 0, y: 22, duration: .9, ease: 'power3.out', delay: .45 });
    gsap.from('.hero-cta',    { opacity: 0, y: 22, duration: .9, ease: 'power3.out', delay: .58 });
    gsap.from('.wedge',       { opacity: 0, xPercent: 18, duration: 1.5, ease: 'power3.out' });
    gsap.from('.wedge-2',     { opacity: 0, xPercent: -18, duration: 1.5, ease: 'power3.out', delay: .15 });
    gsap.from('.hero-stats > .wrap > div', { opacity: 0, y: 26, duration: .9, ease: 'power3.out', stagger: .09, delay: .75 });
    gsap.set(['.hero .lead', '.hero-cta'], { clearProps: 'opacity,transform', delay: 1.7 });

    // Reveal al entrar en pantalla. batch() agrupa lo que aparece a la vez, de
    // modo que un grid de tarjetas entra escalonado y no de golpe.
    ScrollTrigger.batch('.rv', {
      start: 'top 88%',
      once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .085, overwrite: true });
      },
    });

    // Parallax del fondo del hero y de los dispositivos del caso de estudio.
    $$('[data-par]').forEach(function (el) {
      gsap.to(el, {
        yPercent: parseFloat(el.dataset.par) * -100,
        ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    });

    var devices = $('[data-devices]');
    if (devices) {
      gsap.from(devices.querySelectorAll('.dev'), {
        opacity: 0, y: 70, rotateX: 12, duration: 1.15, ease: 'power3.out', stagger: .13,
        scrollTrigger: { trigger: devices, start: 'top 82%', once: true },
      });
    }

    // Contadores del hero.
    $$('[data-count]').forEach(function (el) {
      var to = parseFloat(el.dataset.count);
      var sfx = el.dataset.suffix || '';
      var o = { v: 0 };
      gsap.to(o, {
        v: to, duration: 1.9, ease: 'power2.out', delay: .8,
        onUpdate: function () { el.textContent = Math.round(o.v) + sfx; },
      });
    });
  } else {
    // Sin GSAP el contenido debe verse igual: se retira el estado inicial.
    document.documentElement.classList.remove('js-on');
  }

  // Foco de luz que sigue al cursor dentro de las tarjetas.
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('[data-spot]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ══ CALCULADORA ══════════════════════════════════════════════════════ */
  var wiz = $('#wizard');
  if (wiz) {
    var step = 1;
    var TOTAL = 4;
    var TITLES = ['Tipo de proyecto', 'Funcionalidades', 'Integraciones', 'Tu estimación'];
    var pick = { tipo: null, funcs: [], integra: [] };

    var bar = $('#wizBar'), numEl = $('#wizNum'), titleEl = $('#wizTitle');
    var backBtn = $('#wizBack'), nextBtn = $('#wizNext');

    function render() {
      $$('.wiz-pane', wiz).forEach(function (p) { p.classList.toggle('on', +p.dataset.pane === step); });
      bar.style.width = (step / TOTAL * 100) + '%';
      numEl.textContent = step;
      titleEl.textContent = TITLES[step - 1];
      backBtn.disabled = step === 1;
      nextBtn.style.display = step === TOTAL ? 'none' : '';
      // El paso 1 es de elección única y obligatoria; los demás pueden saltarse.
      nextBtn.disabled = step === 1 && !pick.tipo;
      if (step === TOTAL) estimate();
    }

    $$('.opts', wiz).forEach(function (group) {
      var key = group.dataset.group;
      var single = group.dataset.mode === 'one';
      $$('.opt', group).forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (single) {
            $$('.opt', group).forEach(function (o) { o.classList.remove('on'); });
            opt.classList.add('on');
            pick[key] = { val: opt.dataset.val, base: +opt.dataset.base, label: opt.dataset.label };
            nextBtn.disabled = false;
          } else {
            opt.classList.toggle('on');
            pick[key] = $$('.opt.on', group).map(function (o) {
              return { val: o.dataset.val, add: +o.dataset.add, label: o.dataset.label };
            });
          }
        });
      });
    });

    function estimate() {
      if (!pick.tipo) return;
      var base = pick.tipo.base;
      var extras = 0;
      pick.funcs.forEach(function (f) { extras += f.add; });
      pick.integra.forEach(function (i) { extras += i.add; });

      var mid = base + extras;
      // Se muestra una horquilla, no una cifra cerrada: el alcance real solo se
      // conoce tras hablar, y un número exacto aquí sería una promesa falsa.
      var low = Math.round(mid * 0.85 / 50) * 50;
      var high = Math.round(mid * 1.3 / 50) * 50;

      var amountEl = $('#wizAmount');
      if (hasGSAP && !reduce) {
        var o = { a: 0, b: 0 };
        gsap.to(o, {
          a: low, b: high, duration: 1, ease: 'power2.out',
          onUpdate: function () { amountEl.textContent = EUR.format(Math.round(o.a)) + ' – ' + EUR.format(Math.round(o.b)); },
        });
      } else {
        amountEl.textContent = EUR.format(low) + ' – ' + EUR.format(high);
      }

      var wantsMaint = pick.integra.some(function (i) { return i.val === 'mant'; });
      $('#wizMonthly').textContent = wantsMaint
        ? 'Más mantenimiento mensual desde 150 €/mes.'
        : 'Precio orientativo. La propuesta final se cierra tras hablar.';

      var chips = [pick.tipo.label]
        .concat(pick.funcs.map(function (f) { return f.label; }))
        .concat(pick.integra.map(function (i) { return i.label; }));
      $('#wizRecap').innerHTML = chips.map(function (c) {
        return '<span class="chip">' + c.replace(/[<>&]/g, '') + '</span>';
      }).join('');

      wiz.dataset.low = low;
      wiz.dataset.high = high;
    }

    nextBtn.addEventListener('click', function () { if (step < TOTAL) { step++; render(); } });
    backBtn.addEventListener('click', function () { if (step > 1) { step--; render(); } });
    render();

    /* Envío del lead */
    var leadForm = $('#leadForm');
    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('#leadBtn'), msg = $('#leadMsg');
      var nombre = $('#lName').value.trim();
      var email = $('#lEmail').value.trim();

      if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.className = 'msg err on';
        msg.textContent = 'Revisa tu nombre y tu correo.';
        return;
      }

      btn.disabled = true;
      msg.className = 'msg';
      var original = btn.innerHTML;
      btn.textContent = 'Enviando…';

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre,
          email: email,
          nota: $('#lNote').value.trim(),
          tipo: pick.tipo ? pick.tipo.label : '',
          funcionalidades: pick.funcs.map(function (f) { return f.label; }),
          integraciones: pick.integra.map(function (i) { return i.label; }),
          rango_min: +wiz.dataset.low || null,
          rango_max: +wiz.dataset.high || null,
        }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || 'error');
          msg.className = 'msg ok on';
          msg.textContent = '¡Recibido! Te escribo a ' + email + ' con la propuesta detallada.';
          leadForm.reset();
          btn.innerHTML = original;
        })
        .catch(function () {
          msg.className = 'msg err on';
          msg.textContent = 'No se pudo enviar. Escríbeme directamente y lo vemos.';
          btn.disabled = false;
          btn.innerHTML = original;
        });
    });
  }

  /* ══ AGENDA ═══════════════════════════════════════════════════════════ */
  var calGrid = $('#calGrid');
  if (calGrid) {
    var SLOTS = ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var chosenDay = null, chosenSlot = null;

    var bookBtn = $('#bookBtn'), bookWhen = $('#bookWhen span');

    function drawMonth() {
      $('#calMonth').textContent = view.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      $('#calPrev').disabled = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();

      var html = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
        .map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('');

      // getDay() da 0 para domingo; aquí la semana empieza en lunes.
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var offset = (first.getDay() + 6) % 7;
      for (var i = 0; i < offset; i++) html += '<div></div>';

      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= days; d++) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        var dow = date.getDay();
        // Solo días futuros y entre semana: es cuando puede atender.
        var ok = date > today && dow !== 0 && dow !== 6;
        var isToday = date.getTime() === today.getTime();
        var sel = chosenDay && date.getTime() === chosenDay.getTime();
        html += '<button type="button" class="cal-day' + (sel ? ' on' : '') + (isToday ? ' today' : '') + '"'
              + (ok ? '' : ' disabled') + ' data-d="' + date.toISOString() + '"'
              + ' aria-label="' + date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + '">'
              + d + '</button>';
      }
      calGrid.innerHTML = html;
    }

    function drawSlots() {
      if (!chosenDay) { $('#calSlots').innerHTML = ''; return; }
      $('#calSlots').innerHTML = SLOTS.map(function (s) {
        return '<button type="button" class="slot' + (chosenSlot === s ? ' on' : '') + '" data-s="' + s + '">' + s + '</button>';
      }).join('');
    }

    function sync() {
      var ready = !!(chosenDay && chosenSlot);
      bookBtn.disabled = !ready;
      bookWhen.textContent = ready
        ? chosenDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ' a las ' + chosenSlot
        : 'Elige un día y una hora en el calendario';
    }

    calGrid.addEventListener('click', function (e) {
      var b = e.target.closest('.cal-day');
      if (!b || b.disabled) return;
      chosenDay = new Date(b.dataset.d);
      chosenSlot = null;
      drawMonth(); drawSlots(); sync();
    });

    $('#calSlots').addEventListener('click', function (e) {
      var b = e.target.closest('.slot');
      if (!b) return;
      chosenSlot = b.dataset.s;
      drawSlots(); sync();
    });

    $('#calPrev').addEventListener('click', function () { view.setMonth(view.getMonth() - 1); drawMonth(); });
    $('#calNext').addEventListener('click', function () { view.setMonth(view.getMonth() + 1); drawMonth(); });

    drawMonth(); sync();

    $('#bookForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('#bookMsg');
      var nombre = $('#bName').value.trim();
      var email = $('#bEmail').value.trim();

      if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.className = 'msg err on';
        msg.textContent = 'Revisa tu nombre y tu correo.';
        return;
      }
      if (!chosenDay || !chosenSlot) return;

      bookBtn.disabled = true;
      msg.className = 'msg';
      var original = bookBtn.innerHTML;
      bookBtn.textContent = 'Confirmando…';

      fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre,
          email: email,
          nota: $('#bNote').value.trim(),
          fecha: chosenDay.toISOString().slice(0, 10),
          hora: chosenSlot,
          zona: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || 'error');
          msg.className = 'msg ok on';
          msg.textContent = '¡Reunión confirmada! Te llega la confirmación a ' + email + '.';
          $('#bookForm').reset();
          bookBtn.innerHTML = original;
        })
        .catch(function () {
          msg.className = 'msg err on';
          msg.textContent = 'No se pudo confirmar. Vuelve a intentarlo en un momento.';
          bookBtn.disabled = false;
          bookBtn.innerHTML = original;
        });
    });
  }

  /* ══ CHAT ═════════════════════════════════════════════════════════════ */
  var fab = $('#chatFab'), panel = $('#chat'), log = $('#chatLog');
  if (fab && panel) {
    var history = [];
    var busy = false;

    fab.addEventListener('click', function () {
      var open = panel.classList.toggle('on');
      fab.classList.toggle('on', open);
      fab.setAttribute('aria-expanded', String(open));
      fab.setAttribute('aria-label', open ? 'Cerrar el asistente' : 'Abrir el asistente de TA Labs');
      if (open) setTimeout(function () { $('#chatInput').focus(); }, 380);
    });

    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('on')) fab.click();
    });

    function bubble(text, who) {
      var b = document.createElement('div');
      b.className = 'bub ' + who;
      b.textContent = text;
      log.appendChild(b);
      log.scrollTop = log.scrollHeight;
      return b;
    }

    function ask(text) {
      if (busy || !text) return;
      busy = true;
      $('#chatSend').disabled = true;
      $('#chatSug').style.display = 'none';

      bubble(text, 'me');
      history.push({ role: 'user', content: text });

      var wait = document.createElement('div');
      wait.className = 'bub ai typing';
      wait.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(wait);
      log.scrollTop = log.scrollHeight;

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          wait.remove();
          if (!res.ok || !res.d.reply) throw new Error('sin respuesta');
          bubble(res.d.reply, 'ai');
          history.push({ role: 'assistant', content: res.d.reply });
        })
        .catch(function () {
          wait.remove();
          // Sin backend el chat no inventa: deriva a los caminos que sí existen.
          bubble('Ahora mismo no puedo responder. Puedes agendar una llamada en la sección Agenda o pedir tu propuesta en la calculadora — te respondo personalmente.', 'ai');
        })
        .then(function () {
          busy = false;
          $('#chatSend').disabled = false;
        });
    }

    $('#chatForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#chatInput');
      var v = input.value.trim();
      if (!v) return;
      input.value = '';
      ask(v);
    });

    $$('#chatSug button').forEach(function (b) {
      b.addEventListener('click', function () { ask(b.textContent); });
    });
  }
})();
