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
  var sb = window.supabase.createClient(
    window.TIERRA_SUPABASE.url, window.TIERRA_SUPABASE.anonKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

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
            if (r2.error) { toast(r2.error.message, 'err'); return; }
            toast('Proyecto borrado', 'ok'); loadProjects();
          });
        });
        acts.appendChild(chip); acts.appendChild(ed); acts.appendChild(del);
        li.appendChild(info); li.appendChild(acts); list.appendChild(li);
      });
      ['#a_project', '#c_project', '#k_project', '#n_project'].forEach(function (sel) {
        var s = $(sel); var prev = s.value; s.innerHTML = '';
        if (!PROJECTS.length) { s.innerHTML = '<option value="">— crea un proyecto primero —</option>'; return; }
        PROJECTS.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; s.appendChild(o); });
        if (prev && PROJECTS.some(function (p) { return p.id === prev; })) s.value = prev;
      });
      if (PROJECTS.length) { loadUpdates(); loadWeeks(); loadNotes(); }
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
        if (r.error) { setMsg('#p_msg', r.error.message, 'err'); return; }
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
        if (r.error) { toast(r.error.message, 'err'); return; }
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
      if (r.error) { done(r.error.message, 'err'); return; }
      var up = r.data, i = 0, total = pending.length;
      if (!total) { bar.style.width = '100%'; done('Avance publicado ✓', 'ok'); return; }
      (function next() {
        if (i >= total) { done('Avance publicado con ' + total + ' foto(s) ✓', 'ok'); return; }
        var path = pid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.webp';
        sb.storage.from('obra').upload(path, pending[i].blob, { contentType: 'image/webp', upsert: false })
          .then(function (us) {
            if (us.error) { done(us.error.message, 'err'); return; }
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
        if (r.error) { toast(r.error.message, 'err'); return; }
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
        var del = document.createElement('button'); del.className = 'iconbtn'; del.title = 'Borrar cuenta'; del.textContent = '🗑';
        del.addEventListener('click', function () {
          if (!confirm('¿Borrar la cuenta de ' + (c.email) + '? El cliente ya no podrá entrar al portal.')) return;
          callFn('admin-create-client', { action: 'delete', user_id: c.id }).then(function (r) {
            if (!r.ok) { toast(r.j.error || 'No se pudo borrar.', 'err'); return; }
            toast('Cuenta borrada', 'ok'); loadClients(); loadStats();
          });
        });
        acts.appendChild(chip); acts.appendChild(del); li.appendChild(acts);
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
        if (r.error && r.error.code !== '23505') { toast(r.error.message, 'err'); return; }
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
      cnt('projects'), cnt('profiles', { k: 'role', v: 'client' }), cnt('updates'), cnt('cost_weeks'), cnt('project_notes')
    ]).then(function (n) {
      $('#statsRow').innerHTML =
        stTile('Proyectos', n[0]) + stTile('Clientes', n[1]) + stTile('Avances publicados', n[2]) +
        stTile('Semanas de costos', n[3]) + stTile('Notas de obra', n[4]);
    });
  }
  function stTile(k, v) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }

  // ══ COSTOS ══
  var KROWS = [];
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
      if (r.error) { fin(r.error.message, 'err'); return; }
      var items = KROWS.map(function (x, i) { return { week_id: r.data.id, concept: x.concept, amount: x.amount, sort: i }; });
      sb.from('cost_items').insert(items).then(function (r2) {
        if (r2.error) { fin(r2.error.message, 'err'); return; }
        notify(pid, 'costos', label);
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
        var ws = r.data || [];
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

  // ══ NOTAS DE CONSTRUCCIÓN ══
  $('#n_date').value = new Date().toISOString().slice(0, 10);
  $('#n_project').addEventListener('change', loadNotes);
  $('#n_save').addEventListener('click', function () {
    var pid = $('#n_project').value; if (!pid) { toast('Elige una obra.', 'err'); return; }
    var body = $('#n_body').value.trim(); if (!body) { toast('Escribe la nota.', 'err'); return; }
    var btn = $('#n_save'); btn.disabled = true; btn.textContent = 'Publicando…';
    sb.from('project_notes').insert({
      project_id: pid, note_date: $('#n_date').value || new Date().toISOString().slice(0, 10),
      title: $('#n_title').value.trim() || null, body: body, created_by: ME.id
    }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Publicar nota';
      if (r.error) { toast(r.error.message, 'err'); return; }
      notify(pid, 'nota', $('#n_title').value.trim());
      $('#n_title').value = $('#n_body').value = '';
      toast('Nota publicada ✓ El cliente ya la ve.', 'ok'); loadNotes(); loadStats();
    });
  });
  function loadNotes() {
    var pid = $('#n_project').value; var list = $('#n_list');
    if (!pid) { list.innerHTML = ''; $('#n_count').textContent = ''; return; }
    sb.from('project_notes').select('*').eq('project_id', pid)
      .order('note_date', { ascending: false }).order('created_at', { ascending: false })
      .then(function (r) {
        var ns = r.data || [];
        $('#n_count').textContent = ns.length ? ns.length + ' nota' + (ns.length === 1 ? '' : 's') : '';
        list.innerHTML = '';
        if (!ns.length) { list.innerHTML = '<li class="muted" style="padding:10px 0">Sin notas aún. Escribe la primera a la izquierda.</li>'; return; }
        ns.forEach(function (n) {
          var li = document.createElement('li'); li.className = 'row note-row';
          li.innerHTML = '<div><div class="t">' + esc(n.title || 'Nota de obra') + '</div>' +
            '<div class="s">' + fmtDate(n.note_date) + '</div>' +
            '<div class="body">' + esc(n.body) + '</div></div>';
          var acts = document.createElement('div'); acts.className = 'acts';
          var ed = document.createElement('button'); ed.className = 'iconbtn'; ed.title = 'Editar'; ed.textContent = '✎';
          ed.addEventListener('click', function () { openNoteModal(n); });
          var del = document.createElement('button'); del.className = 'iconbtn'; del.title = 'Borrar'; del.textContent = '🗑';
          del.addEventListener('click', function () {
            if (!confirm('¿Borrar esta nota?')) return;
            sb.from('project_notes').delete().eq('id', n.id).then(function () { toast('Nota borrada', 'ok'); loadNotes(); loadStats(); });
          });
          acts.appendChild(ed); acts.appendChild(del);
          li.appendChild(acts); list.appendChild(li);
        });
      }, function () {
        list.innerHTML = '<li class="muted" style="padding:10px 0">La tabla de notas aún no está en la base de datos.</li>';
      });
  }
  var NM = null;
  function openNoteModal(n) {
    NM = n;
    $('#nm_date').value = n.note_date; $('#nm_title').value = n.title || ''; $('#nm_body').value = n.body || '';
    $('#nModal').classList.add('on');
  }
  $('#nm_cancel').addEventListener('click', function () { $('#nModal').classList.remove('on'); });
  $('#nm_save').addEventListener('click', function () {
    if (!NM) return;
    sb.from('project_notes').update({
      note_date: $('#nm_date').value, title: $('#nm_title').value.trim() || null, body: $('#nm_body').value.trim()
    }).eq('id', NM.id).then(function (r) {
      if (r.error) { toast(r.error.message, 'err'); return; }
      $('#nModal').classList.remove('on'); toast('Nota actualizada ✓', 'ok'); loadNotes();
    });
  });

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
  function notify(pid, kind, title) {
    callFn('notify-update', { project_id: pid, kind: kind, title: title || '' }).then(function (r) {
      if (r.ok && r.j.sent > 0) toast('📧 Aviso enviado al cliente (' + r.j.sent + ')', 'ok');
    }).catch(function () { /* silencioso */ });
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
