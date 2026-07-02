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
    { es: 'Costa de Oaxaca', en: 'Oaxaca Coast' },
    { es: 'Acompañamiento legal', en: 'Legal support' },
    { es: 'Frente al Pacífico', en: 'Facing the Pacific' }
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

  // Fade-in de imágenes al entrar en pantalla (scroll-triggered → consistente
  // en TODAS las páginas, no solo donde las imágenes cargan lento).
  function fadeImages() {
    var EXCLUDE = '#hero, .hvw, .phero, .exp-strip, .pcard, .piw, header, footer, .pnav, .pfoot, .tmbar, #wa-fab, #wa-menu, #tadv-panel, #tadv-fab';
    var imgs = [];
    document.querySelectorAll('img').forEach(function (img) {
      if (img.closest(EXCLUDE)) return;                 // no tocar hero/GSAP/nav/asesor
      if (img.dataset.tFade) return;
      img.dataset.tFade = '1';
      img.classList.add('t-fade-img');
      imgs.push(img);
    });
    if (!imgs.length) return;
    if (!('IntersectionObserver' in window)) { imgs.forEach(function (i) { i.classList.add('loaded'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('loaded'); io.unobserve(e.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });
    imgs.forEach(function (img) { io.observe(img); });
  }

  // Videos de Experiencia: cargar y reproducir solo cuando entran en pantalla
  function expVideos() {
    var vids = document.querySelectorAll('.exp-vid');
    if (!vids.length) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var c = navigator.connection || {};
    var save = c.saveData === true || /(^|\b)(slow-2g|2g)$/.test(c.effectiveType || '');
    if (reduce || save) return;                 // queda la foto real
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          v.muted = true; v.setAttribute('muted', '');    // autoplay confiable
          if (!v.src && v.dataset.src) {
            v.src = v.dataset.src; v.load();
            // si el video falla (red, códec), se oculta y queda la foto real
            v.addEventListener('error', function () { v.remove(); }, { once: true });
          }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
          v.classList.add('on');
        } else {
          v.classList.remove('on');
          try { v.pause(); } catch (_) {}
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px 15% 0px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  function init() { buildTicker(); initReveal(); fadeImages(); expVideos(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
