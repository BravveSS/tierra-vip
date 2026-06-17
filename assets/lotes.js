/* TIERRA — Mapa de lotes interactivo (data-driven, datos reales por proyecto) */
(function(){
  'use strict';
  // estado: 'vendido' | 'lofts' | número = precio MXN (disponible)
  const LOTES = {
    azimut: {
      nombre:'Azimut', wa:'529581087977', plano:'assets/img/lotes/azimut.webp',
      nota:'Precios en pesos mexicanos (MXN), pago de contado.',
      lotes:[
        {n:1,m2:1333,e:'vendido'},{n:2,m2:681,e:'lofts'},{n:3,m2:487,e:'vendido'},
        {n:4,m2:670,e:'vendido'},{n:5,m2:487,e:'vendido'},{n:6,m2:477,e:'vendido'},
        {n:7,m2:617,e:'vendido'},{n:8,m2:683,e:853750},{n:9,m2:611,e:764000},
        {n:10,m2:533,e:666813},{n:11,m2:754,e:'vendido'},{n:12,m2:771,e:963688},
        {n:13,m2:1299,e:1298850},{n:14,m2:1234,e:1234250},{n:15,m2:639,e:702515},
        {n:16,m2:784,e:862730},{n:17,m2:797,e:876700},{n:18,m2:601,e:661100},{n:19,m2:422,e:464090}
      ]
    },
    nabani: {
      nombre:'Nabani', wa:'529581087977', plano:'assets/img/lotes/nabani.webp',
      nota:'Precios en pesos mexicanos (MXN). Zona de departamentos (Etapa 2) y Beach Club.',
      lotes:[
        {n:'L1',m2:259,e:'vendido'},{n:'L2',m2:250,e:'vendido'},{n:'L3',m2:241,e:'vendido'},
        {n:'L4',m2:257,e:514000},{n:'L5',m2:299,e:598000},{n:'L6',m2:307,e:'vendido'},
        {n:'L7',m2:299,e:'vendido'},{n:'L8',m2:277,e:'vendido'},{n:'L9',m2:426,e:852000},
        {n:'L10',m2:415,e:830000},{n:'L11',m2:418,e:'vendido'},{n:'L12',m2:418,e:928889},
        {n:'L13',m2:406,e:902222},{n:'L14',m2:474,e:1053333},{n:'L15',m2:481,e:1068889},
        {n:'L16',m2:488,e:1084444},{n:'L17',m2:685,e:'vendido'},{n:'L18',m2:675,e:1500000},
        {n:'L19',m2:788,e:1751111},{n:'L20',m2:598,e:1129556},{n:'L21',m2:468,e:884000},
        {n:'L22',m2:598,e:1129556},{n:'L23',m2:778,e:1469556},{n:'L24',m2:726,e:1371333},
        {n:'L25',m2:804,e:1518667},{n:'L26',m2:449,e:997778},{n:'L27',m2:449,e:997778},
        {n:'L28',m2:449,e:997778},{n:'L29',m2:309,e:'vendido'},{n:'L30',m2:226,e:502222},
        {n:'L31',m2:247,e:590056},{n:'L32',m2:241,e:575722},{n:'L33',m2:241,e:575722},{n:'L34',m2:288,e:688000}
      ]
    },
    aldea: {
      nombre:'Aldea Tao', wa:'529581087977', plano:'assets/img/lotes/aldea-tao.webp',
      nota:'Precios en pesos mexicanos (MXN). Lotes con vista al Océano Pacífico.',
      lotes:[
        {n:1,m2:1000,e:'vendido'},{n:2,m2:1000,e:2200000},{n:3,m2:1000,e:2200000},
        {n:4,m2:1000,e:'vendido'},{n:5,m2:1000,e:'vendido'},{n:6,m2:1000,e:'vendido'},
        {n:7,m2:1000,e:'vendido'},{n:8,m2:1187,e:2200105},{n:9,m2:1985,e:'vendido'},
        {n:10,m2:955,e:'vendido'},{n:11,m2:500,e:'vendido'},{n:12,m2:500,e:1100000},
        {n:13,m2:500,e:825000},{n:14,m2:500,e:1100000},{n:15,m2:500,e:1100000},
        {n:16,m2:500,e:1100000},{n:17,m2:500,e:1100000},{n:18,m2:500,e:1100000},
        {n:19,m2:500,e:1100000},{n:20,m2:500,e:1100000},{n:21,m2:500,e:1100000},
        {n:22,m2:500,e:1100000},{n:23,m2:500,e:1100000},{n:24,m2:500,e:1100000},
        {n:25,m2:500,e:1100000},{n:26,m2:500,e:1100000},{n:27,m2:500,e:1100000},
        {n:28,m2:500,e:1100000},{n:29,m2:500,e:1100000},{n:30,m2:426,e:936892},
        {n:31,m2:500,e:1100000},{n:32,m2:500,e:1100000}
      ]
    }
  };

  const EN = () => window.__LANG === 'en';
  const fmt = n => '$' + Math.round(n).toLocaleString('es-MX');
  const T = (es,en) => EN() ? en : es;

  document.querySelectorAll('[data-lotes]').forEach(host => {
    const data = LOTES[host.dataset.lotes];
    if (!data) return;
    const total = data.lotes.length;
    const disp = data.lotes.filter(l => typeof l.e === 'number').length;

    const wrap = document.createElement('div');
    wrap.className = 'lt';

    // resumen + filtro
    const head = document.createElement('div'); head.className = 'lt-head';
    head.innerHTML = '<div class="lt-sum"><b>' + disp + '</b> ' + T('lotes disponibles de','lots available of') + ' ' + total + '</div>';
    const filt = document.createElement('div'); filt.className = 'lt-filt';
    const bAll = document.createElement('button'); bAll.textContent = T('Todos','All'); bAll.className = 'on';
    const bDisp = document.createElement('button'); bDisp.textContent = T('Disponibles','Available');
    filt.append(bAll, bDisp); head.appendChild(filt);
    wrap.appendChild(head);

    // plano (si existe la imagen; si no, se oculta)
    if (data.plano){
      const fig = document.createElement('figure'); fig.className = 'lt-plano';
      const img = document.createElement('img');
      img.src = data.plano; img.alt = T('Mapa de lotes de ','Lot map of ') + data.nombre; img.loading = 'lazy';
      img.onerror = () => fig.remove();
      fig.appendChild(img); wrap.appendChild(fig);
    }

    // leyenda
    const leg = document.createElement('div'); leg.className = 'lt-leg';
    leg.innerHTML = '<span><i class="d-disp"></i> ' + T('Disponible','Available') + '</span>'
      + '<span><i class="d-sold"></i> ' + T('Vendido','Sold') + '</span>'
      + (host.dataset.lotes === 'azimut' ? '<span><i class="d-loft"></i> Lofts</span>' : '');
    wrap.appendChild(leg);

    // grid de lotes
    const grid = document.createElement('div'); grid.className = 'lt-grid';
    data.lotes.forEach(l => {
      const av = typeof l.e === 'number';
      const cell = document.createElement(av ? 'button' : 'div');
      cell.className = 'lt-cell ' + (av ? 'av' : (l.e === 'lofts' ? 'loft' : 'sold'));
      const estado = av ? fmt(l.e) : (l.e === 'lofts' ? 'Lofts' : T('Vendido','Sold'));
      cell.innerHTML = '<span class="lt-n">' + l.n + '</span><span class="lt-m">' + l.m2 + ' m²</span><span class="lt-p">' + estado + '</span>';
      if (av){
        cell.addEventListener('click', () => {
          const msg = T('Hola, me interesa el Lote ' + l.n + ' de ' + data.nombre + ' (' + l.m2 + ' m², ' + fmt(l.e) + ' MXN). ¿Me comparten más información?',
                        'Hi, I am interested in Lot ' + l.n + ' at ' + data.nombre + ' (' + l.m2 + ' m², ' + fmt(l.e) + ' MXN). Could you share more info?');
          window.open('https://wa.me/' + data.wa + '?text=' + encodeURIComponent(msg), '_blank');
        });
      }
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);

    if (data.nota){
      const nota = document.createElement('p'); nota.className = 'lt-nota'; nota.textContent = data.nota;
      wrap.appendChild(nota);
    }

    // filtro disponibles/todos
    const apply = only => {
      grid.querySelectorAll('.lt-cell').forEach((c,i) => {
        c.style.display = (only && !c.classList.contains('av')) ? 'none' : '';
      });
      bDisp.classList.toggle('on', only); bAll.classList.toggle('on', !only);
    };
    bAll.addEventListener('click', () => apply(false));
    bDisp.addEventListener('click', () => apply(true));

    host.appendChild(wrap);
  });
})();
