/* ============================================================================
   TIERRA — Panel de administración v2.
   Avances (drag&drop, progreso, fotos borrables), Proyectos (editar/estado/
   borrar), Clientes (generador de contraseña + credenciales copiables),
   Admins (allowlist). Todo protegido por rol vía RLS.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var loading = $('#loading'), login = $('#login'), panel = $('#panel'),
      whoami = $('#whoami'), whoBox = $('#whoBox'), avatar = $('#avatar'),
      logoutBtn = $('#logout');

  if (!window.TIERRA_PORTAL_READY || !window.TIERRA_PORTAL_READY()) {
    loading.classList.add('hidden'); login.classList.remove('hidden');
    $('#loginMsg').textContent = 'El panel está en configuración.';
    return;
  }
  // storageKey propio: el panel y el portal del cliente comparten dominio, así que
  // sin esto entrar como cliente en otra pestaña pisaba la sesión de admin y los
  // guardados fallaban con "row-level security".
  var sb = window.supabase.createClient(
    window.TIERRA_SUPABASE.url, window.TIERRA_SUPABASE.anonKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tierra-admin-auth' } }
  );

  // Traduce errores crudos de Postgres a algo accionable.
  function human(err) {
    var m = (err && (err.message || err)) + '';
    if (/row-level security|violates row/i.test(m)) return 'Tu sesión de administrador ya no es válida. Vuelve a entrar al panel.';
    if (/JWT|token is expired|invalid claim/i.test(m)) return 'Tu sesión expiró. Vuelve a entrar.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    return m;
  }

  var ME = null, PROJECTS = [];
  var STATUS = { en_progreso: 'En progreso', entregada: 'Entregada', pausada: 'En pausa' };

  // ── Toasts ──
  function toast(txt, cls) {
    var t = document.createElement('div');
    t.className = 'toast ' + (cls || '');
    t.textContent = txt;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 3400);
    setTimeout(function () { t.remove(); }, 3900);
  }

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
        if (!a.data) {
          sb.auth.signOut().then(function () {
            show(login); $('#loginMsg').textContent = 'Esta cuenta no está autorizada. Pide acceso a Tierra.';
          });
          return;
        }
        sb.from('profiles').select('*').eq('id', r.data.session.user.id).single().then(function (pr) {
          ME = pr.data || {};
          var name = ME.full_name || ME.email || '';
          whoami.textContent = name;
          avatar.textContent = (name || '·').trim().charAt(0).toUpperCase();
          whoBox.classList.remove('hidden');
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

  // ══ PROYECTOS ══
  function loadProjects() {
    sb.from('projects').select('*').order('created_at', { ascending: false }).then(function (r) {
      PROJECTS = r.data || [];
      var list = $('#p_list'); list.innerHTML = '';
      if (!PROJECTS.length) list.innerHTML = '<li class="muted" style="padding:10px 0">Aún no hay proyectos. Crea el primero a la izquierda.</li>';
      PROJECTS.forEach(function (p) {
        var li = document.createElement('li'); li.className = 'row';
        var info = document.createElement('div');
        info.innerHTML = '<div class="t">' + esc(p.name) + '</div><div class="s">' + [p.client_name, p.location].filter(Boolean).map(esc).join(' · ') + '</div>';
        var acts = document.createElement('div'); acts.className = 'acts';
        var chip = document.createElement('span'); chip.className = 'chip ' + (p.status || ''); chip.textContent = STATUS[p.status] || p.status;
        var ed = document.createElement('button'); ed.className = 'iconbtn'; ed.title = 'Editar'; ed.textContent = '✎';
        ed.addEventListener('click', function () { openProjectModal(p); });
        var del = document.createElement('button'); del.className = 'iconbtn'; del.title = 'Borrar'; del.textContent = '🗑';
        del.addEventListener('click', function () {
          if (!confirm('¿Borrar "' + p.name + '" y TODOS sus avances y fotos? Esto no se puede deshacer.')) return;
          sb.from('projects').delete().eq('id', p.id).then(function (r2) {
            if (r2.error) { toast(human(r2.error), 'err'); return; }
            toast('Proyecto borrado', 'ok'); loadProjects();
          });
        });
        acts.appendChild(chip); acts.appendChild(ed); acts.appendChild(del);
        li.appendChild(info); li.appendChild(acts); list.appendChild(li);
      });
      ['#a_project', '#c_project', '#k_project'].forEach(function (sel) {
        var s = $(sel); var prev = s.value; s.innerHTML = '';
        if (!PROJECTS.length) { s.innerHTML = '<option value="">— crea un proyecto primero —</option>'; return; }
        PROJECTS.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; s.appendChild(o); });
        if (prev && PROJECTS.some(function (p) { return p.id === prev; })) s.value = prev;
      });
      if (PROJECTS.length) { loadUpdates(); loadWeeks(); }
      loadClients();
      loadStats();
    });
  }
  $('#p_create').addEventListener('click', function () {
    var name = $('#p_name').value.trim(); if (!name) { setMsg('#p_msg', 'Escribe un nombre.', 'err'); return; }
    $('#p_create').disabled = true;
    sb.from('projects').insert({ name: name, client_name: $('#p_client').value.trim() || null, location: $('#p_loc').value.trim() || null })
      .then(function (r) {
        $('#p_create').disabled = false;
        if (r.error) { setMsg('#p_msg', human(r.error), 'err'); return; }
        $('#p_name').value = $('#p_client').value = $('#p_loc').value = '';
        setMsg('#p_msg', '', ''); toast('Proyecto creado ✓', 'ok'); loadProjects();
      });
  });
  // modal proyecto
  var PM = null;
  function openProjectModal(p) {
    PM = p;
    $('#pm_name').value = p.name || ''; $('#pm_client').value = p.client_name || '';
    $('#pm_loc').value = p.location || ''; $('#pm_status').value = p.status || 'en_progreso';
    $('#pm_budget').value = p.budget_total || '';
    $('#pm_progress').value = (p.progress == null ? '' : p.progress);
    $('#pModal').classList.add('on');
  }
  $('#pm_cancel').addEventListener('click', function () { $('#pModal').classList.remove('on'); });
  $('#pm_save').addEventListener('click', function () {
    if (!PM) return;
    var base = {
      name: $('#pm_name').value.trim(), client_name: $('#pm_client').value.trim() || null,
      location: $('#pm_loc').value.trim() || null, status: $('#pm_status').value,
      budget_total: $('#pm_budget').value ? Number($('#pm_budget').value) : null
    };
    var full = Object.assign({}, base, {
      progress: $('#pm_progress').value === '' ? 0 : Math.max(0, Math.min(100, Number($('#pm_progress').value)))
    });
    var save = function (payload, retry) {
      sb.from('projects').update(payload).eq('id', PM.id).then(function (r) {
        // Si aún no existe la columna progress, guarda el resto sin perder los cambios.
        if (r.error && retry && /progress/.test(r.error.message || '')) { save(base, false); return; }
        if (r.error) { toast(human(r.error), 'err'); return; }
        $('#pModal').classList.remove('on'); toast('Proyecto actualizado ✓', 'ok'); loadProjects();
      });
    };
    save(full, true);
  });

  // ══ AVANCES ══
  var pending = [];
  $('#a_date').value = new Date().toISOString().slice(0, 10);
  $('#a_project').addEventListener('change', loadUpdates);

  var dz = $('#dz'), fileInput = $('#a_files');
  dz.addEventListener('click', function () { fileInput.click(); });
  ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); }); });
  dz.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', function (e) { addFiles(e.target.files); fileInput.value = ''; });

  function addFiles(fileList) {
    Array.prototype.slice.call(fileList).forEach(function (f) {
      if (!/^image\//.test(f.type)) return;
      resizeImage(f, 1600, 0.82).then(function (blob) {
        var item = { blob: blob, url: URL.createObjectURL(blob) };
        pending.push(item);
        renderPending();
      });
    });
  }
  function renderPending() {
    var box = $('#a_prev'); box.innerHTML = '';
    pending.forEach(function (it, i) {
      var d = document.createElement('div'); d.className = 'thumb';
      d.innerHTML = '<img src="' + it.url + '">';
      var rm = document.createElement('button'); rm.className = 'rm'; rm.textContent = '✕'; rm.title = 'Quitar';
      rm.addEventListener('click', function (e) { e.stopPropagation(); pending.splice(i, 1); renderPending(); });
      d.appendChild(rm); box.appendChild(d);
    });
  }

  $('#a_publish').addEventListener('click', function () {
    var pid = $('#a_project').value; if (!pid) { toast('Elige una obra.', 'err'); return; }
    var btn = $('#a_publish'); btn.disabled = true; btn.textContent = 'Publicando…';
    var prog = $('#a_prog'), bar = prog.querySelector('i');
    prog.classList.add('on'); bar.style.width = '4%';
    sb.from('updates').insert({
      project_id: pid, date: $('#a_date').value, title: $('#a_title').value.trim() || null,
      note: $('#a_note').value.trim() || null, created_by: ME.id
    }).select().single().then(function (r) {
      if (r.error) { done(human(r.error), 'err'); return; }
      var up = r.data, i = 0, total = pending.length;
      if (!total) { bar.style.width = '100%'; done('Avance publicado ✓', 'ok'); return; }
      (function next() {
        if (i >= total) { done('Avance publicado con ' + total + ' foto(s) ✓', 'ok'); return; }
        var path = pid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.webp';
        sb.storage.from('obra').upload(path, pending[i].blob, { contentType: 'image/webp', upsert: false })
          .then(function (us) {
            if (us.error) { done(human(us.error), 'err'); return; }
            sb.from('update_photos').insert({ update_id: up.id, storage_path: path, sort: i }).then(function () {
              i++; bar.style.width = Math.round(4 + (i / total) * 96) + '%'; next();
            });
          });
      })();
    });
    function done(msg, cls) {
      btn.disabled = false; btn.textContent = 'Publicar avance';
      toast(msg, cls);
      setTimeout(function () { $('#a_prog').classList.remove('on'); $('#a_prog i') && ($('#a_prog').querySelector('i').style.width = '0'); }, 600);
      if (cls === 'ok') {
        notify($('#a_project').value, 'avance', $('#a_title').value.trim());
        $('#a_title').value = $('#a_note').value = ''; pending = []; renderPending(); loadUpdates();
      }
    }
  });

  function loadUpdates() {
    var pid = $('#a_project').value; var list = $('#a_list');
    if (!pid) { list.innerHTML = ''; $('#a_count').textContent = ''; return; }
    sb.from('updates').select('*').eq('project_id', pid).order('date', { ascending: false }).order('created_at', { ascending: false })
      .then(function (r) {
        var ups = r.data || [];
        $('#a_count').textContent = ups.length ? ups.length + ' avance' + (ups.length === 1 ? '' : 's') : '';
        list.innerHTML = '';
        if (!ups.length) { list.innerHTML = '<div class="muted" style="padding:10px 0">Sin avances aún. Publica el primero a la izquierda.</div>'; return; }
        var ids = ups.map(function (u) { return u.id; });
        sb.from('update_photos').select('*').in('update_id', ids).order('sort', { ascending: true }).then(function (ph) {
          var byU = {};
          (ph.data || []).forEach(function (x) { (byU[x.update_id] = byU[x.update_id] || []).push(x); });
          var all = ph.data || [];
          var paint = function (urlByPath) {
            ups.forEach(function (u) {
              var card = document.createElement('div'); card.className = 'av-card';
              var head = document.createElement('div'); head.className = 'h';
              var left = document.createElement('div');
              left.innerHTML = '<div class="d">' + fmtDate(u.date) + '</div><div class="t">' + esc(u.title || 'Avance') + '</div>';
              var acts = document.createElement('div'); acts.className = 'acts';
              var ed = document.createElement('button'); ed.className = 'iconbtn'; ed.title = 'Editar'; ed.textContent = '✎';
              ed.addEventListener('click', function () { openUpdateModal(u); });
              var del = document.createElement('button'); del.className = 'iconbtn'; del.title = 'Borrar'; del.textContent = '🗑';
              del.addEventListener('click', function () {
                if (!confirm('¿Borrar este avance y sus fotos?')) return;
                var paths = (byU[u.id] || []).map(function (x) { return x.storage_path; });
                var fin = function () {
                  sb.from('updates').delete().eq('id', u.id).then(function () { toast('Avance borrado', 'ok'); loadUpdates(); });
                };
                if (paths.length) sb.storage.from('obra').remove(paths).then(fin); else fin();
              });
              acts.appendChild(ed); acts.appendChild(del);
              head.appendChild(left); head.appendChild(acts); card.appendChild(head);
              if (u.note) { var n = document.createElement('div'); n.className = 'note'; n.textContent = u.note; card.appendChild(n); }
              var photos = byU[u.id] || [];
              if (photos.length) {
                var tt = document.createElement('div'); tt.className = 'av-thumbs';
                photos.forEach(function (x) {
                  var t = document.createElement('div'); t.className = 't';
                  var url = urlByPath[x.storage_path];
                  t.innerHTML = url ? '<img loading="lazy" src="' + url + '">' : '';
                  var rm = document.createElement('button'); rm.className = 'rm'; rm.textContent = '✕'; rm.title = 'Eliminar foto';
                  rm.addEventListener('click', function () {
                    if (!confirm('¿Eliminar esta foto?')) return;
                    sb.storage.from('obra').remove([x.storage_path]).then(function () {
                      sb.from('update_photos').delete().eq('id', x.id).then(function () { toast('Foto eliminada', 'ok'); loadUpdates(); });
                    });
                  });
                  t.appendChild(rm); tt.appendChild(t);
                });
                card.appendChild(tt);
              }
              list.appendChild(card);
            });
          };
          if (!all.length) { paint({}); return; }
          sb.storage.from('obra').createSignedUrls(all.map(function (x) { return x.storage_path; }), 3600).then(function (sg) {
            var urlByPath = {};
            (sg.data || []).forEach(function (s) { if (s.signedUrl) urlByPath[s.path] = s.signedUrl; });
            paint(urlByPath);
          });
        });
      });
  }
  // modal avance
  var AM = null;
  function openUpdateModal(u) {
    AM = u;
    $('#am_date').value = u.date; $('#am_title').value = u.title || ''; $('#am_note').value = u.note || '';
    $('#aModal').classList.add('on');
  }
  $('#am_cancel').addEventListener('click', function () { $('#aModal').classList.remove('on'); });
  $('#am_save').addEventListener('click', function () {
    if (!AM) return;
    sb.from('updates').update({ date: $('#am_date').value, title: $('#am_title').value.trim() || null, note: $('#am_note').value.trim() || null })
      .eq('id', AM.id).then(function (r) {
        if (r.error) { toast(human(r.error), 'err'); return; }
        $('#aModal').classList.remove('on'); toast('Avance actualizado ✓', 'ok'); loadUpdates();
      });
  });

  // ══ CLIENTES ══
  $('#c_gen').addEventListener('click', function (e) {
    e.preventDefault();
    var abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var pw = '';
    for (var i = 0; i < 10; i++) pw += abc[Math.floor(Math.random() * abc.length)];
    $('#c_pass').value = pw + '!';
  });
  $('#c_create').addEventListener('click', function () {
    var pid = $('#c_project').value, email = $('#c_email').value.trim(), pass = $('#c_pass').value, name = $('#c_name').value.trim();
    if (!pid) { toast('Elige la obra.', 'err'); return; }
    if (!email || pass.length < 8) { toast('Correo válido y contraseña de 8+ caracteres.', 'err'); return; }
    var btn = $('#c_create'); btn.disabled = true; btn.textContent = 'Creando…';
    callFn('admin-create-client', { action: 'create', email: email, password: pass, full_name: name, project_id: pid })
      .then(function (r) {
        btn.disabled = false; btn.textContent = 'Crear cuenta';
        if (!r.ok) { toast(r.j.error || 'No se pudo crear.', 'err'); return; }
        $('#cr_email').textContent = email; $('#cr_pass').textContent = pass;
        $('#c_cred').classList.add('on');
        $('#c_email').value = $('#c_pass').value = $('#c_name').value = '';
        toast('Cuenta creada ✓', 'ok'); loadClients(); loadStats();
      }).catch(function (e2) { btn.disabled = false; btn.textContent = 'Crear cuenta'; toast(String(e2), 'err'); });
  });
  $('#cr_copy').addEventListener('click', function () {
    var txt = 'Hola 👋 Ya puedes ver el avance de tu obra con Tierra:\n\n' +
      '🌐 tierra.vip/portal\n📧 ' + $('#cr_email').textContent + '\n🔑 ' + $('#cr_pass').textContent +
      '\n\nAhí verás fotos y notas de cada avance.';
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
      function () { toast('Mensaje copiado ✓', 'ok'); },
      function () { prompt('Copia el mensaje:', txt); }
    );
  });
  function loadClients() {
    sb.from('profiles').select('id,email,full_name,project_id,role').eq('role', 'client').then(function (r) {
      var list = $('#c_list'); list.innerHTML = '';
      var cs = r.data || [];
      if (!cs.length) { list.innerHTML = '<li class="muted" style="padding:10px 0">Sin clientes aún.</li>'; return; }
      var pname = {}; PROJECTS.forEach(function (p) { pname[p.id] = p.name; });
      cs.forEach(function (c) {
        var li = document.createElement('li'); li.className = 'row';
        li.innerHTML = '<div><div class="t">' + esc(c.full_name || c.email) + '</div><div class="s">' + esc(c.email) + '</div></div>';
        var acts = document.createElement('div'); acts.className = 'acts';
        var chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = pname[c.project_id] || 'sin obra';
        var key = document.createElement('button'); key.className = 'iconbtn'; key.title = 'Poner contraseña nueva'; key.textContent = '🔑';
        key.addEventListener('click', function () {
          var abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789', pw = '';
          for (var i = 0; i < 10; i++) pw += abc[Math.floor(Math.random() * abc.length)];
          pw += '!';
          if (!confirm('Se pondrá esta contraseña nueva a ' + c.email + ':\n\n' + pw + '\n\n¿Continuar? (cópiala, se la tendrás que pasar)')) return;
          callFn('admin-create-client', { action: 'reset', user_id: c.id, password: pw }).then(function (r) {
            if (!r.ok) { toast((r.j && r.j.error) || 'No se pudo cambiar.', 'err'); return; }
            var txt = 'Hola 👋 Tu acceso al portal de tu obra:\n\n🌐 tierra.vip/portal\n📧 ' + c.email + '\n🔑 ' + pw;
            (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
              .then(function () { toast('Contraseña nueva ✓ Mensaje copiado para WhatsApp', 'ok'); },
                    function () { prompt('Copia el mensaje:', txt); });
          });
        });
        var del = document.createElement('button'); del.className = 'iconbtn'; del.title = 'Borrar cuenta'; del.textContent = '🗑';
        del.addEventListener('click', function () {
          if (!confirm('¿Borrar la cuenta de ' + (c.email) + '? El cliente ya no podrá entrar al portal.')) return;
          callFn('admin-create-client', { action: 'delete', user_id: c.id }).then(function (r) {
            if (!r.ok) { toast(r.j.error || 'No se pudo borrar.', 'err'); return; }
            toast('Cuenta borrada', 'ok'); loadClients(); loadStats();
          });
        });
        acts.appendChild(chip); acts.appendChild(key); acts.appendChild(del); li.appendChild(acts);
        list.appendChild(li);
      });
    });
  }

  // ══ ADMINS (superadmin) ══
  $('#ad_add').addEventListener('click', function () {
    var email = $('#ad_email').value.trim().toLowerCase(); if (!email) return;
    $('#ad_add').disabled = true;
    sb.from('admin_allowlist').insert({ email: email, role: 'admin' }).then(function (r) {
      sb.from('profiles').update({ role: 'admin' }).eq('email', email).then(function () {
        $('#ad_add').disabled = false;
        if (r.error && r.error.code !== '23505') { toast(human(r.error), 'err'); return; }
        $('#ad_email').value = ''; toast('Administrador autorizado ✓', 'ok'); loadAdmins();
      });
    });
  });
  function loadAdmins() {
    sb.from('admin_allowlist').select('*').order('role', { ascending: true }).then(function (r) {
      var list = $('#ad_list'); list.innerHTML = '';
      (r.data || []).forEach(function (a) {
        var li = document.createElement('li'); li.className = 'row';
        li.innerHTML = '<div><div class="t">' + esc(a.email) + '</div></div>';
        var acts = document.createElement('div'); acts.className = 'acts';
        var chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = a.role;
        acts.appendChild(chip);
        if (a.role !== 'superadmin') {
          var del = document.createElement('button'); del.className = 'iconbtn'; del.title = 'Quitar'; del.textContent = '🗑';
          del.addEventListener('click', function () {
            if (!confirm('¿Quitar acceso de admin a ' + a.email + '?')) return;
            sb.from('admin_allowlist').delete().eq('email', a.email).then(function () {
              sb.from('profiles').update({ role: 'client' }).eq('email', a.email).then(function () { toast('Acceso retirado', 'ok'); loadAdmins(); });
            });
          });
          acts.appendChild(del);
        }
        li.appendChild(acts); list.appendChild(li);
      });
    });
  }

  // ══ STATS ══
  function loadStats() {
    var cnt = function (t, f) {
      var q = sb.from(t).select('id', { count: 'exact', head: true });
      if (f) q = q.eq(f.k, f.v);
      return q.then(function (r) { return r.count || 0; }, function () { return 0; });
    };
    Promise.all([
      cnt('projects'), cnt('profiles', { k: 'role', v: 'client' }), cnt('updates'), cnt('cost_weeks')
    ]).then(function (n) {
      $('#statsRow').innerHTML =
        stTile('Obras', n[0]) + stTile('Clientes', n[1]) + stTile('Avances', n[2]) + stTile('Semanas', n[3]);
    });
  }
  function stTile(k, v) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }

  // ══ COSTOS ══
  var KROWS = [], WEEKS_NOW = [];

  // Las semanas se ordenan por su NÚMERO, no por cuándo se guardaron: si borras
  // y vuelves a subir la 3, tiene que quedar entre la 2 y la 4, no hasta arriba.
  function weekNum(w) {
    var m = String(w.week_label == null ? '' : w.week_label).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }
  function sortWeeks(list, asc) {
    var dir = asc ? 1 : -1;
    return list.slice().sort(function (a, b) {
      var na = weekNum(a), nb = weekNum(b);
      if (na != null && nb != null) { if (na !== nb) return (na - nb) * dir; }
      else if (na != null) return -1 * dir;      // las que tienen número, primero
      else if (nb != null) return 1 * dir;
      var da = a.date_from || '', db = b.date_from || '';
      if (da && db && da !== db) return (da < db ? -1 : 1) * dir;
      var ca = a.created_at || '', cb = b.created_at || '';
      return (ca < cb ? -1 : ca > cb ? 1 : 0) * dir;
    });
  }
  $('#k_project').addEventListener('change', loadWeeks);
  $('#k_paste').addEventListener('input', function () { parseCostText(this.value); });
  $('#k_file_btn').addEventListener('click', function () { $('#k_file').click(); });
  $('#k_file').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        parseCostRows(rows);
        toast('Excel leído ✓ Revisa la vista previa.', 'ok');
      } catch (err) { toast('No pude leer el archivo: ' + err, 'err'); }
    };
    reader.readAsArrayBuffer(f);
    e.target.value = '';
  });
  function parseCostText(text) {
    var rows = text.split(/\r?\n/).map(function (line) {
      return line.split(/\t|\s{2,}| {1}\$/).map(function (c) { return c; });
    });
    // re-split simple: concepto = todo antes del último token con números
    rows = text.split(/\r?\n/).map(function (line) { return line.split('\t'); });
    parseCostRows(rows);
  }
  function parseCostRows(rows) {
    KROWS = [];
    rows.forEach(function (cells) {
      if (!cells || !cells.length) return;
      var line = cells.join(' ').trim();
      if (!line) return;
      // etiqueta de semana
      var mSem = line.match(/^semana\s*(\d+)/i);
      if (mSem && !parseMoney(cells[cells.length - 1])) {
        if (!$('#k_label').value) $('#k_label').value = 'Semana ' + mSem[1];
        return;
      }
      if (/^descripci/i.test(line) || /^coste$/i.test(line)) return;
      // buscar el último valor monetario de la fila
      var amount = null, idx = -1;
      for (var i = cells.length - 1; i >= 0; i--) {
        var v = parseMoney(cells[i]);
        if (v != null) { amount = v; idx = i; break; }
      }
      if (amount == null) return;
      var concept = cells.slice(0, idx).join(' ').replace(/\s+/g, ' ').trim();
      if (!concept) return; // fila de total
      KROWS.push({ concept: concept, amount: amount });
    });
    renderCostPreview();
  }
  function parseMoney(s) {
    if (s == null) return null;
    var t = String(s).replace(/[$,\s]/g, '');
    if (!t || !/^\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  }
  function renderCostPreview() {
    var box = $('#k_prev');
    if (!KROWS.length) { box.classList.remove('on'); box.innerHTML = ''; return; }
    var total = KROWS.reduce(function (n, r) { return n + r.amount; }, 0);
    var html = '';
    KROWS.forEach(function (r, i) {
      html += '<div class="rowline"><span class="nm">' + esc(r.concept) + '</span><span class="amt">' + money(r.amount) + '</span>' +
        '<button class="iconbtn" data-i="' + i + '" title="Quitar">✕</button></div>';
    });
    html += '<div class="tot">' + KROWS.length + ' conceptos · Total ' + money(total) + '</div>';
    box.innerHTML = html; box.classList.add('on');
    box.querySelectorAll('.iconbtn').forEach(function (b) {
      b.addEventListener('click', function () { KROWS.splice(parseInt(b.dataset.i, 10), 1); renderCostPreview(); });
    });
  }
  // ══ Lector de rejilla: semanas en columnas, en varias bandas apiladas ══
  // Formato real de Tierra: cada semana ocupa 2 columnas (Descripción / Coste),
  // varias semanas lado a lado, y el bloque se repite hacia abajo.
  function parseGridWeeks(grid) {
    var heads = [];
    for (var r = 0; r < grid.length; r++) {
      var row = grid[r] || [];
      for (var c = 0; c < row.length; c++) {
        var m = String(row[c] == null ? '' : row[c]).trim().match(/^SEMANA\s*(\d+)\s*$/i);
        if (m) heads.push({ r: r, c: c, num: parseInt(m[1], 10) });
      }
    }
    if (!heads.length) return [];
    var byCol = {};
    heads.forEach(function (h) { (byCol[h.c] = byCol[h.c] || []).push(h); });
    Object.keys(byCol).forEach(function (c) { byCol[c].sort(function (a, b) { return a.r - b.r; }); });

    var out = [];
    heads.forEach(function (h) {
      var col = byCol[h.c], endR = grid.length;
      for (var k = 0; k < col.length; k++) if (col[k].r > h.r) { endR = col[k].r; break; }
      // Bajo el encabezado: fila de fechas y fila "Descripción | Coste"
      var mmdd = null, headerRow = -1;
      for (var r2 = h.r + 1; r2 < Math.min(h.r + 5, endR); r2++) {
        var v = String(((grid[r2] || [])[h.c]) == null ? '' : (grid[r2] || [])[h.c]).trim();
        var dm = v.match(/(\d{1,2})[-\/](\d{1,2})\s*(?:a|al|–|-)\s*(\d{1,2})[-\/](\d{1,2})/i);
        if (dm && !mmdd) mmdd = { fm: +dm[2], fd: +dm[1], tm: +dm[4], td: +dm[3] };
        if (/^descripci/i.test(v)) { headerRow = r2; break; }
      }
      var start = headerRow >= 0 ? headerRow + 1 : h.r + 3;
      var items = [], declared = null, closed = false;
      for (var i = start; i < endR; i++) {
        var rw = grid[i] || [];
        var concept = String(rw[h.c] == null ? '' : rw[h.c]).trim();
        var raw = rw[h.c + 1];
        var amount = parseMoney(raw);
        if (amount == null && /^\s*\$?\s*-\s*$/.test(String(raw == null ? '' : raw))) amount = 0;
        if (!concept) {
          // Fila sin concepto pero con importe = el total del bloque: ahí termina
          if (amount != null) { declared = amount; closed = true; break; }
          continue;
        }
        if (/^descripci/i.test(concept) || /^coste$/i.test(concept)) continue;
        if (/^semana\s*\d/i.test(concept)) { closed = true; break; }
        if (amount == null) continue;
        items.push({ concept: concept, amount: amount });
      }
      if (items.length) out.push({
        num: h.num, label: 'Semana ' + h.num, mmdd: mmdd, items: items,
        declared: declared, truncated: !closed
      });
    });
    out.sort(function (a, b) { return a.num - b.num; });
    return out;
  }

  // Las fechas del Excel vienen sin año (13-01 a 19-01): se deducen avanzando
  // por número de semana y subiendo el año cada vez que la fecha retrocede.
  function assignYears(weeks, baseYear) {
    var y = baseYear, prev = null;
    weeks.forEach(function (w) {
      if (!w.mmdd) { w.from = w.to = null; return; }
      var mm = w.mmdd.fm, dd = w.mmdd.fd;
      if (prev && (mm < prev.mm || (mm === prev.mm && dd < prev.dd))) y++;
      w.from = iso(y, mm, dd);
      var y2 = (w.mmdd.tm < mm || (w.mmdd.tm === mm && w.mmdd.td < dd)) ? y + 1 : y;
      w.to = iso(y2, w.mmdd.tm, w.mmdd.td);
      prev = { mm: mm, dd: dd };
    });
  }
  function iso(y, m, d) { return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); }
  function guessBaseYear(weeks) {
    var con = weeks.filter(function (w) { return w.mmdd; });
    if (!con.length) return new Date().getFullYear();
    var bumps = 0, prev = null;
    con.forEach(function (w) {
      if (prev && (w.mmdd.fm < prev.mm || (w.mmdd.fm === prev.mm && w.mmdd.fd < prev.dd))) bumps++;
      prev = { mm: w.mmdd.fm, dd: w.mmdd.fd };
    });
    // La última semana del archivo debería caer cerca de hoy
    var last = con[con.length - 1], today = new Date(), best = today.getFullYear(), bestD = Infinity;
    [-1, 0, 1].forEach(function (o) {
      var y = today.getFullYear() + o;
      var diff = Math.abs(new Date(y, last.mmdd.fm - 1, last.mmdd.fd) - today);
      if (diff < bestD) { bestD = diff; best = y; }
    });
    return best - bumps;
  }

  // ══ HISTÓRICO: un Excel con todas las semanas ══
  var HWEEKS = [], HBASE = null;
  var khdz = $('#khdz'), kHistInput = $('#k_hist_file');
  khdz.addEventListener('click', function () { kHistInput.click(); });
  ['dragenter', 'dragover'].forEach(function (ev) { khdz.addEventListener(ev, function (e) { e.preventDefault(); khdz.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { khdz.addEventListener(ev, function (e) { e.preventDefault(); khdz.classList.remove('drag'); }); });
  khdz.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) histFlow(e.dataTransfer.files[0]); });
  kHistInput.addEventListener('change', function (e) { if (e.target.files[0]) histFlow(e.target.files[0]); e.target.value = ''; });
  var histT = null;
  $('#k_hist_paste').addEventListener('input', function () {
    var v = this.value;
    clearTimeout(histT);
    if (v.trim().length < 20) return;
    histT = setTimeout(function () { histPaste(v); }, 500);
  });

  function histStep(p, txt) {
    var pr = $('#k_hist_prog'); pr.classList.add('on'); pr.querySelector('i').style.width = p + '%';
    setMsg('#k_hist_msg', txt, '');
  }
  function histFail(txt) { $('#k_hist_prog').classList.remove('on'); setMsg('#k_hist_msg', txt, 'err'); }

  function histFlow(file) {
    if (!guardProject()) return;
    resetHist();
    histStep(10, 'Abriendo ' + file.name + '…');
    readWorkbook(file).then(function (sheets) {
      // 1) Lector de rejilla propio: exacto y sin depender de la IA
      var found = [];
      sheets.forEach(function (s) { found = found.concat(parseGridWeeks(s.grid)); });
      if (found.length >= 2) { finishHist(found, 'lector de columnas'); return null; }
      // 2) Si el archivo no tiene esa forma, que lo interprete la IA
      histStep(35, sheets.length + ' hoja(s) · pidiendo ayuda a la IA…');
      return callFn('ai-parse-costs', { text: sheetsToText(sheets), multi: true }).then(function (r) {
        var j = r.j || {};
        if (j.error === 'ia_no_configurada') throw 'No reconocí el formato y la IA no está activada (falta ANTHROPIC_API_KEY en Supabase).';
        if (!r.ok || !j.weeks || !j.weeks.length) throw (j.error || 'No pude separar las semanas de ese archivo.');
        finishHist(j.weeks.map(function (w) {
          return { num: null, label: w.week_label || 'Semana', from: w.date_from, to: w.date_to, items: w.items || [] };
        }), 'IA');
      });
    }).catch(function (e) { histFail(String(e)); });
  }

  function histPaste(text) {
    if (!guardProject()) return;
    resetHist();
    histStep(20, 'Leyendo lo que pegaste…');
    var grid = text.split(/\r?\n/).map(function (l) { return l.split('\t'); });
    var found = parseGridWeeks(grid);
    if (found.length >= 2) { finishHist(found, 'lector de columnas'); return; }
    histStep(40, 'Formato no reconocido · pidiendo ayuda a la IA…');
    callFn('ai-parse-costs', { text: text, multi: true }).then(function (r) {
      var j = r.j || {};
      if (j.error === 'ia_no_configurada') { histFail('No reconocí el formato y la IA no está activada (falta ANTHROPIC_API_KEY en Supabase).'); return; }
      if (!r.ok || !j.weeks || !j.weeks.length) { histFail(j.error || 'No encontré semanas ahí.'); return; }
      finishHist(j.weeks.map(function (w) {
        return { num: null, label: w.week_label || 'Semana', from: w.date_from, to: w.date_to, items: w.items || [] };
      }), 'IA');
    }, function (e) { histFail(String(e)); });
  }

  function guardProject() {
    if ($('#k_project').value) return true;
    histFail('Elige primero la obra arriba.'); return false;
  }
  function resetHist() {
    HWEEKS = []; HBASE = null;
    $('#k_hist_prev').classList.remove('on'); $('#k_hist_prev').innerHTML = '';
  }

  function finishHist(found, how) {
    var conFecha = found.filter(function (w) { return w.mmdd; });
    if (conFecha.length) { HBASE = guessBaseYear(found); assignYears(found, HBASE); }
    var existing = {};
    (WEEKS_NOW || []).forEach(function (w) { existing[String(w.week_label).toLowerCase().trim()] = true; });
    HWEEKS = found.map(function (w) {
      var items = (w.items || []).filter(function (x) { return x && x.concept && !isNaN(Number(x.amount)); })
        .map(function (x) { return { concept: String(x.concept), amount: Number(x.amount) }; });
      var label = w.label || 'Semana sin nombre';
      var dup = !!existing[String(label).toLowerCase().trim()];
      var total = items.reduce(function (n, i) { return n + i.amount; }, 0);
      // Aviso si el bloque quedó cortado o si no cuadra con el total del propio Excel
      var desc = (w.declared != null && Math.abs(total - w.declared) > 2)
        ? 'el Excel dice ' + money(w.declared) : null;
      return {
        num: w.num, label: label, mmdd: w.mmdd, from: w.from || null, to: w.to || null,
        items: items, total: total, declared: w.declared, cut: !!w.truncated, mismatch: desc,
        dup: dup, on: !dup && items.length > 0
      };
    }).filter(function (w) { return w.items.length; });
    if (!HWEEKS.length) { histFail('No encontré semanas con gastos ahí.'); return; }
    histStep(100, '');
    setTimeout(function () { $('#k_hist_prog').classList.remove('on'); }, 600);
    setMsg('#k_hist_msg', '', '');
    HOW = how;
    renderHist();
  }
  var HOW = '';

  function renderHist() {
    var box = $('#k_hist_prev');
    var sel = HWEEKS.filter(function (w) { return w.on; });
    var gran = sel.reduce(function (n, w) { return n + w.total; }, 0);
    var conFecha = HWEEKS.some(function (w) { return w.mmdd; });
    var html = '<div class="wp-head">Encontré <b>' + HWEEKS.length + '</b> semana' + (HWEEKS.length === 1 ? '' : 's') +
      ' con el ' + HOW + '. Destilda las que no quieras publicar.</div>';
    if (conFecha) {
      html += '<div class="yearbox">Tu Excel trae las fechas sin año. Deduje que la <b>semana ' +
        (HWEEKS[0].num || 1) + '</b> empieza en ' +
        '<input type="number" id="k_hist_year" value="' + HBASE + '" min="2000" max="2100"> — corrígelo si no cuadra.</div>';
    }
    html += '<ul class="wp-list">';
    HWEEKS.forEach(function (w, i) {
      html += '<li class="' + (w.dup ? 'dup' : '') + '">' +
        '<label><input type="checkbox" data-i="' + i + '"' + (w.on ? ' checked' : '') + '>' +
        '<span class="wl">' + esc(w.label) + '</span></label>' +
        '<span class="wd">' + (w.from && w.to ? fmtDate(w.from) + ' — ' + fmtDate(w.to) : 'sin fechas') + '</span>' +
        '<span class="wi">' + w.items.length + (w.items.length === 1 ? ' concepto' : ' conceptos') + '</span>' +
        '<span class="wt">' + money(w.total) + '</span>' +
        (w.dup ? '<span class="wdup">ya existe</span>' : '') +
        (w.mismatch ? '<span class="wwarn" title="Revisa esta semana antes de publicarla">⚠ ' + esc(w.mismatch) + '</span>' : '') +
        (w.cut && !w.mismatch ? '<span class="wwarn" title="No encontré la fila de total de este bloque">⚠ revisar</span>' : '') +
        '</li>';
    });
    html += '</ul><div class="wp-foot"><b>' + sel.length + '</b> semanas seleccionadas · Total <b>' + money(gran) + '</b></div>' +
      '<label class="autochk"><input type="checkbox" id="k_hist_send"> Avisar al cliente por correo (solo de la semana más reciente)</label>' +
      '<button class="btn block" id="k_hist_save" style="margin-top:14px">Publicar ' + sel.length + ' semana' + (sel.length === 1 ? '' : 's') + '</button>';
    box.innerHTML = html; box.classList.add('on');
    box.querySelectorAll('.wp-list input[type=checkbox]').forEach(function (c) {
      c.addEventListener('change', function () { HWEEKS[parseInt(c.dataset.i, 10)].on = c.checked; renderHist(); });
    });
    var yb = $('#k_hist_year');
    if (yb) yb.addEventListener('change', function () {
      var y = parseInt(yb.value, 10);
      if (!y || y < 2000 || y > 2100) return;
      HBASE = y; assignYears(HWEEKS, y); renderHist();
    });
    $('#k_hist_save').addEventListener('click', saveHist);
  }

  function saveHist() {
    var pid = $('#k_project').value;
    var sel = HWEEKS.filter(function (w) { return w.on; });
    if (!sel.length) { histFail('No hay semanas seleccionadas.'); return; }
    var avisar = $('#k_hist_send').checked;
    var btn = $('#k_hist_save'); btn.disabled = true;
    var done = 0, fail = 0, last = null;
    histStep(4, 'Publicando…');
    (function next(i) {
      if (i >= sel.length) {
        $('#k_hist_prog').classList.remove('on');
        btn.disabled = false;
        var txt = done + ' semana' + (done === 1 ? '' : 's') + ' publicada' + (done === 1 ? '' : 's') +
          (fail ? ' · ' + fail + ' fallaron' : '');
        setMsg('#k_hist_msg', txt, fail ? 'err' : 'ok');
        toast(txt, fail ? 'err' : 'ok');
        $('#k_hist_prev').classList.remove('on'); HWEEKS = [];
        loadWeeks(); loadStats();
        if (avisar && last) notify(pid, 'costos', last.label, { total: last.total, week_id: last.id });
        return;
      }
      var w = sel[i];
      btn.textContent = 'Publicando ' + w.label + ' (' + (i + 1) + '/' + sel.length + ')…';
      histStep(4 + Math.round((i / sel.length) * 92), 'Publicando ' + w.label + '…');
      sb.from('cost_weeks').insert({
        project_id: pid, week_label: w.label, date_from: w.from, date_to: w.to, created_by: ME.id
      }).select().single().then(function (r) {
        if (r.error) { fail++; next(i + 1); return; }
        var wid = r.data.id;
        sb.from('cost_items').insert(w.items.map(function (x, k) {
          return { week_id: wid, concept: x.concept, amount: x.amount, sort: k };
        })).then(function (r2) {
          if (r2.error) fail++; else { done++; last = { label: w.label, total: w.total, id: wid }; }
          next(i + 1);
        });
      });
    })(0);
  }
  // Parser local (sin IA) reutilizando la misma lógica de la vista previa
  function localParse(grid) {
    var keep = KROWS, keepLabel = $('#k_label').value;
    KROWS = [];
    parseCostRows(grid);
    var out = { items: KROWS.slice(), week_label: $('#k_label').value || null, date_from: null, date_to: null };
    KROWS = keep; $('#k_label').value = keepLabel; renderCostPreview();
    return out;
  }

  // Interpretar con IA (Claude) — para Excels desordenados
  $('#k_ai').addEventListener('click', function () {
    var txt = $('#k_paste').value.trim();
    if (!txt) { toast('Primero pega el contenido del Excel.', 'err'); return; }
    var btn = $('#k_ai'); btn.disabled = true; btn.textContent = '✨ Interpretando…';
    callFn('ai-parse-costs', { text: txt }).then(function (r) {
      btn.disabled = false; btn.textContent = '✨ Interpretar con IA';
      var j = r.j || {};
      if (j.error === 'ia_no_configurada') { toast('Falta la clave de IA (ANTHROPIC_API_KEY) en Supabase.', 'err'); return; }
      if (!r.ok || !j.items || !j.items.length) { toast(j.error || 'La IA no encontró gastos en ese texto.', 'err'); return; }
      KROWS = j.items.filter(function (x) { return x && x.concept && !isNaN(Number(x.amount)); })
        .map(function (x) { return { concept: String(x.concept), amount: Number(x.amount) }; });
      if (j.week_label) $('#k_label').value = j.week_label;
      if (j.date_from) $('#k_from').value = j.date_from;
      if (j.date_to) $('#k_to').value = j.date_to;
      renderCostPreview();
      toast('IA lista ✓ ' + KROWS.length + ' conceptos. Revísalos antes de guardar.', 'ok');
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = '✨ Interpretar con IA'; toast(String(e), 'err');
    });
  });

  $('#k_save').addEventListener('click', function () {
    var pid = $('#k_project').value; if (!pid) { toast('Elige una obra.', 'err'); return; }
    var label = $('#k_label').value.trim(); if (!label) { toast('Ponle etiqueta (ej. Semana 78).', 'err'); return; }
    if (!KROWS.length) { toast('Pega o sube los costos primero.', 'err'); return; }
    var btn = $('#k_save'); btn.disabled = true; btn.textContent = 'Guardando…';
    sb.from('cost_weeks').insert({
      project_id: pid, week_label: label,
      date_from: $('#k_from').value || null, date_to: $('#k_to').value || null, created_by: ME.id
    }).select().single().then(function (r) {
      if (r.error) { fin(human(r.error), 'err'); return; }
      var items = KROWS.map(function (x, i) { return { week_id: r.data.id, concept: x.concept, amount: x.amount, sort: i }; });
      var wid = r.data.id;
      var total = KROWS.reduce(function (n, x) { return n + x.amount; }, 0);
      sb.from('cost_items').insert(items).then(function (r2) {
        if (r2.error) { fin(human(r2.error), 'err'); return; }
        notify(pid, 'costos', label, { total: total, week_id: wid });
        fin('Semana guardada ✓ El cliente ya la ve en su dashboard.', 'ok');
      });
    });
    function fin(m, c) {
      btn.disabled = false; btn.textContent = 'Guardar semana';
      toast(m, c);
      if (c === 'ok') { KROWS = []; renderCostPreview(); $('#k_paste').value = ''; $('#k_label').value = ''; loadWeeks(); loadStats(); }
    }
  });
  function loadWeeks() {
    var pid = $('#k_project').value; var list = $('#k_list');
    if (!pid) { list.innerHTML = ''; return; }
    sb.from('cost_weeks').select('*, cost_items(amount)').eq('project_id', pid).order('created_at', { ascending: false })
      .then(function (r) {
        var ws = sortWeeks(r.data || [], false);   // de la más reciente a la más antigua
        WEEKS_NOW = ws;
        $('#k_count').textContent = ws.length ? ws.length + ' semana' + (ws.length === 1 ? '' : 's') : '';
        list.innerHTML = '';
        if (!ws.length) { list.innerHTML = '<li class="muted" style="padding:10px 0">Sin semanas aún.</li>'; return; }
        ws.forEach(function (w) {
          var total = (w.cost_items || []).reduce(function (n, i) { return n + Number(i.amount || 0); }, 0);
          var li = document.createElement('li'); li.className = 'row';
          li.innerHTML = '<div><div class="t">' + esc(w.week_label) + '</div><div class="s">' +
            ((w.date_from && w.date_to) ? (fmtDate(w.date_from) + ' — ' + fmtDate(w.date_to) + ' · ') : '') +
            (w.cost_items || []).length + ' conceptos</div></div>';
          var acts = document.createElement('div'); acts.className = 'acts';
          var amt = document.createElement('span'); amt.className = 'chip'; amt.textContent = money(total);
          var del = document.createElement('button'); del.className = 'iconbtn'; del.title = 'Borrar'; del.textContent = '🗑';
          del.addEventListener('click', function () {
            if (!confirm('¿Borrar ' + w.week_label + ' y sus conceptos?')) return;
            sb.from('cost_weeks').delete().eq('id', w.id).then(function () { toast('Semana borrada', 'ok'); loadWeeks(); loadStats(); });
          });
          acts.appendChild(amt); acts.appendChild(del);
          li.appendChild(acts); list.appendChild(li);
        });
      }, function () {
        list.innerHTML = '<li class="muted" style="padding:10px 0">La tabla de costos aún no está en la base de datos.</li>';
      });
  }

  // ══ helpers de funciones / correo ══
  function callFn(name, body) {
    return sb.auth.getSession().then(function (s) {
      return fetch(window.TIERRA_SUPABASE.url + '/functions/v1/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.data.session.access_token, 'apikey': window.TIERRA_SUPABASE.anonKey },
        body: JSON.stringify(body)
      }).then(function (res) { return res.json().then(function (j2) { return { ok: res.ok, j: j2 }; }); });
    });
  }
  function notify(pid, kind, title, extra) {
    var body = { project_id: pid, kind: kind, title: title || '' };
    if (extra) { body.total = extra.total; body.week_id = extra.week_id; }
    callFn('notify-update', body).then(function (r) {
      var j = r.j || {};
      if (j.reason === 'email_no_configurado') { toast('Publicado ✓ (los correos aún no están activados)', ''); return; }
      if (j.reason === 'sin_clientes') { toast('Publicado ✓ (esta obra aún no tiene cliente con cuenta)', ''); return; }
      // Un correo rechazado casi siempre es el dominio sin verificar en Resend
      // o el remitente equivocado. Callarlo hacía creer que el aviso salió.
      if (j.failed) { toast('Publicado ✓ pero ' + j.failed + ' correo(s) no salieron: ' + correoErr(j.error), 'err'); return; }
      if (r.ok && j.sent > 0) toast('📧 Aviso enviado al cliente (' + j.sent + ')', 'ok');
      else if (!r.ok) toast('Publicado ✓ pero el aviso por correo falló', 'err');
    }).catch(function () { /* silencioso */ });
  }
  function correoErr(txt) {
    var s = String(txt || '');
    if (/domain is not verified|not verified/i.test(s)) return 'el dominio no está verificado en Resend.';
    if (/testing emails|own email address/i.test(s)) return 'el remitente sigue siendo el de pruebas; falta el secreto NOTIFY_FROM.';
    if (/API key|unauthorized|401/i.test(s)) return 'la clave RESEND_API_KEY no es válida.';
    if (/rate|429|limit/i.test(s)) return 'se alcanzó el límite de envíos de Resend por hoy.';
    return s.slice(0, 120);
  }
  function money(n) { return '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }); }

  // ── utils ──
  function resizeImage(file, maxSide, quality) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height, scale = Math.min(1, maxSide / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolve(b || file); }, 'image/webp', quality);
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
