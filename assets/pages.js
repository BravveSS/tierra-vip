/* TIERRA — comportamiento compartido de páginas secundarias */
(function(){
  'use strict';

  // Nav: estado al hacer scroll
  const nav = document.querySelector('.pnav');
  const onScroll = () => { if(nav) nav.classList.toggle('scrolled', window.scrollY > 40); };
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

  // Menú móvil
  const ham = document.querySelector('.pnav-ham');
  const links = document.querySelector('.pnav-links');
  if(ham && links){
    ham.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // Animaciones al entrar en viewport
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.16 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Lightbox a partir de las figuras de .grid (y .lbx)
  const items = [...document.querySelectorAll('.grid figure img, img.lbx')];
  if(items.length){
    const lb = document.createElement('div');
    lb.id = 'lb';
    lb.innerHTML = '<button class="x" aria-label="Cerrar">&times;</button>'
      + '<button class="nav prev" aria-label="Anterior">&#8592;</button>'
      + '<img alt=""><button class="nav next" aria-label="Siguiente">&#8594;</button>';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img');
    const srcs = items.map(i => i.currentSrc || i.src);
    let idx = 0;
    // transición suave al cambiar (fade rápido, sin salto de zoom)
    lbImg.style.transition = 'opacity .18s ease';
    const show = i => {
      idx = (i + srcs.length) % srcs.length;
      lbImg.style.opacity = '0';
      const url = srcs[idx];
      const pre = new Image();
      pre.onload = () => { lbImg.src = url; lbImg.style.opacity = '1'; };
      pre.src = url;
    };
    items.forEach((im, i) => im.addEventListener('click', () => { show(i); lb.classList.add('open'); }));
    lb.querySelector('.x').addEventListener('click', () => lb.classList.remove('open'));
    lb.querySelector('.prev').addEventListener('click', e => { e.stopPropagation(); show(idx-1); });
    lb.querySelector('.next').addEventListener('click', e => { e.stopPropagation(); show(idx+1); });
    lb.addEventListener('click', e => { if(e.target === lb) lb.classList.remove('open'); });
    document.addEventListener('keydown', e => {
      if(!lb.classList.contains('open')) return;
      if(e.key === 'Escape') lb.classList.remove('open');
      if(e.key === 'ArrowLeft') show(idx-1);
      if(e.key === 'ArrowRight') show(idx+1);
    });
    // DESLIZAR en móvil: swipe horizontal cambia de imagen; swipe vertical cierra
    let tx = 0, ty = 0, tmoved = false;
    lb.addEventListener('touchstart', e => {
      const t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; tmoved = false;
    }, { passive: true });
    lb.addEventListener('touchmove', () => { tmoved = true; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if(!tmoved) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - tx, dy = t.clientY - ty;
      if(Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { show(idx + (dx < 0 ? 1 : -1)); }
      else if(dy > 70 && Math.abs(dy) > Math.abs(dx)) { lb.classList.remove('open'); }
    }, { passive: true });
  }

  // Año del footer
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
