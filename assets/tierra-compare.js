/* ============================================================================
   TIERRA — Comparador antes/después ("Del render a la realidad")
   Arrastre con mouse/touch + teclado (accesible) + animación de invitación
   la primera vez que entra en pantalla. Sin dependencias.
   ========================================================================== */
(function () {
  'use strict';

  function init() {
    var comps = document.querySelectorAll('.t-compare');
    if (!comps.length) return;

    comps.forEach(function (c) { setup(c); });

    // etiquetas bilingües (data-es / data-en) — sigue el toggle ES/EN del sitio
    function translate() {
      var en = document.documentElement.getAttribute('lang') === 'en';
      document.querySelectorAll('.tc-wrap [data-es][data-en]').forEach(function (el) {
        el.textContent = en ? el.getAttribute('data-en') : el.getAttribute('data-es');
      });
    }
    new MutationObserver(translate).observe(document.documentElement, {
      attributes: true, attributeFilter: ['lang']
    });
    translate();
  }

  function setup(c) {
    var pos = 50, dragging = false, interacted = false;

    function set(p) {
      pos = Math.max(0, Math.min(100, p));
      c.style.setProperty('--tc', pos + '%');
      c.setAttribute('aria-valuenow', Math.round(pos));
    }

    // accesibilidad: control tipo slider con teclado
    c.setAttribute('role', 'slider');
    c.setAttribute('tabindex', '0');
    c.setAttribute('aria-valuemin', '0');
    c.setAttribute('aria-valuemax', '100');
    c.setAttribute('aria-valuenow', '50');

    function fromEvent(e) {
      var r = c.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      return (x / r.width) * 100;
    }
    function mark() {
      if (interacted) return;
      interacted = true;
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'compare_slide', { event_category: 'engagement' });
      }
    }

    c.addEventListener('pointerdown', function (e) {
      dragging = true; mark();
      if (c.setPointerCapture) { try { c.setPointerCapture(e.pointerId); } catch (_) {} }
      set(fromEvent(e));
    });
    c.addEventListener('pointermove', function (e) { if (dragging) set(fromEvent(e)); });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      c.addEventListener(ev, function () { dragging = false; });
    });
    c.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { mark(); set(pos - 4); e.preventDefault(); }
      if (e.key === 'ArrowRight') { mark(); set(pos + 4); e.preventDefault(); }
    });

    // invitación: pequeño vaivén al entrar en pantalla la primera vez
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        var t0 = null;
        function step(ts) {
          if (interacted) return;               // el usuario ya tomó el control
          if (!t0) t0 = ts;
          var t = (ts - t0) / 1600;             // 1.6s de vaivén
          if (t >= 1) { set(50); return; }
          set(50 + Math.sin(t * Math.PI * 2) * 9);
          requestAnimationFrame(step);
        }
        setTimeout(function () { requestAnimationFrame(step); }, 500);
      });
    }, { threshold: 0.5 });
    io.observe(c);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
