// ============================================================================
// TIERRA — Edge Function: admin-create-client (v2)
// Acciones (solo invocables por un ADMIN autenticado):
//   { action:'create', email, password, full_name, project_id } → crea cliente
//   { action:'delete', user_id }                                → borra cuenta
//   { action:'reset',  user_id, password }                      → nueva contraseña
// La service_role vive SOLO aquí (servidor), nunca en el navegador.
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
    const authHeader = req.headers.get('Authorization') ?? ''

    const asUser = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: uErr } = await asUser.auth.getUser()
    if (uErr || !user) return json({ error: 'No autenticado' }, 401)
    const { data: isAdmin, error: rErr } = await asUser.rpc('is_admin')
    if (rErr || !isAdmin) return json({ error: 'No autorizado' }, 403)

    const body = await req.json()
    const action = body.action ?? 'create'
    const admin = createClient(URL, SERVICE)

    if (action === 'delete') {
      const uid = body.user_id
      if (!uid) return json({ error: 'Falta user_id' }, 400)
      // nunca borrar cuentas admin desde aqui
      const { data: prof } = await admin.from('profiles').select('role').eq('id', uid).single()
      if (!prof) return json({ error: 'Usuario no encontrado' }, 404)
      if (prof.role !== 'client') return json({ error: 'Solo se pueden borrar cuentas de cliente' }, 400)
      const { error: dErr } = await admin.auth.admin.deleteUser(uid)
      if (dErr) return json({ error: dErr.message }, 400)
      return json({ ok: true })
    }

    if (action === 'reset') {
      const uid = body.user_id
      const password = body.password
      if (!uid || !password) return json({ error: 'Faltan datos' }, 400)
      if (String(password).length < 8) return json({ error: 'La contrasena debe tener al menos 8 caracteres' }, 400)
      const { data: prof } = await admin.from('profiles').select('role').eq('id', uid).single()
      if (!prof) return json({ error: 'Usuario no encontrado' }, 404)
      if (prof.role !== 'client') return json({ error: 'Solo cuentas de cliente' }, 400)
      const { error: rsErr } = await admin.auth.admin.updateUserById(uid, { password })
      if (rsErr) return json({ error: rsErr.message }, 400)
      return json({ ok: true })
    }

    // action === 'create'
    const { email, password, full_name, project_id } = body
    if (!email || !password || !project_id) return json({ error: 'Faltan datos (email, password, project_id)' }, 400)
    if (String(password).length < 8) return json({ error: 'La contrasena debe tener al menos 8 caracteres' }, 400)

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: full_name ?? '' },
    })
    if (cErr || !created?.user) return json({ error: cErr?.message ?? 'No se pudo crear el usuario' }, 400)

    const { error: pErr } = await admin.from('profiles')
      .update({ project_id, full_name: full_name ?? null, role: 'client' })
      .eq('id', created.user.id)
    if (pErr) return json({ error: pErr.message }, 400)

    return json({ ok: true, user_id: created.user.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
