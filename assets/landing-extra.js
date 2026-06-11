/* TIERRA — extra compartido de landings: idioma ES/EN completo + atmósfera + animaciones */
(function(){
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Parallax suave en la imagen del hero ── */
  const heroImg = document.querySelector('.phero-img');
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

  /* ── Entrada del contenido del hero ── */
  document.querySelectorAll('.phero-body > *').forEach((el, i) => {
    if (reduced) return;
    el.style.opacity = '0'; el.style.transform = 'translateY(26px)';
    el.style.transition = 'opacity .9s cubic-bezier(.16,1,.3,1) ' + (i*.12+.1) + 's, transform .9s cubic-bezier(.16,1,.3,1) ' + (i*.12+.1) + 's';
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; }));
  });

  /* ════════ IDIOMA ES/EN — contenido COMPLETO de las landings ════════ */
  // Pares exactos por textContent (el ES se restaura desde la captura inicial)
  const PAIRS = [
    // nav / comunes
    ['Proyectos','Projects'],['Construcción','Construction'],['Nosotros','About us'],['Galería','Gallery'],['Contacto','Contact'],
    ['← Todos los proyectos','← All projects'],['← Volver al inicio','← Back to home'],
    ['Hablar por WhatsApp','Chat on WhatsApp'],['Solicitar información','Request information'],
    ['Ver otros proyectos','See other projects'],['Ver proyectos','See projects'],['Lo que construimos','What we build'],
    ['Desarrollo y Construcción · Costa de Oaxaca','Development & Construction · Oaxaca Coast'],
    // subtítulos de hero
    ['Centro de bienestar holístico','Holistic wellness center'],['Terrenos frente al mar','Oceanfront land'],
    ['Comunidad sobre los acantilados','Community on the cliffs'],['Vida en comunidad','Community living'],
    ['Departamentos frente al mar','Oceanfront apartments'],['Casas reales, de clientes reales.','Real homes, for real clients.'],
    ['Arquitectura en armonía con la naturaleza','Architecture in harmony with nature'],
    // eyebrows
    ['Mazunte · Oaxaca','Mazunte · Oaxaca'],['Costa Oaxaqueña','Oaxacan Coast'],['Costa de Oaxaca','Oaxaca Coast'],
    ['San Antonio · Oaxaca · Próximamente','San Antonio · Oaxaca · Coming soon'],['Zipolite · Oaxaca · Preventa','Zipolite · Oaxaca · Pre-sale'],
    // AZIMUT
    ['Construye tu hogar dentro de un centro de bienestar holístico, a pocos pasos del centro de Mazunte. Lotes privados en ladera de selva nativa, con yoga shala, temazcal y alberca natural en el corazón de la comunidad.','Build your home inside a holistic wellness center, steps from the heart of Mazunte. Private jungle hillside lots with a yoga shala, temazcal and natural pool at the center of the community.'],
    ['Algunos terrenos cuentan con vista al Pacífico; todos comparten servicios completos y respaldo legal desde el primer día — para que vivir en armonía con la naturaleza no signifique renunciar a nada.','Some lots have Pacific views; all share full utilities and legal backing from day one — so living in harmony with nature never means giving anything up.'],
    ['Yoga Shala al aire libre','Open-air Yoga Shala'],['Temazcal tradicional','Traditional temazcal'],['Alberca natural con rocas','Natural rock pool'],
    ['Senderos a la playa','Trails to the beach'],['Sendero para bicicletas','Bicycle trail'],['Servicio de luz completo','Full power service'],
    ['Respaldo legal completo','Full legal backing'],['A pasos del centro de Mazunte','Steps from downtown Mazunte'],
    ['Tu lugar en Azimut te espera','Your place in Azimut awaits'],
    ['Agenda una visita o recibe el dossier completo con lotes disponibles, planos y condiciones.','Book a visit or get the full dossier with available lots, plans and terms.'],
    // NABANI
    ['Nabani — “hogar” en zapoteco — son terrenos frente al mar con acceso a playas caminando, a pasos de Zipolite y Mazunte.','Nabani — “home” in Zapotec — is oceanfront land with beaches within walking distance, steps from Zipolite and Mazunte.'],
    ['El lugar para levantar tu residencia de autor en madera, palma y piedra, donde cada amanecer se vive frente al Pacífico.','The place to build your signature residence in wood, palm and stone, where every sunrise happens in front of the Pacific.'],
    ['Acceso a playas caminando','Beaches within walking distance'],['Cerca de Zipolite y Mazunte','Near Zipolite and Mazunte'],
    ['Residencias de autor','Signature residences'],['Arquitectura en palma y madera','Palm & wood architecture'],
    ['Despierta frente al Pacífico','Wake up facing the Pacific'],
    ['Conoce los terrenos disponibles y las condiciones para construir tu residencia en Nabani.','Discover the available lots and the terms to build your residence at Nabani.'],
    // ALDEA TAO
    ['Sobre los acantilados del Pacífico, donde el océano golpea las rocas volcánicas y el horizonte no termina, nace una comunidad única.','On the Pacific cliffs, where the ocean strikes volcanic rock and the horizon never ends, a unique community is born.'],
    ['Construye tu casa frente al mar, con acceso a Playa Tololote y Playa La Boquilla — calas salvajes que no aparecen en los mapas.','Build your house facing the sea, with access to Tololote and La Boquilla — wild coves that appear on no map.'],
    ['Acceso a Playa Tololote','Access to Tololote Beach'],['Acceso a Playa La Boquilla','Access to La Boquilla Beach'],
    ['Vista panorámica al Pacífico','Panoramic Pacific views'],['Acantilados sobre el océano','Cliffs over the ocean'],
    ['Proyecto exclusivo y limitado','Exclusive limited project'],['Escrituración garantizada','Guaranteed deeds'],
    ['Un lugar que todavía es salvaje','A place that is still wild'],
    ['Aldea Tao es un proyecto limitado. Solicita información y disponibilidad antes de que se agote.','Aldea Tao is a limited project. Request information and availability before it sells out.'],
    // SERENA
    ['Serena es un proyecto de vida en comunidad junto a Mazunte: jardín comunitario, huerto orgánico y arquitectura que abraza la tierra.','Serena is a community-living project next to Mazunte: community garden, organic orchard and architecture that embraces the land.'],
    ['Un lugar pensado para quienes buscan vivir con valores ecológicos, en equilibrio con el entorno. Próximo a lanzarse.','A place for those who want to live by ecological values, in balance with their surroundings. Launching soon.'],
    ['Jardín comunitario','Community garden'],['Huerto orgánico','Organic orchard'],['Arquitectura sustentable','Sustainable architecture'],
    ['Junto a Mazunte','Next to Mazunte'],['Lanzamiento próximo','Launching soon'],
    ['Sé parte de Serena','Be part of Serena'],
    ['Serena está por lanzarse. Regístrate en la lista de espera y sé de los primeros en conocer la disponibilidad.','Serena is about to launch. Join the waitlist and be among the first to know availability.'],
    // DEPAS KORA
    ['Uno de los proyectos de departamentos más innovadores de la Costa de Oaxaca, a pocos minutos de Zipolite, con vistas al mar y rodeado de naturaleza.','One of the most innovative apartment projects on the Oaxaca Coast, minutes from Zipolite, with ocean views and surrounded by nature.'],
    ['Diseño minimalista y vida contemporánea, en preventa — los mejores precios son ahora.','Minimalist design and contemporary living, in pre-sale — the best prices are now.'],
    ['Las imágenes son renders de inspiración del diseño que tendrán los departamentos.','The images are inspiration renders of the design the apartments will have.'],
    ['Acceso a playa','Beach access'],['Vistas al océano','Ocean views'],['Diseño minimalista','Minimalist design'],
    ['Rodeado de naturaleza','Surrounded by nature'],['A minutos de Zipolite','Minutes from Zipolite'],['Etapa de preventa','Pre-sale stage'],
    ['Asegura tu departamento en preventa','Secure your apartment in pre-sale'],
    ['Los precios de preventa son por tiempo limitado. Recibe la información detallada de Depas Kora.','Pre-sale prices are for a limited time. Get the full details of Depas Kora.'],
    // CONSTRUCCIÓN
    ['El procedimiento','The process'],['Cómo construimos','How we build'],
    ['Obra terminada · Cliente real','Finished work · Real client'],['En proceso · Cliente real','In progress · Real client'],
    ['Recomendaciones','Testimonials'],['Clientes que ya lo viven','Clients already living it'],
    ['Acompañamos cada proyecto de principio a fin: del diseño arquitectónico a la entrega llave en mano. Construimos con materiales nobles, mano de obra local y un respeto absoluto por el entorno — para que tu espacio nazca en armonía con la tierra que lo rodea.','We accompany every project from start to finish: from architectural design to turnkey delivery. We build with noble materials, local craftsmanship and absolute respect for the surroundings — so your space is born in harmony with the land around it.'],
    ['Encuentra tu terreno, diseña tu hogar, construye con confianza.','Find your land, design your home, build with confidence.'],
    ['Asesoría y terreno','Consultation & land'],['Conocemos tu visión y elegimos juntos el terreno ideal dentro de nuestros desarrollos en la Costa de Oaxaca.','We get to know your vision and choose the ideal lot together within our developments on the Oaxaca Coast.'],
    ['Diseño de autor','Signature design'],['Proyectamos tu casa según la topografía, la luz y el entorno — arquitectura pensada para el lugar, no impuesta sobre él.','We design your home around the topography, the light and the surroundings — architecture made for the place, not imposed on it.'],
    ['Permisos y respaldo legal','Permits & legal backing'],['Gestionamos escrituración, permisos y servicios. Todo en regla, con acompañamiento legal desde el día uno.','We handle deeds, permits and utilities. Everything in order, with legal support from day one.'],
    ['Levantamos tu hogar con materiales nobles y mano de obra local, cuidando cada detalle y cada plazo.','We raise your home with noble materials and local craftsmanship, taking care of every detail and every deadline.'],
    ['Entrega llave en mano','Turnkey delivery'],['Te entregamos tu casa lista para habitar. De principio a fin, con un solo equipo responsable.','We deliver your home ready to live in. From start to finish, with a single accountable team.'],
    ["Casa Yuu'Kee, en La Boquilla, es uno de los proyectos más ambiciosos que ha construido Tierra. De un terreno en bruto a un hogar terminado — una obra que habla por sí sola.","Casa Yuu'Kee, in La Boquilla, is one of the most ambitious projects Tierra has built. From raw land to a finished home — work that speaks for itself."],
    ['Otro proyecto en marcha: el terreno y los primeros trazos de lo que será un nuevo hogar en la costa.','Another project underway: the land and the first lines of what will become a new home on the coast.'],
    ['¿Listo para construir el tuyo?','Ready to build yours?'],
    ['Cuéntanos qué imaginas y te acompañamos desde el terreno hasta la entrega.','Tell us what you imagine and we will walk with you from the land to the delivery.'],
    // NOSOTROS
    ['Nuestra filosofía','Our philosophy'],['Confianza','Trust'],['Años construyendo sueños','Years building dreams'],
    ['Cada proyecto es un ecosistema con identidad propia: impulsa la economía local, respeta el entorno natural y construye comunidad. Somos una empresa confiable que acompaña al cliente en todo el proceso — invertir con nosotros también significa transformar el futuro.','Each project is an ecosystem with its own identity: it boosts the local economy, respects nature and builds community. We are a trusted company that walks with the client through the whole process — investing with us also means transforming the future.'],
    ['Cada proyecto nace de escuchar la tierra: entender su topografía, su historia, su luz. Diseñamos lugares para vivir distinto — espacios que respetan el terreno, aprovechan la luz y conviven con el entorno que los rodea.','Every project is born from listening to the land: understanding its topography, its history, its light. We design places to live differently — spaces that respect the terrain, use the light and coexist with their surroundings.'],
    ['Arquitectura de autor para cada terreno','Signature architecture for every lot'],['Materiales nobles y mano de obra local','Noble materials and local craftsmanship'],
    ['Respaldo legal y escrituración garantizada','Legal backing and guaranteed deeds'],['Acompañamiento de principio a fin','Support from start to finish'],
    ['Plusvalía en la Costa de Oaxaca','Appreciation on the Oaxaca Coast'],['Comunidad y legado a largo plazo','Community and long-term legacy'],
    ['Clientes felices','Happy clients'],['Años de trayectoria','Years of experience'],['Proyectos activos','Active projects'],
    ['Conoce nuestros proyectos','Discover our projects'],
    ['Cinco desarrollos únicos en la Costa de Oaxaca, cada uno con su propia identidad.','Five unique developments on the Oaxaca Coast, each with its own identity.'],
    // tabs visitas (por si existen)
    ['Visita presencial','In-person visit'],['Visita virtual','Virtual visit'],
  ];
  const ES2EN = new Map(PAIRS);
  const EN2ES = new Map(PAIRS.map(([a,b]) => [b,a]));

  // h2 con markup (innerHTML exacto)
  const HPAIRS = [
    ['No solo desarrollamos la tierra. <em>La construimos contigo.</em>',"We don't just develop the land. <em>We build it with you.</em>"],
    ['Construimos <em>con</em> la naturaleza,<br>no sobre ella.','We build <em>with</em> nature,<br>not on top of it.'],
    ['Tierra nace para crear <em>hábitats contemporáneos</em> que conectan arquitectura, cultura y naturaleza, dejando un legado positivo en cada desarrollo.','Tierra was born to create <em>contemporary habitats</em> that connect architecture, culture and nature, leaving a positive legacy in every development.'],
  ];

  // títulos del hero (se re-splitean tras traducir)
  const TITLE_PAIRS = new Map([['Lo que ya construimos.','What we have already built.']]);

  // nodos de texto plano que participan en la traducción
  const SCOPE = document.querySelectorAll('.pnav-links a, .backlink, .btn, .eyebrow, .ftag, .stats .l, .vis-tab, .lead, .h2, .phero-sub, .phero-eyebrow, .feats li, .step h3, .step p, figcaption');
  const captured = [...SCOPE].map(el => ({ el, es: el.textContent.trim(), html: el.innerHTML }));
  const heroTitle = document.querySelector('.phero-title');
  // OJO: <br> no aporta espacio al textContent — convertirlo antes de extraer el texto
  const titleText = el => el.innerHTML.replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  const heroTitleES = heroTitle ? titleText(heroTitle) : '';

  function splitTitle(el){
    if (reduced || !el || el.querySelector('img')) return;
    const words = titleText(el).split(/\s+/);
    el.innerHTML = words.map((w,i) => '<span class="lx-w"><span class="lx-wi" style="transition-delay:' + (.15 + i*.08).toFixed(2) + 's">' + w + '</span></span>').join(' ');
    requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('.lx-wi').forEach(s => s.style.transform = 'translateY(0)')));
  }

  function apply(lang){
    window.__LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    captured.forEach(({el, es, html}) => {
      // primero los h2 con markup
      const hp = HPAIRS.find(([a]) => html.trim() === a || el.innerHTML.trim() === a);
      if (hp){ el.innerHTML = lang === 'en' ? hp[1] : hp[0]; return; }
      const hpEN = HPAIRS.find(([,b]) => el.innerHTML.trim() === b);
      if (hpEN){ el.innerHTML = lang === 'en' ? hpEN[1] : hpEN[0]; return; }
      const cur = el.textContent.trim();
      if (lang === 'en'){ if (ES2EN.has(cur)) el.textContent = ES2EN.get(cur); }
      else { if (EN2ES.has(cur)) el.textContent = EN2ES.get(cur); else if (ES2EN.has(es) && cur !== es) el.textContent = es; }
    });
    // "Un recorrido por X" (conserva el <em>)
    document.querySelectorAll('.h2').forEach(h => {
      if (h.firstChild && h.firstChild.nodeType === 3){
        const t = h.firstChild.nodeValue;
        if (lang === 'en' && /Un recorrido por/.test(t)) h.firstChild.nodeValue = t.replace('Un recorrido por','A journey through');
        if (lang === 'es' && /A journey through/.test(t)) h.firstChild.nodeValue = t.replace('A journey through','Un recorrido por');
      }
    });
    // título del hero (re-split para conservar el reveal)
    if (heroTitle && !heroTitle.querySelector('img')){
      const target = lang === 'en' ? (TITLE_PAIRS.get(heroTitleES) || heroTitleES) : heroTitleES;
      heroTitle.textContent = target;
      splitTitle(heroTitle);
    }
    // propagar el idioma en los enlaces internos
    document.querySelectorAll('a[href$=".html"], a[href*=".html#"]').forEach(a => {
      const base = a.getAttribute('href').split('?')[0];
      a.setAttribute('href', lang === 'en' ? base + (base.includes('#') ? '' : '?lang=en') : base);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(b => b.classList.toggle('on', b.dataset.langBtn === lang));
    try{ localStorage.setItem('tierraLang', lang); }catch(_){}
  }
  document.querySelectorAll('[data-lang-btn]').forEach(b => b.addEventListener('click', () => apply(b.dataset.langBtn)));
  // idioma inicial: ?lang → localStorage → 'es'
  let initLang = new URLSearchParams(location.search).get('lang');
  if (!initLang){ try{ initLang = localStorage.getItem('tierraLang'); }catch(_){} }

  /* ── ATMÓSFERA (viñeta + niebla + línea dorada + word-reveal del título) ── */
  if (!reduced){
    const st = document.createElement('style');
    st.textContent = '.lx-vignette{position:fixed;inset:0;z-index:9990;pointer-events:none;background:radial-gradient(ellipse at center,transparent 58%,rgba(0,0,0,.34) 100%)}'
      + '.lx-fog{position:absolute;width:46vw;height:46vw;max-width:600px;max-height:600px;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:1;background:radial-gradient(circle,rgba(201,169,110,.13),transparent 65%);will-change:transform}'
      + '.lx-fog.a{top:-12%;left:-8%;animation:lxDrift 22s ease-in-out infinite alternate}'
      + '.lx-fog.b{bottom:-15%;right:-10%;animation:lxDrift 26s ease-in-out infinite alternate-reverse}'
      + '@keyframes lxDrift{from{transform:translate(0,0) scale(1)}to{transform:translate(9vw,5vh) scale(1.18)}}'
      + '.lx-line{width:0;height:1px;background:linear-gradient(to right,var(--gold),transparent);margin-top:16px;transition:width 1.4s cubic-bezier(.16,1,.3,1) .9s}'
      + '.lx-w{display:inline-block;overflow:hidden;vertical-align:bottom}.lx-wi{display:inline-block;transform:translateY(108%);transition:transform .85s cubic-bezier(.16,1,.3,1)}'
      + '@media (prefers-reduced-motion:reduce){.lx-vignette,.lx-fog{display:none}}';
    document.head.appendChild(st);
    const v = document.createElement('div'); v.className = 'lx-vignette'; v.setAttribute('aria-hidden','true');
    document.body.appendChild(v);
    const hero = document.querySelector('.phero');
    if (hero){
      ['a','b'].forEach(k => { const f = document.createElement('div'); f.className = 'lx-fog ' + k; f.setAttribute('aria-hidden','true'); hero.appendChild(f); });
      const body = hero.querySelector('.phero-body');
      if (body){
        const line = document.createElement('div'); line.className = 'lx-line'; line.setAttribute('aria-hidden','true');
        body.appendChild(line);
        requestAnimationFrame(() => requestAnimationFrame(() => { line.style.width = '180px'; }));
      }
      splitTitle(hero.querySelector('.phero-title'));
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

  // aplicar idioma inicial DESPUÉS del split del título (para re-splitear traducido)
  if (initLang === 'en') apply('en');
})();
