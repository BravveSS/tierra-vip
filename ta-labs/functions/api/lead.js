/* ============================================================================
   TA LABS — /api/lead
   Recibe el resultado de la calculadora, lo guarda en Supabase y manda dos
   correos: la propuesta al visitante y el aviso a TA Labs.
   ========================================================================== */
import { json, allow, clientIP, isEmail, clean, esc, saveRow, sendMail, shell } from '../_shared.js';

const EUR = (n) => (typeof n === 'number' ? new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
}).format(n) : '—');

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  if (!allow(clientIP(request))) {
    return json({ error: 'Demasiadas solicitudes. Inténtalo en unos minutos.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Petición inválida' }, 400); }

  const nombre = clean(body.nombre, 120);
  const email = clean(body.email, 160);
  if (!nombre || !isEmail(email)) return json({ error: 'Nombre o correo inválido' }, 400);

  const nota = clean(body.nota, 2000);
  const tipo = clean(body.tipo, 80);
  const lista = (arr) => (Array.isArray(arr) ? arr.slice(0, 20).map((v) => clean(v, 80)).filter(Boolean) : []);
  const funcionalidades = lista(body.funcionalidades);
  const integraciones = lista(body.integraciones);
  const min = Number.isFinite(body.rango_min) ? body.rango_min : null;
  const max = Number.isFinite(body.rango_max) ? body.rango_max : null;

  await saveRow(env, 'ta_leads', {
    nombre, email, nota, tipo,
    funcionalidades, integraciones,
    rango_min: min, rango_max: max,
    origen: 'calculadora',
  });

  const rango = min && max ? `${EUR(min)} – ${EUR(max)}` : 'A definir';
  const chips = [tipo, ...funcionalidades, ...integraciones].filter(Boolean);
  const chipsHTML = chips.length
    ? `<p style="margin:0 0 6px;font-size:13px;color:#545C6B">Incluye</p><p style="margin:0 0 20px;font-size:14px;line-height:1.9">${
        chips.map((c) => `<span style="background:#F1EFFE;color:#5B3DF5;padding:4px 10px;border-radius:99px;margin-right:6px;white-space:nowrap">${esc(c)}</span>`).join('')
      }</p>`
    : '';

  // El correo al visitante llega primero: es el que espera para saber que
  // su solicitud entró de verdad.
  await sendMail(env, {
    to: email,
    replyTo: env.MAIL_TO || 'hola@talabs.dev',
    subject: 'Tu estimación de TA Labs',
    html: shell(`Hola ${esc(nombre.split(' ')[0])} 👋`, `
      <p style="font-size:15px;line-height:1.65;color:#333A47;margin:0 0 22px">
        Gracias por usar la calculadora. Esta es la estimación para tu proyecto según lo que has elegido:
      </p>
      <div style="background:#F7F6FF;border:1px solid #E4DFFE;border-radius:14px;padding:22px;margin-bottom:22px">
        <p style="margin:0 0 4px;font-size:13px;color:#545C6B">Rango estimado</p>
        <p style="margin:0;font-size:27px;font-weight:600;letter-spacing:-.03em;color:#0B0D12">${esc(rango)}</p>
      </div>
      ${chipsHTML}
      <p style="font-size:15px;line-height:1.65;color:#333A47;margin:0 0 22px">
        Es un rango orientativo: el precio cerrado sale cuando entendemos bien el alcance.
        Te escribo en menos de 24 h con una propuesta detallada y, si quieres, agendamos 30 minutos para verlo.
      </p>
      <p style="font-size:15px;line-height:1.65;color:#333A47;margin:0">— Tomás, TA Labs</p>
    `),
  });

  await sendMail(env, {
    to: env.MAIL_TO || 'hola@talabs.dev',
    replyTo: email,
    subject: `Nuevo lead: ${nombre} — ${rango}`,
    html: shell('Nuevo lead desde la calculadora', `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:7px 0;color:#858D9B;width:110px">Nombre</td><td style="padding:7px 0">${esc(nombre)}</td></tr>
        <tr><td style="padding:7px 0;color:#858D9B">Correo</td><td style="padding:7px 0"><a href="mailto:${esc(email)}" style="color:#5B3DF5">${esc(email)}</a></td></tr>
        <tr><td style="padding:7px 0;color:#858D9B">Tipo</td><td style="padding:7px 0">${esc(tipo || '—')}</td></tr>
        <tr><td style="padding:7px 0;color:#858D9B">Rango</td><td style="padding:7px 0"><b>${esc(rango)}</b></td></tr>
        <tr><td style="padding:7px 0;color:#858D9B;vertical-align:top">Funciones</td><td style="padding:7px 0">${esc(funcionalidades.join(', ') || '—')}</td></tr>
        <tr><td style="padding:7px 0;color:#858D9B;vertical-align:top">Integra</td><td style="padding:7px 0">${esc(integraciones.join(', ') || '—')}</td></tr>
      </table>
      ${nota ? `<p style="margin:18px 0 0;font-size:13px;color:#858D9B">Nota</p><p style="margin:4px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(nota)}</p>` : ''}
    `),
  });

  return json({ ok: true });
}
