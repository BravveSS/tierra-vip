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
  document.querySelectorAll('[data-lang-btn]').forEach(b => b.addEventListener('click', () => { apply(b.dataset.langBtn); try{ localStorage.setItem('tierraLang', b.dataset.langBtn); }catch(_){} }));
  // idioma inicial: ?lang → localStorage → 'es'
  let initLang = new URLSearchParams(location.search).get('lang');
  if (!initLang){ try{ initLang = localStorage.getItem('tierraLang'); }catch(_){} }
  if (initLang === 'en') apply('en');

  /* ── ATMÓSFERA DE MISTERIO (landings) ── */
  if (!reduced){
    const st = document.createElement('style');
    st.textContent = '.lx-vignette{position:fixed;inset:0;z-index:9990;pointer-events:none;background:radial-gradient(ellipse at center,transparent 58%,rgba(0,0,0,.34) 100%)}'
      + '.lx-fog{position:absolute;width:46vw;height:46vw;max-width:600px;max-height:600px;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:1;background:radial-gradient(circle,rgba(201,169,110,.13),transparent 65%);will-change:transform}'
      + '.lx-fog.a{top:-12%;left:-8%;animation:lxDrift 22s ease-in-out infinite alternate}'
      + '.lx-fog.b{bottom:-15%;right:-10%;animation:lxDrift 26s ease-in-out infinite alternate-reverse}'
      + '@keyframes lxDrift{from{transform:translate(0,0) scale(1)}to{transform:translate(9vw,5vh) scale(1.18)}}'
      + '.lx-gps{font-family:var(--fb);font-size:10px;letter-spacing:.26em;color:rgba(201,169,110,.6);margin-top:18px}'
      + '.lx-line{width:0;height:1px;background:linear-gradient(to right,var(--gold),transparent);margin-top:16px;transition:width 1.4s cubic-bezier(.16,1,.3,1) .9s}'
      + '.lx-w{display:inline-block;overflow:hidden;vertical-align:bottom}.lx-wi{display:inline-block;transform:translateY(108%);transition:transform .85s cubic-bezier(.16,1,.3,1)}'
      + '@media (prefers-reduced-motion:reduce){.lx-vignette,.lx-fog{display:none}}';
    document.head.appendChild(st);
    // viñeta global
    const v = document.createElement('div'); v.className = 'lx-vignette'; v.setAttribute('aria-hidden','true');
    document.body.appendChild(v);
    // niebla dorada en el hero
    const hero = document.querySelector('.phero');
    if (hero){
      ['a','b'].forEach(k => { const f = document.createElement('div'); f.className = 'lx-fog ' + k; f.setAttribute('aria-hidden','true'); hero.appendChild(f); });
      const body = hero.querySelector('.phero-body');
      if (body){
        // coordenadas GPS decorativas (zona Mazunte–Zipolite) + línea dorada que se dibuja
        const gps = document.createElement('div'); gps.className = 'lx-gps'; gps.setAttribute('aria-hidden','true');
        gps.textContent = '15.6651° N · 96.5519° W';
        const line = document.createElement('div'); line.className = 'lx-line'; line.setAttribute('aria-hidden','true');
        body.appendChild(gps); body.appendChild(line);
        requestAnimationFrame(() => requestAnimationFrame(() => { line.style.width = '180px'; }));
      }
      // titular: reveal palabra a palabra
      const title = hero.querySelector('.phero-title');
      if (title && !title.querySelector('img')){
        const words = title.textContent.trim().split(/\s+/);
        title.innerHTML = words.map((w,i) => '<span class="lx-w"><span class="lx-wi" style="transition-delay:' + (.25 + i*.09).toFixed(2) + 's">' + w + '</span></span>').join(' ');
        requestAnimationFrame(() => requestAnimationFrame(() => title.querySelectorAll('.lx-wi').forEach(s => s.style.transform = 'translateY(0)')));
      }
    }
    // imágenes de galería: emergen del negro al entrar
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){ e.target.style.filter = ''; e.target.style.transform = ''; io.unobserve(e.target); }
    }), {threshold:.2});
    document.querySelectorAll('.grid img').forEach(im => {
      im.style.filter = 'brightness(0)'; im.style.transform = 'scale(1.12)';
      im.style.transition = 'filter 1.4s ease, transform 1.4s cubic-bezier(.16,1,.3,1)';
      io.observe(im);
    });
  }
})();
