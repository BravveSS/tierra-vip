/* ============================================================================
   TIERRA — Google Analytics 4 con Consent Mode v2 (recomendación de Google)
   gtag carga SIEMPRE: sin consentimiento mide con pings sin cookies
   (anónimo, cuenta la visita); al aceptar pasa a medición completa.
   Así no se pierde tráfico y sigue siendo GDPR-friendly. Bilingüe ES/EN.
   ========================================================================== */
(function () {
  'use strict';

  var GA_ID = 'G-X2MWFYSH0Y';
  var KEY = 'tierra-consent';

  function isEN() { return window.__LANG === 'en' || document.documentElement.getAttribute('lang') === 'en'; }

  function loadGA(granted) {
    if (window.__gaLoaded) { if (granted) grant(); return; }
    window.__gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    // Consent Mode v2: por defecto denegado → GA mide con pings sin cookies
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    if (granted) grant();
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    // Eventos útiles para medir interés de venta
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
      if (a) gtag('event', 'whatsapp_click', { location: location.pathname });
    }, true);
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (f.classList && (f.classList.contains('tierra-form') || f.classList.contains('tadv-form'))) {
        gtag('event', 'lead_form_submit', { origen: f.getAttribute('data-origen') || 'asesor', location: location.pathname });
      }
    }, true);
  }

  function grant() {
    if (window.__gaGranted) return;
    window.__gaGranted = true;
    window.gtag && gtag('consent', 'update', { analytics_storage: 'granted' });
  }

  function banner() {
    var b = document.createElement('div');
    b.id = 'tierra-consent';
    b.innerHTML =
      '<p>' + (isEN()
        ? 'We use cookies to understand visits and improve the site. Do you accept?'
        : 'Usamos cookies para entender las visitas y mejorar el sitio. ¿Aceptas?') + '</p>' +
      '<div class="tc-btns">' +
        '<button class="tc-ok">' + (isEN() ? 'Accept' : 'Aceptar') + '</button>' +
        '<button class="tc-no">' + (isEN() ? 'No, thanks' : 'No, gracias') + '</button>' +
      '</div>';
    var css = document.createElement('style');
    css.textContent =
      '#tierra-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:990;max-width:420px;margin:0 auto;' +
        'background:rgba(18,26,21,.97);border:1px solid rgba(201,169,110,.3);border-radius:14px;padding:16px 18px;' +
        'box-shadow:0 18px 50px rgba(0,0,0,.45);backdrop-filter:blur(12px);font-family:\'DM Sans\',sans-serif;' +
        'animation:tcIn .45s cubic-bezier(.16,1,.3,1) both}' +
      '@media(min-width:769px){#tierra-consent{left:24px;right:auto;bottom:24px}}' +
      /* en móvil, arriba de la barra fija de contacto */
      '@media(max-width:768px){body.has-tmbar #tierra-consent{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}' +
      '#tierra-consent p{margin:0 0 12px;font-size:13.5px;line-height:1.55;color:#F2EEE4;font-weight:300}' +
      '#tierra-consent .tc-btns{display:flex;gap:8px}' +
      '#tierra-consent button{flex:1;min-height:42px;border-radius:10px;font-family:inherit;font-size:12.5px;' +
        'font-weight:600;letter-spacing:.06em;cursor:pointer;transition:filter .2s}' +
      '#tierra-consent .tc-ok{background:#C9A96E;border:1px solid #C9A96E;color:#14110c}' +
      '#tierra-consent .tc-no{background:none;border:1px solid rgba(242,238,228,.3);color:rgba(242,238,228,.75)}' +
      '#tierra-consent button:hover{filter:brightness(1.1)}' +
      '@keyframes tcIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}';
    document.head.appendChild(css);
    document.body.appendChild(b);
    b.querySelector('.tc-ok').addEventListener('click', function () {
      localStorage.setItem(KEY, 'yes'); b.remove(); grant();
    });
    b.querySelector('.tc-no').addEventListener('click', function () {
      localStorage.setItem(KEY, 'no'); b.remove();
    });
  }

  function init() {
    var c = null;
    try { c = localStorage.getItem(KEY); } catch (_) {}
    loadGA(c === 'yes');                              // GA siempre (pings anónimos si no aceptó)
    if (c !== 'yes' && c !== 'no') setTimeout(banner, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
