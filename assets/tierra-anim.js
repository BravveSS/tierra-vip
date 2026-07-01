/* ============================================================================
   TIERRA — Interactividad (Bloque 3)
   - Ticker infinito con datos (bilingüe)
   - Reveal opt-in (.t-reveal) para lo que quede sin animar
   No interfiere con el GSAP/Lenis del home.
   ========================================================================== */
(function () {
  'use strict';

  function isEN() { return window.__LANG === 'en' || document.documentElement.getAttribute('lang') === 'en'; }

  var STATS = [
    { es: '+40 clientes felices', en: '40+ happy clients' },
    { es: '6+ años de trayectoria', en: '6+ years of experience' },
    { es: '5 proyectos activos', en: '5 active projects' },
    { es: 'Escrituras garantizadas', en: 'Guaranteed deeds' },
    { es: 'Costa de Oaxaca', en: 'Oaxaca Coast' },
    { es: '100% respaldo legal', en: '100% legal backing' }
  ];

  function tickerHTML() {
    var en = isEN();
    var seq = STATS.map(function (s) {
      return '<span>' + (en ? s.en : s.es) + '</span><span class="tk-dot">◆</span>';
    }).join('');
    // duplicado para loop continuo sin saltos
    return seq + seq;
  }

  function buildTicker() {
    var anchor = document.getElementById('chat')          // "Encuentra tu tierra" (home)
              || document.querySelector('footer');
    if (!anchor || document.querySelector('.t-ticker')) return;

    var t = document.createElement('div');
    t.className = 't-ticker';
    t.setAttribute('aria-hidden', 'true');
    var track = document.createElement('div');
    track.className = 't-ticker-track';
    track.innerHTML = tickerHTML();
    t.appendChild(track);
    anchor.parentNode.insertBefore(t, anchor);

    // re-traducir al cambiar idioma
    new MutationObserver(function () { track.innerHTML = tickerHTML(); }).observe(
      document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
  }

  function initReveal() {
    var els = document.querySelectorAll('.t-reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  function init() { buildTicker(); initReveal(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
