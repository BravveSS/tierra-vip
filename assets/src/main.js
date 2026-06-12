
(function(){
'use strict';
gsap.registerPlugin(ScrollTrigger);

/* Flags globales — definidos PRIMERO porque varios bloques los leen */
window.__REDUCED  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
window.__PERF_LOW = (navigator.hardwareConcurrency || 8) < 4 || window.matchMedia('(max-width:768px)').matches;

/* ════════════════════════════════════════
   PARTICLES
═══════════════════════════════════════ */
const ptx = document.getElementById('ptx');
const pctx = ptx.getContext('2d');
let pw, ph, ptArr = [];

function resizePtx(){
  pw = ptx.width  = window.innerWidth;
  ph = ptx.height = window.innerHeight;
}
resizePtx();
window.addEventListener('resize', resizePtx);

function pnoise(x, y, t){
  return (Math.sin(x*1.1+t*.8)*Math.cos(y*.9+t*.6)*.55
        + Math.sin(x*2.3+t*1.2+1.5)*Math.cos(y*2.0+t*.9+1)*.3
        + Math.sin(x*4.5+t*2.1+3)*Math.cos(y*3.8+t*1.8+2)*.15);
}

for(let i=0;i<90;i++){
  ptArr.push({
    x: Math.random()*window.innerWidth,
    y: Math.random()*window.innerHeight,
    sz: .8+Math.random()*2.2,
    sp: .18+Math.random()*.38,
    op: .06+Math.random()*.18,
    nx: Math.random()*1000,
    ny: Math.random()*1000,
  });
}

// Pausa de partículas: pestaña oculta, scroll lejos del hero o reduced-motion (ahorro de batería)
let pt0 = null, ptxRun = true;
document.addEventListener('visibilitychange', ()=>{ ptxRun = !document.hidden; });
window.addEventListener('scroll', ()=>{ ptxRun = !document.hidden && window.scrollY < window.innerHeight * 1.6; }, {passive:true});
function animPtx(ts){
  if(!ptxRun || window.__REDUCED){ requestAnimationFrame(animPtx); return; }
  if(!pt0) pt0 = ts;
  const t = (ts-pt0)/1000;
  pctx.clearRect(0,0,pw,ph);
  ptArr.forEach(p=>{
    const n = pnoise(p.x/250+p.nx, p.y/250+p.ny, t);
    p.x += n*.4;
    p.y -= p.sp;
    if(p.y<-4){ p.y=ph+4; p.x=Math.random()*pw; }
    if(p.x<-4) p.x=pw+4;
    if(p.x>pw+4) p.x=-4;
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.sz, 0, Math.PI*2);
    pctx.fillStyle = `rgba(201,169,110,${p.op})`;
    pctx.fill();
  });
  requestAnimationFrame(animPtx);
}
requestAnimationFrame(animPtx);

/* ════════════════════════════════════════
   LENIS
═══════════════════════════════════════ */
const lenis = new Lenis({
  duration:1.38,
  easing: t => Math.min(1,1.001-Math.pow(2,-10*t)),
  smoothWheel:true,
});
gsap.ticker.add(t => lenis.raf(t*1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  if (a.closest('#nav') || a.closest('#mob-menu')) return; // el nav usa sweepTo (transición dorada)
  a.addEventListener('click',e=>{
    const tgt = document.querySelector(a.getAttribute('href'));
    if(tgt){ e.preventDefault(); lenis.scrollTo(tgt,{offset:-72}); }
  });
});

/* ════════════════════════════════════════
   LOADER  — slides UP on complete
═══════════════════════════════════════ */
const loader = document.getElementById('loader');
const ldN    = document.getElementById('ld-n');
const cobj   = {n:0};

// Pre-start video silently so it's ready
const vid = document.getElementById('hvid');
if (vid) { vid.load(); vid.play().catch(()=>{}); }

// ── PRELOAD ALL IMAGES DURING LOADER ────────────
// Browser fetches everything while user watches the intro
// By scroll time, images are already in cache — no blank flashes
(function preloadAll() {
  const imgs = [
    // Imágenes principales de cada proyecto (lo que se ve al hacer scroll)
    'assets/img/azimut/renderazimutyogashala.webp',
    'assets/img/nabani/dronnabani.webp',
    'assets/img/aldea-tao/dronaldeatao.webp',
    'assets/img/serena/renderserena-2.webp',
    'assets/img/kora/rs-w-719-h-1079-1.webp',
  ];

  // Stagger loads so we don't block the main thread
  // Load in batches of 4 every 200ms
  let i = 0;
  function loadBatch() {
    for (let b = 0; b < 4 && i < imgs.length; b++, i++) {
      const im = new Image();
      im.src = imgs[i];
    }
    if (i < imgs.length) setTimeout(loadBatch, 150);
  }
  // Start after a tiny delay so loader animation renders first
  setTimeout(loadBatch, 100);
})();

const ldTl = gsap.timeline({
  onComplete(){
    // Slide loader UP
    gsap.to(loader, {
      y: '-100vh', duration: .65, ease: 'power2.inOut',
      onComplete() {
        loader.style.display = 'none';
        // Curtain opens: clip-path reveals from top → bottom
        const curtain = document.getElementById('curtain');
        if (curtain) {
          gsap.to(curtain, {
            clipPath: 'inset(0 0 100% 0)',
            duration: .9, ease: 'power3.inOut',
            onComplete() { curtain.style.display = 'none'; }
          });
        }
        startHero();
      }
    });
  }
});
// Momento de misterio: la frase aparece letra a letra antes del logo
(function(){
  const ph = document.getElementById('ld-phrase');
  const PHRASE = 'Hay lugares que aún no aparecen en los mapas.';
  if (!ph || window.__REDUCED){ if (ph) ph.textContent = PHRASE; return; }
  let i = 0;
  const iv = setInterval(() => {
    ph.textContent = PHRASE.slice(0, ++i);
    if (i >= PHRASE.length) clearInterval(iv);
  }, 28);
})();

ldTl
  .to('#ld-logo', {scale:1, opacity:1, duration:.65, ease:'power3.out'}, 1.45)
  .to('#ld-logo', {scale:1.04, duration:.22, ease:'power1.out', yoyo:true, repeat:1}, 2.1)
  .to('#ld-line', {scaleX:1, duration:.72, ease:'power2.inOut'}, 2.25);

gsap.to(cobj,{n:100,duration:2.8,ease:'power1.inOut',delay:.15,
  onUpdate(){ ldN.textContent = Math.round(cobj.n); }
});

/* ════════════════════════════════════════
   NAV
═══════════════════════════════════════ */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start:'top -72',
  onEnter:     ()=> nav.classList.add('solid'),
  onLeaveBack: ()=> nav.classList.remove('solid'),
});

['sec-projects','manifesto','g3d','chat'].forEach(id=>{
  const el = document.getElementById(id); if(!el) return;
  const a  = document.querySelector(`.nav-links a[href="#${id}"]`); if(!a) return;
  ScrollTrigger.create({
    trigger:el, start:'top center', end:'bottom center',
    onEnter:()=>a.classList.add('active'), onLeave:()=>a.classList.remove('active'),
    onEnterBack:()=>a.classList.add('active'), onLeaveBack:()=>a.classList.remove('active'),
  });
});

const ham = document.getElementById('ham');
const mob = document.getElementById('mob-menu');
const mlinks = mob.querySelectorAll('a');
ham.addEventListener('click',()=>{
  const open = mob.classList.toggle('open');
  ham.classList.toggle('open');
  document.body.classList.toggle('menu-open',open);
  if(open){
    gsap.fromTo(mlinks,{opacity:0,x:42},{opacity:1,x:0,duration:.42,ease:'power3.out',stagger:.08,delay:.08});
  } else {
    gsap.to(mlinks,{opacity:0,x:42,duration:.2});
  }
});
mlinks.forEach(a=> a.addEventListener('click',()=>{
  mob.classList.remove('open'); ham.classList.remove('open');
  document.body.classList.remove('menu-open');
}));

/* ════════════════════════════════════════
   HERO entrance  (called after loader)
═══════════════════════════════════════ */
document.getElementById('hvid').addEventListener('error',()=>{
  document.getElementById('hfall').style.display='block';
});

// Set hero elements hidden BEFORE loader exits — no flash
gsap.set('#hpre',  {opacity:0, y:14});
gsap.set('#hl1',   {opacity:0, y:'110%'});
gsap.set('#hl2',   {opacity:0, y:'110%'});
gsap.set('#hsub',  {opacity:0, y:18});
gsap.set('#hctas', {opacity:0, y:18});
gsap.set('#sind',  {opacity:0});

function startHero(){
  // Efecto scramble en la línea superior del hero (usa la función scramble)
  const hp = document.getElementById('hpre');
  if (hp && !window.__REDUCED) setTimeout(()=> scramble(hp, hp.textContent, 850), 380);
  const tl = gsap.timeline();
  tl.to('#hpre',  {opacity:1,y:0,duration:.65,ease:'power3.out'},.3)
    .to('#hl1',   {y:'0%',opacity:1,duration:.72,ease:'expo.out'},.6)
    .to('#hl2',   {y:'0%',opacity:1,duration:.72,ease:'expo.out'},.78)
    .to('#hsub',  {opacity:1,y:0,duration:.6,ease:'power3.out'},1.12)
    .to('#hctas', {opacity:1,y:0,duration:.55,ease:'power3.out'},1.5)
    .to('#sind',  {opacity:1,duration:.5,ease:'power2.out'},2.0);
}

// ── ESCENA 1: hero pinned — la cámara "entra" en el paisaje al scrollear ──
if (window.matchMedia('(min-width:769px)').matches && !window.__REDUCED){
  gsap.timeline({
    scrollTrigger:{ trigger:'#hero', start:'top top', end:'+=85%', pin:true, scrub:.6, anticipatePin:1,
      onLeave(){ gsap.to('.lbox',{height:0,duration:.6,ease:'power2.out'}); },
      onEnterBack(){ gsap.to('.lbox',{height:'6vh',duration:.6,ease:'power2.out'}); } }
  })
  .to('.lbox',  { height:'6vh', ease:'none' }, 0)           // las barras de cine se cierran
  .to('#hvid',  { scale:1.22, ease:'none' }, 0)
  .to('.hgrad', { opacity:1.6, ease:'none' }, 0)
  .to('#hbody', { opacity:0, y:-90, filter:'blur(6px)', ease:'none' }, .12)
  .to('#sind',  { opacity:0, ease:'none' }, 0);
} else {
  // móvil / reduced: parallax simple sin pin
  gsap.to('#hvid', { yPercent: 16, ease:'none',
    scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true}});
  gsap.to('#hbody', { opacity:0, y:-60, ease:'none',
    scrollTrigger:{trigger:'#hero',start:'top top',end:'40% top',scrub:true}});
  gsap.to('#sind', { opacity:0, ease:'none',
    scrollTrigger:{trigger:'#hero',start:'top top',end:'20% top',scrub:true}});
}

/* ════════════════════════════════════════
   WAVES — organic dual-path morph
═══════════════════════════════════════ */
[
  {id:'w1a',d:'M0,38 C200,78 400,8 600,42 C800,76 1000,8 1200,42 C1325,64 1405,22 1440,40 L1440,110 L0,110 Z',dur:5.2},
  {id:'w1b',d:'M0,58 C220,22 440,78 660,42 C880,8 1105,68 1325,38 C1395,22 1428,55 1440,48 L1440,110 L0,110 Z',dur:6.8},
  {id:'w2a',d:'M0,60 C260,22 520,85 780,32 C1040,0 1245,72 1440,42 L1440,110 L0,110 Z',dur:5.5},
  {id:'w2b',d:'M0,38 C180,72 360,18 540,58 C720,96 900,22 1080,55 C1255,86 1388,30 1440,58 L1440,110 L0,110 Z',dur:7.2},
  {id:'w3a',d:'M0,56 C320,18 640,72 960,28 C1120,6 1305,58 1440,22 L1440,80 L0,80 Z',dur:4.8},
  {id:'w3b',d:'M0,28 C200,62 480,10 720,54 C960,94 1185,18 1440,46 L1440,80 L0,80 Z',dur:6.1},
  {id:'w4a',d:'M0,56 C260,12 520,78 780,28 C1040,0 1248,72 1440,22 L1440,80 L0,80 Z',dur:5.0},
  {id:'w4b',d:'M0,28 C180,66 360,12 540,52 C720,90 900,20 1080,58 C1258,90 1388,22 1440,52 L1440,80 L0,80 Z',dur:6.5},
  {id:'w5a',d:'M0,38 C260,88 520,5 780,55 C1040,100 1240,15 1440,55 L1440,110 L0,110 Z',dur:5.4},
  {id:'w5b',d:'M0,58 C200,15 400,78 600,30 C800,0 1005,72 1205,38 C1328,15 1408,58 1440,32 L1440,110 L0,110 Z',dur:7.0},
  {id:'w6a',d:'M0,30 C240,72 480,5 720,55 C960,98 1205,12 1440,52 L1440,90 L0,90 Z',dur:5.2},
  {id:'w6b',d:'M0,52 C200,18 400,62 600,38 C800,14 1005,60 1205,35 C1338,12 1408,48 1440,38 L1440,90 L0,90 Z',dur:6.8},
  {id:'w7a',d:'M0,48 C360,8 720,62 1080,18 C1252,0 1388,44 1440,18 L1440,70 L0,70 Z',dur:5.5},
].forEach(w=>{
  const el=document.getElementById(w.id); if(!el) return;
  gsap.to(el,{attr:{d:w.d},duration:w.dur,ease:'sine.inOut',repeat:-1,yoyo:true});
});

/* ════════════════════════════════════════
   MANIFESTO
═══════════════════════════════════════ */
gsap.to('#mf-ri',{scaleX:1,duration:.85,ease:'power2.inOut',
  scrollTrigger:{trigger:'#manifesto',start:'top 78%'}});
gsap.to('#mf-ro',{scaleX:1,duration:.85,ease:'power2.inOut',
  scrollTrigger:{trigger:'#manifesto',start:'bottom 85%'}});

// ── ESCENA 2: manifiesto pinned — cada frase emerge mientras se scrubea ──
if (window.matchMedia('(min-width:769px)').matches && !window.__REDUCED){
  gsap.timeline({
    scrollTrigger:{ trigger:'#manifesto', start:'top top', end:'+=110%', pin:true, scrub:.7, anticipatePin:1 }
  })
  .to('#mfl1',{clipPath:'polygon(0 0%,100% 0%,100% 100%,0 100%)',ease:'power2.out',duration:1}, 0)
  .to('#mfl2',{clipPath:'polygon(0 0%,100% 0%,100% 100%,0 100%)',ease:'power2.out',duration:1}, .8)
  .to('#mfl3',{clipPath:'polygon(0 0%,100% 0%,100% 100%,0 100%)',ease:'power2.out',duration:1}, 1.6)
  .fromTo('#manifesto > p',{opacity:0,y:26},{opacity:1,y:0,ease:'power2.out',duration:1}, 2.3);
} else {
  ['#mfl1','#mfl2','#mfl3'].forEach((s,i)=>{
    gsap.to(s,{ clipPath:'polygon(0 0%,100% 0%,100% 100%,0 100%)', duration:.92, ease:'power3.out',
      scrollTrigger:{trigger:s,start:'top 82%'}, delay:i*.22 });
  });
}

// Números de sección gigantes: profundidad extra (cada capa a su velocidad)
if (!window.__REDUCED){
  document.querySelectorAll('.pbgn').forEach(el => {
    gsap.fromTo(el, {yPercent:-22}, {yPercent:22, ease:'none',
      scrollTrigger:{trigger:el.parentElement, start:'top bottom', end:'bottom top', scrub:true}});
  });
}

// Escenas: cada sección principal emerge de la oscuridad al entrar
if (!window.__REDUCED){
  const scns = ['#masterplan','#coming','#invertir','#construccion','#proceso','#comparador','#confianza','#entregados','#visitas','#chat'];
  const ioScn = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add('in'); ioScn.unobserve(e.target); }
  }), { threshold:.12 });
  scns.forEach(s => { const el = document.querySelector(s); if (el){ el.classList.add('scn'); ioScn.observe(el); } });
}

// Marquee reactivo: se inclina con la velocidad del scroll
(function(){
  const track = document.getElementById('mq1');
  if (!track || window.__REDUCED) return;
  let skew = 0;
  lenis.on('scroll', e => {
    const target = Math.max(-8, Math.min(8, (e.velocity || 0) * .35));
    skew += (target - skew) * .15;
    track.style.transform = 'skewX(' + skew.toFixed(2) + 'deg)';
  });
})();

document.querySelectorAll('.mfn').forEach(el=>{
  const t=+el.dataset.t, s=el.dataset.s||'';
  let ran=false;
  function run(){
    if(ran) return; ran=true;
    const o={n:0};
    gsap.to(o,{n:t,duration:1.9,ease:'power2.out',
      onUpdate(){ el.textContent=Math.round(o.n)+s; }
    });
  }
  ScrollTrigger.create({trigger:el,start:'top 86%',once:true,onEnter:run});
  // red de seguridad: si por cualquier motivo el trigger no corre, mostrar el valor real
  new IntersectionObserver((es,o)=>{ if(es[0].isIntersecting){ run(); o.disconnect(); } },{threshold:.4}).observe(el);
});

gsap.to('.mfs',{opacity:1,y:0,duration:.75,ease:'power3.out',stagger:.12,
  scrollTrigger:{trigger:'.mf-stats',start:'top 88%'}});

/* ════════════════════════════════════════
   PROJECTS
═══════════════════════════════════════ */
// Azimut: image right, wipe left (inset clips from right side out)
gsap.to('#piw-az',{clipPath:'inset(0 0% 0 0)',duration:1.25,ease:'power3.inOut',
  scrollTrigger:{trigger:'#pc-az',start:'top 74%'}});
gsap.fromTo('#pco-az',{opacity:0,x:-32},{opacity:1,x:0,duration:.92,ease:'power3.out',
  scrollTrigger:{trigger:'#pc-az',start:'top 70%'}});

// Nabani: image left, wipe right
gsap.to('#piw-nb',{clipPath:'inset(0 0 0 0%)',duration:1.25,ease:'power3.inOut',
  scrollTrigger:{trigger:'#pc-nb',start:'top 74%'}});
gsap.fromTo('#pco-nb',{opacity:0,x:32},{opacity:1,x:0,duration:.92,ease:'power3.out',
  scrollTrigger:{trigger:'#pc-nb',start:'top 70%'}});

// Aldea Tao: full bleed, content up
gsap.fromTo('#pco-at',{opacity:0,y:24},{opacity:1,y:0,duration:.9,ease:'power3.out',
  scrollTrigger:{trigger:'#pc-at',start:'top 74%'}});

// Las imágenes de proyecto emergen del negro (la luz las descubre)
if (!window.__REDUCED){
  [['#pc-az','#pc-az .piw img'],['#pc-nb','#pc-nb .piw img'],['#pc-at','#pc-at .piw img']].forEach(([card,img])=>{
    gsap.fromTo(img, {filter:'brightness(0) contrast(1.04) saturate(1.08)'},
      {filter:'brightness(1) contrast(1.04) saturate(1.08)', duration:1.6, ease:'power2.out',
       scrollTrigger:{trigger:card, start:'top 72%'}});
  });
}

// Parallax on images
if(window.matchMedia('(min-width:769px)').matches){
  [['#pc-az','#pc-az .piw img'],['#pc-nb','#pc-nb .piw img'],['#pc-at','#pc-at .piw img']].forEach(([card,img])=>{
    gsap.to(img,{yPercent:-9,ease:'none',
      scrollTrigger:{trigger:card,start:'top bottom',end:'bottom top',scrub:true}});
  });
}

/* ════════════════════════════════════════
   LIGHTBOX
═══════════════════════════════════════ */
const lbSets = {
  az:['assets/img/azimut/dronazimut.webp','assets/img/azimut/vistaazimut.webp',
      'assets/img/azimut/fotorealazimut.webp','assets/img/azimut/fotorealazimut2.webp',
      'assets/img/azimut/renderazimutyogashala.webp'],
  nb:['assets/img/nabani/dronnabani.webp','assets/img/nabani/fotorealnabani.webp',
      'assets/img/nabani/fotorealnabaniplayaaguete.webp','assets/img/nabani/vistanabani.webp',
      'assets/img/nabani/rendernabani.webp','assets/img/nabani/rendernabani2.webp'],
  at:['assets/img/aldea-tao/dronaldeatao.webp','assets/img/aldea-tao/fotorealaldeatao.webp',
      'assets/img/aldea-tao/fotorealaldeatao2.webp','assets/img/aldea-tao/vistaaldeatao.webp',
      'assets/img/aldea-tao/renderaldeatao.webp','assets/img/aldea-tao/renderaldeatao2png.webp'],
};
let lbSet=[], lbIdx=0;
const lbEl   = document.getElementById('lb');
const lbImg  = document.getElementById('lb-img');
const lbCntr = document.getElementById('lb-counter');

function openLb(set,idx){
  lbSet=set; lbIdx=idx;
  lbImg.src=lbSet[lbIdx];
  lbCntr.textContent=(lbIdx+1)+' / '+lbSet.length;
  lbEl.classList.add('open');
  lenis.stop();
}
function closeLb(){
  lbEl.classList.remove('open');
  lenis.start();
}
function lbNav(d){
  lbIdx=(lbIdx+d+lbSet.length)%lbSet.length;
  gsap.to(lbImg,{opacity:0,duration:.18,onComplete(){
    lbImg.src=lbSet[lbIdx];
    lbCntr.textContent=(lbIdx+1)+' / '+lbSet.length;
    gsap.to(lbImg,{opacity:1,duration:.22});
  }});
}
document.getElementById('lb-close').addEventListener('click',closeLb);
document.getElementById('lb-prev').addEventListener('click',()=>lbNav(-1));
document.getElementById('lb-next').addEventListener('click',()=>lbNav(1));
lbEl.addEventListener('click',e=>{ if(e.target===lbEl) closeLb(); });
// (teclado: listener ÚNICO unificado más abajo — prioridad lightbox, luego galería)

document.querySelectorAll('.ptb').forEach(tb=>{
  tb.addEventListener('click',()=>{
    const set = lbSets[tb.dataset.set];
    if(set) openLb(set,parseInt(tb.dataset.i)||0);
  });
});

/* ════════════════════════════════════════
   3D ROTARY GALLERY
═══════════════════════════════════════ */
const gdata = [
  // ── ALDEA TAO ──
  {src:'assets/img/aldea-tao/dronaldeatao.webp',       lbl:'Aldea Tao · Vista aérea',          tag:'Aldea Tao'},
  {src:'assets/img/aldea-tao/fotorealaldeatao.webp',   lbl:'Aldea Tao · Acantilados del Pacífico', tag:'Aldea Tao'},
  {src:'assets/img/aldea-tao/fotorealaldeatao2.webp',  lbl:'Aldea Tao · Costa salvaje',        tag:'Aldea Tao'},
  {src:'assets/img/aldea-tao/vistaaldeatao.webp',      lbl:'Aldea Tao · Vista al mar',         tag:'Aldea Tao'},
  {src:'assets/img/aldea-tao/renderaldeatao.webp',     lbl:'Aldea Tao · Render del proyecto',  tag:'Aldea Tao'},
  {src:'assets/img/aldea-tao/renderaldeatao2png.webp', lbl:'Aldea Tao · Diseño en acantilado', tag:'Aldea Tao'},
  // ── AZIMUT ──
  {src:'assets/img/azimut/dronazimut.webp',            lbl:'Azimut · Mazunte desde el aire',   tag:'Azimut'},
  {src:'assets/img/azimut/fotorealazimut.webp',        lbl:'Azimut · Selva nativa',            tag:'Azimut'},
  {src:'assets/img/azimut/fotorealazimut2.webp',       lbl:'Azimut · El terreno',              tag:'Azimut'},
  {src:'assets/img/azimut/vistaazimut.webp',           lbl:'Azimut · Vista al Pacífico',       tag:'Azimut'},
  {src:'assets/img/azimut/renderazimutyogashala.webp', lbl:'Azimut · Yoga Shala (render)',     tag:'Azimut'},
  // ── NABANI ──
  {src:'assets/img/nabani/dronnabani.webp',                 lbl:'Nabani · Frente al mar desde el aire', tag:'Nabani'},
  {src:'assets/img/nabani/fotorealnabani.webp',             lbl:'Nabani · Terreno frente al mar',   tag:'Nabani'},
  {src:'assets/img/nabani/fotorealnabaniplayaaguete.webp',  lbl:'Nabani · Playa Aguete',            tag:'Nabani'},
  {src:'assets/img/nabani/vistanabani.webp',                lbl:'Nabani · Vista al Pacífico',       tag:'Nabani'},
  {src:'assets/img/nabani/rendernabani.webp',               lbl:'Nabani · Render de residencia',    tag:'Nabani'},
  {src:'assets/img/nabani/rendernabani2.webp',              lbl:'Nabani · Diseño de autor',         tag:'Nabani'},
  // ── DEPAS KORA ──
  {src:'assets/img/kora/rs-w-719-h-1079-1.webp', lbl:'Depas Kora · Diseño contemporáneo', tag:'Depas Kora'},
  {src:'assets/img/kora/rs-w-719-h-1079.webp',   lbl:'Depas Kora · Vista al mar',          tag:'Depas Kora'},
  {src:'assets/img/kora/rs-w-719-h-836.webp',    lbl:'Depas Kora · Departamentos',         tag:'Depas Kora'},
  // ── SERENA ──
  {src:'assets/img/serena/renderserena-2.webp', lbl:'Serena · Render del proyecto', tag:'Serena'},
  {src:'assets/img/serena/renderserena-3.webp', lbl:'Serena · Comunidad eco',       tag:'Serena'},
  {src:'assets/img/serena/renderserena.webp',   lbl:'Serena · Vida en comunidad',   tag:'Serena'},
];

const gstage  = document.getElementById('g3d-stage');
const gcards  = document.getElementById('g3d-cards');
const gdots   = document.getElementById('g3d-dots');
const gmob    = document.getElementById('g3d-mob');
const cards   = [];
let   gActive = 0;

gdata.forEach((d)=>{
  // 3D card
  const c = document.createElement('div');
  c.className='gcard';
  c.innerHTML=`<img src="${d.src}" alt="${d.lbl}" loading="lazy">
    <div class="gcard-lbl"><div class="gcard-name">${d.lbl}</div></div>`;
  gcards.appendChild(c);
  cards.push(c);

  // mobile item (los dots los crea rebuildDots)
  const mi = document.createElement('div');
  mi.className='g3d-mob-item';
  mi.innerHTML=`<img src="${d.src}" alt="${d.lbl}" loading="lazy">`;
  gmob.appendChild(mi);
});

// Breakpoints per spec
function cardStyle(offset){
  const a = Math.abs(offset);
  let ry, tz, sc, br;
  if(a<=1){ ry=offset*20;    tz=-a*100;  sc=1-a*.12;   br=1-a*.45; }
  else if(a<=2){ const f=a-1; ry=(a/Math.abs(a||1))*(20+f*18); tz=-(100+f*100); sc=.88-f*.12; br=.55-f*.25; }
  else { const f=a-2; ry=(a/Math.abs(a||1))*(38+f*17); tz=-(200+f*100); sc=.76-f*.11; br=.3-f*.15; }
  ry  = Math.max(-55, Math.min(55, ry));
  tz  = Math.max(-300, tz);
  sc  = Math.max(.65, sc);
  br  = Math.max(.15, br);
  return {ry, tz, sc, br};
}

const gBigC = document.getElementById('g3d-bigc');
const gBlurOK = window.matchMedia('(min-width:769px)').matches;
function renderGallery(activeF){
  const snap = Math.round(activeF);
  cards.forEach((c,i)=>{
    const offset = i - activeF;
    const a = Math.abs(offset);
    const {ry,tz,sc,br} = cardStyle(offset);
    c.style.transform  = `rotateY(${ry}deg) translateZ(${tz}px) scale(${sc})`;
    // blur progresivo en cards lejanas (solo desktop, fuera de modo performance)
    const bl = (gBlurOK && !window.__PERF_LOW && a > 1) ? ` blur(${Math.min(3,(a-1)*1.4).toFixed(1)}px)` : '';
    c.style.filter     = `brightness(${br})${bl}`;
    c.style.zIndex     = Math.round(1000 - a*100);
    c.style.borderColor= a<.5 ? 'rgba(201,169,110,.45)' : 'rgba(201,169,110,0)';
    c.classList.toggle('active', i===snap);
  });
  gdots.querySelectorAll('.gdot').forEach((d,i)=>d.classList.toggle('active',i===snap));
  gActive = snap;
  // contador editorial "07 / 23"
  if (gBigC && cards.length) gBigC.innerHTML = String(snap+1).padStart(2,'0') + ' <small>/ ' + String(cards.length).padStart(2,'0') + '</small>';
}
renderGallery(0);

// ── GALLERY: CLICK/SWIPE — NO SCROLL PIN ─────
let gAutoTimer = null;

function goToCard(idx, animate = true) {
  const n = cards.length;
  gActive = ((idx % n) + n) % n;
  // Flash active card label before transition
  if (animate) {
    cards.forEach(c => c.style.opacity = '0.85');
    cards[gActive].style.opacity = '1';
  }
  renderGallery(gActive);
  gcards.dataset.pos = gActive;
}

function startAuto() {
  stopAuto();
  gAutoTimer = setInterval(() => goToCard(gActive + 1), 3800);
}
function stopAuto() {
  if (gAutoTimer) { clearInterval(gAutoTimer); gAutoTimer = null; }
}

// Arrow buttons
const gPrev = document.getElementById('g3d-prev');
const gNext = document.getElementById('g3d-next');
if (gPrev) gPrev.addEventListener('click', () => { stopAuto(); goToCard(gActive - 1); startAuto(); });
if (gNext) gNext.addEventListener('click', () => { stopAuto(); goToCard(gActive + 1); startAuto(); });

// Dot clicks
function rebuildDots(filtered) {
  gdots.innerHTML = '';
  filtered.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'gdot';
    dot.addEventListener('click', () => { stopAuto(); goToCard(i); startAuto(); });
    gdots.appendChild(dot);
  });
}

// Touch / drag swipe con INERCIA: un flick rápido avanza 2 tarjetas
let dragStart = null, dragT0 = 0;
function endDrag(x){
  if (dragStart === null) return;
  const d  = x - dragStart;
  const v  = Math.abs(d) / Math.max(1, Date.now() - dragT0); // px/ms
  if (Math.abs(d) > 40) goToCard(gActive + (d < 0 ? 1 : -1) * (v > .65 ? 2 : 1));
  startAuto(); dragStart = null;
}
gstage.addEventListener('mousedown',  e => { dragStart = e.clientX; dragT0 = Date.now(); stopAuto(); });
gstage.addEventListener('touchstart', e => { dragStart = e.touches[0].clientX; dragT0 = Date.now(); stopAuto(); }, {passive:true});
gstage.addEventListener('mouseup',  e => endDrag(e.clientX));
gstage.addEventListener('touchend', e => endDrag(e.changedTouches[0].clientX));

// Pause on hover
gstage.addEventListener('mouseenter', stopAuto);
gstage.addEventListener('mouseleave', startAuto);

// Teclado UNIFICADO: un solo listener — el lightbox tiene prioridad sobre la galería
document.addEventListener('keydown', e => {
  if (lbEl.classList.contains('open')) {
    if (e.key === 'Escape')     closeLb();
    if (e.key === 'ArrowLeft')  lbNav(-1);
    if (e.key === 'ArrowRight') lbNav(1);
    return;
  }
  const r = document.getElementById('g3d').getBoundingClientRect();
  if (r.top > window.innerHeight || r.bottom < 0) return;
  if (e.key === 'ArrowRight') { stopAuto(); goToCard(gActive + 1); startAuto(); }
  if (e.key === 'ArrowLeft')  { stopAuto(); goToCard(gActive - 1); startAuto(); }
});

// Filters
document.querySelectorAll('.gfbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gfbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.f;
    const filtered = f === 'all' ? gdata : gdata.filter(d => d.tag === f);
    document.getElementById('g3d-count').textContent = filtered.length;
    gcards.innerHTML = ''; gmob.innerHTML = '';
    cards.length = 0;
    filtered.forEach((d, i) => {
      const c = document.createElement('div');
      c.className = 'gcard';
      c.innerHTML = `<img src="${d.src}" alt="${d.lbl}" loading="lazy"><div class="gcard-lbl"><div class="gcard-name">${d.lbl}</div></div>`;
      gcards.appendChild(c); cards.push(c);
      const mi = document.createElement('div');
      mi.className = 'g3d-mob-item';
      mi.innerHTML = `<img src="${d.src}" alt="${d.lbl}" loading="lazy">`;
      gmob.appendChild(mi);
    });
    rebuildDots(filtered);
    gActive = 0; gcards.dataset.pos = 0;
    renderGallery(0);
    if (window.__txGallery) window.__txGallery();   // re-traducir labels recién creados
    stopAuto(); startAuto();
  });
});

// Init
rebuildDots(gdata);
goToCard(0, false);

// Start auto-play when gallery enters viewport
ScrollTrigger.create({
  trigger: '#g3d', start: 'top 80%', once: true,
  onEnter() { startAuto(); }
});

/* ════════════════════════════════════════
   CHAT CONCIERGE
═══════════════════════════════════════ */
const cmsgs = document.getElementById('cmsgs');
const ans   = {type:null,loc:null,step:null};

const steps = [
  {
    key:'type',
    msg:'Hola, soy la asesora virtual de Tierra Desarrollos.\nEstoy aquí para ayudarte a encontrar el espacio perfecto. ¿Qué tipo de propiedad te interesa?',
    pills:[
      {label:'Terreno para construir',val:'terreno'},
      {label:'Residencia de autor',   val:'residencia'},
      {label:'Inversión patrimonial', val:'inversion'},
    ]
  },
  {
    key:'loc',
    msg:'¿Tienes alguna zona del Pacífico en mente?',
    pills:[
      {label:'Costa de Oaxaca',         val:'oaxaca'},
      {label:'Pacífico Mexicano',val:'pacifico'},
      {label:'Abierto a opciones',       val:'abierto'},
    ]
  },
  {
    key:'step',
    msg:'¿En qué etapa de tu proceso estás?',
    pills:[
      {label:'Listo para invertir',        val:'listo'},
      {label:'Evaluando (6–18 meses)',     val:'evaluando'},
      {label:'Explorando opciones',        val:'explorando'},
    ]
  },
];

function rec(){
  const t=ans.type;
  if(t==='residencia')
    return {proj:'Nabani',
      msg:'Nabani es nuestro proyecto de residencias de autor más especial — diseñado para quienes buscan vivir con lujo y en conexión total con la naturaleza tropical. Nuestro equipo puede enviarte el dossier completo con planos, disponibilidad y condiciones. ¿Te lo hacemos llegar?'};
  if(t==='inversion')
    return {proj:'portafolio completo',
      msg:'Contamos con tres proyectos en distintas etapas de desarrollo en el Pacífico mexicano, cada uno con retornos y condiciones diferenciadas. Un asesor especializado puede presentarte las opciones con proyecciones y estructura de inversión. ¿Cuándo sería un buen momento para hablar?'};
  return {proj:'Azimut y Aldea Tao',
    msg:'Basándonos en tus preferencias, Azimut Mazunte y Aldea Tao son los proyectos que mejor se adaptan a tu perfil. Ambos ofrecen terrenos exclusivos en la Costa de Oaxaca con vistas al Pacífico, pleno respaldo legal y arquitectura en armonía con el entorno. ¿Te gustaría que un asesor te comparta información detallada y disponibilidad?'};
}

function scrollC(){ cmsgs.scrollTop=cmsgs.scrollHeight; }

function addMsg(text,role){
  // chat bilingüe: si el idioma activo es EN, traducir mensajes conocidos
  if (window.__LANG === 'en' && typeof CHAT_EN !== 'undefined' && CHAT_EN.has(text)) text = CHAT_EN.get(text);
  const w=document.createElement('div');
  const b=document.createElement('div');
  w.className=`cmsg ${role}`; b.className='cbub';
  b.innerHTML=text.replace(/\n/g,'<br>');
  w.appendChild(b);
  w.style.opacity='0'; w.style.transform='translateY(12px)';
  cmsgs.appendChild(w); scrollC();
  gsap.to(w,{opacity:1,y:0,duration:.38,ease:'power3.out'});
  return w;
}
function showTyping(){
  const t=document.createElement('div');
  t.className='ctyp';
  t.innerHTML='<div class="cdt"></div><div class="cdt"></div><div class="cdt"></div>';
  t.style.opacity='0'; cmsgs.appendChild(t); scrollC();
  gsap.to(t,{opacity:1,duration:.22});
  return t;
}
function rmEl(el){ if(el?.parentNode) el.parentNode.removeChild(el); }

function addPills(msgEl,pills,onPick){
  const wrap=document.createElement('div');
  wrap.className='cpills';
  pills.forEach(p=>{
    const btn=document.createElement('button');
    btn.className='cpill';
    btn.textContent = (window.__LANG === 'en' && typeof CHAT_EN !== 'undefined' && CHAT_EN.has(p.label)) ? CHAT_EN.get(p.label) : p.label;
    btn.addEventListener('click',()=>{
      wrap.querySelectorAll('.cpill').forEach(b=> b.classList.add(b===btn?'chosen':'faded'));
      wrap.querySelectorAll('.cpill').forEach(b=> b.disabled=true);
      onPick(p);
    });
    wrap.appendChild(btn);
  });
  msgEl.appendChild(wrap); scrollC();
}

function runStep(idx){
  if(idx>=steps.length){ showRec(); return; }
  const s=steps[idx];
  const ty=showTyping();
  setTimeout(()=>{
    rmEl(ty);
    const m=addMsg(s.msg,'ai');
    addPills(m,s.pills,p=>{
      ans[s.key]=p.val;
      addMsg(p.label,'usr');
      setTimeout(()=>runStep(idx+1),560);
    });
  },900);
}

function showRec(){
  const r=rec();
  const ty=showTyping();
  const chosen=Object.values(ans).filter(Boolean);
  // mensajes generados según el idioma activo
  const EN = window.__LANG === 'en';
  const waT=encodeURIComponent(EN
    ? `Hi, the tierra.vip virtual advisor helped me. I'm interested in ${r.proj}. My profile: ${chosen.join(', ')}. Looking forward to hearing from you.`
    : `Hola, me asesoró la asistente virtual de tierra.vip. Me interesa el proyecto ${r.proj}. Mi perfil: ${chosen.join(', ')}. Quedo en espera de su contacto.`);
  const mSub=encodeURIComponent(EN ? `Inquiry from tierra.vip — Interest in ${r.proj}` : `Consulta desde tierra.vip — Interés en ${r.proj}`);
  const mBod=encodeURIComponent(EN
    ? `Dear Tierra Desarrollos team,\n\nI'm reaching out through your website.\nProject of interest: ${r.proj}\nProfile: ${chosen.join(', ')}\n\nLooking forward to your reply.\n\nBest regards,`
    : `Estimado equipo de Tierra Desarrollos,\n\nMe comunico a través de su sitio web.\nProyecto de interés: ${r.proj}\nPerfil: ${chosen.join(', ')}\n\nQuedo en espera de su respuesta.\n\nSaludos,`);

  setTimeout(()=>{
    rmEl(ty);
    addMsg(r.msg,'ai');
    const ty2=showTyping();
    setTimeout(()=>{
      rmEl(ty2);
      const m2=addMsg('¿Cómo prefieres que te contactemos?','ai');
      // El mensaje de cierre solo aparece DESPUÉS de que el usuario elige una acción
      let finShown=false;
      const fireFinal=()=>{
        if(finShown) return; finShown=true;
        const fin=showTyping();
        setTimeout(()=>{
          rmEl(fin);
          addMsg('Perfecto. Nuestro equipo se pondrá en contacto contigo a la brevedad.\n\nEn Tierra Desarrollos, cada historia comienza con encontrar el lugar correcto. Gracias por tu confianza. 🌿','ai');
        },900);
      };
      const acts=document.createElement('div'); acts.className='cacts';
      const wa=document.createElement('button'); wa.className='cact wa'; wa.textContent= EN ? 'WhatsApp now' : 'WhatsApp ahora';
      wa.addEventListener('click',()=>{ window.open(`https://wa.me/529581087977?text=${waT}`,'_blank'); fireFinal(); });
      const em=document.createElement('button'); em.className='cact em'; em.textContent= EN ? 'Get it by email' : 'Recibir por email';
      em.addEventListener('click',()=>{ window.open(`mailto:ventas@tierra.vip?subject=${mSub}&body=${mBod}`,'_blank'); fireFinal(); });
      acts.appendChild(wa); acts.appendChild(em);
      m2.appendChild(acts); scrollC();
    },1200);
  },1000);
}

ScrollTrigger.create({
  trigger:'#chat',start:'top 68%',once:true,
  onEnter:()=> setTimeout(()=>runStep(0),500)
});

/* ════════════════════════════════════════
   LOGO TIERRA — composición CSS limpia
   (reveals al entrar; sin Three.js)
═══════════════════════════════════════ */
(function(){
  const section = document.getElementById('logo3d');
  if (!section) return;
  const io = new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting) return;
    ['logo3d-label','logo3d-img','logo3d-sub','logo3d-body'].forEach(id => {
      const el = document.getElementById(id);
      if (el){ el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }
    });
    const line = document.getElementById('logo3d-line');
    if (line) line.style.width = '200px';
    o.disconnect();
  }, { threshold: 0.35 });
  io.observe(section);
})();

/* ════════════════════════════════════════
   SCROLL PROGRESS BAR
═══════════════════════════════════════ */
const spb = document.getElementById('spb');
window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
  spb.style.width = Math.min(pct, 100) + '%';
}, { passive: true });

/* ════════════════════════════════════════
   MAGNETIC BUTTONS
═══════════════════════════════════════ */
// gsap.quickTo anima solo x/y: no pisa los hovers CSS (background/color) ni sus transiciones
if (window.matchMedia('(hover:hover) and (pointer:fine)').matches){
  document.querySelectorAll('.btn-go, .btn-arrow, .pcta').forEach(btn => {
    const xTo = gsap.quickTo(btn, 'x', { duration: .35, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: .35, ease: 'power3.out' });
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.28);
    });
    btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

/* ════════════════════════════════════════
   IMAGE TILT ON HOVER (project cards)
═══════════════════════════════════════ */
document.querySelectorAll('.pcard').forEach(card => {
  const img = card.querySelector('.piw img');
  if (!img || window.innerWidth < 769) return;
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - .5;
    const y = (e.clientY - r.top)  / r.height - .5;
    gsap.to(img, { rotateY: x * 4, rotateX: -y * 4, scale: 1.04, duration: .4, ease: 'power2.out', transformPerspective: 800 });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(img, { rotateY: 0, rotateX: 0, scale: 1.06, duration: .8, ease: 'power3.out' });
  });
});

/* ════════════════════════════════════════
   COMING SOON — staggered reveal
═══════════════════════════════════════ */
gsap.fromTo('.cs-card', { opacity: 0, y: 48 }, {
  opacity: 1, y: 0, duration: .9, stagger: .18, ease: 'power3.out',
  scrollTrigger: { trigger: '#coming', start: 'top 75%' }
});
gsap.fromTo('.cs-hd', { opacity: 0, y: 24 }, {
  opacity: 1, y: 0, duration: .8, ease: 'power3.out',
  scrollTrigger: { trigger: '#coming', start: 'top 80%' }
});

/* ════════════════════════════════════════
   HERO TEXT SCRAMBLE
═══════════════════════════════════════ */
function scramble(el, finalText, duration) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let frame = 0;
  const totalFrames = duration / 16;
  const interval = setInterval(() => {
    const progress = frame / totalFrames;
    el.textContent = finalText.split('').map((c, i) => {
      if (c === ' ') return ' ';
      if (i / finalText.length < progress) return c;
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    if (frame >= totalFrames) { el.textContent = finalText; clearInterval(interval); }
    frame++;
  }, 16);
}

/* ════════════════════════════════════════
   FEATURES LIST REVEAL
═══════════════════════════════════════ */
gsap.utils.toArray('.pfeat').forEach((el, i) => {
  gsap.fromTo(el, { opacity: 0, x: -16 }, {
    opacity: 1, x: 0, duration: .5, delay: i * .08, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%' }
  });
});

/* ════════════════════════════════════════
   AI HELP PANEL
═══════════════════════════════════════ */
const aiFab   = document.getElementById('ai-fab');
const aiPanel = document.getElementById('ai-panel');
const aipMsgs = document.getElementById('aip-msgs');
const aipInput= document.getElementById('aip-input');
const aipSend = document.getElementById('aip-send');
const aipClose= document.getElementById('aip-close');
let aipStarted = false;

// ── TIERRA AI SALES ASSISTANT ─────────────────
const TIERRA_CONTEXT = {
  empresa: 'Tierra Desarrollos — empresa mexicana de desarrollo inmobiliario eco-luxury en la Costa de Oaxaca, Pacífico mexicano.',
  filosofia: 'Construimos en armonía con la naturaleza. Cada proyecto respeta el ecosistema local y ofrece pleno respaldo legal.',
  contacto: 'WhatsApp: +52 958 108 7977 | Email: ventas@tierra.vip | Instagram: @tierra_desarrollos',
  proyectos: {
    azimut: {
      nombre: 'Azimut Mazunte',
      tipo: 'Lotes residenciales',
      ubicacion: 'Mazunte, Oaxaca',
      descripcion: 'Lotes en ladera con selva nativa y vista panorámica al Pacífico. A minutos de la playa de Mazunte.',
      amenidades: ['Yoga Shala al aire libre', 'Temazcal tradicional', 'Alberca natural con rocas', 'Senderos a la playa', 'Estacionamiento solar', 'Acceso controlado'],
      ideal: 'Quienes buscan construir su propia casa o cabaña en contacto con la naturaleza.'
    },
    nabani: {
      nombre: 'Nabani',
      tipo: 'Residencias de autor',
      ubicacion: 'Costa Oaxaqueña',
      descripcion: 'Residencias tropicales llave en mano. Arquitectura en palma y madera, albercas privadas y terrazas con hamacas.',
      amenidades: ['Alberca privada', 'Terraza con hamaca', 'Jardín tropical', 'Arquitectura en palma y madera', 'Entrega llave en mano'],
      ideal: 'Quienes buscan una residencia lista para habitar o rentar vacacionalente.'
    },
    aldea: {
      nombre: 'Aldea Tao',
      tipo: 'Lotes exclusivos en acantilado',
      ubicacion: 'Costa de Oaxaca',
      descripcion: 'Los terrenos más exclusivos sobre acantilados del Pacífico. Acceso a Playa Tololote y La Boquilla — calas privadas.',
      amenidades: ['Vista panorámica al Pacífico', 'Acceso a Playa Tololote', 'Acceso a Playa La Boquilla', 'Acantilados volcánicos', 'Proyecto limitado'],
      ideal: 'Inversores y compradores que buscan exclusividad y naturaleza salvaje.'
    },
    serena: {
      nombre: 'Serena',
      tipo: 'Comunidad eco — próximamente',
      ubicacion: 'San Antonio, Oaxaca',
      descripcion: 'Proyecto de vida en comunidad junto a Mazunte. Jardín comunitario, huerto orgánico y arquitectura sustentable.',
      amenidades: ['Jardín comunitario', 'Huerto orgánico', 'Arquitectura sustentable'],
      ideal: 'Quienes buscan vivir en comunidad con valores ecológicos.'
    },
    kora: {
      nombre: 'Depas Kora',
      tipo: 'Departamentos — preventa',
      ubicacion: 'Zipolite, Oaxaca',
      descripcion: 'Diseño minimalista con acceso a playa y vistas al océano. El nuevo referente de vida contemporánea en Zipolite.',
      amenidades: ['Acceso a playa', 'Vista al océano', 'Diseño minimalista', 'Preventa'],
      ideal: 'Quienes buscan un departamento moderno en Zipolite.'
    }
  }
};

let aipHistory = [];

function aipDetectIntent(q) {
  const t = q.toLowerCase();
  if (t.match(/hola|buenas|buenos|hey|hi|buen/)) return 'saludo';
  if (t.match(/azimut|mazunte/)) return 'azimut';
  if (t.match(/nabani/)) return 'nabani';
  if (t.match(/aldea|tao|boquilla|tololote/)) return 'aldea';
  if (t.match(/serena|san antonio|comunidad|huerto/)) return 'serena';
  if (t.match(/kora|zipolite|depa|departamento/)) return 'kora';
  if (t.match(/precio|costo|cuánto|cuanto|valor|presupuesto/)) return 'precio';
  if (t.match(/invest|plusval|retorno|rendimiento|roi|ganar/)) return 'inversion';
  if (t.match(/proceso|compra|escritura|legal|papeles|contrato/)) return 'proceso';
  if (t.match(/financia|crédito|credito|pago|mensualidad|plazo/)) return 'financiamiento';
  if (t.match(/dond|ubica|cómo llego|llegar|distancia|cerca/)) return 'ubicacion';
  if (t.match(/contact|whatsapp|llamar|teléfono|telefono|email|correo/)) return 'contacto';
  if (t.match(/proyecto|opciones|qué tienen|que tienen|disponible/)) return 'proyectos';
  if (t.match(/gracias|perfecto|ok|bueno|genial|excelente/)) return 'agradecimiento';
  return 'general';
}

function aipBuildReply(intent, userMsg) {
  const p = TIERRA_CONTEXT.proyectos;
  const replies = {
    saludo: [
      '¡Hola! Bienvenido a Tierra Desarrollos 🌿\n\nSoy tu asistente de ventas. Tenemos proyectos increíbles en la Costa de Oaxaca: lotes en selva con vista al Pacífico, residencias tropicales de lujo y terrenos sobre acantilados.\n\n¿Qué tipo de propiedad te interesa?',
      'Hola, qué gusto tenerte aquí. En Tierra Desarrollos desarrollamos espacios donde la arquitectura vive en armonía con la naturaleza — todos en la Costa de Oaxaca, Pacífico mexicano.\n\n¿Estás buscando un terreno para construir, una residencia lista o una inversión?'
    ],
    azimut: [
      `**${p.azimut.nombre}** — ${p.azimut.tipo}\n📍 ${p.azimut.ubicacion}\n\n${p.azimut.descripcion}\n\n✦ ${p.azimut.amenidades.join('\n✦ ')}\n\nIdeal para: ${p.azimut.ideal}\n\n¿Te gustaría saber más sobre precios o disponibilidad?`
    ],
    nabani: [
      `**${p.nabani.nombre}** — ${p.nabani.tipo}\n📍 ${p.nabani.ubicacion}\n\n${p.nabani.descripcion}\n\n✦ ${p.nabani.amenidades.join('\n✦ ')}\n\nIdeal para: ${p.nabani.ideal}\n\n¿Te interesa conocer los precios actuales?`
    ],
    aldea: [
      `**${p.aldea.nombre}** — ${p.aldea.tipo}\n📍 ${p.aldea.ubicacion}\n\n${p.aldea.descripcion}\n\n✦ ${p.aldea.amenidades.join('\n✦ ')}\n\nIdeal para: ${p.aldea.ideal}\n\nEs nuestro proyecto más exclusivo con disponibilidad limitada. ¿Quieres que un asesor te contacte?`
    ],
    serena: [
      `**${p.serena.nombre}** — ${p.serena.tipo}\n📍 ${p.serena.ubicacion}\n\n${p.serena.descripcion}\n\n✦ ${p.serena.amenidades.join('\n✦ ')}\n\nEste proyecto está próximo a lanzarse. ¿Te registramos en la lista de espera?`
    ],
    kora: [
      `**${p.kora.nombre}** — ${p.kora.tipo}\n📍 ${p.kora.ubicacion}\n\n${p.kora.descripcion}\n\n✦ ${p.kora.amenidades.join('\n✦ ')}\n\nEstá en preventa — los mejores precios son ahora. ¿Te enviamos información detallada?`
    ],
    precio: [
      'Los precios varían según el proyecto y la disponibilidad actual. No los publicamos en línea para poder ofrecerte el mejor precio según tu perfil de inversión.\n\n¿Qué proyecto te interesa más? Con eso te conecto directo con un asesor que te da números concretos.',
      'Los precios dependen del proyecto y el lote específico. Tenemos opciones desde inversiones accesibles hasta terrenos premium en acantilado.\n\n¿Cuál de nuestros proyectos te llama más la atención — Azimut, Nabani o Aldea Tao?'
    ],
    inversion: [
      'La Costa de Oaxaca es una de las zonas con mayor plusvalía en México — todavía con precios accesibles antes del boom turístico masivo.\n\nNuestros proyectos ofrecen:\n✦ Plusvalía del terreno a largo plazo\n✦ Renta vacacional si construyes (Mazunte/Zipolite son destinos en auge)\n✦ Escrituración garantizada y respaldo legal completo\n\n¿Buscas invertir para construir, rentar o revender?'
    ],
    proceso: [
      'El proceso de compra con Tierra Desarrollos es seguro y acompañado:\n\n1️⃣ Asesoría inicial — conocemos tu perfil\n2️⃣ Visita al terreno (presencial o virtual)\n3️⃣ Firma de promesa de compraventa\n4️⃣ Plan de pago acordado\n5️⃣ Escrituración notarial\n6️⃣ Entrega de terreno\n\nTodo con acompañamiento legal desde el día uno. ¿Tienes alguna duda sobre alguno de estos pasos?'
    ],
    financiamiento: [
      'Sí, ofrecemos planes de pago flexibles — no necesitas pagar todo de contado.\n\nContamos con esquemas de enganche + mensualidades adaptados a cada cliente. Los detalles específicos los maneja nuestro equipo de ventas según tu capacidad de inversión.\n\n¿Prefieres que te contacte un asesor por WhatsApp para ver opciones concretas?'
    ],
    ubicacion: [
      'Todos nuestros proyectos están en la Costa de Oaxaca, Pacífico mexicano:\n\n📍 **Azimut** — Mazunte, Oaxaca\n📍 **Nabani** — Costa Oaxaqueña\n📍 **Aldea Tao** — Acantilados Costa de Oaxaca\n📍 **Serena** — San Antonio, cerca de Mazunte\n📍 **Depas Kora** — Zipolite, Oaxaca\n\nLa zona está a ~7h de CDMX por carretera o ~1h en vuelo a Huatulco. ¿Quieres información de cómo llegar?'
    ],
    contacto: [
      '¡Con gusto! Puedes contactarnos por:\n\n📱 **WhatsApp:** +52 958 108 7977\n📧 **Email:** ventas@tierra.vip\n📸 **Instagram:** @tierra_desarrollos\n\nNuestro equipo atiende de lunes a domingo. ¿Quieres que te abra el WhatsApp directo?'
    ],
    proyectos: [
      'Tenemos 5 proyectos en la Costa de Oaxaca:\n\n🌿 **Azimut** — Lotes en selva con vista al Pacífico, Mazunte\n🌴 **Nabani** — Residencias tropicales llave en mano\n🌊 **Aldea Tao** — Lotes exclusivos en acantilado\n🌱 **Serena** — Comunidad eco, próximamente\n🏙️ **Depas Kora** — Departamentos en Zipolite, preventa\n\n¿Cuál te interesa explorar primero?'
    ],
    agradecimiento: [
      'Un placer ayudarte 🌿 Si tienes más preguntas o quieres hablar con un asesor, estamos en WhatsApp: +52 958 108 7977',
      '¡Gracias a ti! Para cualquier consulta adicional escríbenos a ventas@tierra.vip o por WhatsApp al +52 958 108 7977.'
    ],
    general: [
      `Cuéntame un poco más — ¿estás buscando un terreno para construir, una casa lista para habitar, o más bien una inversión? Así te oriento mejor 🌿`,
      `Claro. Para recomendarte bien: ¿lo tuyo es vivir frente al mar, un refugio en la selva, o hacer crecer tu patrimonio? Tenemos algo para cada historia.`
    ]
  };

  const options = replies[intent] || replies.general;
  return options[Math.floor(Math.random() * options.length)];
}

function aipAddMsg(role, text) {
  const w = document.createElement('div');
  w.className = `aip-msg ${role}`;
  const b = document.createElement('div');
  b.className = 'aip-bub';
  // Format bold **text**
  b.innerHTML = text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  w.appendChild(b);
  aipMsgs.appendChild(w);
  aipMsgs.scrollTop = aipMsgs.scrollHeight;
}

function aipShowTyping() {
  const t = document.createElement('div');
  t.className = 'aip-typ';
  t.innerHTML = '<div class="aip-d"></div><div class="aip-d"></div><div class="aip-d"></div>';
  aipMsgs.appendChild(t);
  aipMsgs.scrollTop = aipMsgs.scrollHeight;
  return t;
}

function aipGetReply(text) {
  const intent = aipDetectIntent(text);
  aipHistory.push({ role: 'user', text });
  const reply = aipBuildReply(intent, text);
  aipHistory.push({ role: 'ai', text: reply });
  return reply;
}

async function aipSendMsg() {
  let text = aipInput.value.trim();
  if (!text) return;
  aipInput.value = '';
  // comandos de los chips (no son texto del usuario real)
  if (text === '__lead__'){ aipAddMsg('usr', LL('Sí, tomar mis datos','Yes, take my details')); leadStart(); return; }
  if (text === '__skip__'){ aipAddMsg('usr', LL('Ahora no','Not now')); aipAddMsg('ai', LL('Sin problema 🌿 Aquí estoy para lo que necesites — y si cambias de opinión, WhatsApp: +52 958 108 7977.','No problem 🌿 I am here for anything you need — and if you change your mind, WhatsApp: +52 958 108 7977.')); return; }
  if (text === '__virtual__' || text === '__presencial__'){
    const v = text === '__virtual__';
    aipAddMsg('usr', v ? LL('Visita virtual','Virtual visit') : LL('Visita presencial','In-person visit'));
    AIP.step = 3; leadStep(v ? 'virtual' : 'presencial'); return;
  }
  aipAddMsg('usr', text);
  const ty = aipShowTyping();
  // 1) flujo de captura de lead activo → la entrada es un dato del lead
  if (AIP.mode === 'lead'){ await new Promise(r => setTimeout(r, 500)); ty.remove(); leadStep(text); return; }
  // 2) backend Claude si está configurado (window.TIERRA_API_URL) → si falla, motor local
  let reply = null;
  if (window.TIERRA_API_URL){ reply = await aipBackend(text).catch(() => null); }
  await new Promise(r => setTimeout(r, reply ? 80 : 820));
  ty.remove();
  if (!reply) reply = aipGetReply(text);
  aipAddMsg('ai', reply);
  aipAfterReply(text);
}

aipSend.addEventListener('click', aipSendMsg);
aipInput.addEventListener('keydown', e => { if (e.key === 'Enter') aipSendMsg(); });

function openAiPanel() {
  aiPanel.classList.add('open');
  if (!aipStarted) {
    aipStarted = true;
    setTimeout(() => {
      const ty = aipShowTyping();
      setTimeout(() => {
        ty.remove();
        aipAddMsg('ai', LL(
          'Hola, bienvenido a Tierra Desarrollos 🌿\n\nSoy parte del equipo de ventas. Desarrollamos lotes, residencias y departamentos en la Costa de Oaxaca.\n\n¿Qué estás buscando?',
          "Hello, welcome to Tierra Desarrollos 🌿\n\nI'm part of the sales team. We develop lots, residences and apartments on the Oaxaca Coast.\n\nWhat are you looking for?"));
        aipChips([
          [LL('Quiero un terreno','I want land'), 'quiero un terreno para construir'],
          [LL('Busco invertir','I want to invest'), 'quiero invertir'],
          [LL('Ver proyectos','See projects'), 'qué proyectos tienen'],
          [LL('Agendar visita','Book a visit'), 'quiero agendar una visita'],
        ]);
      }, 700);
    }, 300);
  }
  aipInput.focus();
}

aiFab.addEventListener('click', () => { openAiPanel(); gsap.to(aiFab, {rotate: 90, duration: .4, ease: 'back.out(2)'}); });
aipClose.addEventListener('click', () => { aiPanel.classList.remove('open'); gsap.to(aiFab, {rotate: 0, duration: .4}); });

/* ════════════════════════════════════════
   MODO PERFORMANCE (flags ya definidos arriba)
═══════════════════════════════════════ */
if (window.__PERF_LOW) {
  ptArr.length = 36;                                   // menos partículas de fondo
  const gr = document.querySelector('.grain'); if (gr) gr.style.display = 'none';
}

/* ════════════════════════════════════════
   SPLITWORDS — reveal palabra por palabra
═══════════════════════════════════════ */
(function(){
  if (window.__REDUCED) return;
  function split(el){
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3 && ch.textContent.trim()){
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(w => {
            if (!w.trim()){ frag.appendChild(document.createTextNode(w)); return; }
            const o = document.createElement('span'); o.className = 'sw-w';
            const i2 = document.createElement('span'); i2.className = 'sw-i'; i2.textContent = w;
            o.appendChild(i2); frag.appendChild(o);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(el);
    el.querySelectorAll('.sw-i').forEach((s,i)=> s.style.transitionDelay = (i*.045)+'s');
  }
  const targets = document.querySelectorAll('.sw, .g3d-ttl, .cs-ttl, .cht-hd h2');
  targets.forEach(split);
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add('sw-on'); io.unobserve(e.target); }
  }), {threshold:.35});
  targets.forEach(t => io.observe(t));
})();

/* ════════════════════════════════════════
   MASTERPLAN INTERACTIVO
═══════════════════════════════════════ */
(function(){
  const stage = document.querySelector('.mp-stage'); if (!stage) return;
  const shore = document.getElementById('mp-shore');
  const card = document.getElementById('mp-card'), ci = document.getElementById('mp-card-img'),
        cn = document.getElementById('mp-card-n'), cl = document.getElementById('mp-card-l');
  const DATA = {
    azimut:{n:'Azimut', l:'Mazunte · Oaxaca', l_en:'Mazunte · Oaxaca', img:'assets/img/azimut/renderazimutyogashala.webp'},
    serena:{n:'Serena', l:'San Antonio · Próximamente', l_en:'San Antonio · Coming soon', img:'assets/img/serena/renderserena-2.webp'},
    nabani:{n:'Nabani', l:'Costa Oaxaqueña', l_en:'Oaxacan Coast', img:'assets/img/nabani/dronnabani.webp'},
    kora:  {n:'Depas Kora', l:'Zipolite · Preventa', l_en:'Zipolite · Pre-sale', img:'assets/img/kora/rs-w-719-h-836.webp'},
    aldea: {n:'Aldea Tao', l:'La Boquilla', l_en:'La Boquilla', img:'assets/img/aldea-tao/dronaldeatao.webp'},
  };
  // ── POSICIONAMIENTO MATEMÁTICO: cada pin se ancla a la curva con getPointAtLength ──
  const pins = [...document.querySelectorAll('.mp-pin')];
  const PCT = [.08, .28, .50, .70, .90];
  function placePins(){
    if (!shore || !shore.getTotalLength) return;
    const total = shore.getTotalLength();
    pins.forEach((pin, i) => {
      const p = shore.getPointAtLength(total * PCT[i]);
      pin.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
      // etiquetas: alternar arriba/abajo de la costa + clamp horizontal en los bordes
      const txt = pin.querySelector('text');
      if (txt){
        txt.setAttribute('y', i % 2 === 0 ? -22 : 36);
        const approx = txt.textContent.length * 7.2;             // ancho estimado del label
        const half = approx / 2;
        let anchor = 'middle', dx = 0;
        if (p.x - half < 8)        { anchor = 'start'; dx = -p.x + 10; }
        else if (p.x + half > 1092){ anchor = 'end';   dx = 1090 - p.x; }
        txt.setAttribute('text-anchor', anchor);
        txt.setAttribute('x', dx.toFixed(0));
      }
    });
  }
  placePins();
  window.addEventListener('resize', placePins);
  // tarjeta hover + navegación
  pins.forEach(pin => {
    const show = () => {
      const d = DATA[pin.dataset.proj]; if (!d) return;
      ci.src = d.img; ci.alt = d.n; cn.textContent = d.n;
      cl.textContent = window.__LANG === 'en' ? d.l_en : d.l;
      const pr = pin.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      let x = pr.left - sr.left + 18, y = pr.top - sr.top - 150;
      x = Math.max(0, Math.min(x, sr.width - 240)); y = Math.max(-10, y);
      card.style.left = x + 'px'; card.style.top = y + 'px';
      card.classList.add('show');
    };
    const hide = () => card.classList.remove('show');
    pin.addEventListener('mouseenter', show);
    pin.addEventListener('mouseleave', hide);
    pin.addEventListener('focus', show);
    pin.addEventListener('blur', hide);
    pin.addEventListener('click', () => { const t = document.querySelector(pin.dataset.target); if (t) sweepTo(t); });
    pin.addEventListener('keydown', e => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); pin.click(); } });
  });
  // dibujo de la línea de costa al entrar
  if (shore && !window.__REDUCED){
    const len = shore.getTotalLength();
    shore.style.strokeDasharray = len; shore.style.strokeDashoffset = len;
    new IntersectionObserver((es,o) => { if (es[0].isIntersecting){
      shore.style.transition = 'stroke-dashoffset 2.2s cubic-bezier(.16,1,.3,1)';
      shore.style.strokeDashoffset = '0'; o.disconnect();
    }}, {threshold:.4}).observe(stage);
  }
})();

/* ════════════════════════════════════════
   TRANSICIÓN DORADA + NAVEGACIÓN
═══════════════════════════════════════ */
const sweepEl = document.getElementById('page-sweep');
function sweepTo(target){
  if (window.__REDUCED || !sweepEl){ lenis.scrollTo(target,{offset:-72}); return; }
  gsap.fromTo(sweepEl, {x:'-130%'}, {x:'130%', duration:.85, ease:'power2.inOut'});
  setTimeout(()=> lenis.scrollTo(target,{offset:-72, duration:1.1}), 300);
}
document.querySelectorAll('#nav .nav-links a[href^="#"], #mob-menu a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t){ e.preventDefault(); sweepTo(t); }
  });
});

/* ════════════════════════════════════════
   COMPARADOR → scroll al proyecto
═══════════════════════════════════════ */
document.querySelectorAll('.cmp tbody tr[data-target]').forEach(tr => {
  tr.addEventListener('click', () => { const t = document.querySelector(tr.dataset.target); if (t) sweepTo(t); });
});

/* ════════════════════════════════════════
   TIMELINE PROCESO — reveal escalonado
═══════════════════════════════════════ */
gsap.utils.toArray('.tl-step').forEach((el,i)=>{
  gsap.to(el,{opacity:1,y:0,duration:.7,delay:i*.12,ease:'power3.out',
    scrollTrigger:{trigger:'#tl',start:'top 80%'}});
});

/* ════════════════════════════════════════
   CALCULADORA DE ENGANCHE (orientativa)
═══════════════════════════════════════ */
(function(){
  const P = document.getElementById('calc-p'), E = document.getElementById('calc-e'), M = document.getElementById('calc-m');
  if (!P) return;
  const fmt = n => '$' + Math.round(n).toLocaleString('es-MX');
  function upd(){
    const p = +P.value, e = +E.value, m = +M.value;
    const eng = p * e / 100, fin = p - eng;
    document.getElementById('calc-p-v').textContent = fmt(p) + ' MXN';
    document.getElementById('calc-e-v').textContent = e + '%';
    document.getElementById('calc-m-v').textContent = m + ' meses';
    document.getElementById('calc-eng').textContent = fmt(eng);
    document.getElementById('calc-fin').textContent = fmt(fin);
    document.getElementById('calc-out').textContent = fmt(fin / m);
  }
  [P,E,M].forEach(i => i.addEventListener('input', upd));
  upd();
})();

/* ════════════════════════════════════════
   TOURS — formulario → WhatsApp prellenado
═══════════════════════════════════════ */
(function(){
  const form = document.getElementById('vis-form'); if (!form) return;
  // fecha mínima = hoy (no permitir fechas pasadas)
  const fEl = document.getElementById('vis-fecha');
  if (fEl) fEl.min = new Date().toISOString().split('T')[0];
  let tipo = 'presencial';
  const tabs = [document.getElementById('vis-pres'), document.getElementById('vis-virt')];
  tabs.forEach((t,i) => t.addEventListener('click', e => {
    e.preventDefault(); tipo = i === 0 ? 'presencial' : 'virtual';
    tabs.forEach(x => { x.classList.remove('on'); x.setAttribute('aria-selected','false'); });
    t.classList.add('on'); t.setAttribute('aria-selected','true');
  }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const n = document.getElementById('vis-nombre').value.trim();
    const w = document.getElementById('vis-wa').value.trim();
    const p = document.getElementById('vis-proj').value;
    const f = document.getElementById('vis-fecha').value;
    if (!n){ document.getElementById('vis-nombre').focus(); return; }
    const EN = window.__LANG === 'en';
    let msg;
    if (EN){
      msg = `Hi, I'm ${n} and I'd like to book a ${tipo === 'presencial' ? 'site' : 'virtual'} visit`;
      if (p) msg += ` to ${p}`;
      if (f) msg += `. Preferred date: ${f}`;
      if (w) msg += `. My WhatsApp: ${w}`;
      msg += '. Coming from tierra.vip 🌿';
    } else {
      msg = `Hola, soy ${n} y quiero agendar una visita ${tipo}`;
      if (p) msg += ` al proyecto ${p}`;
      if (f) msg += `. Fecha preferida: ${f}`;
      if (w) msg += `. Mi WhatsApp: ${w}`;
      msg += '. Vengo desde tierra.vip 🌿';
    }
    window.open('https://wa.me/529581087977?text=' + encodeURIComponent(msg), '_blank');
  });
})();

/* ════════════════════════════════════════
   NEWSLETTER / LISTA DE ESPERA
═══════════════════════════════════════ */
(function(){
  const f = document.getElementById('nlw-form'); if (!f) return;
  const inp = document.getElementById('nlw-email'), ok = document.getElementById('nlw-ok');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = inp.value.trim();
    const EN = window.__LANG === 'en';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){
      inp.classList.add('err'); inp.focus();
      ok.textContent = EN ? 'Check your email — it looks incomplete.' : 'Revisa tu correo — parece incompleto.';
      ok.classList.add('show');
      return;
    }
    inp.classList.remove('err');
    ok.textContent = EN ? 'Done! We opened your email app to confirm your spot. 🌿' : '¡Listo! Abrimos tu correo para confirmar tu lugar en la lista. 🌿';
    ok.classList.add('show');
    window.open('mailto:ventas@tierra.vip?subject=' + encodeURIComponent(EN ? 'Waitlist — Serena / Depas Kora' : 'Lista de espera — Serena / Depas Kora')
      + '&body=' + encodeURIComponent(EN ? `Hi, I want to join the waitlist for Serena and Depas Kora.\nMy email: ${v}\n(Sent from tierra.vip)` : `Hola, quiero unirme a la lista de espera de Serena y Depas Kora.\nMi correo: ${v}\n(Enviado desde tierra.vip)`), '_blank');
    inp.value = '';
  });
  inp.addEventListener('input', () => { inp.classList.remove('err'); ok.classList.remove('show'); });
})();

/* ════════════════════════════════════════
   RELOJ DE OAXACA + AÑO + BADGE TRUST
═══════════════════════════════════════ */
(function(){
  const c = document.getElementById('oax-clock');
  function tick(){
    try{
      const t = new Date().toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit', timeZone:'America/Mexico_City'});
      c.innerHTML = (window.__LANG === 'en' ? "In Mazunte it's <b>" : 'En Mazunte son las <b>') + t + '</b>';
    }catch(_){ c.textContent = ''; }
  }
  if (c){ tick(); setInterval(tick, 30000); }
  const fy = document.getElementById('fyear'); if (fy) fy.textContent = new Date().getFullYear();
  const tb = document.getElementById('trust-badge');
  if (tb) window.addEventListener('scroll', () => tb.classList.toggle('show', window.scrollY > 600), {passive:true});
})();

/* ════════════════════════════════════════
   ETIQUETA DE SECCIÓN ACTUAL (scroll)
═══════════════════════════════════════ */
(function(){
  const lbl = document.getElementById('sec-label'); if (!lbl) return;
  const secs = [
    ['#hero','01 — Inicio','01 — Home'],['#manifesto','02 — Manifiesto','02 — Manifesto'],['#masterplan','03 — Masterplan','03 — Masterplan'],
    ['#sec-projects','04 — Proyectos','04 — Projects'],['#coming','05 — Próximamente','05 — Coming soon'],['#invertir','06 — Inversión','06 — Investment'],
    ['#construccion','07 — Construcción','07 — Construction'],['#g3d','08 — Galería','08 — Gallery'],['#confianza','09 — Confianza','09 — Trust'],['#chat','10 — Contacto','10 — Contact'],
  ];
  let curSec = null;
  window.__secLabelRefresh = () => { if (curSec) lbl.textContent = window.__LANG === 'en' ? curSec[2] : curSec[1]; };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){
      const m = secs.find(s => document.querySelector(s[0]) === e.target);
      if (m){ curSec = m; lbl.textContent = window.__LANG === 'en' ? m[2] : m[1]; lbl.classList.add('show'); }
    }
  }), {rootMargin:'-45% 0px -45% 0px'});
  secs.forEach(s => { const el = document.querySelector(s[0]); if (el) io.observe(el); });
})();

/* ════════════════════════════════════════
   PRELOAD INTELIGENTE (resto en idle)
═══════════════════════════════════════ */
(function(){
  const rest = gdata.map(d => d.src);
  const run = () => rest.forEach(src => { const im = new Image(); im.src = src; });
  if ('requestIdleCallback' in window) requestIdleCallback(run, {timeout:6000});
  else setTimeout(run, 3500);
})();

/* ════════════════════════════════════════
   MOTOR DEL ASISTENTE — sinónimos EN,
   memoria de conversación y fallback
═══════════════════════════════════════ */
let aipLastIntent = null, aipGeneralStreak = 0;
const EN_REPLIES = {
  saludo: "Hi! Welcome to Tierra Desarrollos 🌿\n\nWe develop eco-luxury lots and homes on the Oaxaca coast: jungle lots near Mazunte, oceanfront land steps from Zipolite, and clifftop sites above hidden beaches.\n\nWhat are you looking for — land to build, a turnkey home, or an investment?",
  precio: "Prices vary by project and current availability, so we don't publish them online — that way an advisor can offer you the best option for your profile.\n\nTell me which project interests you (Azimut, Nabani, Aldea Tao, Serena or Depas Kora) and we'll connect you right away.",
  contacto: "Of course! You can reach us at:\n\n📱 **WhatsApp:** +52 958 108 7977\n📧 **Email:** ventas@tierra.vip\n📸 **Instagram:** @tierra_desarrollos\n\nWe reply every day of the week.",
  proyectos: "We have 5 projects on the Oaxaca coast:\n\n🌿 **Azimut** — jungle lots in a holistic wellness center, Mazunte\n🌴 **Nabani** — oceanfront land, walking distance to beaches\n🌊 **Aldea Tao** — exclusive clifftop lots with hidden coves\n🌱 **Serena** — eco community, coming soon\n🏙️ **Depas Kora** — apartments in Zipolite, pre-sale\n\nWhich one would you like to explore?",
  proceso: "Buying with Tierra is safe and guided:\n\n1️⃣ Initial consultation\n2️⃣ Site visit (in person or virtual)\n3️⃣ Purchase agreement\n4️⃣ Payment plan\n5️⃣ Notarized deed\n6️⃣ Delivery\n\nFull legal support from day one. Want an advisor to walk you through it?",
  inversion: "The Oaxaca coast is one of Mexico's fastest-appreciating regions — still affordable compared to saturated destinations like Tulum.\n\n✦ Long-term land appreciation\n✦ Vacation rental demand in Mazunte & Zipolite\n✦ Guaranteed deeds and full legal backing\n\nAre you looking to build, rent out, or hold?",
  financiamiento: "Yes — we offer flexible down payments and monthly installments adapted to each client. An advisor can share exact terms by WhatsApp: +52 958 108 7977.",
  agradecimiento: "My pleasure! 🌿 If you'd like to talk to a human advisor, we're on WhatsApp: +52 958 108 7977.",
  general: "I can help you with our 5 projects on the Oaxaca coast, the buying process, financing or how to visit.\n\nWhat would you like to know?",
};
// Redefinimos aipGetReply con detección de idioma, sinónimos y memoria
aipGetReply = function(text){
  const t = text.toLowerCase();
  // ── conversación humana: presentaciones, small talk y saludos repetidos ──
  const pres = text.match(/(?:soy|me llamo|mi nombre es|i'?m|my name is)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]{2,})/i);
  if (pres && !/^(un|una|de|del|el|la|buscando|interesado|interesada|cliente|nuevo|aqui|aquí)$/i.test(pres[1])){
    const name = pres[1].charAt(0).toUpperCase() + pres[1].slice(1).toLowerCase();
    AIP.lead.nombre = AIP.lead.nombre || name;
    aipLastIntent = 'presentacion';
    aipHistory.push({role:'user', text});
    const r = LL(`¡Mucho gusto, ${name}! 🌿 Cuéntame, ¿qué te trae por aquí — estás buscando un terreno para construir, una casa lista o una inversión en la costa?`,
                 `Nice to meet you, ${name}! 🌿 Tell me — are you looking for land to build, a finished home, or an investment on the coast?`);
    aipHistory.push({role:'ai', text:r});
    return r;
  }
  if (/c[oó]mo est[aá]s|qu[eé] tal est[aá]s|how are you|todo bien/.test(t)){
    aipHistory.push({role:'user', text});
    const r = LL(`Muy bien, gracias por preguntar 🌿 ${AIP.lead.nombre ? AIP.lead.nombre + ', d' : 'D'}ime, ¿en qué te puedo ayudar hoy?`,
                 `Very well, thanks for asking 🌿 ${AIP.lead.nombre ? AIP.lead.nombre + ', w' : 'W'}hat can I help you with today?`);
    aipHistory.push({role:'ai', text:r});
    return r;
  }
  if (aipLastIntent && /hola|buenas|hello|hi\b|hey/.test(t) && aipHistory.length > 2){
    aipHistory.push({role:'user', text});
    const r = LL(`¡Hola de nuevo${AIP.lead.nombre ? ', ' + AIP.lead.nombre : ''}! ¿Por dónde quieres empezar — proyectos, precios o agendar una visita?`,
                 `Hello again${AIP.lead.nombre ? ', ' + AIP.lead.nombre : ''}! Where shall we start — projects, prices, or booking a visit?`);
    aipHistory.push({role:'ai', text:r});
    return r;
  }
  // ── contexto: respuesta directa a "¿qué buscas?" (terreno / casa / depa) ──
  if (/terreno|lote|para construir|\bland\b|\blot\b/.test(t) && !/azimut|nabani|aldea|serena|kora/.test(t)){
    AIP.interests.push('terreno'); aipLastIntent = 'proyectos';
    aipHistory.push({role:'user', text});
    const r = LL(`Buena elección${AIP.lead.nombre ? ', ' + AIP.lead.nombre : ''}. Para terrenos tenemos dos joyas:\n\n🌿 **Azimut** — lotes en selva dentro de un centro de bienestar, a pasos de Mazunte.\n🌊 **Aldea Tao** — lotes en acantilado frente al Pacífico, con calas privadas.\n\n¿Te llama más la selva o el mar?`,
                 `Great choice${AIP.lead.nombre ? ', ' + AIP.lead.nombre : ''}. For land we have two gems:\n\n🌿 **Azimut** — jungle lots inside a wellness center, steps from Mazunte.\n🌊 **Aldea Tao** — clifftop lots facing the Pacific, with private coves.\n\nAre you more jungle or more ocean?`);
    aipHistory.push({role:'ai', text:r});
    return r;
  }
  if (/\bcasa\b|residencia|llave en mano|\bhouse\b|\bhome\b|turnkey/.test(t) && !/azimut|nabani|aldea|serena|kora/.test(t)){
    AIP.interests.push('Nabani'); aipLastIntent = 'nabani';
    aipHistory.push({role:'user', text});
    const r = LL(`Entonces te va a encantar **Nabani**: terrenos frente al mar donde construimos residencias de autor llave en mano — madera, palma y piedra, con playas caminando.\n\n¿Quieres que te comparta disponibilidad?`,
                 `Then you'll love **Nabani**: oceanfront land where we build turnkey signature residences — wood, palm and stone, with beaches within walking distance.\n\nWant me to share availability?`);
    aipHistory.push({role:'ai', text:r});
    return r;
  }
  // selva vs mar (seguimiento de la recomendación de terrenos)
  if (/^(la )?(selva|jungle)\b/.test(t.trim())){
    AIP.interests.push('Azimut'); aipLastIntent = 'azimut';
    aipHistory.push({role:'user', text});
    const r = LL(`**Azimut** entonces 🌿 Lotes privados en ladera de selva con yoga shala, temazcal y alberca natural — y algunos con vista al Pacífico. ¿Te comparto disponibilidad o prefieres agendar una visita?`,
                 `**Azimut** it is 🌿 Private jungle hillside lots with a yoga shala, temazcal and natural pool — some with Pacific views. Shall I share availability, or would you rather book a visit?`);
    aipHistory.push({role:'ai', text:r});
    return r;
  }
  if (/^(el )?(mar|oc[eé]ano|ocean|sea)\b/.test(t.trim())){
    AIP.interests.push('Aldea Tao'); aipLastIntent = 'aldea';
    aipHistory.push({role:'user', text});
    const r = LL(`**Aldea Tao** 🌊 Lotes exclusivos sobre acantilados, con acceso a Playa Tololote y La Boquilla — calas que no aparecen en los mapas. Es proyecto limitado. ¿Te comparto disponibilidad o agendamos una visita?`,
                 `**Aldea Tao** 🌊 Exclusive clifftop lots with access to Tololote and La Boquilla — coves that appear on no map. It's a limited project. Shall I share availability, or shall we book a visit?`);
    aipHistory.push({role:'ai', text:r});
    return r;
  }
  const isEN = !/[áéíóúñ¿¡]/.test(text) && /\b(the|price|cost|how|where|when|buy|invest|beach|house|land|lot|hello|hi|thanks|what|can|info|you|visit|process|payment)\b/.test(t);
  let intent = aipDetectIntent(text);
  if (intent === 'general'){ // sinónimos EN → intents
    if (/\b(price|cost|how much|expensive)\b/.test(t)) intent = 'precio';
    else if (/\b(buy|purchase|process|deed|notary|legal)\b/.test(t)) intent = 'proceso';
    else if (/\b(invest|roi|return|appreciat)\b/.test(t)) intent = 'inversion';
    else if (/\b(finance|financing|installment|payment|down payment)\b/.test(t)) intent = 'financiamiento';
    else if (/\b(where|location|get there|how far)\b/.test(t)) intent = 'ubicacion';
    else if (/\b(contact|phone|whatsapp|email)\b/.test(t)) intent = 'contacto';
    else if (/\b(project|options|available|portfolio)\b/.test(t)) intent = 'proyectos';
    else if (/\b(hello|hi|hey|good (morning|afternoon|evening))\b/.test(t)) intent = 'saludo';
    else if (/\bthank/.test(t)) intent = 'agradecimiento';
  }
  // memoria: un "sí / yes / claro" después de una pregunta del bot → pasar a contacto
  if (/^(s[ií]|claro|ok|dale|va|por favor|yes|sure|please|yep)\W*$/i.test(text.trim()) && aipLastIntent && aipLastIntent !== 'contacto') intent = 'contacto';
  aipGeneralStreak = intent === 'general' ? aipGeneralStreak + 1 : 0;
  aipHistory.push({ role: 'user', text });
  let reply;
  if (isEN && EN_REPLIES[intent]) reply = EN_REPLIES[intent];
  else if (intent === 'general' && aipGeneralStreak > 1)
    reply = 'Para esa pregunta, lo mejor es un asesor humano 🌿 Escríbenos por WhatsApp (+52 958 108 7977) — o dime si te interesa un **terreno**, una **residencia** o **invertir**, y te oriento.';
  else reply = aipBuildReply(intent, text);
  aipLastIntent = intent;
  aipHistory.push({ role: 'ai', text: reply });
  return reply;
};

/* ════════════════════════════════════════
   ASESOR DE VENTAS — memoria, sugerencias,
   captura de leads y arquitectura Claude-ready
═══════════════════════════════════════ */
// Estado de la conversación (memoria)
const AIP = { mode:'chat', step:0, lead:{nombre:'',tel:'',email:'',visita:'',proyecto:''}, interests:[] };
function LL(es,en){ return window.__LANG==='en' ? en : es; }

// Chips de respuestas sugeridas (estilo .cpill existente — identidad Tierra)
function aipChips(items){
  const wrap = document.createElement('div');
  wrap.className = 'cpills'; wrap.style.padding = '0 4px';
  items.forEach(([label, send]) => {
    const b = document.createElement('button');
    b.className = 'cpill'; b.textContent = label;
    b.addEventListener('click', () => { wrap.remove(); aipInput.value = send; aipSendMsg(); });
    wrap.appendChild(b);
  });
  aipMsgs.appendChild(wrap);
  aipMsgs.scrollTop = aipMsgs.scrollHeight;
}

// Recomendador según necesidades detectadas
function aipRecommend(t){
  if (/yoga|wellness|bienestar|holist|comunidad cerca|mazunte/.test(t)) return 'Azimut';
  if (/eco|sustent|huerto|jard[ií]n|comunidad/.test(t)) return 'Serena';
  if (/depa|departamento|apartment|zipolite|preventa/.test(t)) return 'Depas Kora';
  if (/acantilado|vista|exclusiv|cliff|view|lujo/.test(t)) return 'Aldea Tao';
  if (/inver|invest|roi|renta|patrimonio/.test(t)) return 'Nabani';
  return '';
}

// Memoria de intereses + oferta de captura tras señales de interés
function aipAfterReply(text){
  const t = text.toLowerCase();
  const proj = aipRecommend(t) || (t.match(/azimut|nabani|aldea|serena|kora/) || [''])[0];
  if (proj && !AIP.interests.includes(proj)) AIP.interests.push(proj.charAt(0).toUpperCase()+proj.slice(1));
  // honestidad si preguntan si es bot/humano
  if (/eres (un )?(bot|robot|ia|inteligencia|humano)|are you (a )?(bot|robot|ai|human)/.test(t)){
    aipAddMsg('ai', LL('Soy el asistente digital del equipo de Tierra — y detrás hay asesores humanos que dan seguimiento personal a cada conversación. ¿Te conecto con uno?','I am the digital assistant of the Tierra team — with human advisors following up personally on every conversation. Want me to connect you with one?'));
    return;
  }
  const interested = /me interesa|interesad|quiero (comprar|invertir|agendar|visitar|ver|información|info)|disponibilidad|precio|cu[aá]nto cuesta|agendar|visita|interested|i want|how much|schedule|visit|contact/.test(t);
  if (interested && AIP.mode === 'chat'){
    setTimeout(() => {
      aipAddMsg('ai', LL('Para darte atención personalizada, ¿me compartes tus datos? Un asesor te contacta hoy mismo.','To give you personal attention, may I take your details? An advisor will contact you today.'));
      aipChips([[LL('Sí, tomar mis datos','Yes, take my details'),'__lead__'],[LL('Ahora no','Not now'),'__skip__']]);
    }, 600);
  }
}

// ── Flujo de captura de lead: nombre → teléfono → correo → tipo de visita ──
function leadStart(){
  AIP.mode = 'lead';
  AIP.lead.proyecto = AIP.interests[AIP.interests.length-1] || '';
  if (AIP.lead.nombre){  // ya se presentó: ir directo al teléfono
    AIP.step = 1;
    aipAddMsg('ai', LL(`Perfecto, ${AIP.lead.nombre}. ¿Cuál es tu teléfono (WhatsApp)?`,`Perfect, ${AIP.lead.nombre}. What is your phone (WhatsApp)?`));
  } else {
    AIP.step = 0;
    aipAddMsg('ai', LL('Perfecto. ¿Cuál es tu nombre?','Perfect. What is your name?'));
  }
}
function leadStep(text){
  const t = text.trim();
  if (AIP.step === 0){
    if (t.length < 2){ aipAddMsg('ai', LL('¿Me repites tu nombre, por favor?','Could you repeat your name, please?')); return; }
    AIP.lead.nombre = t; AIP.step = 1;
    aipAddMsg('ai', LL(`Gracias, ${t}. ¿Cuál es tu teléfono (WhatsApp)?`,`Thank you, ${t}. What is your phone (WhatsApp)?`));
  } else if (AIP.step === 1){
    const digits = t.replace(/\D/g,'');
    if (digits.length < 8){ aipAddMsg('ai', LL('Ese número parece incompleto — ¿me lo compartes con lada?','That number looks incomplete — could you share it with area code?')); return; }
    AIP.lead.tel = t; AIP.step = 2;
    aipAddMsg('ai', LL('¿Y tu correo electrónico? (puedes escribir "omitir")','And your email? (you can type "skip")'));
  } else if (AIP.step === 2){
    if (!/omitir|skip/i.test(t)){
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)){ aipAddMsg('ai', LL('Ese correo no parece válido — ¿lo revisas? (o escribe "omitir")','That email does not look valid — could you check it? (or type "skip")')); return; }
      AIP.lead.email = t;
    }
    AIP.step = 3;
    aipAddMsg('ai', LL('¿Prefieres una visita virtual o presencial?','Do you prefer a virtual or an in-person visit?'));
    aipChips([[LL('Visita virtual','Virtual visit'),'__virtual__'],[LL('Visita presencial','In-person visit'),'__presencial__']]);
  } else {
    AIP.lead.visita = /virtual/i.test(t) ? 'virtual' : 'presencial';
    leadFinish();
  }
}
function leadFinish(){
  AIP.mode = 'chat';
  try{ const all = JSON.parse(localStorage.getItem('tierraLeads')||'[]'); all.push({...AIP.lead, fecha:new Date().toISOString()}); localStorage.setItem('tierraLeads', JSON.stringify(all)); }catch(_){}
  const L = AIP.lead;
  const msg = encodeURIComponent(LL(
    `Hola, soy ${L.nombre}. Hablé con el asesor de tierra.vip.${L.proyecto ? ' Me interesa ' + L.proyecto + '.' : ''} Prefiero visita ${L.visita}. Tel: ${L.tel}${L.email ? ' · Email: ' + L.email : ''}`,
    `Hi, I'm ${L.nombre}. I spoke with the tierra.vip advisor.${L.proyecto ? " I'm interested in " + L.proyecto + '.' : ''} I prefer a ${L.visita === 'virtual' ? 'virtual' : 'site'} visit. Phone: ${L.tel}${L.email ? ' · Email: ' + L.email : ''}`));
  aipAddMsg('ai', LL(
    `Listo, ${L.nombre} 🌿 Un asesor te contactará hoy${L.proyecto ? ' con la información de ' + L.proyecto : ''}.\n\nSi prefieres no esperar, continúa ahora mismo por WhatsApp:`,
    `Done, ${L.nombre} 🌿 An advisor will contact you today${L.proyecto ? ' with information on ' + L.proyecto : ''}.\n\nIf you'd rather not wait, continue right now on WhatsApp:`));
  const wrap = document.createElement('div'); wrap.className = 'cacts'; wrap.style.padding = '0 4px';
  const wa = document.createElement('button'); wa.className = 'cact wa';
  wa.textContent = LL('Continuar por WhatsApp →','Continue on WhatsApp →');
  wa.addEventListener('click', () => window.open('https://wa.me/529581087977?text=' + msg, '_blank'));
  wrap.appendChild(wa); aipMsgs.appendChild(wrap); aipMsgs.scrollTop = aipMsgs.scrollHeight;
}

// ── Backend Claude-ready: si window.TIERRA_API_URL apunta a /api/chat (server.js),
//    el asesor usa Claude real con streaming; si no, cae al motor local. ──
async function aipBackend(text){
  const messages = aipHistory.slice(-20).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
  messages.push({ role:'user', content:text });
  const res = await fetch(window.TIERRA_API_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ messages })
  });
  if (!res.ok) throw new Error('backend ' + res.status);
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let out = '';
  for(;;){
    const {done, value} = await reader.read(); if (done) break;
    dec.decode(value).split('\n').forEach(line => {
      if (line.startsWith('data: ') && line !== 'data: [DONE]'){
        try{ const j = JSON.parse(line.slice(6)); if (j.text) out += j.text; }catch(_){}
      }
    });
  }
  if (!out) throw new Error('empty');
  aipHistory.push({role:'user', text}); aipHistory.push({role:'ai', text:out});
  return out;
}

/* ════════════════════════════════════════
   CHAT CONCIERGE — entrada de texto libre
═══════════════════════════════════════ */
(function(){
  const inp = document.getElementById('chat-input'), btn = document.getElementById('chat-send');
  if (!inp || !btn) return;
  function send(){
    const v = inp.value.trim(); if (!v) return;
    inp.value = '';
    addMsg(v, 'usr');
    const ty = showTyping();
    setTimeout(() => {
      rmEl(ty);
      addMsg(aipGetReply(v).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'), 'ai');
    }, 750);
  }
  btn.addEventListener('click', send);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
})();

/* ════════════════════════════════════════
   IDIOMA ES / EN — sitio COMPLETO
   ES se captura del DOM; aquí solo vive el EN.
═══════════════════════════════════════ */
const CHAT_EN = new Map([
  ['Hola, soy la asesora virtual de Tierra Desarrollos.\nEstoy aquí para ayudarte a encontrar el espacio perfecto. ¿Qué tipo de propiedad te interesa?', "Hi, I'm the virtual advisor at Tierra Desarrollos.\nI'm here to help you find the perfect place. What kind of property are you looking for?"],
  ['Terreno para construir','Land to build'],['Residencia de autor','Signature residence'],['Inversión patrimonial','Investment'],
  ['¿Tienes alguna zona del Pacífico en mente?','Do you have a Pacific area in mind?'],
  ['Costa de Oaxaca','Oaxaca coast'],['Pacífico Mexicano','Mexican Pacific'],['Abierto a opciones','Open to options'],
  ['¿En qué etapa de tu proceso estás?','Where are you in your process?'],
  ['Listo para invertir','Ready to invest'],['Evaluando (6–18 meses)','Evaluating (6–18 months)'],['Explorando opciones','Just exploring'],
  ['¿Cómo prefieres que te contactemos?','How would you like us to contact you?'],
  ['Perfecto. Nuestro equipo se pondrá en contacto contigo a la brevedad.\n\nEn Tierra Desarrollos, cada historia comienza con encontrar el lugar correcto. Gracias por tu confianza. 🌿','Perfect. Our team will reach out shortly.\n\nAt Tierra Desarrollos, every story begins with finding the right place. Thank you for your trust. 🌿'],
  ['Nabani es nuestro proyecto de residencias de autor más especial — diseñado para quienes buscan vivir con lujo y en conexión total con la naturaleza tropical. Nuestro equipo puede enviarte el dossier completo con planos, disponibilidad y condiciones. ¿Te lo hacemos llegar?','Nabani is our most special signature-residence project — designed for those who want luxury in total connection with tropical nature. Our team can send you the full dossier with plans, availability and terms. Shall we?'],
  ['Contamos con tres proyectos en distintas etapas de desarrollo en el Pacífico mexicano, cada uno con retornos y condiciones diferenciadas. Un asesor especializado puede presentarte las opciones con proyecciones y estructura de inversión. ¿Cuándo sería un buen momento para hablar?','We have three projects at different stages on the Mexican Pacific, each with its own returns and terms. A specialist advisor can walk you through the options. When would be a good time to talk?'],
  ['Basándonos en tus preferencias, Azimut Mazunte y Aldea Tao son los proyectos que mejor se adaptan a tu perfil. Ambos ofrecen terrenos exclusivos en la Costa de Oaxaca con vistas al Pacífico, pleno respaldo legal y arquitectura en armonía con el entorno. ¿Te gustaría que un asesor te comparta información detallada y disponibilidad?','Based on your preferences, Azimut Mazunte and Aldea Tao fit your profile best. Both offer exclusive lots on the Oaxaca coast with Pacific views, full legal backing and architecture in harmony with the land. Would you like an advisor to share details and availability?'],
]);

(function(){
  window.__LANG = 'es';
  // [selector, EN, modo] — modo: 't'=textContent (def) · 'h'=innerHTML · 'p'=placeholder · 'f'=primer nodo de texto
  const TRX = [
    // hero
    ['#hl1','We create spaces'],['#hl2','where the land speaks.'],['#hsub','Architecture in harmony with nature'],
    ['#hctas a:nth-child(1)','Explore projects'],['#hctas a:nth-child(2)','Talk to an advisor <span>→</span>','h'],
    // manifesto
    ['#mfl1','We believe land'],['#mfl2','is not owned.'],['#mfl3','It is cared for.'],
    ['#manifesto > p',"At Tierra Desarrollos we don't sell square meters. We sell access to a place that still exists — where the ocean is still wild, the jungle hasn't given way and silence still has value. Every project we build is a promise that this place will go on existing."],
    // hero pre + ubicaciones de proyecto
    ['#hpre','Tierra  ·  Development & Construction'],
    ['#pco-nb .ploc','Oaxacan Coast'],['#pco-at .ploc','Oaxacan Coast'],
    // features de los 3 proyectos (mismo orden del DOM)
    ['#pco-az .pfeat:nth-of-type(1)','◆ Open-air Yoga Shala','h'],['#pco-az .pfeat:nth-of-type(2)','◆ Traditional temazcal','h'],['#pco-az .pfeat:nth-of-type(3)','◆ Natural rock pool','h'],['#pco-az .pfeat:nth-of-type(4)','◆ Trails to the beach','h'],['#pco-az .pfeat:nth-of-type(5)','◆ Bicycle trail','h'],['#pco-az .pfeat:nth-of-type(6)','◆ Full power service','h'],['#pco-az .pfeat:nth-of-type(7)','◆ Full legal backing','h'],
    ['#pco-nb .pfeat:nth-of-type(1)','◆ Signature residences','h'],['#pco-nb .pfeat:nth-of-type(2)','◆ Private pools','h'],['#pco-nb .pfeat:nth-of-type(3)','◆ Palm & wood architecture','h'],['#pco-nb .pfeat:nth-of-type(4)','◆ Hammock terraces','h'],['#pco-nb .pfeat:nth-of-type(5)','◆ Private tropical gardens','h'],['#pco-nb .pfeat:nth-of-type(6)','◆ Turnkey delivery','h'],
    ['#pco-at .pfeat:nth-of-type(1)','◆ Access to Tololote Beach','h'],['#pco-at .pfeat:nth-of-type(2)','◆ Access to La Boquilla Beach','h'],['#pco-at .pfeat:nth-of-type(3)','◆ Panoramic Pacific views','h'],['#pco-at .pfeat:nth-of-type(4)','◆ Cliffs over the ocean','h'],['#pco-at .pfeat:nth-of-type(5)','◆ Exclusive limited project','h'],['#pco-at .pfeat:nth-of-type(6)','◆ Guaranteed deeds','h'],
    // próximamente: badges y descripciones
    ['.cs-card:nth-of-type(1) .cs-badge','Coming soon'],['.cs-card:nth-of-type(2) .cs-badge','Pre-sale'],
    ['.cs-card:nth-of-type(1) .cs-desc','Community living next to Mazunte: community garden, organic orchard and architecture that embraces the land.'],
    ['.cs-card:nth-of-type(2) .cs-desc','One of the most innovative apartment projects on the Oaxaca Coast — minutes from Zipolite, with ocean views and surrounded by nature. Minimalist design, contemporary living.'],
    // comparador: columna ubicación (solo las traducibles)
    ['.cmp tbody tr:nth-child(2) td:nth-child(3)','Oaxacan Coast'],['.cmp tbody tr:nth-child(6) td:nth-child(3)','Oaxaca Coast'],
    // chat: cabecera y estado
    ['.cname','Virtual Advisor · Tierra Desarrollos'],
    ['.cstat','<div class="cdot-g"></div> Online','h'],
    ['#chat-input','Or type your question here…','p'],
    // masterplan
    ['#masterplan h2','The Oaxaca Coast, <em style="color:var(--gold)">project by project.</em>','h'],
    // proyectos
    ['#pco-az .pdesc','Build your home inside a holistic wellness center, steps from the heart of Mazunte. Private jungle hillside lots with a yoga shala, temazcal and natural pool at the center of the community. Some lots have Pacific views; all come with full utilities and legal backing from day one.'],
    ['#pco-nb .pdesc','Nabani — "home" in Zapotec — is oceanfront land with beaches within walking distance, steps from Zipolite and Mazunte. The place to build your signature residence in wood, palm and stone, where every sunrise happens in front of the Pacific.'],
    ['#pco-at .pdesc','On the Pacific cliffs, where the ocean strikes volcanic rock and the horizon never ends, a unique community is born. Build your house facing the sea, with access to Tololote and La Boquilla — wild coves that appear on no map.'],
    ['#pco-az .pcta','Discover Azimut →'],['#pco-nb .pcta','Discover Nabani →'],['#pco-at .pcta','Discover Aldea Tao →'],
    // coming soon + newsletter
    ['.cs-tag','Coming soon'],['.cs-ttl','New projects on the way'],
    ['.nlw > div','Be the first to know'],
    ['.nlw > p','Leave your email and we will let you know when Serena and Depas Kora open availability.'],
    ['#nlw-form button','Join the list'],['#nlw-email','your@email.com','p'],
    // invertir
    ['#invertir h2','Why invest in <em style="color:var(--gold)">the Oaxaca Coast?</em>','h'],
    ['.inv-item:nth-child(1) h3','Rising value'],['.inv-item:nth-child(2) h3',"What Tulum no longer is"],['.inv-item:nth-child(3) h3','Legal certainty'],['.inv-item:nth-child(4) h3','Vacation rental'],
    ['.inv-item:nth-child(1) p','One of the fastest-growing coasts of the Mexican Pacific. Mazunte and Zipolite are rising destinations — and there is still land available by the sea.'],
    ['.inv-item:nth-child(2) p','No saturation, no inflated prices, no lost soul. The Oaxaca coast keeps what the Caribbean sold: wild nature, living towns and silence.'],
    ['.inv-item:nth-child(3) p','Guaranteed deeds and full legal support from day one. Investing here is not a bet: it is patrimony.'],
    ['.inv-item:nth-child(4) p','Build and rent: demand for boutique stays in Mazunte and Zipolite grows year after year. Your house can pay for itself.'],
    // construccion
    ['#construccion h2','We don\'t just develop the land.<br><em style="color:var(--gold)">We build it with you.</em>','h'],
    ['#construccion > div > p','We accompany every project from design to turnkey delivery. <a href="construccion.html" style="color:var(--gold);border-bottom:1px solid rgba(201,169,110,.5)">See everything we have built →</a>','h'],
    ['#construccion h3','Estimate your payment plan'],
    ['.calc-r .lbl','Estimated monthly payment'],
    ['.calc-r .row:nth-of-type(1) span:first-child','Down payment'],['.calc-r .row:nth-of-type(2) span:first-child','Amount financed'],
    ['.calc-r .btn-arrow','Ask for real terms <span>→</span>','h'],
    ['.calc-disc','* Reference figures only, without interest or fees, to size your plan. Real prices and terms are confirmed by an advisor per project and availability.'],
    // proceso
    ['#proceso h2','From the first call <em style="color:var(--gold)">to the keys.</em>','h'],
    ['.tl-step:nth-child(1) h4','Initial consultation'],['.tl-step:nth-child(2) h4','Site visit'],['.tl-step:nth-child(3) h4','Purchase agreement'],['.tl-step:nth-child(4) h4','Payment plan'],['.tl-step:nth-child(5) h4','Notarized deed'],['.tl-step:nth-child(6) h4','Delivery'],
    ['.tl-step:nth-child(1) p','We get to know your profile, your timing and what you are looking for.'],
    ['.tl-step:nth-child(2) p','In person or virtual — walk the lot before deciding.'],
    ['.tl-step:nth-child(3) p','You sign with legal support from the first document.'],
    ['.tl-step:nth-child(4) p','Down payment and installments adapted to you.'],
    ['.tl-step:nth-child(5) p','Notarized and guaranteed. Your patrimony is protected.'],
    ['.tl-step:nth-child(6) p','The land is yours. And if you want, Tierra builds it for you.'],
    // comparador
    ['#comparador h2','Which one is <em style="color:var(--gold)">your project?</em>','h'],
    ['.cmp th:nth-child(1)','Project'],['.cmp th:nth-child(2)','Type'],['.cmp th:nth-child(3)','Location'],['.cmp th:nth-child(4)','Highlight'],['.cmp th:nth-child(5)','Status'],
    ['.cmp tbody tr:nth-child(1) td:nth-child(2)','Residential lots'],['.cmp tbody tr:nth-child(2) td:nth-child(2)','Oceanfront land'],['.cmp tbody tr:nth-child(3) td:nth-child(2)','Clifftop lots'],['.cmp tbody tr:nth-child(4) td:nth-child(2)','Apartments'],['.cmp tbody tr:nth-child(5) td:nth-child(2)','Eco community'],['.cmp tbody tr:nth-child(6) td:nth-child(2)','Residential lots'],
    ['.cmp tbody tr:nth-child(1) td:nth-child(4)','Holistic wellness center'],['.cmp tbody tr:nth-child(2) td:nth-child(4)','Beaches within walking distance'],['.cmp tbody tr:nth-child(3) td:nth-child(4)','Private coves'],['.cmp tbody tr:nth-child(4) td:nth-child(4)','Minimalist design'],['.cmp tbody tr:nth-child(5) td:nth-child(4)','Community garden & orchard'],['.cmp tbody tr:nth-child(6) td:nth-child(4)',"Tierra's first development"],
    ['.cmp tbody tr:nth-child(1) .tag','Available'],['.cmp tbody tr:nth-child(2) .tag','Available'],['.cmp tbody tr:nth-child(3) .tag','Limited'],['.cmp tbody tr:nth-child(4) .tag','Pre-sale'],['.cmp tbody tr:nth-child(5) .tag','Coming soon'],['.cmp tbody tr:nth-child(6) .tag','Sold out'],
    // galería
    ['.g3d-ttl','A journey along <em>the coast</em>','h'],
    ['.gfbtn[data-f="all"]','All'],
    ['#g3d > p','← Drag, tap the arrows or use your keyboard →'],
    // confianza
    ['#confianza > div > p:nth-of-type(1)','Tierra was born to create contemporary habitats that connect <em style="color:var(--gold)">architecture, culture and nature</em>, leaving a positive legacy in every development.','h'],
    ['#confianza > div > p:nth-of-type(2)','Each project is an ecosystem with its own identity: it boosts the local economy, respects nature and builds community. We are a trusted company that walks with the client through the whole process — investing with us also means transforming the future.'],
    // visitas
    ['#visitas h2','Book your <em style="color:var(--gold)">visit.</em>','h'],
    ['#visitas > div > p','Walking the land changes everything. Choose how you want to see the projects and an advisor confirms by WhatsApp.'],
    ['#vis-pres','In-person visit'],['#vis-virt','Virtual visit'],
    ['#vis-nombre','Your name','p'],['#vis-wa','Your WhatsApp','p'],
    ['#vis-form .vis-send','Book via WhatsApp →'],
    // chat header
    ['.cht-hd h2','Find your land'],['.cht-hd p','Tell us what you are looking for and we connect you with the right project.'],
    // footer
    ['.flc > div','Development & Construction'],['.ftag','Mexican Pacific · Oaxaca Coast'],
    ['.fnt','Projects'],
    ['.finfo > div:nth-of-type(3)','Customer service · Oaxaca<br>Calle Rinconcito s/n, Mazunte, 70947','h'],
    // trust badge
    ['#trust-badge','<span class="d"></span>Guaranteed deeds · 100% legal backing','h'],
    // panel asistente
    ['.aip-name','Tierra Advisor'],['.aip-sub','Sales team · Oaxaca Coast'],
    ['#aip-input','Type your question…','p'],
    ['.aip-pwrd','Tierra Desarrollos · Immediate attention'],
  ];
  const DICT_EN = { nav_proyectos:'Projects', nav_construccion:'Construction', nav_nosotros:'About us', nav_galeria:'Gallery', nav_confianza:'Trust', nav_contacto:'Contact',
    mp_tag:'Masterplan', mp_sub:'Explore the map: every dot is a Tierra development. Tap a pin to discover it.', mp_3d:'Explore the coast in 3D →',
    sold_tag:'Track record', sold_sub:'When a Tierra project sells out, it becomes a community. This is our history — and the best proof of what comes next.', sold_badge:'Sold out', sold_loc:'Oaxaca Coast · 100% sold out',
    lg_label:'Tierra Desarrollos · Est. Mexico', lg_sub:'Architecture in harmony with nature', lg_body:'Every project is born from listening to the land: understanding its topography, its history, its light. We do not build on top of nature — we build with it.' };
  const DICT_ES = {};   // se captura del DOM
  document.querySelectorAll('[data-i18n]').forEach(el => { if (!(el.dataset.i18n in DICT_ES)) DICT_ES[el.dataset.i18n] = el.textContent; });

  // capturar ES original de cada selector de TRX
  const store = TRX.map(([sel, en, mode]) => {
    const els = document.querySelectorAll(sel);
    return { els, en, mode: mode || 't',
      es: [...els].map(el => mode === 'p' ? el.placeholder : (mode === 'f' ? (el.firstChild ? el.firstChild.nodeValue : '') : el.innerHTML)) };
  });
  // labels de la calculadora (texto antes del <b>)
  const calcLabels = [...document.querySelectorAll('.calc-l label')];
  const calcES = calcLabels.map(l => l.firstChild ? l.firstChild.nodeValue : '');
  const calcEN = ['Estimated lot price ', 'Down payment ', 'Term '];

  // labels de la galería 3D (parte tras el "·" de cada gdata.lbl)
  const G_LBL = [['Vista aérea','Aerial view'],['Acantilados del Pacífico','Pacific cliffs'],['Costa salvaje','Wild coast'],['Vista al mar','Ocean view'],['Render del proyecto','Project render'],['Diseño en acantilado','Clifftop design'],['Mazunte desde el aire','Mazunte from above'],['Selva nativa','Native jungle'],['El terreno','The land'],['Vista al Pacífico','Pacific view'],['Yoga Shala (render)','Yoga Shala (render)'],['Frente al mar desde el aire','Oceanfront from above'],['Terreno frente al mar','Oceanfront land'],['Playa Aguete','Aguete Beach'],['Render de residencia','Residence render'],['Diseño de autor','Signature design'],['Diseño contemporáneo','Contemporary design'],['Departamentos','Apartments'],['Comunidad eco','Eco community'],['Vida en comunidad','Community living']];
  window.__txGallery = function(){
    const en = window.__LANG === 'en';
    document.querySelectorAll('.gcard-name').forEach(n => {
      let t = n.textContent;
      G_LBL.forEach(([es, e]) => {
        if (en) t = t.replace(es, e); else t = t.replace(e, es);
      });
      n.textContent = t;
    });
  };
  // "Galería · N imágenes" — conserva el contador dinámico
  const gl = document.querySelector('.g3d-lbl');
  function txGalleryHeader(l){
    if (!gl || gl.childNodes.length < 3) return;
    gl.firstChild.nodeValue = l === 'en' ? 'Gallery · ' : 'Galería · ';
    gl.lastChild.nodeValue  = l === 'en' ? ' images' : ' imágenes';
  }
  // options del formulario de visitas
  const visSel = document.getElementById('vis-proj');
  const visOptES = visSel ? [...visSel.options].map(o => o.textContent) : [];
  const visOptEN = ['Project of interest (optional)','Azimut','Nabani','Aldea Tao','Depas Kora','Serena','Several / not sure yet'];

  function apply(l){
    window.__LANG = l;
    document.documentElement.setAttribute('lang', l);
    document.documentElement.setAttribute('data-lang', l);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      el.textContent = l === 'en' ? (DICT_EN[k] || el.textContent) : (DICT_ES[k] || el.textContent);
    });
    store.forEach(s => s.els.forEach((el, i) => {
      const v = l === 'en' ? s.en : s.es[i];
      if (s.mode === 'p') el.placeholder = v;
      else if (s.mode === 'f') { if (el.firstChild) el.firstChild.nodeValue = v; }
      else el.innerHTML = v;
    }));
    calcLabels.forEach((lab, i) => { if (lab.firstChild) lab.firstChild.nodeValue = l === 'en' ? calcEN[i] : calcES[i]; });
    // stats de confianza y manifesto (labels bajo números)
    const statPairs = [['Clientes felices','Happy clients'],['Años de trayectoria','Years of experience'],['Proyectos activos','Active projects'],['Años en el mercado','Years in the market'],['Respaldo legal','Legal backing']];
    document.querySelectorAll('#confianza [style*="uppercase"], .mflb').forEach(el => {
      statPairs.forEach(([es, en]) => { if (el.textContent.trim() === (l==='en'?es:en)) el.textContent = l==='en'?en:es; });
    });
    // propagar idioma a las landings vía ?lang=en
    document.querySelectorAll('a[href$=".html"], a[href*=".html#"]').forEach(a => {
      const base = a.getAttribute('href').split('?')[0];
      a.setAttribute('href', l === 'en' ? base + '?lang=en' : base);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(b => b.classList.toggle('on', b.dataset.langBtn === l));
    // galería, header de galería, options de visitas y etiqueta lateral
    window.__txGallery();
    txGalleryHeader(l);
    if (visSel) [...visSel.options].forEach((o, i) => o.textContent = l === 'en' ? (visOptEN[i] || o.textContent) : visOptES[i]);
    if (window.__secLabelRefresh) window.__secLabelRefresh();
    try{ localStorage.setItem('tierraLang', l); }catch(_){}
  }
  document.querySelectorAll('[data-lang-btn]').forEach(b => b.addEventListener('click', () => apply(b.dataset.langBtn)));
  // idioma inicial: ?lang → localStorage → 'es'
  let init = new URLSearchParams(location.search).get('lang');
  if (!init){ try{ init = localStorage.getItem('tierraLang'); }catch(_){} }
  if (init === 'en') apply('en');
})();


/* ════════════════════════════════════════
   FAB WHATSAPP DINÁMICO — menú rápido
   con mensaje pre-escrito por intención
═══════════════════════════════════════ */
(function(){
  const fab = document.getElementById('wa-fab'), menu = document.getElementById('wa-menu');
  if (!fab || !menu) return;
  const MSGS = {
    catalogo: ['Hola, quiero el catálogo de precios de los proyectos de Tierra 🌿', 'Hi, I would like the price catalog for the Tierra projects 🌿'],
    visita:   ['Hola, quiero agendar una visita a la costa para conocer los proyectos.', 'Hi, I would like to book a visit to the coast to see the projects.'],
    juridica: ['Hola, tengo dudas sobre la certeza jurídica y la escrituración de los lotes.', 'Hi, I have questions about legal certainty and the deeds of the lots.'],
  };
  fab.addEventListener('click', () => menu.classList.toggle('open'));
  document.addEventListener('click', e => { if (!fab.contains(e.target) && !menu.contains(e.target)) menu.classList.remove('open'); });
  menu.querySelectorAll('button[data-wa]').forEach(b => b.addEventListener('click', () => {
    const m = MSGS[b.dataset.wa];
    window.open('https://wa.me/529581087977?text=' + encodeURIComponent(window.__LANG === 'en' ? m[1] : m[0]), '_blank');
    menu.classList.remove('open');
  }));
})();

})();
