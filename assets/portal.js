/* ============================================================================
   TIERRA — Portal del cliente: login + línea de tiempo de avance de obra.
   Seguridad: el aislamiento lo garantiza el RLS de Supabase (el cliente solo
   puede leer SU proyecto). Este JS solo pinta lo que la base de datos permite.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var loading = $('#loading'), login = $('#login'), content = $('#content'),
      whoami = $('#whoami'), logoutBtn = $('#logout');

  if (!window.TIERRA_PORTAL_READY || !window.TIERRA_PORTAL_READY()) {
    loading.classList.add('hidden');
    login.classList.remove('hidden');
    $('#loginMsg').textContent = 'El portal está en configuración. Vuelve pronto.';
    $('#loginForm').addEventListener('submit', function (e) { e.preventDefault(); });
    return;
  }

  var sb = window.supabase.createClient(
    window.TIERRA_SUPABASE.url, window.TIERRA_SUPABASE.anonKey,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );

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

  logoutBtn.addEventListener('click', function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });

  // ── Router ──
  function route() {
    show(loading);
    sb.auth.getSession().then(function (r) {
      var session = r.data.session;
      if (!session) { show(login); return; }
      sb.from('profiles').select('role,full_name,project_id,email').eq('id', session.user.id).single()
        .then(function (pr) {
          var p = pr.data;
          whoami.textContent = (p && (p.full_name || p.email)) || session.user.email;
          logoutBtn.classList.remove('hidden');
          if (!p) { renderMessage('No encontramos tu perfil. Contacta a Tierra.'); return; }
          if (p.role === 'admin' || p.role === 'superadmin') {
            renderMessage('Tu cuenta es de administrador. Entra al <a href="admin.html">panel de administración</a>.');
            return;
          }
          if (!p.project_id) { renderMessage('Aún no tienes una obra asignada. En cuanto empiece, la verás aquí.'); return; }
          loadProject(p.project_id);
        });
    });
  }

  function loadProject(pid) {
    Promise.all([
      sb.from('projects').select('*').eq('id', pid).single(),
      sb.from('updates').select('*').eq('project_id', pid).order('date', { ascending: false }).order('created_at', { ascending: false })
    ]).then(function (res) {
      var proj = res[0].data, ups = res[1].data || [];
      if (!proj) { renderMessage('No pudimos cargar tu obra.'); return; }
      if (!ups.length) { renderProject(proj, []); return; }
      var ids = ups.map(function (u) { return u.id; });
      sb.from('update_photos').select('*').in('update_id', ids).order('sort', { ascending: true })
        .then(function (ph) {
          var byU = {};
          (ph.data || []).forEach(function (x) { (byU[x.update_id] = byU[x.update_id] || []).push(x); });
          // firmar URLs de todas las fotos
          var all = (ph.data || []);
          if (!all.length) { renderProject(proj, ups.map(function (u) { return { u: u, photos: [] }; })); return; }
          sb.storage.from('obra').createSignedUrls(all.map(function (x) { return x.storage_path; }), 3600)
            .then(function (sg) {
              var urlByPath = {};
              (sg.data || []).forEach(function (s) { urlByPath[s.path] = s.signedUrl; });
              var items = ups.map(function (u) {
                return { u: u, photos: (byU[u.id] || []).map(function (x) { return urlByPath[x.storage_path]; }).filter(Boolean) };
              });
              renderProject(proj, items);
            });
        });
    });
  }

  // ── Render ──
  var GALLERY = [];
  function renderProject(proj, items) {
    GALLERY = [];
    var statusTxt = { en_progreso: 'En progreso', entregada: 'Entregada', pausada: 'En pausa' }[proj.status] || proj.status;
    var html = '<section class="hero-obra">' +
      '<div class="eyebrow">Avance de obra</div>' +
      '<h1>' + esc(proj.name) + '</h1>' +
      '<div class="meta">' + [proj.location, statusTxt].filter(Boolean).map(esc).join(' · ') + '</div>' +
      '</section>';

    if (!items.length) {
      html += '<div class="empty">Todavía no hay avances publicados.<br>En cuanto el equipo suba las primeras fotos, aparecerán aquí.</div>';
      content.innerHTML = html; show(content); return;
    }
    html += '<div class="tl">';
    items.forEach(function (it) {
      var u = it.u;
      html += '<div class="tl-item">' +
        '<div class="tl-date">' + fmtDate(u.date) + '</div>' +
        (u.title ? '<h3>' + esc(u.title) + '</h3>' : '') +
        (u.note ? '<p>' + esc(u.note) + '</p>' : '');
      if (it.photos.length) {
        html += '<div class="ph-grid">';
        it.photos.forEach(function (url) {
          var i = GALLERY.push(url) - 1;
          html += '<img loading="lazy" src="' + url + '" data-i="' + i + '" alt="Avance ' + fmtDate(u.date) + '">';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    content.innerHTML = html; show(content);
    content.querySelectorAll('.ph-grid img').forEach(function (img) {
      img.addEventListener('click', function () { openLb(parseInt(img.dataset.i, 10)); });
    });
  }

  function renderMessage(html) {
    content.innerHTML = '<div class="empty">' + html + '</div>';
    show(content);
  }

  // ── Lightbox ──
  var lb = $('#lb'), lbimg = $('#lbimg'), lbi = 0;
  function openLb(i) { lbi = i; lbimg.src = GALLERY[i]; lb.classList.add('on'); }
  function move(d) { lbi = (lbi + d + GALLERY.length) % GALLERY.length; lbimg.src = GALLERY[lbi]; }
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

  // ── utils ──
  function show(el) { [loading, login, content].forEach(function (x) { x.classList.add('hidden'); }); el.classList.remove('hidden'); }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtDate(d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return d; }
  }

  route();
})();
