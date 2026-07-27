/* ============================================================================
   TIERRA — Portal del cliente v3: avance de obra + dashboard de costos.
   El aislamiento lo garantiza el RLS de Supabase.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var loading = $('#loading'), login = $('#login'), content = $('#content'),
      recover = $('#recover'),
      whoami = $('#whoami'), whoBox = $('#whoBox'), avatar = $('#avatar'),
      logoutBtn = $('#logout');

  if (!window.TIERRA_PORTAL_READY || !window.TIERRA_PORTAL_READY()) {
    loading.classList.add('hidden');
    login.classList.remove('hidden');
    $('#loginMsg').textContent = 'El portal está en configuración. Vuelve pronto.';
    $('#loginForm').addEventListener('submit', function (e) { e.preventDefault(); });
    return;
  }

  // storageKey propio: así la sesión del cliente y la del panel de admin conviven
  // en el mismo navegador sin pisarse.
  var sb = window.supabase.createClient(
    window.TIERRA_SUPABASE.url, window.TIERRA_SUPABASE.anonKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tierra-portal-auth' } }
  );

  // Paleta categórica validada (dona) + neutral para "Otros"
  var PAL = ['#B98A2C', '#3B82D6', '#2E9455', '#CC5228', '#9557E2'];
  var OTHER = '#8B8778';
  var STATUS = { en_progreso: 'En progreso', entregada: 'Entregada', pausada: 'En pausa' };

  // ── Login ──
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#loginBtn'), msg = $('#loginMsg');
    msg.textContent = ''; btn.disabled = true; btn.textContent = 'Entrando…';
    sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value })
      .then(function (r) {
        btn.disabled = false; btn.textContent = 'Entrar';
        if (r.error) { msg.textContent = 'Correo o contraseña incorrectos.'; return; }
        route();
      });
  });
  logoutBtn.addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });

  // ── Olvidé mi contraseña ──
  $('#forgot').addEventListener('click', function (e) {
    e.preventDefault();
    var mail = $('#email').value.trim();
    var msg = $('#loginMsg');
    if (!mail) { msg.className = 'msg err'; msg.textContent = 'Escribe tu correo arriba y vuelve a tocar aquí.'; return; }
    msg.className = 'msg'; msg.textContent = 'Enviando…';
    sb.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + '/portal' }).then(function (r) {
      if (r.error) { msg.className = 'msg err'; msg.textContent = r.error.message; return; }
      msg.className = 'msg ok';
      msg.textContent = 'Listo: te mandamos un correo a ' + mail + ' para elegir una contraseña nueva.';
    });
  });

  // ── Nueva contraseña (viene del enlace del correo) ──
  $('#recoverForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var p1 = $('#np1').value, p2 = $('#np2').value, msg = $('#npMsg'), btn = $('#npBtn');
    if (p1.length < 8) { msg.className = 'msg err'; msg.textContent = 'Usa al menos 8 caracteres.'; return; }
    if (p1 !== p2) { msg.className = 'msg err'; msg.textContent = 'Las dos contraseñas no coinciden.'; return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    sb.auth.updateUser({ password: p1 }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Guardar y entrar';
      if (r.error) { msg.className = 'msg err'; msg.textContent = r.error.message; return; }
      RECOVERY = false;
      history.replaceState(null, '', location.pathname);
      route();
    });
  });

  // ── Cambiar contraseña estando dentro ──
  $('#chpass').addEventListener('click', function () {
    $('#cp1').value = $('#cp2').value = ''; $('#cpMsg').textContent = '';
    $('#cpModal').classList.add('on');
  });
  $('#cp_cancel').addEventListener('click', function () { $('#cpModal').classList.remove('on'); });
  $('#cp_save').addEventListener('click', function () {
    var p1 = $('#cp1').value, p2 = $('#cp2').value, msg = $('#cpMsg'), btn = $('#cp_save');
    if (p1.length < 8) { msg.className = 'msg err'; msg.textContent = 'Usa al menos 8 caracteres.'; return; }
    if (p1 !== p2) { msg.className = 'msg err'; msg.textContent = 'Las dos contraseñas no coinciden.'; return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    sb.auth.updateUser({ password: p1 }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Guardar';
      if (r.error) { msg.className = 'msg err'; msg.textContent = r.error.message; return; }
      msg.className = 'msg ok'; msg.textContent = 'Contraseña actualizada ✓';
      setTimeout(function () { $('#cpModal').classList.remove('on'); }, 1200);
    });
  });

  // Supabase manda el enlace de recuperación con #access_token=…&type=recovery
  var RECOVERY = /[#&?]type=recovery/.test(location.hash + location.search);
  sb.auth.onAuthStateChange(function (evt) { if (evt === 'PASSWORD_RECOVERY') { RECOVERY = true; show(recover); } });

  // ── Router ──
  function route() {
    show(loading);
    if (RECOVERY) { show(recover); return; }
    sb.auth.getSession().then(function (r) {
      var session = r.data.session;
      if (!session) { show(login); return; }
      sb.from('profiles').select('role,full_name,project_id,email').eq('id', session.user.id).single()
        .then(function (pr) {
          var p = pr.data;
          var name = (p && (p.full_name || p.email)) || session.user.email;
          whoami.textContent = name;
          avatar.textContent = (name || '·').trim().charAt(0).toUpperCase();
          whoBox.classList.remove('hidden');
          logoutBtn.classList.remove('hidden');
          $('#chpass').classList.remove('hidden');
          if (!p) { renderMessage('Tu cuenta', 'No encontramos tu perfil. Contacta a Tierra.'); return; }
          if (p.role === 'admin' || p.role === 'superadmin') {
            renderMessage('Cuenta de administrador', 'Tu cuenta es de administrador. Entra al <a href="admin.html">panel de administración</a>.');
            return;
          }
          if (!p.project_id) { renderMessage('Aún no hay obra asignada', 'En cuanto tu obra empiece, la verás aquí con fotos de cada avance.'); return; }
          loadAll(p.project_id);
        });
    });
  }

  var D = { proj: null, items: [], weeks: [], notes: [] };   // estado del dashboard

  function loadAll(pid) {
    var soft = function (q) { return q.then(function (r) { return r.data || []; }, function () { return []; }); };
    var qWeeks = soft(sb.from('cost_weeks').select('*').eq('project_id', pid).order('created_at', { ascending: false }));
    var qNotes = soft(sb.from('project_notes').select('*').eq('project_id', pid)
      .order('note_date', { ascending: false }).order('created_at', { ascending: false }));
    Promise.all([
      sb.from('projects').select('*').eq('id', pid).single(),
      sb.from('updates').select('*').eq('project_id', pid).order('date', { ascending: false }).order('created_at', { ascending: false }),
      qWeeks, qNotes
    ]).then(function (res) {
      var proj = res[0].data, ups = res[1].data || [], weeks = res[2] || [];
      if (!proj) { renderMessage('Error', 'No pudimos cargar tu obra. Intenta de nuevo.'); return; }
      D.proj = proj; D.weeks = weeks; D.notes = res[3] || [];
      var wIds = weeks.map(function (w) { return w.id; });
      var qItems = wIds.length
        ? sb.from('cost_items').select('*').in('week_id', wIds).order('sort', { ascending: true }).then(function (r) { return r.data || []; }, function () { return []; })
        : Promise.resolve([]);
      var ids = ups.map(function (u) { return u.id; });
      var qPhotos = ids.length
        ? sb.from('update_photos').select('*').in('update_id', ids).order('sort', { ascending: true }).then(function (r) { return r.data || []; })
        : Promise.resolve([]);
      Promise.all([qPhotos, qItems]).then(function (r2) {
        var photos = r2[0], costItems = r2[1];
        weeks.forEach(function (w) {
          w.items = costItems.filter(function (i) { return i.week_id === w.id; });
          w.total = w.items.reduce(function (n, i) { return n + Number(i.amount || 0); }, 0);
        });
        var finish = function (urlByPath) {
          var byU = {};
          photos.forEach(function (x) { (byU[x.update_id] = byU[x.update_id] || []).push(x); });
          D.items = ups.map(function (u) {
            return { u: u, photos: (byU[u.id] || []).map(function (x) { return urlByPath[x.storage_path]; }).filter(Boolean) };
          });
          render();
        };
        if (!photos.length) { finish({}); return; }
        sb.storage.from('obra').createSignedUrls(photos.map(function (x) { return x.storage_path; }), 3600)
          .then(function (sg) {
            var urlByPath = {};
            (sg.data || []).forEach(function (s) { if (s.signedUrl) urlByPath[s.path] = s.signedUrl; });
            finish(urlByPath);
          });
      });
    });
  }

  // ── Render principal ──
  var VIEW = 'avance';
  function render() {
    var proj = D.proj, items = D.items, weeks = D.weeks;
    var totalPhotos = items.reduce(function (n, it) { return n + it.photos.length; }, 0);
    var lastDate = items.length ? fmtDate(items[0].u.date) : null;
    var prog = Math.max(0, Math.min(100, Number(proj.progress || 0)));
    var html = '<section class="hero-obra">' +
      '<div class="eyebrow">Tu obra con Tierra</div>' +
      '<h1>' + esc(proj.name) + '</h1>' +
      '<div class="meta">' +
        '<span class="chip ' + esc(proj.status || '') + '">' + (STATUS[proj.status] || esc(proj.status || '')) + '</span>' +
        (proj.location ? '<span>' + esc(proj.location) + '</span>' : '') +
        (items.length ? '<span class="dot"></span><span>' + items.length + ' avance' + (items.length === 1 ? '' : 's') + ' · ' + totalPhotos + ' foto' + (totalPhotos === 1 ? '' : 's') + '</span>' : '') +
        (lastDate ? '<span class="dot"></span><span>Actualizado: ' + lastDate + '</span>' : '') +
      '</div>' +
      (prog > 0 ? '<div class="hprog"><div class="hp-top"><span>Avance de la construcción</span><b>' + prog + '%</b></div>' +
        '<div class="hp-bar"><i style="width:' + prog + '%"></i></div></div>' : '') +
      '</section>';

    var tabs = [['avance', 'Avance de obra']];
    if (D.notes.length) tabs.push(['notas', 'Notas de obra']);
    if (weeks.length) tabs.push(['costos', 'Costos']);
    if (tabs.length > 1) {
      if (!tabs.some(function (t) { return t[0] === VIEW; })) VIEW = 'avance';
      html += '<div class="pills">';
      tabs.forEach(function (t) {
        html += '<button class="pill-t' + (VIEW === t[0] ? ' on' : '') + '" data-v="' + t[0] + '">' + t[1] + '</button>';
      });
      html += '</div>';
    } else { VIEW = 'avance'; }
    html += '<div id="view"></div>';
    content.innerHTML = html; show(content);
    content.querySelectorAll('.pill-t').forEach(function (b) {
      b.addEventListener('click', function () { VIEW = b.dataset.v; render(); });
    });
    if (VIEW === 'costos') renderCostos();
    else if (VIEW === 'notas') renderNotas();
    else renderAvance();
  }

  // ── Vista: notas de construcción ──
  function renderNotas() {
    var view = $('#view');
    var html = '<div class="notes">';
    D.notes.forEach(function (n, i) {
      html += '<article class="note-card" style="animation-delay:' + Math.min(i * 80, 460) + 'ms">' +
        '<div class="nd">' + fmtDate(n.note_date) + '</div>' +
        (n.title ? '<h3>' + esc(n.title) + '</h3>' : '') +
        '<p>' + esc(n.body).replace(/\n/g, '<br>') + '</p></article>';
    });
    html += '</div><div style="height:60px"></div>';
    view.innerHTML = html;
  }

  // ── Vista: avance ──
  var GALLERY = [];
  function renderAvance() {
    var view = $('#view'); GALLERY = [];
    var items = D.items;
    if (!items.length) {
      view.innerHTML = '<div class="empty"><div class="big">Tu obra está por comenzar</div>Cuando el equipo publique el primer avance, lo verás aquí con fotos.</div>';
      return;
    }
    var html = '<div class="tl">';
    items.forEach(function (it, idx) {
      var u = it.u;
      html += '<div class="tl-item" style="animation-delay:' + Math.min(idx * 90, 500) + 'ms">' +
        '<div class="tl-date">' + fmtDate(u.date) + '</div>' +
        (u.title ? '<h3>' + esc(u.title) + '</h3>' : '') +
        (u.note ? '<p>' + esc(u.note) + '</p>' : '');
      if (it.photos.length) {
        html += '<div class="ph-grid">';
        it.photos.forEach(function (url) {
          var i = GALLERY.push(url) - 1;
          html += '<div class="ph" data-i="' + i + '"><img loading="lazy" src="' + url + '" alt="Avance ' + fmtDate(u.date) + '"></div>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    view.innerHTML = html;
    view.querySelectorAll('.ph').forEach(function (el) {
      el.addEventListener('click', function () { openLb(parseInt(el.dataset.i, 10)); });
    });
  }

  // ── Vista: costos (dashboard) ──
  var WEEK_ID = null;
  function renderCostos() {
    var view = $('#view');
    var weeks = D.weeks, proj = D.proj;
    if (!WEEK_ID || !weeks.some(function (w) { return w.id === WEEK_ID; })) WEEK_ID = weeks[0].id;
    var wk = weeks.find(function (w) { return w.id === WEEK_ID; });
    var acumulado = weeks.reduce(function (n, w) { return n + w.total; }, 0);
    var budget = Number(proj.budget_total || 0);

    var html = '<div class="weekbar"><label class="muted" style="font-size:13px">Semana:</label><select id="wksel">';
    weeks.forEach(function (w) {
      html += '<option value="' + w.id + '"' + (w.id === WEEK_ID ? ' selected' : '') + '>' + esc(w.week_label) + '</option>';
    });
    html += '</select>';
    if (wk.date_from && wk.date_to) html += '<span class="rng">' + fmtDate(wk.date_from) + ' — ' + fmtDate(wk.date_to) + '</span>';
    html += '</div>';

    html += '<div class="stats-row">' +
      tile('Gasto de la semana', money(wk.total), esc(wk.week_label)) +
      tile('Invertido en tu obra', money(acumulado), weeks.length + (weeks.length === 1 ? ' semana registrada' : ' semanas registradas')) +
      (budget > 0 ? tile('Presupuesto restante', money(Math.max(budget - acumulado, 0)), 'de ' + money(budget)) : '') +
      '</div>';

    // dona + leyenda (top 5 + Otros)
    var groups = donutGroups(wk.items);
    html += '<div class="donut-wrap"><div class="donut" id="donut">' + donutSvg(groups, wk.total) +
      '<div class="c"><div class="n">' + money(wk.total) + '</div><div class="l">' + esc(wk.week_label) + '</div></div></div>' +
      '<ul class="lg">';
    groups.forEach(function (g, i) {
      html += '<li data-g="' + i + '"><span class="sw" style="background:' + g.color + '"></span>' +
        '<span class="nm">' + esc(g.name) + '</span><span class="amt">' + money(g.value) + '</span>' +
        '<span class="pct">' + pct(g.value, wk.total) + '</span></li>';
    });
    html += '</ul></div>';

    if (budget > 0) {
      var used = Math.min(acumulado / budget * 100, 100);
      html += '<div class="budget"><div class="top"><span>Avance del presupuesto</span><span><b>' + money(acumulado) + '</b> <span class="muted">de ' + money(budget) + ' (' + used.toFixed(1) + '%)</span></span></div>' +
        '<div class="bbar"><i style="width:' + used.toFixed(1) + '%"></i></div></div>';
    }

    // tabla detallada (todos los gastos)
    html += '<div class="ctable-scroll"><table class="ctable"><thead><tr><th>Descripción</th><th class="r">Costo</th><th class="r">%</th></tr></thead><tbody>';
    wk.items.slice().sort(function (a, b) { return b.amount - a.amount; }).forEach(function (it) {
      html += '<tr><td>' + esc(it.concept) + '</td><td class="r">' + money(it.amount) + '</td><td class="r pct">' + pct(it.amount, wk.total) + '</td></tr>';
    });
    html += '<tr class="total"><td>Total ' + esc(wk.week_label) + '</td><td class="r">' + money(wk.total) + '</td><td></td></tr>';
    html += '</tbody></table></div><div style="height:60px"></div>';

    view.innerHTML = html;
    $('#wksel').addEventListener('change', function () { WEEK_ID = this.value; renderCostos(); });
    // hover leyenda ⇄ dona
    var donut = $('#donut');
    view.querySelectorAll('.lg li').forEach(function (li) {
      li.addEventListener('mouseenter', function () {
        donut.classList.add('dim');
        donut.querySelectorAll('path').forEach(function (p) { p.classList.toggle('hot', p.dataset.g === li.dataset.g); });
      });
      li.addEventListener('mouseleave', function () { donut.classList.remove('dim'); });
    });
  }
  function tile(k, v, s) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }

  function donutGroups(items) {
    var sorted = items.slice().sort(function (a, b) { return b.amount - a.amount; });
    var top = sorted.slice(0, 5), rest = sorted.slice(5);
    var groups = top.map(function (it, i) { return { name: it.concept, value: Number(it.amount), color: PAL[i] }; });
    if (rest.length) {
      groups.push({ name: 'Otros (' + rest.length + ')', value: rest.reduce(function (n, i) { return n + Number(i.amount); }, 0), color: OTHER });
    }
    return groups;
  }
  function donutSvg(groups, total) {
    if (!total) return '<svg viewBox="0 0 100 100"></svg>';
    var r = 40, cx = 50, cy = 50, sw = 14;
    var gapDeg = 2.2, start = 0, paths = '';
    groups.forEach(function (g, i) {
      var frac = g.value / total, sweep = frac * 360 - (groups.length > 1 ? gapDeg : 0);
      if (sweep <= 0) sweep = 0.6;
      var a0 = start + gapDeg / 2, a1 = a0 + sweep;
      paths += '<path data-g="' + i + '" d="' + arc(cx, cy, r, a0, a1) + '" fill="none" stroke="' + g.color + '" stroke-width="' + sw + '" stroke-linecap="butt"><title>' + esc(g.name) + ': ' + money(g.value) + '</title></path>';
      start += frac * 360;
    });
    return '<svg viewBox="0 0 100 100" role="img" aria-label="Distribución del gasto semanal">' + paths + '</svg>';
  }
  function arc(cx, cy, r, a0, a1) {
    var s = polar(cx, cy, r, a0), e = polar(cx, cy, r, a1);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return 'M ' + s.x + ' ' + s.y + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + e.x + ' ' + e.y;
  }
  function polar(cx, cy, r, deg) {
    var rad = deg * Math.PI / 180;
    return { x: (cx + r * Math.cos(rad)).toFixed(3), y: (cy + r * Math.sin(rad)).toFixed(3) };
  }
  function money(n) { return '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }
  function pct(v, t) { return t ? (v / t * 100).toFixed(1) + '%' : '—'; }

  function renderMessage(title, html) {
    content.innerHTML = '<div class="empty"><div class="big">' + title + '</div>' + html + '</div>';
    show(content);
  }

  // ── Lightbox ──
  var lb = $('#lb'), lbimg = $('#lbimg'), lbdl = $('#lbdl'), lbcnt = $('#lbcnt'), lbi = 0;
  function openLb(i) { lbi = i; paint(); lb.classList.add('on'); }
  function move(d) { lbi = (lbi + d + GALLERY.length) % GALLERY.length; paint(); }
  function paint() { lbimg.src = GALLERY[lbi]; lbdl.href = GALLERY[lbi]; lbcnt.textContent = (lbi + 1) + ' / ' + GALLERY.length; }
  lb.querySelector('.x').addEventListener('click', function () { lb.classList.remove('on'); });
  lb.querySelector('.prev').addEventListener('click', function () { move(-1); });
  lb.querySelector('.next').addEventListener('click', function () { move(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.classList.remove('on'); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') lb.classList.remove('on');
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });
  var tx = null;
  lbimg.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lbimg.addEventListener('touchend', function (e) {
    if (tx == null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 44) move(dx < 0 ? 1 : -1);
    tx = null;
  }, { passive: true });

  // ── utils ──
  function show(el) { [loading, login, content, recover].forEach(function (x) { x.classList.add('hidden'); }); el.classList.remove('hidden'); }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtDate(d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return d; }
  }

  route();
})();
