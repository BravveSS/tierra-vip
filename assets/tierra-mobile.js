/* ============================================================================
   TIERRA — Barra fija de contacto en móvil (Bloque 2)
   WhatsApp (canal directo) + Agendar visita (lleva al formulario de la página).
   No toca nada del desktop ni el WhatsApp existente.
   ========================================================================== */
(function () {
  'use strict';

  var WA = 'https://wa.me/529581087977';
  var WA_ASESOR = WA + '?text=' + encodeURIComponent('Hola, me gustaría hablar con un asesor de Tierra Desarrollos.');
  var WA_VISITA = WA + '?text=' + encodeURIComponent('Hola, quiero agendar una visita a la costa.');

  function isEN() { return window.__LANG === 'en' || document.documentElement.getAttribute('lang') === 'en'; }
  var isMobile = window.matchMedia('(max-width: 768px)').matches;

  /* -- Perf: no descargar el video pesado del hero en móvil --
     El hero ya trae un póster full-res. En pantallas chicas evitamos los ~31MB
     del .mp4: pre-insertamos un <source> vacío para que el cargador diferido del
     sitio no adjunte el video (queda el póster). Corre antes del evento load. */
  (function guardHeroVideo() {
    if (!isMobile) return;
    var v = document.getElementById('hvid');
    if (v && !v.querySelector('source')) {
      v.appendChild(document.createElement('source')); // centinela sin src
      v.removeAttribute('data-src');
    }
  })();

  /* -- Lazy-load para imágenes que aún no lo declaran (mejora Lighthouse) -- */
  (function lazyImages() {
    var first = true;
    document.querySelectorAll('img:not([loading])').forEach(function (img) {
      // la primera imagen (hero/above-the-fold) se deja en carga normal
      if (first) { first = false; return; }
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  })();

  // ¿A dónde lleva "Agendar visita"? Preferimos un formulario de captura en la
  // misma página; si no hay, caemos al WhatsApp de visita.
  function visitTarget() {
    return document.querySelector('#chat')
        || document.querySelector('#waitlist')
        || document.querySelector('#visitas')
        || document.querySelector('.tierra-form, #vis-form');
  }

  var svgWA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>';
  var svgPin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="2.6"/></svg>';

  function build() {
    if (document.querySelector('.tmbar')) return;

    var bar = document.createElement('div');
    bar.className = 'tmbar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', isEN() ? 'Quick contact' : 'Contacto rápido');

    var wa = document.createElement('a');
    wa.className = 'tm-wa';
    wa.href = WA_ASESOR;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.innerHTML = svgWA + '<span data-tm="wa">WhatsApp</span>';

    var visit = document.createElement('a');
    visit.className = 'tm-visit';
    var target = visitTarget();
    if (target) {
      visit.href = '#' + (target.id || '');
      visit.addEventListener('click', function (e) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var input = target.querySelector('input, select, textarea');
        if (input) setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (_) {} }, 600);
      });
    } else {
      visit.href = WA_VISITA;
      visit.target = '_blank';
      visit.rel = 'noopener';
    }
    visit.innerHTML = svgPin + '<span data-tm="visit">Agendar visita</span>';

    bar.appendChild(wa);
    bar.appendChild(visit);
    document.body.appendChild(bar);
    document.body.classList.add('has-tmbar');

    applyLang(bar);

    // Mostrar tras un pequeño scroll para no tapar el hero al entrar
    var reveal = function () {
      if (window.scrollY > 40) bar.classList.add('show');
      else bar.classList.remove('show');
    };
    reveal();
    window.addEventListener('scroll', reveal, { passive: true });

    // Re-traducir al cambiar ES/EN
    new MutationObserver(function () { applyLang(bar); }).observe(
      document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
  }

  function applyLang(bar) {
    var en = isEN();
    var w = bar.querySelector('[data-tm="wa"]');
    var v = bar.querySelector('[data-tm="visit"]');
    if (w) w.textContent = 'WhatsApp';
    if (v) v.textContent = en ? 'Book a visit' : 'Agendar visita';
    bar.setAttribute('aria-label', en ? 'Quick contact' : 'Contacto rápido');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
