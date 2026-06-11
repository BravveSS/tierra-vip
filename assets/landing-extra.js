/* TIERRA — extra compartido de landings: idioma ES/EN + animaciones ligeras */
(function(){
  'use strict';

  /* ── Parallax suave en la imagen del hero (solo transform) ── */
  const heroImg = document.querySelector('.phero-img');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroImg && !reduced){
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        heroImg.style.transform = 'scale(1.08) translateY(' + (y * .18) + 'px)';
        ticking = false;
      });
    }, {passive:true});
  }

  /* ── Entrada del contenido del hero (si la página no la trae por CSS) ── */
  document.querySelectorAll('.phero-body > *').forEach((el, i) => {
    if (reduced) return;
    el.style.opacity = '0'; el.style.transform = 'translateY(26px)';
    el.style.transition = 'opacity .9s cubic-bezier(.16,1,.3,1) ' + (i*.12+.1) + 's, transform .9s cubic-bezier(.16,1,.3,1) ' + (i*.12+.1) + 's';
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; }));
  });

  /* ── IDIOMA ES/EN — textos comunes de las landings ── */
  // pares exactos texto-ES → texto-EN (el ES se restaura desde la captura)
  const PAIRS = [
    ['Proyectos','Projects'],['Construcción','Construction'],['Nosotros','About us'],['Galería','Gallery'],['Contacto','Contact'],
    ['← Todos los proyectos','← All projects'],['← Volver al inicio','← Back to home'],
    ['Hablar por WhatsApp','Chat on WhatsApp'],['Solicitar información','Request information'],
    ['Ver otros proyectos','See other projects'],['Ver proyectos','See projects'],['Lo que construimos','What we build'],
    ['Desarrollo y Construcción · Costa de Oaxaca','Development & Construction · Oaxaca Coast'],
    ['Recomendaciones','Testimonials'],['El procedimiento','The process'],['Cómo construimos','How we build'],
    ['Obra terminada · Cliente real','Finished work · Real client'],['En proceso · Cliente real','In progress · Real client'],
    ['Clientes que ya lo viven','Clients already living it'],['Confianza','Trust'],['Nuestra filosofía','Our philosophy'],
    ['Clientes felices','Happy clients'],['Años de trayectoria','Years of experience'],['Proyectos activos','Active projects'],
  ];
  const ES2EN = new Map(PAIRS);
  // nodos candidatos: nav, backlinks, botones, eyebrows, tags y footer
  const SCOPE = document.querySelectorAll('.pnav-links a, .backlink, .btn, .eyebrow, .ftag, .stats .l, .vis-tab');
  const captured = [...SCOPE].map(el => ({ el, es: el.textContent.trim() }));

  function apply(lang){
    window.__LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    captured.forEach(({el, es}) => {
      if (lang === 'en' && ES2EN.has(es)) el.textContent = ES2EN.get(es);
      else if (lang === 'es') el.textContent = es;
    });
    // "Un recorrido por X" — traducir solo el primer nodo de texto, conserva <em>
    document.querySelectorAll('.h2').forEach(h => {
      if (h.firstChild && h.firstChild.nodeType === 3){
        const t = h.firstChild.nodeValue;
        if (lang === 'en' && /Un recorrido por/.test(t)) h.firstChild.nodeValue = t.replace('Un recorrido por','A journey through');
        if (lang === 'es' && /A journey through/.test(t)) h.firstChild.nodeValue = t.replace('A journey through','Un recorrido por');
      }
    });
    // propagar el idioma en los enlaces internos
    document.querySelectorAll('a[href$=".html"], a[href*=".html#"]').forEach(a => {
      const base = a.getAttribute('href').split('?')[0];
      a.setAttribute('href', lang === 'en' ? base + (base.includes('#') ? '' : '?lang=en') : base);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(b => b.classList.toggle('on', b.dataset.langBtn === lang));
  }
  document.querySelectorAll('[data-lang-btn]').forEach(b => b.addEventListener('click', () => apply(b.dataset.langBtn)));
  if (new URLSearchParams(location.search).get('lang') === 'en') apply('en');
})();
