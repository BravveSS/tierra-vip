// ============================================================================
// TIERRA — Edge Function: notify-update
// Avisa por correo a los clientes de una obra cuando se publica un avance.
// Usa Resend (https://resend.com). Requiere el secreto RESEND_API_KEY en
// Supabase → Edge Functions → Secrets. Si no está configurado, responde
// {sent:0, reason:'email_no_configurado'} sin fallar.
// Solo invocable por un ADMIN autenticado.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405)
  try {
    const URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const RESEND = Deno.env.get('RESEND_API_KEY') ?? ''
    const FROM = Deno.env.get('NOTIFY_FROM') ?? 'Tierra Desarrollos <onboarding@resend.dev>'
    const authHeader = req.headers.get('Authorization') ?? ''

    const asUser = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)
    const { data: isAdmin } = await asUser.rpc('is_admin')
    if (!isAdmin) return json({ error: 'No autorizado' }, 403)

    const { project_id, kind, title } = await req.json()
    if (!project_id) return json({ error: 'Falta project_id' }, 400)
    if (!RESEND) return json({ sent: 0, reason: 'email_no_configurado' })

    const admin = createClient(URL, SERVICE)
    const { data: proj } = await admin.from('projects').select('name').eq('id', project_id).single()
    const { data: clients } = await admin.from('profiles')
      .select('email, full_name').eq('project_id', project_id).eq('role', 'client')
    const emails = (clients ?? []).map(c => c.email).filter(Boolean)
    if (!emails.length) return json({ sent: 0, reason: 'sin_clientes' })

    const what = kind === 'costos' ? 'un nuevo reporte de costos'
      : kind === 'nota' ? 'una nueva nota de construcción'
      : 'un nuevo avance con fotos'
    const subj = `Tu obra tiene ${what} — ${proj?.name ?? 'Tierra'}`
    const html = `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#122019;color:#F2EEE4;border-radius:12px">
        <div style="text-align:center;font-size:22px;letter-spacing:.2em;color:#C9A96E;margin-bottom:18px">T I E R R A</div>
        <h2 style="font-weight:normal;font-size:24px;margin:0 0 10px">Tu obra avanza 🏗️</h2>
        <p style="font-size:15px;line-height:1.7;color:#d9d4c7">
          Se publicó ${what} de <b style="color:#F2EEE4">${proj?.name ?? 'tu obra'}</b>${title ? ': <i>' + title + '</i>' : ''}.
        </p>
        <p style="text-align:center;margin:26px 0">
          <a href="https://tierra.vip/portal" style="background:#C9A96E;color:#20170c;text-decoration:none;padding:13px 30px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px">Ver mi obra</a>
        </p>
        <p style="font-size:12px;color:#8a8577;text-align:center">Tierra Desarrollos · Costa de Oaxaca · tierra.vip</p>
      </div>`

    let sent = 0
    for (const to of emails) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to, subject: subj, html }),
      })
      if (r.ok) sent++
    }
    return json({ sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
