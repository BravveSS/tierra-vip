// ============================================================================
// TIERRA — Edge Function: admin-create-client
// Crea la cuenta de un cliente (correo + contraseña) y le asigna su obra.
// Solo la puede invocar un ADMIN (se verifica su token). La service_role key
// vive SOLO aquí (servidor), nunca en el navegador.
//
// Deploy (una vez):  Supabase → Edge Functions → Deploy a new function
//   nombre: admin-create-client   → pega este archivo.
// (o CLI:  supabase functions deploy admin-create-client --no-verify-jwt=false)
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
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  try {
    const URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''

    // 1) El que llama debe ser admin (cliente con SU token)
    const asUser = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: uErr } = await asUser.auth.getUser()
    if (uErr || !user) return json({ error: 'No autenticado' }, 401)
    const { data: isAdmin, error: rErr } = await asUser.rpc('is_admin')
    if (rErr || !isAdmin) return json({ error: 'No autorizado' }, 403)

    // 2) Datos del nuevo cliente
    const { email, password, full_name, project_id } = await req.json()
    if (!email || !password || !project_id) return json({ error: 'Faltan datos (email, password, project_id)' }, 400)
    if (String(password).length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)

    // 3) Crear el usuario con service_role (email ya confirmado)
    const admin = createClient(URL, SERVICE)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? '' },
    })
    if (cErr || !created?.user) return json({ error: cErr?.message ?? 'No se pudo crear el usuario' }, 400)

    // 4) Asignar obra + rol cliente (el trigger ya creó el perfil)
    const { error: pErr } = await admin.from('profiles')
      .update({ project_id, full_name: full_name ?? null, role: 'client' })
      .eq('id', created.user.id)
    if (pErr) return json({ error: pErr.message }, 400)

    return json({ ok: true, user_id: created.user.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
