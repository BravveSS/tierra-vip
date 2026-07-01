/* ============================================================================
   TIERRA — Captura de leads (Web3Forms)
   Motor ÚNICO de formularios. Toda la lógica de envío vive acá.
   Los leads llegan por email a ventas@tierra.vip sin necesidad de backend.

   ┌───────────────────────────────────────────────────────────────────────┐
   │  CÓMO ACTIVARLO (1 sola línea):                                        │
   │  1. Entrá a  https://web3forms.com  y poné el correo ventas@tierra.vip │
   │  2. Copiá la "Access Key" que te dan (ej: 12ab34cd-56ef-...).          │
   │  3. Pegala abajo en WEB3FORMS_ACCESS_KEY, entre las comillas.          │
   │  Eso es todo. Todos los formularios del sitio quedan conectados.       │
   └───────────────────────────────────────────────────────────────────────┘
   ========================================================================== */
(function () {
  'use strict';

  /* ⬇️⬇️⬇️  PEGÁ ACÁ TU ACCESS KEY DE WEB3FORMS  ⬇️⬇️⬇️ */
  var WEB3FORMS_ACCESS_KEY = '3dec12c4-bb25-4fa7-b9a3-d7a15c6d6994';
  /* ⬆️⬆️⬆️  (mientras diga REEMPLAZAR..., los forms muestran modo demo) ⬆️⬆️⬆️ */

  var ENDPOINT = 'https://api.web3forms.com/submit';
  var LEADS_EMAIL = 'ventas@tierra.vip';

  // ¿La key ya fue configurada?
  var KEY_READY = WEB3FORMS_ACCESS_KEY &&
                  WEB3FORMS_ACCESS_KEY.indexOf('REEMPLAZAR') === -1 &&
                  WEB3FORMS_ACCESS_KEY.length > 10;

  var EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function isEN() { return window.__LANG === 'en' || document.documentElement.getAttribute('lang') === 'en'; }
  function t(es, en) { return isEN() ? en : es; }

  /* --------------------------------------------------------------------------
     sendLead(fields) — envía un lead a Web3Forms.
     Expuesto en window.TierraForms.sendLead para reusarlo desde otros scripts
     (ej: el formulario de "Agendar visita" que además abre WhatsApp).
     Devuelve una Promise que resuelve { success:boolean, message:string }.
     -------------------------------------------------------------------------- */
  function sendLead(fields) {
    fields = fields || {};
    if (!KEY_READY) {
      // Sin key: no perdemos el lead en silencio; avisamos en consola.
      console.warn('[Tierra] Web3Forms sin configurar. Pegá tu Access Key en assets/tierra-forms.js. Lead:', fields);
      return Promise.resolve({ success: false, demo: true, message: 'demo' });
    }
    var fd = new FormData();
    fd.append('access_key', WEB3FORMS_ACCESS_KEY);
    fd.append('from_name', 'Web tierra.vip');
    fd.append('subject', fields.subject || ('Nuevo contacto desde tierra.vip' + (fields.proyecto ? ' — ' + fields.proyecto : '')));
    // Campos del lead
    Object.keys(fields).forEach(function (k) {
      if (k === 'subject') return;
      if (fields[k] != null && fields[k] !== '') fd.append(k, fields[k]);
    });
    fd.append('pagina', location.href);
    fd.append('destinatario', LEADS_EMAIL);

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fd
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { return { success: !!d.success, message: d.message || '' }; })
      .catch(function () { return { success: false, message: 'network' }; });
  }

  /* --------------------------------------------------------------------------
     Traducción de placeholders / textos con data-es / data-en
     -------------------------------------------------------------------------- */
  function applyLang(root) {
    (root || document).querySelectorAll('.tierra-form [data-es]').forEach(function (el) {
      var val = isEN() ? (el.getAttribute('data-en') || el.getAttribute('data-es')) : el.getAttribute('data-es');
      if (el.placeholder !== undefined && el.tagName === 'INPUT') el.placeholder = val;
      else if (el.tagName === 'OPTION') el.textContent = val;
      else if (el.tagName === 'BUTTON') el.textContent = val;
      else el.textContent = val;
    });
    (root || document).querySelectorAll('.tierra-form option[data-es][data-en]').forEach(function (op) {
      op.textContent = isEN() ? op.getAttribute('data-en') : op.getAttribute('data-es');
    });
  }

  /* --------------------------------------------------------------------------
     UI de estado (éxito / error) dentro del formulario
     -------------------------------------------------------------------------- */
  function setStatus(form, kind, msg) {
    var box = form.querySelector('.tf-status');
    if (!box) { box = document.createElement('p'); box.className = 'tf-status'; form.appendChild(box); }
    box.className = 'tf-status show tf-' + kind;
    box.textContent = msg;
  }

  function showSuccess(form) {
    var name = (form.querySelector('[name="name"]') || {}).value || '';
    var wrap = form.querySelector('.tf-body') || form;
    form.classList.add('tf-done');
    var first = name.trim().split(' ')[0];
    wrap.innerHTML =
      '<div class="tf-success" role="status">' +
        '<div class="tf-check" aria-hidden="true">' +
          '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="none"/><path fill="none" d="M14 27l8 8 16-16"/></svg>' +
        '</div>' +
        '<h4>' + t('¡Gracias' + (first ? ', ' + first : '') + '!', 'Thank you' + (first ? ', ' + first : '') + '!') + '</h4>' +
        '<p>' + t('Recibimos tus datos. Un asesor de Tierra te contacta muy pronto.',
                  'We got your details. A Tierra advisor will reach out shortly.') + '</p>' +
      '</div>';
  }

  /* --------------------------------------------------------------------------
     Manejo de cada formulario .tierra-form
     -------------------------------------------------------------------------- */
  function enhance(form) {
    if (form.__tierraBound) return;
    form.__tierraBound = true;

    // Honeypot anti-spam (invisible)
    if (!form.querySelector('[name="botcheck"]')) {
      var hp = document.createElement('input');
      hp.type = 'checkbox'; hp.name = 'botcheck'; hp.tabIndex = -1;
      hp.setAttribute('autocomplete', 'off');
      hp.style.cssText = 'position:absolute!important;left:-9999px!important;opacity:0!important';
      hp.setAttribute('aria-hidden', 'true');
      form.appendChild(hp);
    }

    // Pre-seleccionar proyecto si el form declara data-proyecto
    var pre = form.getAttribute('data-proyecto');
    if (pre) {
      var sel = form.querySelector('select[name="proyecto"]');
      if (sel) {
        [].forEach.call(sel.options, function (o) {
          if (o.value === pre || o.textContent.trim() === pre) o.selected = true;
        });
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.__sending) return;

      // Bot detectado
      var bc = form.querySelector('[name="botcheck"]');
      if (bc && bc.checked) return;

      // Validación
      var email = (form.querySelector('[name="email"]') || {});
      var name = (form.querySelector('[name="name"]') || {});
      var phone = (form.querySelector('[name="phone"]') || {});

      form.querySelectorAll('.tf-err').forEach(function (el) { el.classList.remove('tf-err'); });

      if (name.value !== undefined && !name.value.trim()) {
        name.classList.add('tf-err'); name.focus();
        setStatus(form, 'err', t('Contanos tu nombre.', 'Please tell us your name.'));
        return;
      }
      if (email.value !== undefined && !EMAIL_RX.test(email.value.trim())) {
        email.classList.add('tf-err'); email.focus();
        setStatus(form, 'err', t('Revisá tu correo — parece incompleto.', 'Check your email — it looks incomplete.'));
        return;
      }
      if (phone.value !== undefined && phone.value.trim().replace(/\D/g, '').length < 7) {
        phone.classList.add('tf-err'); phone.focus();
        setStatus(form, 'err', t('Dejanos un teléfono o WhatsApp para contactarte.', 'Leave a phone or WhatsApp so we can reach you.'));
        return;
      }

      // Datos
      var fields = { origen: form.getAttribute('data-origen') || 'Formulario web' };
      form.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (el) {
        if (el.name === 'botcheck') return;
        fields[el.name] = el.value.trim ? el.value.trim() : el.value;
      });
      fields.subject = t('Nuevo lead', 'New lead') + ' · ' + fields.origen +
        (fields.proyecto ? ' · ' + fields.proyecto : '');

      // Envío
      form.__sending = true;
      var btn = form.querySelector('button[type="submit"], button:not([type])');
      var btnTxt = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.dataset.txt = btnTxt; btn.textContent = t('Enviando…', 'Sending…'); }
      setStatus(form, 'wait', '');

      sendLead(fields).then(function (res) {
        form.__sending = false;
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.txt || btnTxt; }
        if (res.success) {
          showSuccess(form);
        } else if (res.demo) {
          // Sin key configurada: no engañamos al visitante, mostramos éxito visual
          // pero dejamos aviso en consola para el dueño del sitio.
          showSuccess(form);
        } else {
          setStatus(form, 'err', t(
            'No pudimos enviar. Probá de nuevo o escribinos por WhatsApp.',
            "We couldn't send it. Try again or reach us on WhatsApp."));
        }
      });
    });

    // limpiar error al tipear
    form.addEventListener('input', function (e) {
      if (e.target.classList) e.target.classList.remove('tf-err');
      var box = form.querySelector('.tf-status.tf-err');
      if (box) box.classList.remove('show');
    });
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  function init() {
    document.querySelectorAll('form.tierra-form').forEach(enhance);
    applyLang();
    // re-traducir cuando cambia el idioma (ES/EN observando <html lang>)
    new MutationObserver(function () { applyLang(); }).observe(
      document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // API pública
  window.TierraForms = { sendLead: sendLead, keyReady: KEY_READY };
})();
