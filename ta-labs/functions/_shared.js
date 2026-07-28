/* ============================================================================
   TA LABS — Utilidades compartidas por las funciones de /api
   ========================================================================== */

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/* ── Límite por IP ──────────────────────────────────────────────────────────
   Las claves de Claude y Resend se pagan por uso, así que un formulario
   abierto a internet sin freno es una factura esperando a ocurrir. El estado
   vive en memoria del worker: no es exacto entre instancias, pero corta de
   sobra el abuso desde una sola IP, que es el caso real. */
const hits = new Map();

export function allow(ip, porMinuto = 5, porHora = 30) {
  const ahora = Date.now();
  const previos = (hits.get(ip) ?? []).filter((t) => ahora - t < 3600_000);

  if (previos.length >= porHora || previos.filter((t) => ahora - t < 60_000).length >= porMinuto) {
    hits.set(ip, previos);
    return false;
  }

  previos.push(ahora);
  hits.set(ip, previos);
  if (hits.size > 5000) hits.clear();
  return true;
}

export const clientIP = (request) =>
  request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anon';

/* ── Validación ─────────────────────────────────────────────────────────── */
export const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Recorta y limita: nada de lo que llega del formulario entra sin tope. */
export const clean = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Escapa antes de interpolar en el HTML de los correos. */
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Supabase ───────────────────────────────────────────────────────────── */
/** Inserta una fila vía REST. Devuelve true/false: guardar el lead no debe
    tumbar la petición si el usuario ya recibió su confirmación. */
export async function saveRow(env, table, row) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return false;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/* ── Resend ─────────────────────────────────────────────────────────────── */
export async function sendMail(env, { to, subject, html, replyTo }) {
  if (!env.RESEND_API_KEY) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM || 'TA Labs <hola@talabs.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Plantilla común de los correos: sobria y legible en cualquier cliente. */
export const shell = (title, inner) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0B0D12">
  <div style="display:inline-block;background:#7C5CFF;color:#fff;font-weight:700;font-size:13px;padding:7px 11px;border-radius:8px;letter-spacing:-.02em">TA</div>
  <h1 style="font-size:21px;margin:22px 0 14px;letter-spacing:-.02em">${title}</h1>
  ${inner}
  <hr style="border:0;border-top:1px solid #E6E8EC;margin:28px 0">
  <p style="font-size:12px;color:#858D9B;margin:0">TA Labs — Software que hace crecer empresas.</p>
</div>`;
