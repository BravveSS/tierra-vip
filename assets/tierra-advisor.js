/* ============================================================================
   TIERRA — Asesor de ventas guiado (PC + móvil)
   Chat inteligente por pasos: califica el lead (qué busca, zona, tiempo),
   toma sus datos y los envía por email (Web3Forms) + ofrece WhatsApp.
   Sin backend. Bilingüe ES/EN. Se auto-inyecta en la página.
   ========================================================================== */
(function () {
  'use strict';

  var WA = 'https://wa.me/529581087977';

  function isEN() { return window.__LANG === 'en' || document.documentElement.getAttribute('lang') === 'en'; }
  function t(es, en) { return isEN() ? en : es; }

  // Estado del lead que vamos armando en la conversación
  var lead = { busca: '', proyecto: '', tiempo: '', name: '', phone: '', email: '' };
  var els = {};

  /* ---------- Construcción del widget ---------- */
  function build() {
    if (document.getElementById('tadv-fab')) return;

    var fab = document.createElement('button');
    fab.id = 'tadv-fab';
    fab.setAttribute('aria-label', t('Abrir asesor de ventas', 'Open sales advisor'));
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 2 8.38 8.38 0 0 1 21 10.5z"/></svg>' +
      '<span class="tadv-fab-dot"></span>';

    var panel = document.createElement('div');
    panel.id = 'tadv-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t('Asesor de ventas Tierra', 'Tierra sales advisor'));
    panel.innerHTML =
      '<div class="tadv-hd">' +
        '<div class="tadv-av">🌿</div>' +
        '<div class="tadv-hd-txt"><div class="tadv-name">' + t('Asesor Tierra', 'Tierra Advisor') + '</div>' +
        '<div class="tadv-status"><span class="tadv-dot"></span>' + t('En línea · responde al instante', 'Online · instant reply') + '</div></div>' +
        '<button class="tadv-x" aria-label="' + t('Cerrar', 'Close') + '">✕</button>' +
      '</div>' +
      '<div class="tadv-body" id="tadv-body" aria-live="polite"></div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    els.fab = fab; els.panel = panel;
    els.body = panel.querySelector('#tadv-body');

    fab.addEventListener('click', toggle);
    panel.querySelector('.tadv-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  var opened = false, started = false;
  function toggle() { opened ? close() : open(); }
  function open() {
    opened = true;
    els.panel.classList.add('open');
    els.fab.classList.add('active');
    document.body.classList.add('tadv-open');
    if (!started) { started = true; startFlow(); }
  }
  function close() {
    opened = false;
    els.panel.classList.remove('open');
    els.fab.classList.remove('active');
    document.body.classList.remove('tadv-open');
  }

  /* ---------- Helpers de UI del chat ---------- */
  function scroll() { els.body.scrollTop = els.body.scrollHeight; }

  function botSay(html, cb) {
    var typing = document.createElement('div');
    typing.className = 'tadv-msg bot tadv-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    els.body.appendChild(typing); scroll();
    setTimeout(function () {
      typing.remove();
      var m = document.createElement('div');
      m.className = 'tadv-msg bot';
      m.innerHTML = html;
      els.body.appendChild(m); scroll();
      if (cb) cb();
    }, 520);
  }

  function userSay(text) {
    var m = document.createElement('div');
    m.className = 'tadv-msg user';
    m.textContent = text;
    els.body.appendChild(m); scroll();
  }

  function options(opts, onPick) {
    var wrap = document.createElement('div');
    wrap.className = 'tadv-opts';
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'tadv-opt';
      b.textContent = o.label;
      b.addEventListener('click', function () {
        userSay(o.label);
        wrap.remove();
        onPick(o);
      });
      wrap.appendChild(b);
    });
    els.body.appendChild(wrap); scroll();
  }

  /* ---------- El flujo de la conversación ---------- */
  function startFlow() {
    botSay(t('¡Hola! 🌿 Soy tu asesor de Tierra Desarrollos. En un minuto te ayudo a encontrar tu lugar en la Costa de Oaxaca.',
             'Hi! 🌿 I\'m your Tierra Desarrollos advisor. In a minute I\'ll help you find your place on the Oaxaca Coast.'), function () {
      botSay(t('¿Qué estás buscando?', 'What are you looking for?'), function () {
        options([
          { v: 'Terreno / lote', label: t('🏝️ Un terreno / lote', '🏝️ Land / a lot') },
          { v: 'Construir mi casa', label: t('🏠 Construir mi casa', '🏠 Build my home') },
          { v: 'Invertir', label: t('📈 Invertir', '📈 Invest') },
          { v: 'ai', label: t('✍️ Tengo una pregunta', '✍️ I have a question') }
        ], function (o) {
          if (o.v === 'ai') { aiMode(); return; }
          lead.busca = o.v; askProject();
        });
      });
    });
  }

  /* ---------- Modo IA real (Netlify Function + Claude) ----------
     AI_ENABLED: poner en true cuando el backend esté desplegado en Netlify
     con la variable ANTHROPIC_API_KEY configurada. Mientras esté en false,
     el chat muestra un aviso de mantenimiento elegante y sigue captando
     leads por WhatsApp y el recorrido guiado. */
  var AI_ENABLED = false;
  var AI_ENDPOINT = '/.netlify/functions/chat';
  var aiHistory = [];
  var aiTurns = 0;

  function aiMode() {
    if (!AI_ENABLED) { aiMaintenance(); return; }
    botSay(t('¡Claro! Escribime tu pregunta y te respondo al instante. 👇',
             'Sure! Type your question and I\'ll answer right away. 👇'), showAiInput);
  }

  function aiMaintenance() {
    botSay(t('Nuestro asistente inteligente está en mantenimiento por unas horas 🔧 Pero no te quedás sin respuesta: un asesor humano te contesta al instante por WhatsApp.',
             'Our smart assistant is under maintenance for a few hours 🔧 But you\'re not left hanging: a human advisor replies instantly on WhatsApp.'), function () {
      var cta = document.createElement('a');
      cta.className = 'tadv-wa-cta';
      cta.href = WA + '?text=' + encodeURIComponent(t('Hola, tengo una pregunta sobre los proyectos de Tierra.', 'Hi, I have a question about Tierra\'s projects.'));
      cta.target = '_blank'; cta.rel = 'noopener';
      cta.textContent = t('Preguntar por WhatsApp', 'Ask on WhatsApp');
      els.body.appendChild(cta); scroll();
      botSay(t('O te ayudo yo con el recorrido guiado — en 1 minuto encontramos tu proyecto ideal:', 'Or I can help you with the guided tour — we\'ll find your ideal project in 1 minute:'), function () {
        options([
          { v: 'g', label: t('🌿 Recorrido guiado', '🌿 Guided tour') },
          { v: 'd', label: t('📝 Dejar mis datos', '📝 Leave my details') }
        ], function (o) {
          if (o.v === 'g') { botSay(t('¿Qué estás buscando?', 'What are you looking for?'), function () {
            options([
              { v: 'Terreno / lote', label: t('🏝️ Un terreno / lote', '🏝️ Land / a lot') },
              { v: 'Construir mi casa', label: t('🏠 Construir mi casa', '🏠 Build my home') },
              { v: 'Invertir', label: t('📈 Invertir', '📈 Invest') }
            ], function (x) { lead.busca = x.v; askProject(); });
          }); }
          else { lead.busca = 'Chat'; lead.proyecto = 'No sé aún'; lead.tiempo = 'Explorando opciones'; askData(); }
        });
      });
    });
  }

  function showAiInput() {
    var old = els.body.querySelector('.tadv-ai'); if (old) old.remove();
    var f = document.createElement('form');
    f.className = 'tadv-form tadv-ai';
    f.innerHTML =
      '<input name="q" type="text" autocomplete="off" placeholder="' + t('Tu pregunta…', 'Your question…') + '">' +
      '<button type="submit" aria-label="' + t('Enviar', 'Send') + '">→</button>';
    els.body.appendChild(f); scroll();
    f.q.focus();

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = f.q.value.trim();
      if (!q) return;
      f.remove();
      userSay(q);
      aiHistory.push({ role: 'user', content: q });
      aiTurns++;

      var typing = document.createElement('div');
      typing.className = 'tadv-msg bot tadv-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      els.body.appendChild(typing); scroll();

      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

      fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: aiHistory }),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (d) {
          typing.remove();
          if (!d.reply) throw new Error('empty');
          aiHistory.push({ role: 'assistant', content: d.reply });
          var m = document.createElement('div');
          m.className = 'tadv-msg bot';
          m.textContent = d.reply;
          els.body.appendChild(m); scroll();
          if (aiTurns >= 4) nudgeContact(); else showAiInput();
        })
        .catch(function () {
          clearTimeout(to); typing.remove();
          aiFallback(q);
        });
    });
  }

  function nudgeContact() {
    botSay(t('¿Te gustaría que un asesor humano te contacte con precios y disponibilidad? 🌿',
             'Would you like a human advisor to reach out with prices and availability? 🌿'), function () {
      options([
        { v: 'datos', label: t('📝 Sí, dejar mis datos', '📝 Yes, leave my details') },
        { v: 'seguir', label: t('✍️ Seguir preguntando', '✍️ Keep asking') }
      ], function (o) {
        if (o.v === 'datos') { lead.busca = lead.busca || 'Chat IA'; lead.proyecto = lead.proyecto || 'No sé aún'; lead.tiempo = lead.tiempo || 'Explorando opciones'; askData(); }
        else { aiTurns = 0; showAiInput(); }
      });
    });
  }

  function aiFallback(q) {
    botSay(t('Justo ahora no puedo responder eso en línea 🙈 pero un asesor humano sí. Te dejo el enlace directo:',
             'I can\'t answer that online right now 🙈 but a human advisor can. Here\'s the direct link:'), function () {
      var cta = document.createElement('a');
      cta.className = 'tadv-wa-cta';
      cta.href = WA + '?text=' + encodeURIComponent(t('Hola, tengo una pregunta: ', 'Hi, I have a question: ') + q);
      cta.target = '_blank'; cta.rel = 'noopener';
      cta.textContent = t('Preguntar por WhatsApp', 'Ask on WhatsApp');
      els.body.appendChild(cta); scroll();
      botSay(t('O si preferís, te ayudo con el recorrido guiado:', 'Or if you prefer, I can guide you:'), function () {
        options([
          { v: 'g', label: t('🌿 Recorrido guiado', '🌿 Guided tour') },
          { v: 'd', label: t('📝 Dejar mis datos', '📝 Leave my details') }
        ], function (o) {
          if (o.v === 'g') { botSay(t('¿Qué estás buscando?', 'What are you looking for?'), function () {
            options([
              { v: 'Terreno / lote', label: t('🏝️ Un terreno / lote', '🏝️ Land / a lot') },
              { v: 'Construir mi casa', label: t('🏠 Construir mi casa', '🏠 Build my home') },
              { v: 'Invertir', label: t('📈 Invertir', '📈 Invest') }
            ], function (x) { lead.busca = x.v; askProject(); });
          }); }
          else { lead.busca = 'Chat'; lead.proyecto = 'No sé aún'; lead.tiempo = 'Explorando opciones'; askData(); }
        });
      });
    });
  }

  function askProject() {
    botSay(t('¡Buenísimo! ¿Qué zona o proyecto te llama más?', 'Great! Which area or project draws you most?'), function () {
      options([
        { v: 'Azimut', label: t('Azimut · Mazunte', 'Azimut · Mazunte') },
        { v: 'Nabani', label: t('Nabani · frente al mar', 'Nabani · oceanfront') },
        { v: 'Aldea Tao', label: t('Aldea Tao · acantilado', 'Aldea Tao · clifftop') },
        { v: 'Depas Kora', label: t('Depas Kora · Puerto Ángel', 'Depas Kora · Puerto Ángel') },
        { v: 'No sé aún', label: t('Ayúdame a elegir', 'Help me choose') }
      ], function (o) { lead.proyecto = o.v; askTime(); });
    });
  }

  function askTime() {
    botSay(t('Perfecto. ¿Para cuándo te gustaría avanzar?', 'Perfect. When would you like to move forward?'), function () {
      options([
        { v: 'Lo antes posible', label: t('🔥 Lo antes posible', '🔥 As soon as possible') },
        { v: 'En 1–3 meses', label: t('🗓️ En 1–3 meses', '🗓️ In 1–3 months') },
        { v: 'Explorando opciones', label: t('🌱 Explorando opciones', '🌱 Exploring options') }
      ], function (o) { lead.tiempo = o.v; askData(); });
    });
  }

  function askData() {
    botSay(t('Genial. Dejame tus datos y un asesor humano te contacta con disponibilidad y precios — sin compromiso.',
             'Great. Leave me your details and a human advisor will reach out with availability and prices — no strings attached.'), function () {
      showForm();
    });
  }

  function showForm() {
    var f = document.createElement('form');
    f.className = 'tadv-form';
    f.innerHTML =
      '<input name="name" type="text" required autocomplete="name" placeholder="' + t('Tu nombre', 'Your name') + '">' +
      '<input name="phone" type="tel" required autocomplete="tel" placeholder="' + t('WhatsApp / Teléfono', 'WhatsApp / Phone') + '">' +
      '<input name="email" type="email" required autocomplete="email" placeholder="' + t('Tu correo', 'Your email') + '">' +
      '<button type="submit">' + t('Quiero que me contacten', 'Have someone contact me') + '</button>' +
      '<p class="tadv-status-msg" role="status"></p>';
    els.body.appendChild(f); scroll();
    f.querySelector('input').focus();

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.name.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim();
      var st = f.querySelector('.tadv-status-msg');
      if (!name) { f.name.focus(); return; }
      if (phone.replace(/\D/g, '').length < 7) { st.textContent = t('Dejanos un teléfono válido.', 'Please leave a valid phone.'); f.phone.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { st.textContent = t('Revisá tu correo.', 'Check your email.'); f.email.focus(); return; }
      lead.name = name; lead.phone = phone; lead.email = email;

      var btn = f.querySelector('button'); btn.disabled = true; btn.textContent = t('Enviando…', 'Sending…');

      var resumen = t('Busca: ', 'Looking for: ') + lead.busca +
                    ' · ' + t('Proyecto: ', 'Project: ') + lead.proyecto +
                    ' · ' + t('Tiempo: ', 'Timeline: ') + lead.tiempo;

      var send = (window.TierraForms && window.TierraForms.sendLead)
        ? window.TierraForms.sendLead({
            origen: 'Asesor guiado (chat)',
            name: name, phone: phone, email: email,
            proyecto: lead.proyecto, mensaje: resumen
          })
        : Promise.resolve({ success: false });

      send.then(function () {
        f.remove();
        botSay(t('¡Gracias, ' + name.split(' ')[0] + '! ✅ Tu info ya llegó a nuestro equipo. Te contactamos muy pronto.',
                 'Thank you, ' + name.split(' ')[0] + '! ✅ Your info reached our team. We\'ll be in touch very soon.'), function () {
          var waMsg = t('Hola, soy ' + name + '. Me interesa ' + lead.proyecto + ' (' + lead.busca + '). Vengo del asesor de tierra.vip 🌿',
                        'Hi, I\'m ' + name + '. I\'m interested in ' + lead.proyecto + ' (' + lead.busca + '). Coming from the tierra.vip advisor 🌿');
          var cta = document.createElement('a');
          cta.className = 'tadv-wa-cta';
          cta.href = WA + '?text=' + encodeURIComponent(waMsg);
          cta.target = '_blank'; cta.rel = 'noopener';
          cta.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35z"/></svg>' +
            t('Continuar por WhatsApp', 'Continue on WhatsApp');
          els.body.appendChild(cta); scroll();
        });
      });
    });
  }

  /* ---------- Exit-intent (solo desktop) ----------
     Cuando el mouse sale por arriba (va a cerrar la pestaña), el asesor
     se abre UNA vez con una oferta de último momento. Se recuerda por
     3 días para no molestar. */
  function exitIntent() {
    if (window.innerWidth <= 1024) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var KEY = 'tierra-exit';
    try { if (Date.now() - (+localStorage.getItem(KEY) || 0) < 3 * 864e5) return; } catch (_) {}

    var fired = false;
    function onOut(e) {
      if (fired || opened || started) { cleanup(); return; }
      if (e.clientY > 8 || e.relatedTarget) return;
      fired = true; cleanup();
      try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {}
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'exit_intent_shown', { event_category: 'engagement' });
      }
      open(); started = true;                       // flujo propio, no el normal
      botSay(t('¡Espera! 🌿 Antes de irte: dejame tu WhatsApp y te mando disponibilidad y precios de los proyectos — sin compromiso.',
               'Wait! 🌿 Before you go: leave your WhatsApp and I\'ll send you availability and prices — no strings attached.'), function () {
        options([
          { v: 'd', label: t('📝 Sí, quiero la info', '📝 Yes, send me the info') },
          { v: 'w', label: t('💬 Mejor por WhatsApp', '💬 WhatsApp me instead') },
          { v: 'n', label: t('Ahora no, gracias', 'Not now, thanks') }
        ], function (o) {
          if (o.v === 'd') { lead.busca = 'Exit intent'; lead.proyecto = 'No sé aún'; lead.tiempo = 'Explorando opciones'; askData(); }
          else if (o.v === 'w') {
            var cta = document.createElement('a');
            cta.className = 'tadv-wa-cta';
            cta.href = WA + '?text=' + encodeURIComponent(t('Hola, me interesa recibir disponibilidad y precios de los proyectos de Tierra.', 'Hi, I\'d like availability and prices for Tierra\'s projects.'));
            cta.target = '_blank'; cta.rel = 'noopener';
            cta.textContent = t('Abrir WhatsApp', 'Open WhatsApp');
            els.body.appendChild(cta); scroll();
          }
          else { botSay(t('¡Sin problema! Aquí me quedo por si me necesitas. 🌿', 'No problem! I\'ll be right here if you need me. 🌿'), close ? function () { setTimeout(close, 1200); } : null); }
        });
      });
    }
    function cleanup() { document.removeEventListener('mouseout', onOut); }
    document.addEventListener('mouseout', onOut);
  }

  /* ---------- Init ---------- */
  function init() {
    // Ocultar el asesor simulado viejo si existe (evita duplicados)
    ['ai-fab', 'ai-panel'].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = 'none'; });
    build();
    exitIntent();
    // re-traducir etiquetas fijas si cambia idioma antes de abrir
    new MutationObserver(function () {
      if (!started && els.name) { /* labels se recalculan al abrir */ }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
