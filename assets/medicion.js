/* ============================================================================
   TIERRA — Medición de ventas por canal
   ----------------------------------------------------------------------------
   Qué hace:
   · Guarda el ORIGEN de la visita (UTM o, si no hay, el sitio de donde vino:
     instagram, tiktok, facebook…) durante 30 días.
   · Cuenta un `generate_lead` en GA4 (y `Contact`/`Lead` en el Pixel de Meta)
     cada vez que alguien abre WhatsApp — por enlace, por `window.open` o por
     botones creados después con JavaScript (chat, barra móvil, menú) — y
     cuando envía un formulario con datos reales (uno por proyecto y visita).
   · Añade "(ref: instagram)" al mensaje de WhatsApp: el equipo ve de qué red
     llegó la persona aunque la venta se cierre fuera de la web.
   · `view_item` en las páginas de cada proyecto.
   · Banner de promociones configurable (apagado) y enlace al aviso de
     privacidad en el footer si faltara.

   GA4 ya se carga en assets/tierra-analytics.js (con Consent Mode v2). Este
   archivo NO vuelve a cargarlo: usa el mismo `gtag`, así no se duplica nada.
   El Pixel de Meta solo se carga si la persona aceptó cookies.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    // Vacío = se usa solo el GA4 que ya tiene el sitio (tierra-analytics.js).
    // Si se pone otro ID, los eventos también se envían a esa propiedad.
    ga4: '',
    // Vacío = el Pixel de Meta no se carga.
    pixel: '',
    whatsapp: '529581087977',
    diasOrigen: 30,

    // Banner de promociones. Para encenderlo: activo: true y el texto.
    promo: {
      activo: false,
      texto: { es: '', en: '' },
      enlace: '',                    // opcional, p. ej. 'azimut.html#lotes'
      hasta: ''                      // opcional, 'AAAA-MM-DD': se apaga solo después
    }
  };

  // Proyectos: la clave es la ruta de su página (la del canonical).
  var PROYECTOS = {
    'azimut':       { id: 'azimut',       nombre: 'Azimut',       zona: 'Mazunte' },
    'nabani':       { id: 'nabani',       nombre: 'Nabani',       zona: 'Puerto Ángel' },
    'aldea-tao':    { id: 'aldea-tao',    nombre: 'Aldea Tao',    zona: 'La Boquilla' },
    'serena':       { id: 'serena',       nombre: 'Serena',       zona: 'Mazunte' },
    'depas-kora':   { id: 'depas-kora',   nombre: 'Depas Kora',   zona: 'Puerto Ángel' },
    'construccion': { id: 'construccion', nombre: 'Construcción', zona: 'Costa de Oaxaca' }
  };

  var CLAVE_ORIGEN = 'tierra-origen';

  /* ---------- utilidades ---------- */
  function isEN() { return window.__LANG === 'en' || document.documentElement.getAttribute('lang') === 'en'; }
  function guardar(k, v, sesion) { try { (sesion ? sessionStorage : localStorage).setItem(k, v); } catch (_) {} }
  function leer(k, sesion) { try { return (sesion ? sessionStorage : localStorage).getItem(k); } catch (_) { return null; } }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // gtag idéntico al estándar: si tierra-analytics aún no lo definió, los
  // eventos esperan en dataLayer y gtag.js los procesa al cargar.
  function gtag() { (window.dataLayer = window.dataLayer || []).push(arguments); }

  /* ---------- página y proyecto actual ---------- */
  // Se lee del canonical y no de la URL: los dominios de proyecto
  // (centroazimut.com, nabani.mx…) muestran la landing en "/".
  function rutaPagina() {
    var c = document.querySelector('link[rel="canonical"]');
    var p = c ? c.getAttribute('href') : location.pathname;
    try { p = new URL(p, location.href).pathname; } catch (_) {}
    return p.replace(/\.html$/, '').replace(/^\/+|\/+$/g, '');
  }
  var PROYECTO_PAGINA = PROYECTOS[rutaPagina()] || null;

  function proyectoPorNombre(txt) {
    var s = slug(txt);
    if (!s) return null;
    for (var k in PROYECTOS) {
      if (s.indexOf(k) !== -1 || s.indexOf(slug(PROYECTOS[k].nombre)) !== -1) return PROYECTOS[k];
    }
    return null;
  }

  /* ---------- origen de la visita ---------- */
  var REDES = [
    [/(^|\.)instagram\.com$/, 'instagram', 'social'],
    [/(^|\.)tiktok\.com$/, 'tiktok', 'social'],
    [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook', 'social'],
    [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube', 'social'],
    [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'x', 'social'],
    [/(^|\.)linkedin\.com$/, 'linkedin', 'social'],
    [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp', 'social'],
    [/(^|\.)google\./, 'google', 'organic'],
    [/(^|\.)bing\.com$/, 'bing', 'organic'],
    [/(^|\.)duckduckgo\.com$/, 'duckduckgo', 'organic']
  ];
  var PROPIOS = /(^|\.)(tierra\.vip|centroazimut\.com|nabani\.mx|aldeatao\.com|proyectoserena\.com|depaskora\.com|grupo-tierra\.com|grupotierra\.net|localhost|127\.0\.0\.1)$/;

  function detectarOrigen() {
    var q = new URLSearchParams(location.search);
    var src = (q.get('utm_source') || '').trim().toLowerCase();
    if (src) {
      return { source: src, medium: (q.get('utm_medium') || '').toLowerCase(),
               campaign: (q.get('utm_campaign') || '').toLowerCase(), ts: Date.now() };
    }
    if (q.get('fbclid')) return { source: 'facebook', medium: 'social', campaign: '', ts: Date.now() };
    if (q.get('gclid')) return { source: 'google', medium: 'cpc', campaign: '', ts: Date.now() };
    if (document.referrer) {
      var host = '';
      try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (_) {}
      if (host && !PROPIOS.test(host)) {
        for (var i = 0; i < REDES.length; i++) {
          if (REDES[i][0].test(host)) return { source: REDES[i][1], medium: REDES[i][2], campaign: '', ts: Date.now() };
        }
        return { source: host, medium: 'referral', campaign: '', ts: Date.now() };
      }
    }
    return null;   // directo o navegación interna: no pisa el origen guardado
  }

  var origen = (function () {
    var nuevo = detectarOrigen();
    if (nuevo) { guardar(CLAVE_ORIGEN, JSON.stringify(nuevo)); return nuevo; }
    try {
      var o = JSON.parse(leer(CLAVE_ORIGEN) || 'null');
      if (o && Date.now() - o.ts < CONFIG.diasOrigen * 864e5) return o;
    } catch (_) {}
    return null;
  })();

  function paramsOrigen() {
    return {
      origen: origen ? origen.source : '(directo)',
      medio: origen ? (origen.medium || '(no definido)') : '(ninguno)',
      campana: origen && origen.campaign ? origen.campaign : '(ninguna)',
      pagina: rutaPagina() || 'inicio'
    };
  }

  /* ---------- envío de eventos ---------- */
  function ga(evento, params) {
    var p = paramsOrigen();
    for (var k in params) p[k] = params[k];
    gtag('event', evento, p);   // va a todos los IDs configurados (el del sitio y CONFIG.ga4)
  }

  function consintio() { return leer('tierra-consent') === 'yes'; }
  var colaPixel = [];
  function pixel(evento, params) {
    if (!CONFIG.pixel || !consintio()) return;
    if (window.fbq) window.fbq('track', evento, params || {});
    else colaPixel.push([evento, params || {}]);
  }

  function cargarPixel() {
    if (!CONFIG.pixel || !consintio() || window.fbq) return;
    /* fragmento oficial de Meta */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.pixel);
    window.fbq('track', 'PageView');
    if (PROYECTO_PAGINA) window.fbq('track', 'ViewContent', { content_name: PROYECTO_PAGINA.nombre, content_category: 'Desarrollo' });
    colaPixel.forEach(function (e) { window.fbq('track', e[0], e[1]); });
    colaPixel = [];
  }

  /* ---------- WhatsApp ---------- */
  var RE_WA = /^(https?:)?\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i;
  function esWhatsApp(url) { return typeof url === 'string' && (RE_WA.test(url) || /^whatsapp:/i.test(url)); }

  function etiquetaRef() {
    if (!origen || !origen.source) return '';
    return '(ref: ' + origen.source + (origen.campaign ? ' · ' + origen.campaign : '') + ')';
  }

  // Devuelve la misma URL con "(ref: …)" al final del mensaje. El texto se
  // codifica a mano (encodeURIComponent): wa.me no siempre lee '+' como espacio.
  function conRef(url) {
    var ref = etiquetaRef();
    if (!ref || !esWhatsApp(url)) return url;
    var partes = url.split('#'), base = partes[0], hash = partes[1] ? '#' + partes[1] : '';
    var i = base.indexOf('?');
    var ruta = i === -1 ? base : base.slice(0, i);
    var q = new URLSearchParams(i === -1 ? '' : base.slice(i + 1));
    var texto = q.get('text') || '';
    if (/\(ref: /.test(texto)) return url;               // ya lleva su referencia
    texto = texto ? texto.replace(/\s+$/, '') + ' ' + ref : (isEN() ? 'Hi! ' : '¡Hola! ') + ref;
    q.delete('text');
    var resto = q.toString();
    return ruta + '?' + (resto ? resto + '&' : '') + 'text=' + encodeURIComponent(texto) + hash;
  }

  function proyectoDeEnlace(url, el) {
    if (el && el.closest) {
      var conDato = el.closest('[data-proyecto]');
      if (conDato) { var p1 = proyectoPorNombre(conDato.getAttribute('data-proyecto')); if (p1) return p1; }
    }
    try {
      var t = new URLSearchParams(url.split('?')[1] || '').get('text');
      var p2 = proyectoPorNombre(t);
      if (p2) return p2;
    } catch (_) {}
    return PROYECTO_PAGINA;
  }

  function leadWhatsApp(url, el, via) {
    var pr = proyectoDeEnlace(url, el);
    ga('generate_lead', { method: 'whatsapp', via: via, proyecto: pr ? pr.id : 'general' });
    pixel('Contact', { content_name: pr ? pr.nombre : 'General' });
  }

  // 1) Enlaces <a>, incluidos los que el chat o la barra móvil crean después.
  //    Se escucha en la fase de burbuja de window, la última: así se respeta
  //    a quien cancela el clic (la barra móvil abre su hoja de preguntas en
  //    vez de navegar) y la referencia se añade después de que el chat
  //    escriba su propio mensaje en el enlace.
  window.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!esWhatsApp(href)) return;
    leadWhatsApp(href, a, 'enlace');
    var nueva = conRef(href);
    if (nueva !== href) a.setAttribute('href', nueva);
  });

  // 2) Botones que abren WhatsApp con window.open (home, lotes, visitas, menú).
  var abrirOriginal = window.open;
  window.open = function (url) {
    if (esWhatsApp(url)) {
      leadWhatsApp(url, document.activeElement, 'boton');
      arguments[0] = conRef(url);
    }
    return abrirOriginal.apply(window, arguments);
  };

  /* ---------- formularios ---------- */
  function valor(f, selectores) {
    for (var i = 0; i < selectores.length; i++) {
      var el = f.querySelector(selectores[i]);
      if (el && el.value && el.value.trim()) return el.value.trim();
    }
    return '';
  }

  // Cuenta solo si trae datos de contacto de verdad: un nombre y un teléfono
  // o correo válidos. Un formulario vacío o a medias no es un lead.
  function datosValidos(f) {
    if (f.querySelector('input[type="password"]')) return false;     // logins del portal y admin
    var nombre = valor(f, ['[name="name"]', '[autocomplete="name"]', '[name*="nombre" i]', '[id*="nombre" i]']);
    var tel = valor(f, ['input[type="tel"]', '[name="phone"]', '[name*="tel" i]']);
    var mail = valor(f, ['input[type="email"]', '[name="email"]']);
    var telOk = tel.replace(/\D/g, '').length >= 7;
    var mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail);
    return nombre.length >= 2 && (telOk || mailOk);
  }

  function proyectoDeFormulario(f) {
    var dato = f.getAttribute('data-proyecto');
    var sel = f.querySelector('select[name="proyecto"], select[id*="proj" i], select[name*="proyecto" i]');
    return proyectoPorNombre(dato) || (sel && proyectoPorNombre(sel.value)) || PROYECTO_PAGINA;
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.tagName !== 'FORM' || !datosValidos(f)) return;
    var pr = proyectoDeFormulario(f);
    var id = pr ? pr.id : 'general';
    var clave = 'tierra-lead-form:' + id;
    if (leer(clave, true)) return;                 // uno por proyecto y por visita
    guardar(clave, '1', true);
    ga('generate_lead', { method: 'formulario', proyecto: id, formulario: f.getAttribute('data-origen') || f.id || f.className.split(' ')[0] || 'formulario' });
    pixel('Lead', { content_name: pr ? pr.nombre : 'General' });
  }, true);

  /* ---------- banner de promociones (apagado por defecto) ---------- */
  function promo() {
    var c = CONFIG.promo;
    if (!c || !c.activo) return;
    var txt = isEN() ? (c.texto.en || c.texto.es) : (c.texto.es || c.texto.en);
    if (!txt) return;
    if (c.hasta && new Date() > new Date(c.hasta + 'T23:59:59')) return;
    if (leer('tierra-promo-cerrada', true) === txt) return;
    var css = document.createElement('style');
    css.textContent =
      '#tierra-promo{position:fixed;z-index:930;left:50%;top:88px;transform:translateX(-50%);' +
        'width:max-content;max-width:min(560px,calc(100vw - 32px));' +
        'display:flex;align-items:center;gap:12px;padding:10px 10px 10px 18px;border-radius:999px;' +
        'background:rgba(18,26,21,.94);border:1px solid rgba(201,169,110,.45);box-shadow:0 14px 40px rgba(0,0,0,.4);' +
        '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);font-family:\'DM Sans\',sans-serif;' +
        'animation:tpIn .5s cubic-bezier(.16,1,.3,1) both}' +
      '#tierra-promo .tp-t{font-size:13px;line-height:1.35;color:#F2EEE4;letter-spacing:.01em}' +
      '#tierra-promo .tp-t b{color:#C9A96E;font-weight:600}' +
      '#tierra-promo a.tp-t{text-decoration:none}' +
      '#tierra-promo button{flex:0 0 auto;width:30px;height:30px;border-radius:50%;border:1px solid rgba(242,238,228,.25);' +
        'background:none;color:rgba(242,238,228,.7);font-size:14px;line-height:1;cursor:pointer}' +
      /* en móvil, de borde a borde: con left:50% el navegador lo encogía a medio ancho */
      '@media(max-width:768px){#tierra-promo{top:72px;left:16px;right:16px;width:auto;max-width:none;transform:none;' +
        'border-radius:16px;animation-name:tpInM}#tierra-promo .tp-t{flex:1;font-size:12.5px}}' +
      '@keyframes tpIn{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translateX(-50%)}}' +
      '@keyframes tpInM{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}' +
      '@media(prefers-reduced-motion:reduce){#tierra-promo{animation:none}}';
    document.head.appendChild(css);
    var b = document.createElement('div');
    b.id = 'tierra-promo';
    b.setAttribute('role', 'status');
    var t = document.createElement(c.enlace ? 'a' : 'span');
    t.className = 'tp-t';
    t.textContent = '◆ ' + txt;
    if (c.enlace) t.href = c.enlace;
    var x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', isEN() ? 'Close' : 'Cerrar');
    x.textContent = '✕';
    x.addEventListener('click', function () { guardar('tierra-promo-cerrada', txt, true); b.remove(); });
    b.appendChild(t); b.appendChild(x);
    document.body.appendChild(b);
  }

  /* ---------- aviso de privacidad en el footer (si faltara) ---------- */
  function enlacePrivacidad() {
    var footer = document.querySelector('footer');
    if (!footer || footer.querySelector('a[href*="aviso-de-privacidad"]')) return;
    var p = document.createElement('p');
    p.style.cssText = 'margin:14px 0 0;font-size:11.5px;letter-spacing:.04em;text-align:center';
    var a = document.createElement('a');
    a.href = 'aviso-de-privacidad.html';
    a.textContent = isEN() ? 'Privacy Notice' : 'Aviso de privacidad';
    a.style.cssText = 'color:#C9A96E;border-bottom:1px solid rgba(201,169,110,.35);text-decoration:none';
    p.appendChild(a);
    footer.appendChild(p);
  }

  /* ---------- arranque ---------- */
  // Se espera a DOMContentLoaded: para entonces tierra-analytics.js (que va al
  // final del body) ya fijó el consentimiento por defecto. Consent Mode exige
  // que ese 'default' entre en dataLayer ANTES que cualquier 'config' o evento.
  // Ojo: este archivo es defer y corre con readyState 'interactive' pero ANTES
  // de DOMContentLoaded, así que no basta con mirar si sigue en 'loading'.
  var iniciado = false;
  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    if (CONFIG.ga4) gtag('config', CONFIG.ga4, { anonymize_ip: true });
    if (PROYECTO_PAGINA) {
      ga('view_item', { items: [{ item_id: PROYECTO_PAGINA.id, item_name: PROYECTO_PAGINA.nombre,
                                  item_category: 'Desarrollo', location_id: PROYECTO_PAGINA.zona }] });
    }
    cargarPixel();
    promo();
    enlacePrivacidad();
  }
  // tierra-analytics.js avisa cuando la persona acepta cookies
  document.addEventListener('tierra-consent-granted', function () {
    cargarPixel();
  });

  if (document.readyState === 'complete') iniciar();
  else {
    document.addEventListener('DOMContentLoaded', iniciar);
    window.addEventListener('load', iniciar);    // por si este archivo llegara tarde
  }

  // Para revisar desde la consola: TierraMedicion.origen
  window.TierraMedicion = { origen: origen, proyecto: PROYECTO_PAGINA, config: CONFIG };
})();
