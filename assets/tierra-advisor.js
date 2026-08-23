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
 '<div class="tadv-av">T</div>' +
 '<div class="tadv-hd-txt"><div class="tadv-name">' + t('Asesor Tierra', 'Tierra Advisor') + '</div>' +
 '<div class="tadv-status"><span class="tadv-dot"></span>' + t('Costa de Oaxaca · Atención por WhatsApp', 'Oaxaca Coast · WhatsApp support') + '</div></div>' +
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

 /* La IA responde en markdown ligero: negritas para los números de lote y
    enlaces a las guías. Sin esto se leerían los asteriscos en crudo y las
    URLs no serían clicables. Se escapa TODO primero y solo después se
    permiten <strong>, <br> y <a> generados aquí — nunca HTML del modelo. */
 function richText(txt) {
 var s = String(txt)
 .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
 s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
 s = s.replace(/(^|[\s(])(tierra\.vip\/[a-z0-9\-\/]*)/gi, function (_m, pre, url) {
 return pre + '<a href="https://' + url + '" target="_blank" rel="noopener">' + url + '</a>';
 });
 return s.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
 }

 /* Handoff: cuando la IA ya calificó al visitante, le entrega SU PROPIO mensaje
    ya redactado (en primera persona, con todo lo que contó) para que se lo envíe
    al equipo por WhatsApp. Es editable: si quiere ajustar algo, el enlace toma
    el texto en el momento del clic. */
 function handoff(resumen) {
 var box = document.createElement('div');
 box.className = 'tadv-handoff';

 var lbl = document.createElement('div');
 lbl.className = 'tadv-handoff-lbl';
 lbl.textContent = t('Tu mensaje para el equipo', 'Your message to the team');

 var ta = document.createElement('textarea');
 ta.className = 'tadv-handoff-txt';
 ta.rows = 3;
 ta.value = resumen;
 ta.setAttribute('aria-label', t('Mensaje para el equipo de Tierra', 'Message to the Tierra team'));
 // se ajusta al contenido para que se lea completo sin scroll interno
 function fit() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 340) + 'px'; }
 ta.addEventListener('input', fit);

 var cta = document.createElement('a');
 cta.className = 'tadv-wa-cta';
 cta.target = '_blank'; cta.rel = 'noopener';
 cta.href = WA + '?text=' + encodeURIComponent(resumen);
 cta.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35z"/></svg>' +
 t('Enviarlo por WhatsApp', 'Send it on WhatsApp');

 // el texto puede haber cambiado: se relee justo antes de abrir WhatsApp
 cta.addEventListener('click', function () {
 var v = ta.value.trim();
 cta.href = WA + (v ? '?text=' + encodeURIComponent(v) : '');
 if (typeof window.gtag === 'function') {
 window.gtag('event', 'advisor_handoff_whatsapp', { event_category: 'lead' });
 }
 });

 var nota = document.createElement('p');
 nota.className = 'tadv-handoff-nota';
 nota.textContent = t('Puedes editarlo antes de enviarlo.', 'You can edit it before sending.');

 box.appendChild(lbl); box.appendChild(ta); box.appendChild(cta); box.appendChild(nota);
 els.body.appendChild(box);
 fit();          // solo mide bien ya dentro del DOM
 scroll();
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

 /* ---------- El flujo de la conversación ----------
 El recorrido guiado funciona siempre (no depende de la IA): califica al
 prospecto, capta sus datos y ofrece WhatsApp. MAINTENANCE solo se pone en
 true si hiciera falta apagar el chat por completo. */
 var MAINTENANCE = false;

 function startFlow() {
 if (MAINTENANCE) { maintenanceFlow(); return; }
 aiMode();
 }

 /* ---------- Aviso de mantenimiento (formal, sin jerga técnica) ---------- */
 function maintenanceFlow() {
 botSay(t('Bienvenido a Tierra Desarrollos. Nuestro asistente virtual se encuentra temporalmente en mantenimiento.',
 'Welcome to Tierra Desarrollos. Our virtual assistant is temporarily under maintenance.'), function () {
 botSay(t('Mientras tanto, un asesor puede atenderte personalmente por WhatsApp — respuesta inmediata en horario de atención.',
 'Meanwhile, an advisor can assist you personally on WhatsApp — immediate reply during business hours.'), function () {
 var cta = document.createElement('a');
 cta.className = 'tadv-wa-cta';
 cta.href = WA + '?text=' + encodeURIComponent(t('Hola, quiero recibir información sobre los proyectos de Tierra.', 'Hi, I\'d like information about Tierra\'s projects.'));
 cta.target = '_blank'; cta.rel = 'noopener';
 cta.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35z"/></svg>' +
 t('Escribir por WhatsApp', 'Message on WhatsApp');
 els.body.appendChild(cta); scroll();
 });
 });
 }

 /* ---------- Modo IA real (Edge Function de Supabase + Claude) ----------
 Si la función todavía no está desplegada o falta la ANTHROPIC_API_KEY,
 la petición falla y aiFallback() deriva al visitante a WhatsApp con su
 pregunta ya escrita: nunca se queda sin respuesta. */
 var AI_ENABLED = true;
 var AI_ENDPOINT = 'https://hgdccmkpepjcmrrnpdms.supabase.co/functions/v1/ai-sales';
 var AI_KEY = 'sb_publishable_qp0nJ5AWwCFgekGkG01cEg_XQ4sP66m';
 var aiHistory = [];
 var aiTurns = 0;

 function aiMode() {
 if (!AI_ENABLED) { aiMaintenance(); return; }
 botSay(t('¡Hola! Soy el asesor de Tierra. Conozco los terrenos, sus precios y lo que implica construir en la costa.',
 'Hi! I\'m Tierra\'s advisor. I know the lots, their prices and what building on the coast involves.'), function () {
 botSay(t('Cuéntame qué buscas y te oriento; al final te dejo tu mensaje listo para enviárselo al equipo. ¿Buscas un terreno, construir tu casa, invertir o un departamento?',
 'Tell me what you\'re after and I\'ll guide you; at the end I\'ll leave your message ready to send to the team. Are you looking for land, to build a home, to invest, or an apartment?'), showAiInput);
 });
 }

 function aiMaintenance() {
 botSay(t('Nuestro asistente virtual está temporalmente en mantenimiento Mientras tanto, puedes escribirnos por WhatsApp y un asesor de Tierra te atenderá personalmente',
 'Our virtual assistant is temporarily under maintenance Meanwhile, you can message us on WhatsApp and a Tierra advisor will assist you personally'), function () {
 var cta = document.createElement('a');
 cta.className = 'tadv-wa-cta';
 cta.href = WA + '?text=' + encodeURIComponent(t('Hola, quiero recibir información sobre los proyectos de Tierra.', 'Hi, I\'d like information about Tierra\'s projects.'));
 cta.target = '_blank'; cta.rel = 'noopener';
 cta.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35z"/></svg>' +
 t('Escribir por WhatsApp', 'Message on WhatsApp');
 els.body.appendChild(cta); scroll();
 });
 }

 var handoffHecho = false;

 function showAiInput() {
 var old = els.body.querySelector('.tadv-ai'); if (old) old.remove();
 var wrap = document.createElement('div');
 wrap.className = 'tadv-ai';

 var f = document.createElement('form');
 f.className = 'tadv-form';
 f.innerHTML =
 '<input name="q" type="text" autocomplete="off" placeholder="' + t('Tu pregunta…', 'Your question…') + '">' +
 '<button type="submit" aria-label="' + t('Enviar', 'Send') + '">→</button>';
 wrap.appendChild(f);

 // Salida directa: en cualquier momento puede saltarse las preguntas y pasar
 // con una persona. La IA arma igual su mensaje con lo que ya sepa de él.
 if (!handoffHecho) {
 var salto = document.createElement('button');
 salto.type = 'button';
 salto.className = 'tadv-skip';
 salto.textContent = t('Prefiero hablar con un asesor', 'I\'d rather talk to an advisor');
 salto.addEventListener('click', function () {
 preguntar(t('Prefiero hablar directamente con un asesor.', 'I\'d rather talk directly with an advisor.'));
 });
 wrap.appendChild(salto);
 }

 els.body.appendChild(wrap); scroll();
 f.q.focus();

 f.addEventListener('submit', function (e) {
 e.preventDefault();
 var q = f.q.value.trim();
 if (q) preguntar(q);
 });
 }

 function preguntar(q) {
 var caja = els.body.querySelector('.tadv-ai'); if (caja) caja.remove();
 userSay(q);
 aiHistory.push({ role: 'user', content: q });
 aiTurns++;

 var typing = document.createElement('div');
 typing.className = 'tadv-msg bot tadv-typing';
 typing.innerHTML = '<span></span><span></span><span></span>';
 els.body.appendChild(typing); scroll();

 var ctrl = ('AbortController' in window) ? new AbortController() : null;
 var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);

 fetch(AI_ENDPOINT, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'apikey': AI_KEY, 'Authorization': 'Bearer ' + AI_KEY },
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
 m.innerHTML = richText(d.reply);
 els.body.appendChild(m); scroll();

 if (d.listo && d.resumen) { handoffHecho = true; handoff(d.resumen); }
 if (typeof window.gtag === 'function') {
 window.gtag('event', 'advisor_turno', { event_category: 'lead', interes: d.interes || 'bajo', turno: aiTurns });
 }
 showAiInput();
 })
 .catch(function () {
 clearTimeout(to); typing.remove();
 aiFallback(q);
 });
 }

 function nudgeContact() {
 botSay(t('¿Te gustaría que un asesor humano te contacte con precios y disponibilidad?',
 'Would you like a human advisor to reach out with prices and availability?'), function () {
 options([
 { v: 'datos', label: t('Sí, dejar mis datos', 'Yes, leave my details') },
 { v: 'seguir', label: t('Seguir preguntando', 'Keep asking') }
 ], function (o) {
 if (o.v === 'datos') { lead.busca = lead.busca || 'Chat IA'; lead.proyecto = lead.proyecto || 'No sé aún'; lead.tiempo = lead.tiempo || 'Explorando opciones'; askData(); }
 else { aiTurns = 0; showAiInput(); }
 });
 });
 }

 function aiFallback(q) {
 botSay(t('Justo ahora no puedo responder eso en línea pero un asesor humano sí. Te dejo el enlace directo:',
 'I can\'t answer that online right now but a human advisor can. Here\'s the direct link:'), function () {
 var cta = document.createElement('a');
 cta.className = 'tadv-wa-cta';
 cta.href = WA + '?text=' + encodeURIComponent(t('Hola, tengo una pregunta: ', 'Hi, I have a question: ') + q);
 cta.target = '_blank'; cta.rel = 'noopener';
 cta.textContent = t('Preguntar por WhatsApp', 'Ask on WhatsApp');
 els.body.appendChild(cta); scroll();
 botSay(t('O si prefieres, te ayudo con el recorrido guiado:', 'Or if you prefer, I can guide you:'), function () {
 options([
 { v: 'g', label: t('Recorrido guiado', 'Guided tour') },
 { v: 'd', label: t('Dejar mis datos', 'Leave my details') }
 ], function (o) {
 if (o.v === 'g') { botSay(t('¿Qué estás buscando?', 'What are you looking for?'), function () {
 options([
 { v: 'Terreno / lote', label: t('Un terreno / lote', 'Land / a lot') },
 { v: 'Construir mi casa', label: t('Construir mi casa', 'Build my home') },
 { v: 'Invertir', label: t('Invertir', 'Invest') }
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
 botSay(t('¡Gracias, ' + name.split(' ')[0] + '! Tu info ya llegó a nuestro equipo. Te contactamos muy pronto.',
 'Thank you, ' + name.split(' ')[0] + '! Your info reached our team. We\'ll be in touch very soon.'), function () {
 var waMsg = t('Hola, soy ' + name + '. Me interesa ' + lead.proyecto + ' (' + lead.busca + '). Vengo del asesor de tierra.vip',
 'Hi, I\'m ' + name + '. I\'m interested in ' + lead.proyecto + ' (' + lead.busca + '). Coming from the tierra.vip advisor');
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
 open(); started = true; // flujo propio, no el normal
 if (MAINTENANCE) {
 botSay(t('Antes de irte: podemos enviarte disponibilidad y precios de nuestros proyectos por WhatsApp, sin compromiso.',
 'Before you go: we can send you availability and prices of our projects on WhatsApp, no strings attached.'), function () {
 var cta = document.createElement('a');
 cta.className = 'tadv-wa-cta';
 cta.href = WA + '?text=' + encodeURIComponent(t('Hola, quiero recibir disponibilidad y precios de los proyectos de Tierra.', 'Hi, I\'d like availability and prices for Tierra\'s projects.'));
 cta.target = '_blank'; cta.rel = 'noopener';
 cta.textContent = t('Escribir por WhatsApp', 'Message on WhatsApp');
 els.body.appendChild(cta); scroll();
 });
 return;
 }
 botSay(t('Antes de irte: déjame tu WhatsApp y te envío disponibilidad y precios de los proyectos — sin compromiso.',
 'Before you go: leave your WhatsApp and I\'ll send you availability and prices — no strings attached.'), function () {
 options([
 { v: 'd', label: t('Sí, quiero la info', 'Yes, send me the info') },
 { v: 'w', label: t('Mejor por WhatsApp', 'WhatsApp me instead') },
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
 else { botSay(t('¡Sin problema! Aquí me quedo por si me necesitas.', 'No problem! I\'ll be right here if you need me.'), close ? function () { setTimeout(close, 1200); } : null); }
 });
 });
 }
 function cleanup() { document.removeEventListener('mouseout', onOut); }
 document.addEventListener('mouseout', onOut);
 }

 /* ---------- Menú del botón de WhatsApp ----------
    Las preguntas que la gente hace de verdad, ya escritas: el visitante toca
    una y el mensaje sale redactado. Se reconstruye aquí (y no en el HTML de
    cada página) para que las diez páginas compartan la misma lista. */
 var WA_FAQ = [
 ['¿Cuánto cuestan los terrenos?', 'How much do the lots cost?',
  'Hola, me interesan sus terrenos. ¿Me pasan precios y disponibilidad?',
  'Hi, I\'m interested in your lots. Could you send me prices and availability?'],
 ['¿Puedo pagar en mensualidades?', 'Can I pay in installments?',
  'Hola, quiero saber cómo son los planes de pago: enganche y mensualidades.',
  'Hi, I\'d like to know how your payment plans work: down payment and installments.'],
 ['¿Los lotes tienen papeles en regla?', 'Are the lots properly titled?',
  'Hola, tengo dudas sobre la certeza jurídica y los papeles de los lotes.',
  'Hi, I have questions about legal certainty and the paperwork of the lots.'],
 ['¿Cuánto cuesta construir una casa?', 'How much does it cost to build?',
  'Hola, quiero construir una casa en la costa. ¿Cuánto cuesta y cómo es el proceso?',
  'Hi, I want to build a house on the coast. How much does it cost and how does it work?'],
 ['Quiero agendar una visita', 'I want to book a visit',
  'Hola, quiero agendar una visita a la costa para conocer los proyectos.',
  'Hi, I\'d like to book a visit to the coast to see the projects.'],
 ['Soy extranjero, ¿puedo comprar?', 'I\'m a foreigner, can I buy?',
  'Hola, soy extranjero y quiero saber si puedo comprar un terreno en la costa de Oaxaca.',
  'Hi, I\'m a foreigner and I\'d like to know if I can buy land on the Oaxaca coast.']
 ];

 var WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>';

 /* El botón y el menú solo existían en el home y su interruptor vivía dentro
    del bundle grande: si ese script fallaba, el menú no abría. Aquí se crea
    donde falte y se queda con su propio interruptor, sin depender de nada. */
 var waListo = false;

 function waMenu() {
 var menu = document.getElementById('wa-menu');
 if (waListo) { waPintar(menu); return; }
 waListo = true;
 var fab = document.getElementById('wa-fab');

 if (!menu) {
 menu = document.createElement('div');
 menu.id = 'wa-menu';
 menu.setAttribute('role', 'menu');
 document.body.appendChild(menu);
 }
 if (!fab) {
 fab = document.createElement('button');
 fab.id = 'wa-fab';
 fab.type = 'button';
 fab.innerHTML = WA_SVG;
 document.body.appendChild(fab);
 }
 menu.setAttribute('aria-label', t('Preguntas frecuentes por WhatsApp', 'Frequent questions on WhatsApp'));
 fab.setAttribute('aria-label', t('Contactar por WhatsApp', 'Contact on WhatsApp'));
 fab.setAttribute('aria-haspopup', 'menu');
 fab.setAttribute('aria-controls', 'wa-menu');

 // el clon se lleva los listeners viejos: el interruptor queda solo aquí
 var nuevoFab = fab.cloneNode(true);
 fab.parentNode.replaceChild(nuevoFab, fab);
 nuevoFab.addEventListener('click', function (e) {
 e.stopPropagation();
 menu.classList.toggle('open');
 nuevoFab.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false');
 });
 document.addEventListener('click', function (e) {
 if (!nuevoFab.contains(e.target) && !menu.contains(e.target)) {
 menu.classList.remove('open');
 nuevoFab.setAttribute('aria-expanded', 'false');
 }
 });
 document.addEventListener('keydown', function (e) {
 if (e.key === 'Escape') menu.classList.remove('open');
 });

 waPintar(menu);
 }

 function waPintar(menu) {
 if (!menu) return;
 menu.innerHTML = '';
 var ttl = document.createElement('div');
 ttl.className = 't';
 ttl.textContent = t('¿Qué te gustaría preguntar?', 'What would you like to ask?');
 menu.appendChild(ttl);
 WA_FAQ.forEach(function (q) {
 var b = document.createElement('button');
 b.type = 'button';
 b.setAttribute('role', 'menuitem');
 b.innerHTML = '<span>◆</span> ';
 b.appendChild(document.createTextNode(isEN() ? q[1] : q[0]));
 b.addEventListener('click', function () {
 if (typeof window.gtag === 'function') {
 window.gtag('event', 'wa_pregunta', { event_category: 'lead', event_label: q[0] });
 }
 window.open(WA + '?text=' + encodeURIComponent(isEN() ? q[3] : q[2]), '_blank', 'noopener');
 menu.classList.remove('open');
 });
 menu.appendChild(b);
 });
 }

 /* ---------- Móvil: hoja inferior con las mismas preguntas ----------
    En móvil el FAB de WhatsApp está oculto (lo sustituye la barra fija de
    abajo), así que el botón de esa barra abre esta hoja en lugar de saltar
    directo a WhatsApp: la persona elige su pregunta y llega escrita. */
 var hoja = null;

 function cerrarHoja() {
 if (!hoja) return;
 hoja.back.classList.remove('open');
 hoja.el.classList.remove('open');
 document.body.classList.remove('twq-abierta');
 setTimeout(function () {
 if (hoja) { hoja.back.remove(); hoja.el.remove(); hoja = null; }
 }, 320);
 }

 function abrirHoja() {
 if (hoja) return;
 var back = document.createElement('div');
 back.className = 'twq-back';

 var el = document.createElement('div');
 el.className = 'twq-sheet';
 el.setAttribute('role', 'dialog');
 el.setAttribute('aria-modal', 'true');
 el.setAttribute('aria-label', t('Preguntas frecuentes por WhatsApp', 'Frequent questions on WhatsApp'));

 var hd = document.createElement('div');
 hd.className = 'twq-hd';
 hd.innerHTML = '<span class="twq-grip" aria-hidden="true"></span>';
 var ttl = document.createElement('div');
 ttl.className = 'twq-ttl';
 ttl.textContent = t('¿Qué te gustaría preguntar?', 'What would you like to ask?');
 hd.appendChild(ttl);
 el.appendChild(hd);

 WA_FAQ.forEach(function (q, i) {
 var b = document.createElement('button');
 b.type = 'button';
 b.className = 'twq-op';
 b.style.setProperty('--i', i);
 b.innerHTML = '<span class="twq-d" aria-hidden="true">◆</span>';
 b.appendChild(document.createTextNode(isEN() ? q[1] : q[0]));
 b.addEventListener('click', function () {
 if (typeof window.gtag === 'function') {
 window.gtag('event', 'wa_pregunta', { event_category: 'lead', event_label: q[0] });
 }
 window.open(WA + '?text=' + encodeURIComponent(isEN() ? q[3] : q[2]), '_blank', 'noopener');
 cerrarHoja();
 });
 el.appendChild(b);
 });

 var otra = document.createElement('button');
 otra.type = 'button';
 otra.className = 'twq-otra';
 otra.style.setProperty('--i', WA_FAQ.length);
 otra.textContent = t('Escribir otra cosa', 'Write something else');
 otra.addEventListener('click', function () {
 window.open(WA + '?text=' + encodeURIComponent(t('Hola, me gustaría hablar con un asesor de Tierra Desarrollos.', 'Hi, I\'d like to talk to a Tierra Desarrollos advisor.')), '_blank', 'noopener');
 cerrarHoja();
 });
 el.appendChild(otra);

 document.body.appendChild(back);
 document.body.appendChild(el);
 document.body.classList.add('twq-abierta');
 hoja = { el: el, back: back };

 back.addEventListener('click', cerrarHoja);
 requestAnimationFrame(function () { back.classList.add('open'); el.classList.add('open'); });
 }

 document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarHoja(); });

 // El botón de WhatsApp de la barra móvil abre la hoja; si algo fallara,
 // el enlace original sigue funcionando porque no lo tocamos.
 document.addEventListener('click', function (e) {
 if (!e.target.closest) return;
 var a = e.target.closest('.tmbar .tm-wa');
 if (!a || !window.matchMedia('(max-width: 768px)').matches) return;
 try {
 e.preventDefault();
 abrirHoja();
 } catch (_err) { window.open(a.href, '_blank', 'noopener'); }
 }, true);

 /* ---------- Init ---------- */
 function init() {
 // Ocultar el asesor simulado viejo si existe (evita duplicados)
 ['ai-fab', 'ai-panel'].forEach(function (id) { var e = document.getElementById(id); if (e) e.style.display = 'none'; });
 build();
 exitIntent();
 waMenu();
 // al cambiar de idioma se rehace el menú de WhatsApp con las preguntas traducidas
 new MutationObserver(waMenu).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
 }

 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
 else init();
})();
