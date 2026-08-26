/* ============================================================================
   TA LABS — /api/booking
   Reserva de reunión: guarda en Supabase y envía confirmación al visitante y
   aviso a TA Labs.
   ========================================================================== */
import { json, allow, clientIP, isEmail, clean, esc, saveRow, sendMail, shell } from '../_shared.js';

const HORAS = ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  if (!allow(clientIP(request), 3, 12)) {
    return json({ error: 'Demasiadas solicitudes. Inténtalo en unos minutos.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Petición inválida' }, 400); }

  const nombre = clean(body.nombre, 120);
  const email = clean(body.email, 160);
  if (!nombre || !isEmail(email)) return json({ error: 'Nombre o correo inválido' }, 400);

  // La fecha y la hora se revalidan aquí: el cliente puede mandar cualquier
  // cosa, y una reserva en domingo a las 3 de la mañana no debe entrar.
  const fecha = clean(body.fecha, 10);
  const hora = clean(body.hora, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !HORAS.includes(hora)) {
    return json({ error: 'Fecha u hora no válida' }, 400);
  }

  const cuando = new Date(`${fecha}T00:00:00Z`);
  const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0);
  const dow = cuando.getUTCDay();
  if (Number.isNaN(cuando.getTime()) || cuando <= hoy || dow === 0 || dow === 6) {
    return json({ error: 'Elige un día laborable futuro' }, 400);
  }

  const nota = clean(body.nota, 2000);
  const zona = clean(body.zona, 60);

  const legible = cuando.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  await saveRow(env, 'ta_reuniones', {
    nombre, email, nota, fecha, hora, zona, estado: 'solicitada',
  });

  await sendMail(env, {
    to: email,
    replyTo: env.MAIL_TO || 'hola@talabs.dev',
    subject: `Reunión confirmada — ${legible} a las ${hora}`,
    html: shell('Reunión confirmada ✅', `
      <p style="font-size:15px;line-height:1.65;color:#333A47;margin:0 0 22px">
        Hola ${esc(nombre.split(' ')[0])}, tu reunión con TA Labs está agendada.
      </p>
      <div style="background:#F7F6FF;border:1px solid #E4DFFE;border-radius:14px;padding:22px;margin-bottom:22px">
        <p style="margin:0 0 4px;font-size:13px;color:#545C6B">Cuándo</p>
        <p style="margin:0;font-size:19px;font-weight:600;letter-spacing:-.02em;color:#0B0D12;text-transform:capitalize">${esc(legible)} · ${esc(hora)}</p>
        ${zona ? `<p style="margin:8px 0 0;font-size:13px;color:#858D9B">Zona horaria: ${esc(zona)}</p>` : ''}
      </div>
      <p style="font-size:15px;line-height:1.65;color:#333A47;margin:0 0 22px">
        Te envío el enlace de la videollamada por correo antes de la reunión.
        Si te surge algo y necesitas cambiarla, responde a este mensaje.
      </p>
      <p style="font-size:15px;line-height:1.65;color:#333A47;margin:0">— Tomás, TA Labs</p>
    `),
  });

  await sendMail(env, {
    to: env.MAIL_TO || 'hola@talabs.dev',
    replyTo: email,
    subject: `Nueva reunión: ${nombre} — ${fecha} ${hora}`,
    html: shell('Nueva reunión agendada', `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:7px 0;color:#858D9B;width:110px">Nombre</td><td style="padding:7px 0">${esc(nombre)}</td></tr>
        <tr><td style="padding:7px 0;color:#858D9B">Correo</td><td style="padding:7px 0"><a href="mailto:${esc(email)}" style="color:#5B3DF5">${esc(email)}</a></td></tr>
        <tr><td style="padding:7px 0;color:#858D9B">Cuándo</td><td style="padding:7px 0"><b>${esc(legible)} · ${esc(hora)}</b></td></tr>
        <tr><td style="padding:7px 0;color:#858D9B">Zona</td><td style="padding:7px 0">${esc(zona || '—')}</td></tr>
      </table>
      ${nota ? `<p style="margin:18px 0 0;font-size:13px;color:#858D9B">Nota</p><p style="margin:4px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(nota)}</p>` : ''}
    `),
  });

  return json({ ok: true });
}
