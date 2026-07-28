// ============================================================================
// TIERRA — Edge Function: notify-update
// Avisa por correo a los clientes de una obra cuando se publica un avance.
// Usa Resend (https://resend.com). Requiere el secreto RESEND_API_KEY en
// Supabase → Edge Functions → Secrets. Si no está configurado, responde
// {sent:0, reason:'email_no_configurado'} sin fallar.
// Solo invocable por un ADMIN autenticado.
//
// El correo se arma por destinatario para saludar por su nombre, va maquetado
// con tablas y bgcolor (el <div> con CSS lo rompen Outlook y Gmail) y lleva
// versión en texto plano: sin ella, un dominio recién verificado se va a spam
// mucho más fácil.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// El logo NO va como <img src="https://…">: Gmail y Outlook bloquean las
// imágenes externas de un remitente que aún no es de confianza, y el correo
// llegaba sin logo. Se manda incrustado en el propio mensaje (adjunto con
// content_id, que se referencia como cid:), así no hay petición externa que
// bloquear y se ve siempre.
// Si por lo que sea no se pudiera descargar, se cae a la URL normal.
const LOGO_URL = 'https://tierra.vip/assets/img/brand/logo-correo.png'
const LOGO_CID = 'logo-tierra'

let logoB64 = ''
async function logoIncrustado(): Promise<string> {
  if (logoB64) return logoB64
  try {
    const r = await fetch(LOGO_URL)
    if (!r.ok) throw new Error('http ' + r.status)
    const bytes = new Uint8Array(await r.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    logoB64 = btoa(bin)
  } catch (_e) { /* se queda vacío y se usa la URL */ }
  return logoB64
}
const PORTAL = 'https://tierra.vip/portal'
const money = (n: number) => '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })
// El nombre y el título los escribe un admin: se escapan antes de entrar al HTML.
const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const primerNombre = (n: unknown) => String(n ?? '').trim().split(/\s+/)[0] || ''

type Item = { concept: string; amount: number }

function maquetar(o: {
  saludo: string; que: string; obra: string; titulo: string;
  total: number | null; items: Item[]; progreso: number | null; logo: string;
}): string {
  const fila = (i: Item) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(201,169,110,.14);font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#d9d4c7">${esc(i.concept)}</td>` +
    `<td style="padding:8px 0;border-bottom:1px solid rgba(201,169,110,.14);font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F2EEE4;text-align:right;white-space:nowrap">${money(i.amount)}</td></tr>`

  const desglose = o.items.length
    ? `<tr><td style="padding:22px 32px 0">
         <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#C9A96E;padding-bottom:6px">En qué se fue</div>
         <table width="100%" cellpadding="0" cellspacing="0" border="0">${o.items.map(fila).join('')}</table>
       </td></tr>` : ''

  // Barra de avance: dos celdas de tabla, que es lo único que pinta igual en
  // todos los clientes (nada de width en % dentro de un div con background).
  const barra = (o.progreso != null && o.progreso > 0)
    ? `<tr><td style="padding:24px 32px 0">
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,238,228,.5)">Avance de la obra</td>
             <td align="right" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;color:#C9A96E">${Math.round(o.progreso)}%</td>
           </tr>
         </table>
         <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1d2b23" style="background:#1d2b23;border-radius:4px;margin-top:8px">
           <tr>
             <td width="${Math.round(o.progreso)}%" bgcolor="#C9A96E" style="background:#C9A96E;height:6px;line-height:6px;font-size:0;border-radius:4px">&nbsp;</td>
             <td style="height:6px;line-height:6px;font-size:0">&nbsp;</td>
           </tr>
         </table>
       </td></tr>` : ''

  const totalHtml = o.total != null
    ? `<tr><td style="padding:22px 32px 0">
         <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0e1a14" style="background:#0e1a14;border-radius:8px">
           <tr><td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,238,228,.5)">Total de la semana</td>
           <td align="right" style="padding:16px 20px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#C9A96E;white-space:nowrap">${money(o.total)}</td></tr>
         </table>
       </td></tr>` : ''

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080706" style="background:#080706;margin:0;padding:32px 12px">
  <tr><td align="center" bgcolor="#080706" style="background:#080706">
    <table width="520" cellpadding="0" cellspacing="0" border="0" bgcolor="#122019" style="max-width:520px;width:100%;background:#122019;border-radius:12px">
      <tr><td bgcolor="#122019" style="padding:34px 32px 8px;text-align:center;background:#122019">
        <a href="https://tierra.vip" style="text-decoration:none">
          <img src="${o.logo}" width="72" height="91" alt="Tierra Desarrollos"
               style="display:block;margin:0 auto;width:72px;max-width:72px;height:auto;border:0;outline:none;text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:18px;letter-spacing:.24em;color:#C9A96E">
        </a>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(242,238,228,.45);margin-top:14px">Portal de obra</div>
      </td></tr>
      <tr><td style="padding:24px 32px 0"><div style="height:1px;background:#C9A96E;opacity:.28;line-height:1px;font-size:0">&nbsp;</div></td></tr>
      <tr><td style="padding:28px 32px 0">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:27px;line-height:1.25;color:#F2EEE4;margin:0">Tu obra avanzó esta semana</h1>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#d9d4c7;margin:16px 0 0">
          ${o.saludo}${o.saludo ? 'a' : 'A'}cabamos de publicar ${o.que} de <strong style="color:#F2EEE4">${esc(o.obra)}</strong>${o.titulo ? ': <em>' + esc(o.titulo) + '</em>' : ''}.
        </p>
      </td></tr>
      ${barra}
      ${totalHtml}
      ${desglose}
      <tr><td style="padding:30px 32px 0;text-align:center">
        <a href="${PORTAL}" style="display:inline-block;background:#C9A96E;color:#20170c;text-decoration:none;padding:15px 34px;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold">Ver mi obra</a>
      </td></tr>
      <tr><td style="padding:20px 32px 0">
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:rgba(242,238,228,.5);margin:0;text-align:center">
          Dentro tienes las fotos, el desglose completo y el presupuesto que queda.
        </p>
      </td></tr>
      <tr><td style="padding:28px 32px 34px;text-align:center">
        <div style="height:1px;background:#C9A96E;opacity:.18;line-height:1px;font-size:0;margin-bottom:20px">&nbsp;</div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:rgba(242,238,228,.42);margin:0">
          ¿Alguna duda sobre esta semana? Responde a este correo o escríbenos al
          <a href="https://wa.me/529581087977" style="color:#C9A96E;text-decoration:none">+52 958 108 7977</a><br>
          <a href="https://tierra.vip" style="color:rgba(242,238,228,.42);text-decoration:none">tierra.vip</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`
}

function textoPlano(o: { saludo: string; que: string; obra: string; total: number | null; progreso: number | null }) {
  return [
    o.saludo ? o.saludo.replace(/&nbsp;/g, ' ').trim() : '',
    `Acabamos de publicar ${o.que} de ${o.obra}.`,
    o.progreso != null && o.progreso > 0 ? `Avance de la obra: ${Math.round(o.progreso)}%.` : '',
    o.total != null ? `Total de la semana: ${money(o.total)}.` : '',
    `Entra a ver las fotos y el desglose completo: ${PORTAL}`,
    '',
    '¿Dudas? Responde a este correo o escríbenos al +52 958 108 7977.',
    'Tierra Desarrollos · Costa de Oaxaca · tierra.vip',
  ].filter(Boolean).join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405)
  try {
    const URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const RESEND = Deno.env.get('RESEND_API_KEY') ?? ''
    const FROM = Deno.env.get('NOTIFY_FROM') ?? 'Tierra Desarrollos <onboarding@resend.dev>'
    const REPLY = Deno.env.get('NOTIFY_REPLY_TO') ?? 'ventas@tierra.vip'
    const authHeader = req.headers.get('Authorization') ?? ''

    const asUser = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)
    const { data: isAdmin } = await asUser.rpc('is_admin')
    if (!isAdmin) return json({ error: 'No autorizado' }, 403)

    const { project_id, kind, title, total, week_id } = await req.json()
    if (!project_id) return json({ error: 'Falta project_id' }, 400)
    if (!RESEND) return json({ sent: 0, reason: 'email_no_configurado' })

    const admin = createClient(URL, SERVICE)
    const { data: proj } = await admin.from('projects').select('name, progress').eq('id', project_id).single()
    const { data: clients } = await admin.from('profiles')
      .select('email, full_name').eq('project_id', project_id).eq('role', 'client')
    const destinatarios = (clients ?? []).filter((c: { email?: string }) => c.email)
    if (!destinatarios.length) return json({ sent: 0, reason: 'sin_clientes' })

    // Desglose de la semana (solo para costos)
    let items: Item[] = []
    if (kind === 'costos' && week_id) {
      const { data } = await admin.from('cost_items')
        .select('concept, amount').eq('week_id', week_id).order('amount', { ascending: false }).limit(6)
      items = (data ?? []) as Item[]
    }

    const que = kind === 'costos' ? 'un nuevo reporte de costos' : 'un nuevo avance con fotos'
    const obra = proj?.name ?? 'tu obra'
    const progreso = typeof proj?.progress === 'number' ? proj.progress : null
    const subject = `${obra}: ${kind === 'costos' ? 'nuevo reporte de costos' : 'nuevas fotos del avance'}`

    const b64 = await logoIncrustado()
    const logoSrc = b64 ? 'cid:' + LOGO_CID : LOGO_URL
    const adjuntos = b64
      ? [{ filename: 'tierra.png', content: b64, content_type: 'image/png', content_id: LOGO_CID }]
      : undefined

    let sent = 0
    const fallos: string[] = []
    for (const c of destinatarios) {
      const nombre = primerNombre((c as { full_name?: string }).full_name)
      const datos = {
        saludo: nombre ? `Hola ${esc(nombre)}, ` : '',
        que, obra, titulo: title ?? '',
        total: total != null ? Number(total) : null,
        items, progreso, logo: logoSrc,
      }
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: (c as { email: string }).email,
          reply_to: REPLY,
          subject,
          html: maquetar(datos),
          attachments: adjuntos,
          text: textoPlano({ saludo: nombre ? `Hola ${nombre},` : '', que, obra, total: datos.total, progreso }),
        }),
      })
      if (r.ok) sent++
      // El motivo importa: casi siempre es el dominio sin verificar o el
      // remitente equivocado, y sin esto el panel solo diría "0 enviados".
      else fallos.push(await r.text().catch(() => 'error ' + r.status))
    }
    return json(fallos.length ? { sent, failed: fallos.length, error: fallos[0].slice(0, 300) } : { sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
