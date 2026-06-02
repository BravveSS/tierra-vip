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
    const show = i => { idx = (i + srcs.length) % srcs.length; lbImg.src = srcs[idx]; };
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
  }

  // Año del footer
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
