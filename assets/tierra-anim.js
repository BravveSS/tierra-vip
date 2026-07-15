/* ============================================================================
   TIERRA — Interactividad (Bloque 3)
   - Ticker infinito con datos (bilingüe)
   - Reveal opt-in (.t-reveal) para lo que quede sin animar
   No interfiere con el GSAP/Lenis del home.
   ========================================================================== */
(function () {
  'use strict';

  // Señal de "JS vivo": desactiva la red de seguridad CSS del fade (tfSafe)
  document.documentElement.classList.add('t-js');

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

  // Red de seguridad para .scn: el bundle solo revela una lista fija de
  // secciones y .exp-intro ("No vendemos terrenos…", arriba de "Despierta
  // frente al Pacífico") quedaba invisible → espacio en blanco. Este
  // observador revela CUALQUIER .scn al entrar en pantalla (idempotente).
  function scnSafety() {
    var els = document.querySelectorAll('.scn:not(.in)');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (e) { io.observe(e); });
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
    // .phero SÍ entra con fade (imagen grande de arriba en páginas de proyecto):
    // el fade es opacidad pura y no choca con el parallax que le aplica landing-extra.
    var EXCLUDE = '#hero, .hvw, .exp-strip, .pcard, .piw, header, .pnav, .pfoot, footer, .tmbar, #wa-fab, #wa-menu, #tadv-panel, #tadv-fab, #lb, #logo3d, .t-compare';
    var imgs = [];
    document.querySelectorAll('img').forEach(function (img) {
      if (img.closest(EXCLUDE)) return;                 // no tocar hero/GSAP/nav/asesor/lightbox
      if (img.dataset.tFade) return;
      img.dataset.tFade = '1';
      img.classList.add('t-fade-img');
      imgs.push(img);
    });
    if (!imgs.length) return;
    if (!('IntersectionObserver' in window)) { imgs.forEach(function (i) { i.classList.add('loaded'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      // cascada: las que entran juntas (misma fila) se revelan escalonadas
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var img = e.target;
        io.unobserve(img);
        var delay = Math.min(n++ * 90, 360);
        // El fade solo arranca cuando la imagen YA cargó sus bytes: si no,
        // la transición corre sobre un hueco vacío y el JPEG aparece de
        // golpe al decodificarse (el bug de "salen de sopetón" en PC).
        var reveal = function () {
          img.style.transitionDelay = delay + 'ms';
          img.classList.add('loaded');
          // limpiar el delay al terminar para no retrasar el hover-zoom
          setTimeout(function () { img.style.transitionDelay = ''; }, delay + 1000);
        };
        if (img.complete && img.naturalWidth > 0) reveal();
        else {
          img.addEventListener('load', reveal, { once: true });
          img.addEventListener('error', reveal, { once: true }); // nunca dejarla invisible
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });
    // doble rAF: garantiza que el estado inicial (opacity 0) se pinte antes
    // de observar → el fade también se ve en las imágenes ya en viewport.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        imgs.forEach(function (img) { io.observe(img); });
      });
    });
  }

  // Videos de Experiencia: cargar y reproducir solo cuando entran en pantalla
  function expVideos() {
    var vids = document.querySelectorAll('.exp-vid');
    if (!vids.length) return;
    var c = navigator.connection || {};
    var save = c.saveData === true || /(^|\b)(slow-2g|2g)$/.test(c.effectiveType || '');
    if (save) return;                           // solo ahorro de datos apaga el video
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

  // Hero en 2K para pantallas grandes con buena conexión (móvil usa la liviana).
  // Corre antes del evento load, que es cuando el sitio adjunta el source.
  function heroQuality() {
    var v = document.getElementById('hvid');
    if (!v || !v.dataset.src) return;
    var c = navigator.connection || {};
    var slow = c.saveData === true || /(^|\b)(slow-2g|2g|3g)$/.test(c.effectiveType || '');
    if (window.innerWidth > 1024 && !slow) v.dataset.src = 'assets/video/hero-2k.mp4?v=2';
  }

  // Respaldo del video del hero: si a los 2.5s el bundle aún no adjuntó el
  // source (red lenta, GSAP caído, carrera con el load), lo adjunta este
  // código y lo reproduce → el video del hero carga SIEMPRE.
  function heroVideoRescue() {
    var v = document.getElementById('hvid');
    if (!v) return;
    setTimeout(function () {
      if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }, 2500);
    // reintento al volver a la pestaña (autoplay bloqueado en background)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }

  // Botón "volver arriba": aparece tras 2 pantallas de scroll. Útil en
  // páginas largas (galerías) — vuelve al inicio con scroll suave.
  function topButton() {
    if (document.getElementById('t-top')) return;
    var b = document.createElement('button');
    b.id = 't-top';
    b.setAttribute('aria-label', isEN() ? 'Back to top' : 'Volver arriba');
    b.innerHTML = '&#8593;';
    document.body.appendChild(b);
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    var vis = false, ticking = false;
    function chk() {
      var show = window.scrollY > window.innerHeight * 2;
      if (show !== vis) { vis = show; b.classList.toggle('on', show); }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(chk); }
    }, { passive: true });
  }

  // Barra de progreso de lectura (fina, dorada, arriba)
  function progressBar() {
    if (document.getElementById('t-progress')) return;
    var bar = document.createElement('div');
    bar.id = 't-progress';
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Dominios de proyecto (centroazimut.com, nabani.mx, aldeatao.com, …):
  // muestran SU landing en su propio dominio, pero cualquier navegación
  // interna va al dominio principal. Sin esto, "index.html" en un alias
  // vuelve a reescribirse a la misma landing (el logo parecía no funcionar).
  // El preview viejo (bravvess.github.io) quedó congelado y confundía:
  // ahora redirige SIEMPRE al sitio real para que nadie vea versiones viejas.
  if (location.hostname === 'bravvess.github.io') {
    location.replace('https://tierra.vip' + location.pathname.replace(/^\/tierra-vip/, '') + location.search + location.hash);
  }

  function aliasLinks() {
    var MAIN = ['tierra.vip', 'www.tierra.vip', 'bravvess.github.io', 'tierra-desarrollos.netlify.app', 'localhost', '127.0.0.1'];
    if (MAIN.indexOf(location.hostname) !== -1) return;
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#|\/\/)/i.test(href)) return;
      a.setAttribute('href', 'https://tierra.vip/' + href.replace(/^\.?\//, ''));
    });
  }

  // Red de seguridad GSAP (home): si el CDN de GSAP falla (adblocker, red
  // corporativa, timeout), el bundle muere en la línea 1 → el loader queda
  // tapando la página y el hero/stats quedan invisibles. Este rescate
  // destraba la página y muestra el contenido con los valores reales.
  function gsapRescue() {
    function unlock() {
      document.documentElement.classList.add('t-no-gsap');
      var l = document.getElementById('loader');
      if (l && l.parentNode) {
        l.style.transition = 'opacity .6s ease';
        l.style.opacity = '0';
        l.style.pointerEvents = 'none';
        setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); }, 700);
      }
    }
    setTimeout(function () {
      if (typeof window.gsap === 'undefined' && document.getElementById('loader')) unlock();
    }, 2600);
    // último recurso: si a los 9s el loader sigue VISIBLE (el bundle lo
    // apaga con display:none cuando todo va bien), destrabar igual
    setTimeout(function () {
      var l = document.getElementById('loader');
      if (l && l.parentNode && getComputedStyle(l).display !== 'none' && getComputedStyle(l).opacity !== '0') unlock();
    }, 9000);
  }

  // Traducción genérica ES/EN: cualquier elemento con data-es + data-en
  // (badges, FAQ, "ideal para", etc.). Los formularios se traducen solos
  // en tierra-forms.js, por eso se excluyen.
  function badgeLang() {
    var els = document.querySelectorAll('[data-es][data-en]');
    if (!els.length) return;
    function apply() {
      var en = isEN();
      els.forEach(function (b) {
        if (b.closest('.tierra-form')) return;
        b.textContent = en ? b.getAttribute('data-en') : b.getAttribute('data-es');
      });
    }
    new MutationObserver(apply).observe(document.documentElement, {
      attributes: true, attributeFilter: ['lang']
    });
    if (isEN()) apply();
  }

  function init() { heroQuality(); heroVideoRescue(); buildTicker(); scnSafety(); initReveal(); fadeImages(); expVideos(); progressBar(); topButton(); badgeLang(); gsapRescue(); aliasLinks(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
