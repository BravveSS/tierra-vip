/* ============================================================================
   TIERRA — Panel de administración del portal de obra.
   - Login Google (solo entran cuentas con rol admin/superadmin, forzado por RLS).
   - Proyectos, Avances (subir fotos redimensionadas), Clientes, Admins.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var loading = $('#loading'), login = $('#login'), panel = $('#panel'),
      whoami = $('#whoami'), logoutBtn = $('#logout');

  if (!window.TIERRA_PORTAL_READY || !window.TIERRA_PORTAL_READY()) {
    loading.classList.add('hidden'); login.classList.remove('hidden');
    $('#loginMsg').textContent = 'El panel está en configuración.';
    return;
  }
  var sb = window.supabase.createClient(
    window.TIERRA_SUPABASE.url, window.TIERRA_SUPABASE.anonKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

  var ME = null;            // profile del admin
  var PROJECTS = [];        // cache de proyectos

  // ── Login ──
  $('#googleBtn').addEventListener('click', function () {
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  });
  $('#adminEmailForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#ae_btn'); btn.disabled = true; btn.textContent = 'Entrando…';
    sb.auth.signInWithPassword({ email: $('#ae_email').value.trim(), password: $('#ae_pass').value })
      .then(function (r) {
        btn.disabled = false; btn.textContent = 'Entrar';
        if (r.error) { $('#loginMsg').textContent = 'Correo o contraseña incorrectos.'; return; }
        boot();
      });
  });
  logoutBtn.addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });

  function show(el) { [loading, login, panel].forEach(function (x) { x.classList.add('hidden'); }); el.classList.remove('hidden'); }

  function boot() {
    show(loading);
    sb.auth.getSession().then(function (r) {
      if (!r.data.session) { show(login); return; }
      sb.rpc('is_admin').then(function (a) {
        if (!a.data) {   // logueado pero NO autorizado
          sb.auth.signOut().then(function () {
            show(login); $('#loginMsg').textContent = 'Esta cuenta no está autorizada. Pide acceso a Tierra.';
          });
          return;
        }
        sb.from('profiles').select('*').eq('id', r.data.session.user.id).single().then(function (pr) {
          ME = pr.data || {};
          whoami.textContent = ME.full_name || ME.email || '';
          logoutBtn.classList.remove('hidden');
          if (ME.role === 'superadmin') { $('#tabAdmins').classList.remove('hidden'); loadAdmins(); }
          show(panel);
          loadProjects();
        });
      });
    });
  }

  // ── Tabs ──
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
      document.querySelectorAll('.panel').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      document.querySelector('.panel[data-panel="' + t.dataset.tab + '"]').classList.add('on');
    });
  });

  // ── PROYECTOS ──
  function loadProjects() {
    sb.from('projects').select('*').order('created_at', { ascending: false }).then(function (r) {
      PROJECTS = r.data || [];
      var list = $('#p_list'); list.innerHTML = '';
      if (!PROJECTS.length) list.innerHTML = '<li class="muted" style="padding:10px 0">Aún no hay proyectos.</li>';
      PROJECTS.forEach(function (p) {
        var li = document.createElement('li'); li.className = 'row';
        li.innerHTML = '<div><div class="t">' + esc(p.name) + '</div><div class="s">' + [p.client_name, p.location].filter(Boolean).map(esc).join(' · ') + '</div></div>' +
          '<span class="pill">' + ({ en_progreso: 'En progreso', entregada: 'Entregada', pausada: 'Pausa' }[p.status] || p.status) + '</span>';
        list.appendChild(li);
      });
      // rellenar selects
      ['#a_project', '#c_project'].forEach(function (sel) {
        var s = $(sel); s.innerHTML = '';
        if (!PROJECTS.length) { s.innerHTML = '<option value="">— crea un proyecto primero —</option>'; return; }
        PROJECTS.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; s.appendChild(o); });
      });
      if (PROJECTS.length) loadUpdates();
      loadClients();
    });
  }
  $('#p_create').addEventListener('click', function () {
    var name = $('#p_name').value.trim(); if (!name) { setMsg('#p_msg', 'Escribe un nombre.', 'err'); return; }
    $('#p_create').disabled = true;
    sb.from('projects').insert({ name: name, client_name: $('#p_client').value.trim() || null, location: $('#p_loc').value.trim() || null })
      .then(function (r) {
        $('#p_create').disabled = false;
        if (r.error) { setMsg('#p_msg', r.error.message, 'err'); return; }
        $('#p_name').value = $('#p_client').value = $('#p_loc').value = '';
        setMsg('#p_msg', 'Proyecto creado ✓', 'ok'); loadProjects();
      });
  });

  // ── AVANCES ──
  var pending = [];  // {blob,url}
  $('#a_date').value = new Date().toISOString().slice(0, 10);
  $('#a_project').addEventListener('change', loadUpdates);
  $('#a_files').addEventListener('change', function (e) {
    pending = []; $('#a_prev').innerHTML = '';
    var files = Array.prototype.slice.call(e.target.files);
    files.forEach(function (f) {
      resizeImage(f, 1600, 0.82).then(function (blob) {
        var url = URL.createObjectURL(blob);
        pending.push({ blob: blob });
        var img = document.createElement('img'); img.src = url; $('#a_prev').appendChild(img);
      });
    });
  });
  $('#a_publish').addEventListener('click', function () {
    var pid = $('#a_project').value; if (!pid) { setMsg('#a_msg', 'Elige una obra.', 'err'); return; }
    var btn = $('#a_publish'); btn.disabled = true; btn.textContent = 'Publicando…';
    sb.from('updates').insert({
      project_id: pid, date: $('#a_date').value, title: $('#a_title').value.trim() || null,
      note: $('#a_note').value.trim() || null, created_by: ME.id
    }).select().single().then(function (r) {
      if (r.error) { done(r.error.message, 'err'); return; }
      var up = r.data, i = 0;
      if (!pending.length) { done('Avance publicado ✓', 'ok'); return; }
      (function next() {
        if (i >= pending.length) { done('Avance publicado con ' + pending.length + ' foto(s) ✓', 'ok'); return; }
        var path = pid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.webp';
        sb.storage.from('obra').upload(path, pending[i].blob, { contentType: 'image/webp', upsert: false })
          .then(function (us) {
            if (us.error) { done(us.error.message, 'err'); return; }
            sb.from('update_photos').insert({ update_id: up.id, storage_path: path, sort: i }).then(function () { i++; next(); });
          });
      })();
    });
    function done(msg, cls) {
      btn.disabled = false; btn.textContent = 'Publicar avance';
      setMsg('#a_msg', msg, cls);
      if (cls === 'ok') { $('#a_title').value = $('#a_note').value = ''; $('#a_files').value = ''; $('#a_prev').innerHTML = ''; pending = []; loadUpdates(); }
    }
  });
  function loadUpdates() {
    var pid = $('#a_project').value; var list = $('#a_list');
    if (!pid) { list.innerHTML = ''; return; }
    sb.from('updates').select('*').eq('project_id', pid).order('date', { ascending: false }).then(function (r) {
      list.innerHTML = '';
      var ups = r.data || [];
      if (!ups.length) { list.innerHTML = '<li class="muted" style="padding:10px 0">Sin avances aún.</li>'; return; }
      ups.forEach(function (u) {
        var li = document.createElement('li'); li.className = 'row';
        li.innerHTML = '<div><div class="t">' + fmtDate(u.date) + (u.title ? ' · ' + esc(u.title) : '') + '</div>' +
          '<div class="s">' + esc((u.note || '').slice(0, 70)) + '</div></div>';
        var del = document.createElement('button'); del.className = 'btn danger sm'; del.textContent = 'Borrar';
        del.addEventListener('click', function () {
          if (!confirm('¿Borrar este avance y sus fotos?')) return;
          sb.from('updates').delete().eq('id', u.id).then(function () { loadUpdates(); });
        });
        li.appendChild(del); list.appendChild(li);
      });
    });
  }

  // ── CLIENTES ──
  $('#c_create').addEventListener('click', function () {
    var pid = $('#c_project').value, email = $('#c_email').value.trim(), pass = $('#c_pass').value, name = $('#c_name').value.trim();
    if (!pid) { setMsg('#c_msg', 'Elige la obra.', 'err'); return; }
    if (!email || pass.length < 8) { setMsg('#c_msg', 'Correo válido y contraseña de 8+ caracteres.', 'err'); return; }
    var btn = $('#c_create'); btn.disabled = true; btn.textContent = 'Creando…';
    sb.auth.getSession().then(function (s) {
      fetch(window.TIERRA_SUPABASE.url + '/functions/v1/admin-create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.data.session.access_token },
        body: JSON.stringify({ email: email, password: pass, full_name: name, project_id: pid })
      }).then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
        .then(function (r) {
          btn.disabled = false; btn.textContent = 'Crear cuenta';
          if (!r.ok) { setMsg('#c_msg', r.j.error || 'No se pudo crear.', 'err'); return; }
          $('#c_email').value = $('#c_pass').value = $('#c_name').value = '';
          setMsg('#c_msg', 'Cuenta creada ✓ Comparte las credenciales con tu cliente.', 'ok'); loadClients();
        }).catch(function (e) { btn.disabled = false; btn.textContent = 'Crear cuenta'; setMsg('#c_msg', String(e), 'err'); });
    });
  });
  function loadClients() {
    sb.from('profiles').select('id,email,full_name,project_id,role').eq('role', 'client').then(function (r) {
      var list = $('#c_list'); list.innerHTML = '';
      var cs = r.data || [];
      if (!cs.length) { list.innerHTML = '<li class="muted" style="padding:10px 0">Sin clientes aún.</li>'; return; }
      var pname = {}; PROJECTS.forEach(function (p) { pname[p.id] = p.name; });
      cs.forEach(function (c) {
        var li = document.createElement('li'); li.className = 'row';
        li.innerHTML = '<div><div class="t">' + esc(c.full_name || c.email) + '</div><div class="s">' + esc(c.email) + ' · ' + esc(pname[c.project_id] || 'sin obra') + '</div></div>';
        list.appendChild(li);
      });
    });
  }

  // ── ADMINS (superadmin) ──
  $('#ad_add').addEventListener('click', function () {
    var email = $('#ad_email').value.trim().toLowerCase(); if (!email) return;
    $('#ad_add').disabled = true;
    sb.from('admin_allowlist').insert({ email: email, role: 'admin' }).then(function (r) {
      // si ya existe un perfil con ese correo, promuévelo ya
      sb.from('profiles').update({ role: 'admin' }).eq('email', email).then(function () {
        $('#ad_add').disabled = false;
        if (r.error && r.error.code !== '23505') { setMsg('#ad_msg', r.error.message, 'err'); return; }
        $('#ad_email').value = ''; setMsg('#ad_msg', 'Autorizado ✓', 'ok'); loadAdmins();
      });
    });
  });
  function loadAdmins() {
    sb.from('admin_allowlist').select('*').order('role', { ascending: true }).then(function (r) {
      var list = $('#ad_list'); list.innerHTML = '';
      (r.data || []).forEach(function (a) {
        var li = document.createElement('li'); li.className = 'row';
        li.innerHTML = '<div><div class="t">' + esc(a.email) + '</div></div><span class="pill">' + a.role + '</span>';
        if (a.role !== 'superadmin') {
          var del = document.createElement('button'); del.className = 'btn danger sm'; del.textContent = 'Quitar';
          del.addEventListener('click', function () {
            if (!confirm('¿Quitar acceso de admin a ' + a.email + '?')) return;
            sb.from('admin_allowlist').delete().eq('email', a.email).then(function () {
              sb.from('profiles').update({ role: 'client' }).eq('email', a.email).then(loadAdmins);
            });
          });
          li.appendChild(del);
        }
        list.appendChild(li);
      });
    });
  }

  // ── utils ──
  function resizeImage(file, maxSide, quality) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height, scale = Math.min(1, maxSide / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolve(b); }, 'image/webp', quality);
      };
      img.onerror = function () { resolve(file); };
      img.src = URL.createObjectURL(file);
    });
  }
  function setMsg(sel, txt, cls) { var m = $(sel); m.textContent = txt; m.className = 'msg ' + (cls || ''); }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtDate(d) { try { return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } }

  boot();
})();
